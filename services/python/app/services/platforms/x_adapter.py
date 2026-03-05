"""
X (Twitter) API v2 platform adapter.

Implements posting tweets, replying, searching recent tweets, and
OAuth 2.0 token refresh via the Twitter API v2 endpoints.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.services.platforms.base import (
    ContentType,
    MentionItem,
    PlatformAdapter,
    PublishResult,
    PublishStatus,
    SearchResult,
    TokenRefreshResult,
)

logger = logging.getLogger(__name__)

API_BASE = "https://api.twitter.com/2"
OAUTH2_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
UPLOAD_BASE = "https://upload.twitter.com/1.1"


class XAdapter(PlatformAdapter):
    """X / Twitter API v2 adapter."""

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        self._client = httpx.AsyncClient(
            base_url=API_BASE,
            headers=self._auth_headers(),
            timeout=httpx.Timeout(30.0),
        )

    @property
    def platform_name(self) -> str:
        return "x"

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    async def publish_post(
        self,
        text: str,
        media_urls: Optional[List[str]] = None,
        content_type: ContentType = ContentType.TEXT,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Post a tweet, optionally with media."""
        extra = extra or {}
        payload: Dict[str, Any] = {"text": text}

        # If media IDs were already uploaded, attach them
        media_ids: List[str] = extra.get("media_ids", [])
        if media_ids:
            payload["media"] = {"media_ids": media_ids}

        # Optional: quote tweet
        if extra.get("quote_tweet_id"):
            payload["quote_tweet_id"] = extra["quote_tweet_id"]

        # Optional: poll
        if extra.get("poll_options"):
            payload["poll"] = {
                "options": extra["poll_options"],
                "duration_minutes": extra.get("poll_duration_minutes", 1440),
            }

        resp = await self._client.post("/tweets", json=payload)
        return self._parse_publish_response(resp)

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to an existing tweet."""
        payload: Dict[str, Any] = {
            "text": text,
            "reply": {"in_reply_to_tweet_id": parent_id},
        }
        resp = await self._client.post("/tweets", json=payload)
        return self._parse_publish_response(resp)

    # ------------------------------------------------------------------
    # Search mentions
    # ------------------------------------------------------------------

    async def search_mentions(
        self,
        keywords: List[str],
        since: Optional[datetime] = None,
        cursor: Optional[str] = None,
        max_results: int = 50,
    ) -> SearchResult:
        """Search recent tweets matching keywords.

        Uses ``GET /2/tweets/search/recent``.
        """
        query = " OR ".join(keywords)
        params: Dict[str, Any] = {
            "query": query,
            "max_results": min(max_results, 100),
            "tweet.fields": "author_id,created_at,conversation_id,in_reply_to_user_id,text",
            "expansions": "author_id",
            "user.fields": "username,name",
        }
        if since:
            params["start_time"] = since.strftime("%Y-%m-%dT%H:%M:%SZ")
        if cursor:
            params["next_token"] = cursor

        resp = await self._client.get("/tweets/search/recent", params=params)

        if resp.status_code != 200:
            return SearchResult(
                platform=self.platform_name,
                error_message=resp.text,
                raw_response=self._safe_json(resp),
            )

        data = resp.json()
        tweets = data.get("data", [])
        # Build username lookup from includes
        users = {
            u["id"]: u
            for u in data.get("includes", {}).get("users", [])
        }

        mentions: List[MentionItem] = []
        for tw in tweets:
            author = users.get(tw.get("author_id"), {})
            mentions.append(
                MentionItem(
                    mention_id=tw["id"],
                    platform=self.platform_name,
                    author_id=tw.get("author_id"),
                    author_name=author.get("username"),
                    text=tw.get("text", ""),
                    url=f"https://x.com/i/status/{tw['id']}",
                    created_at=self._parse_dt(tw.get("created_at")),
                    parent_id=tw.get("conversation_id"),
                    metadata={"in_reply_to_user_id": tw.get("in_reply_to_user_id")},
                )
            )

        next_token = data.get("meta", {}).get("next_token")
        return SearchResult(
            platform=self.platform_name,
            mentions=mentions,
            next_cursor=next_token,
            raw_response=data,
        )

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def refresh_access_token_grant(self) -> TokenRefreshResult:
        """Refresh the OAuth 2.0 access token using the refresh token."""
        if not self.refresh_token:
            return TokenRefreshResult(
                access_token=self.access_token,
                error_message="No refresh token available",
            )

        from app.config import get_settings
        settings = get_settings()

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                OAUTH2_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": settings.x_client_id,
                },
                auth=(settings.x_client_id, settings.x_client_secret),
            )

        if resp.status_code != 200:
            return TokenRefreshResult(
                access_token=self.access_token,
                error_message=f"Token refresh failed: {resp.text}",
            )

        body = resp.json()
        new_access = body["access_token"]
        new_refresh = body.get("refresh_token", self.refresh_token)

        # Update internal state
        self.access_token = new_access
        self.refresh_token = new_refresh
        self._client.headers.update(self._auth_headers())

        return TokenRefreshResult(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=body.get("expires_in"),
        )

    async def validate_token(self) -> bool:
        """Check token validity by requesting the authenticated user."""
        resp = await self._client.get("/users/me")
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Media upload helpers
    # ------------------------------------------------------------------

    async def upload_media(self, media_bytes: bytes, media_type: str) -> Optional[str]:
        """Upload media via the v1.1 chunked upload endpoint.

        Returns the media_id_string on success, None on failure.
        """
        # INIT
        async with httpx.AsyncClient(
            base_url=UPLOAD_BASE,
            headers=self._auth_headers(),
            timeout=httpx.Timeout(60.0),
        ) as client:
            init_resp = await client.post(
                "/media/upload.json",
                data={
                    "command": "INIT",
                    "total_bytes": str(len(media_bytes)),
                    "media_type": media_type,
                },
            )
            if init_resp.status_code != 202 and init_resp.status_code != 200:
                logger.error("Media INIT failed: %s", init_resp.text)
                return None
            media_id = init_resp.json()["media_id_string"]

            # APPEND (single chunk for simplicity; production should chunk)
            append_resp = await client.post(
                "/media/upload.json",
                data={"command": "APPEND", "media_id": media_id, "segment_index": "0"},
                files={"media_data": media_bytes},
            )
            if append_resp.status_code not in (200, 202, 204):
                logger.error("Media APPEND failed: %s", append_resp.text)
                return None

            # FINALIZE
            fin_resp = await client.post(
                "/media/upload.json",
                data={"command": "FINALIZE", "media_id": media_id},
            )
            if fin_resp.status_code not in (200, 201):
                logger.error("Media FINALIZE failed: %s", fin_resp.text)
                return None

            return media_id

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _auth_headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    def _parse_publish_response(self, resp: httpx.Response) -> PublishResult:
        body = self._safe_json(resp)
        if resp.status_code == 201:
            tweet_data = body.get("data", {})
            tweet_id = tweet_data.get("id")
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=tweet_id,
                url=f"https://x.com/i/status/{tweet_id}" if tweet_id else None,
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        if resp.status_code == 429:
            return PublishResult(
                status=PublishStatus.RATE_LIMITED,
                platform=self.platform_name,
                error_message="Rate limited by X API",
                raw_response=body,
            )
        if resp.status_code == 401:
            return PublishResult(
                status=PublishStatus.TOKEN_EXPIRED,
                platform=self.platform_name,
                error_message="Access token expired or invalid",
                raw_response=body,
            )
        return PublishResult(
            status=PublishStatus.FAILED,
            platform=self.platform_name,
            error_message=body.get("detail", resp.text[:500]),
            error_code=str(resp.status_code),
            raw_response=body,
        )

    @staticmethod
    def _safe_json(resp: httpx.Response) -> Dict[str, Any]:
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text[:2000]}

    @staticmethod
    def _parse_dt(dt_str: Optional[str]) -> Optional[datetime]:
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except ValueError:
            return None

    async def close(self) -> None:
        await self._client.aclose()
