"""
LinkedIn API platform adapter.

Implements publishing posts (text, image, article), comment replies, and
mention search via the LinkedIn Marketing & Community Management APIs.
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

API_BASE = "https://api.linkedin.com/v2"
REST_API = "https://api.linkedin.com/rest"
OAUTH_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"


class LinkedInAdapter(PlatformAdapter):
    """LinkedIn API adapter.

    ``account_id`` should be the LinkedIn URN of the person or
    organisation, e.g. ``urn:li:person:abc123`` or
    ``urn:li:organization:12345``.
    """

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        self._author_urn = account_id  # e.g. urn:li:person:xxx
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers=self._auth_headers(),
        )

    @property
    def platform_name(self) -> str:
        return "linkedin"

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
        """Publish a post to LinkedIn (text, image, article, or video)."""
        extra = extra or {}

        if content_type == ContentType.IMAGE and media_urls:
            return await self._publish_image_post(text, media_urls[0], extra)

        if content_type == ContentType.VIDEO and media_urls:
            return await self._publish_video_post(text, media_urls[0], extra)

        if content_type == ContentType.LINK or extra.get("link"):
            return await self._publish_article_post(
                text, extra.get("link", ""), extra
            )

        # Text-only post
        payload = {
            "author": self._author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }

        resp = await self._client.post(
            f"{API_BASE}/ugcPosts",
            json=payload,
        )
        return self._parse_response(resp)

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to a LinkedIn post or comment.

        Uses the Social Actions API: POST /socialActions/{activity}/comments
        """
        # parent_id should be the activity URN (e.g. urn:li:activity:xxx)
        payload = {
            "actor": self._author_urn,
            "message": {"text": text},
        }
        resp = await self._client.post(
            f"{API_BASE}/socialActions/{parent_id}/comments",
            json=payload,
        )
        return self._parse_response(resp)

    # ------------------------------------------------------------------
    # Search / Mentions
    # ------------------------------------------------------------------

    async def search_mentions(
        self,
        keywords: List[str],
        since: Optional[datetime] = None,
        cursor: Optional[str] = None,
        max_results: int = 50,
    ) -> SearchResult:
        """Search for mentions of keywords.

        LinkedIn does not offer a full-text public search API for UGC.
        This implementation fetches the organisation's social actions
        (comments on the organisation's posts) and filters by keyword.
        For a broader approach, the Community Management API can be used.
        """
        mentions: List[MentionItem] = []

        # Fetch comments on own posts via Social Actions
        params: Dict[str, Any] = {
            "q": "organizationalEntity",
            "organizationalEntity": self._author_urn,
            "count": max_results,
        }
        if cursor:
            params["start"] = int(cursor)

        resp = await self._client.get(
            f"{REST_API}/socialMetadata",
            params=params,
            headers={
                **self._auth_headers(),
                "LinkedIn-Version": "202401",
                "X-Restli-Protocol-Version": "2.0.0",
            },
        )

        if resp.status_code != 200:
            return SearchResult(
                platform=self.platform_name,
                error_message=resp.text[:500],
                raw_response=self._safe_json(resp),
            )

        body = self._safe_json(resp)
        kw_lower = [k.lower() for k in keywords]

        for element in body.get("elements", []):
            comment_text = element.get("message", {}).get("text", "")
            if any(kw in comment_text.lower() for kw in kw_lower):
                mentions.append(
                    MentionItem(
                        mention_id=element.get("$URN", element.get("id", "")),
                        platform=self.platform_name,
                        author_id=element.get("actor"),
                        text=comment_text,
                        created_at=self._epoch_to_dt(element.get("created", {}).get("time")),
                        metadata={"parent_urn": element.get("parentComment")},
                    )
                )

        new_cursor = str(int(cursor or 0) + max_results)
        return SearchResult(
            platform=self.platform_name,
            mentions=mentions,
            next_cursor=new_cursor if mentions else None,
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
                OAUTH_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                },
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
            error_message=body.get("error_description", resp.text[:300]),
        )

    async def validate_token(self) -> bool:
        resp = await self._client.get(
            f"{API_BASE}/me",
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Internal: image / video / article publishing
    # ------------------------------------------------------------------

    async def _publish_image_post(
        self, text: str, image_url: str, extra: Dict[str, Any],
    ) -> PublishResult:
        """Publish a post with an image.

        Steps: register upload -> upload image -> create post.
        For simplicity, this uses the image URL in the share media.
        """
        payload = {
            "author": self._author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "IMAGE",
                    "media": [
                        {
                            "status": "READY",
                            "originalUrl": image_url,
                            "description": {"text": extra.get("alt_text", "")},
                            "title": {"text": extra.get("title", "")},
                        }
                    ],
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }
        resp = await self._client.post(f"{API_BASE}/ugcPosts", json=payload)
        return self._parse_response(resp)

    async def _publish_video_post(
        self, text: str, video_url: str, extra: Dict[str, Any],
    ) -> PublishResult:
        """Publish a post with a video URL."""
        payload = {
            "author": self._author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "VIDEO",
                    "media": [
                        {
                            "status": "READY",
                            "originalUrl": video_url,
                            "title": {"text": extra.get("title", "")},
                        }
                    ],
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }
        resp = await self._client.post(f"{API_BASE}/ugcPosts", json=payload)
        return self._parse_response(resp)

    async def _publish_article_post(
        self, text: str, link: str, extra: Dict[str, Any],
    ) -> PublishResult:
        """Publish a post with an article link."""
        payload = {
            "author": self._author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "ARTICLE",
                    "media": [
                        {
                            "status": "READY",
                            "originalUrl": link,
                            "title": {"text": extra.get("title", "")},
                            "description": {"text": extra.get("description", "")},
                        }
                    ],
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }
        resp = await self._client.post(f"{API_BASE}/ugcPosts", json=payload)
        return self._parse_response(resp)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

    def _parse_response(self, resp: httpx.Response) -> PublishResult:
        body = self._safe_json(resp)
        if resp.status_code in (200, 201):
            post_id = body.get("id") or resp.headers.get("x-restli-id", "")
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=post_id,
                url=f"https://www.linkedin.com/feed/update/{post_id}" if post_id else None,
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        if resp.status_code == 429:
            return PublishResult(
                status=PublishStatus.RATE_LIMITED,
                platform=self.platform_name,
                error_message="Rate limited by LinkedIn API",
                raw_response=body,
            )
        if resp.status_code == 401:
            return PublishResult(
                status=PublishStatus.TOKEN_EXPIRED,
                platform=self.platform_name,
                error_message="Access token expired",
                raw_response=body,
            )
        return PublishResult(
            status=PublishStatus.FAILED,
            platform=self.platform_name,
            error_message=body.get("message", resp.text[:500]),
            error_code=str(body.get("status", resp.status_code)),
            raw_response=body,
        )

    @staticmethod
    def _safe_json(resp: httpx.Response) -> Dict[str, Any]:
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text[:2000]}

    @staticmethod
    def _epoch_to_dt(epoch_ms: Optional[int]) -> Optional[datetime]:
        if not epoch_ms:
            return None
        try:
            return datetime.utcfromtimestamp(epoch_ms / 1000)
        except (ValueError, OSError):
            return None

    async def close(self) -> None:
        await self._client.aclose()
