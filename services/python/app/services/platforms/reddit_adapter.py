"""
Reddit OAuth API platform adapter.

Implements subreddit posting, comment replies, and keyword search
using the Reddit JSON API with OAuth 2.0 bearer tokens.
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

OAUTH_API = "https://oauth.reddit.com"
AUTH_URL = "https://www.reddit.com/api/v1/access_token"
USER_AGENT = "SocialMediaAutomation/1.0 (by /u/automation_bot)"


class RedditAdapter(PlatformAdapter):
    """Reddit OAuth API adapter.

    ``account_id`` is the Reddit username.
    ``metadata`` may contain ``default_subreddit`` for convenience.
    """

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        self._username = account_id
        self._client = httpx.AsyncClient(
            base_url=OAUTH_API,
            headers=self._auth_headers(),
            timeout=httpx.Timeout(30.0),
        )

    @property
    def platform_name(self) -> str:
        return "reddit"

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
        """Submit a new post to a subreddit.

        ``extra`` must contain ``subreddit`` (without "r/" prefix).
        For link posts, include ``url`` in ``extra``.
        The ``text`` is used as the self-text body for text posts.
        """
        extra = extra or {}
        subreddit = extra.get("subreddit", self.metadata.get("default_subreddit", ""))
        if not subreddit:
            return PublishResult(
                status=PublishStatus.FAILED,
                platform=self.platform_name,
                error_message="No subreddit specified in extra or metadata",
            )

        title = extra.get("title", text[:300])

        payload: Dict[str, str] = {
            "sr": subreddit,
            "title": title,
            "kind": "self",
            "text": text,
            "api_type": "json",
        }

        # Link post
        if content_type == ContentType.LINK or extra.get("url"):
            payload["kind"] = "link"
            payload["url"] = extra.get("url", "")
            payload.pop("text", None)

        # Image / video post (via URL — Reddit will generate a preview)
        if media_urls and content_type in (ContentType.IMAGE, ContentType.VIDEO):
            payload["kind"] = "link"
            payload["url"] = media_urls[0]
            payload.pop("text", None)

        # Flair
        if extra.get("flair_id"):
            payload["flair_id"] = extra["flair_id"]
        if extra.get("flair_text"):
            payload["flair_text"] = extra["flair_text"]

        # NSFW / spoiler
        if extra.get("nsfw"):
            payload["nsfw"] = "true"
        if extra.get("spoiler"):
            payload["spoiler"] = "true"

        resp = await self._client.post("/api/submit", data=payload)
        return self._parse_submit_response(resp)

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to a post or comment.

        ``parent_id`` is the Reddit fullname (e.g. ``t3_xxxx`` for post,
        ``t1_xxxx`` for comment).
        """
        payload = {
            "thing_id": parent_id,
            "text": text,
            "api_type": "json",
        }
        resp = await self._client.post("/api/comment", data=payload)
        return self._parse_comment_response(resp)

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search_mentions(
        self,
        keywords: List[str],
        since: Optional[datetime] = None,
        cursor: Optional[str] = None,
        max_results: int = 50,
    ) -> SearchResult:
        """Search Reddit for posts/comments matching keywords.

        Uses ``GET /search.json`` with ``sort=new``.
        """
        query = " OR ".join(keywords)
        params: Dict[str, Any] = {
            "q": query,
            "sort": "new",
            "type": "link,comment",
            "limit": min(max_results, 100),
            "raw_json": 1,
        }
        if cursor:
            params["after"] = cursor
        if since:
            # Reddit uses epoch time for 'after' in some contexts;
            # the search API only loosely supports time filtering,
            # so we filter client-side.
            pass

        resp = await self._client.get("/search.json", params=params)

        if resp.status_code != 200:
            return SearchResult(
                platform=self.platform_name,
                error_message=resp.text[:500],
                raw_response=self._safe_json(resp),
            )

        body = self._safe_json(resp)
        listing = body.get("data", {})
        children = listing.get("children", [])

        mentions: List[MentionItem] = []
        for child in children:
            kind = child.get("kind", "")
            data = child.get("data", {})
            created_utc = data.get("created_utc")
            created_dt = datetime.utcfromtimestamp(created_utc) if created_utc else None

            # Client-side since filter
            if since and created_dt and created_dt < since:
                continue

            mention_text = data.get("selftext") or data.get("body") or data.get("title", "")
            permalink = data.get("permalink", "")

            mentions.append(
                MentionItem(
                    mention_id=data.get("name", data.get("id", "")),
                    platform=self.platform_name,
                    author_id=data.get("author_fullname"),
                    author_name=data.get("author"),
                    text=mention_text,
                    url=f"https://www.reddit.com{permalink}" if permalink else None,
                    created_at=created_dt,
                    parent_id=data.get("parent_id"),
                    metadata={
                        "subreddit": data.get("subreddit"),
                        "score": data.get("score"),
                        "kind": kind,
                    },
                )
            )

        next_cursor = listing.get("after")
        return SearchResult(
            platform=self.platform_name,
            mentions=mentions,
            next_cursor=next_cursor,
            raw_response=body,
        )

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def refresh_access_token_grant(self) -> TokenRefreshResult:
        from app.config import get_settings
        settings = get_settings()

        if not self.refresh_token:
            return TokenRefreshResult(
                access_token=self.access_token,
                error_message="No refresh token available",
            )

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                AUTH_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                },
                auth=(settings.reddit_client_id, settings.reddit_client_secret),
                headers={"User-Agent": USER_AGENT},
            )

        body = self._safe_json(resp)
        if resp.status_code == 200 and "access_token" in body:
            self.access_token = body["access_token"]
            self.refresh_token = body.get("refresh_token", self.refresh_token)
            self._client.headers.update(self._auth_headers())
            return TokenRefreshResult(
                access_token=body["access_token"],
                refresh_token=body.get("refresh_token"),
                expires_in=body.get("expires_in"),
            )
        return TokenRefreshResult(
            access_token=self.access_token,
            error_message=body.get("error", resp.text[:300]),
        )

    async def validate_token(self) -> bool:
        resp = await self._client.get("/api/v1/me")
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "User-Agent": USER_AGENT,
        }

    def _parse_submit_response(self, resp: httpx.Response) -> PublishResult:
        body = self._safe_json(resp)
        json_data = body.get("json", {})
        errors = json_data.get("errors", [])

        if resp.status_code == 200 and not errors:
            thing_data = json_data.get("data", {})
            post_id = thing_data.get("name", thing_data.get("id", ""))
            url = thing_data.get("url", "")
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=post_id,
                url=url,
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        if resp.status_code == 429:
            return PublishResult(
                status=PublishStatus.RATE_LIMITED,
                platform=self.platform_name,
                error_message="Rate limited by Reddit",
                raw_response=body,
            )
        error_msg = "; ".join(str(e) for e in errors) if errors else resp.text[:500]
        return PublishResult(
            status=PublishStatus.FAILED,
            platform=self.platform_name,
            error_message=error_msg,
            error_code=str(resp.status_code),
            raw_response=body,
        )

    def _parse_comment_response(self, resp: httpx.Response) -> PublishResult:
        body = self._safe_json(resp)
        json_data = body.get("json", {})
        errors = json_data.get("errors", [])

        if resp.status_code == 200 and not errors:
            things = json_data.get("data", {}).get("things", [])
            comment_id = things[0]["data"]["name"] if things else ""
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=comment_id,
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        error_msg = "; ".join(str(e) for e in errors) if errors else resp.text[:500]
        return PublishResult(
            status=PublishStatus.FAILED,
            platform=self.platform_name,
            error_message=error_msg,
            raw_response=body,
        )

    @staticmethod
    def _safe_json(resp: httpx.Response) -> Dict[str, Any]:
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text[:2000]}

    async def close(self) -> None:
        await self._client.aclose()
