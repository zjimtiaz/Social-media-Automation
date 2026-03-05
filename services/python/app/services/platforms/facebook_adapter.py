"""
Facebook Graph API platform adapter.

Implements post publishing, comment replies, and mention/keyword search
via the Facebook Graph API v21.0.
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

GRAPH_API = "https://graph.facebook.com/v21.0"


class FacebookAdapter(PlatformAdapter):
    """Facebook Graph API adapter.

    ``account_id`` should be the Facebook Page ID.  The ``access_token``
    should be a Page Access Token with ``pages_manage_posts``,
    ``pages_read_engagement``, and ``pages_manage_metadata`` permissions.
    """

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        self._page_id = account_id
        self._client = httpx.AsyncClient(
            base_url=GRAPH_API,
            timeout=httpx.Timeout(30.0),
        )

    @property
    def platform_name(self) -> str:
        return "facebook"

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
        """Publish a post to a Facebook Page.

        Supports text-only, link, single photo, multi-photo, and video.
        """
        extra = extra or {}

        if content_type == ContentType.VIDEO and media_urls:
            return await self._publish_video(text, media_urls[0], extra)

        if media_urls and len(media_urls) > 1:
            return await self._publish_multi_photo(text, media_urls, extra)

        if media_urls and len(media_urls) == 1:
            return await self._publish_photo(text, media_urls[0], extra)

        # Text-only (or link) post
        payload: Dict[str, Any] = {"message": text}
        if extra.get("link"):
            payload["link"] = extra["link"]
        if extra.get("scheduled_publish_time"):
            payload["scheduled_publish_time"] = extra["scheduled_publish_time"]
            payload["published"] = False

        resp = await self._client.post(
            f"/{self._page_id}/feed",
            params={"access_token": self.access_token},
            json=payload,
        )
        return self._parse_response(resp)

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to a comment or post on Facebook."""
        resp = await self._client.post(
            f"/{parent_id}/comments",
            params={"access_token": self.access_token},
            json={"message": text},
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
        """Fetch recent posts and comments mentioning keywords.

        Uses the Page's feed and filters client-side, since the public
        Graph API does not offer keyword search across all of Facebook.
        Also fetches ``/{page-id}/tagged`` for posts the page is tagged in.
        """
        mentions: List[MentionItem] = []

        # 1. Tagged posts
        tagged = await self._fetch_tagged_posts(cursor)
        mentions.extend(tagged["items"])
        next_cursor = tagged.get("next_cursor")

        # 2. Page feed posts (own + visitor posts) filtered by keywords
        feed = await self._fetch_feed_filtered(keywords, since, cursor)
        mentions.extend(feed["items"])
        if not next_cursor:
            next_cursor = feed.get("next_cursor")

        return SearchResult(
            platform=self.platform_name,
            mentions=mentions[:max_results],
            next_cursor=next_cursor,
        )

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def refresh_access_token_grant(self) -> TokenRefreshResult:
        """Exchange a short-lived token for a long-lived one via FB."""
        from app.config import get_settings
        settings = get_settings()

        resp = await self._client.get(
            "/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.facebook_app_id,
                "client_secret": settings.facebook_app_secret,
                "fb_exchange_token": self.access_token,
            },
        )
        body = self._safe_json(resp)
        if resp.status_code == 200 and "access_token" in body:
            self.access_token = body["access_token"]
            return TokenRefreshResult(
                access_token=body["access_token"],
                expires_in=body.get("expires_in"),
            )
        return TokenRefreshResult(
            access_token=self.access_token,
            error_message=body.get("error", {}).get("message", resp.text[:300]),
        )

    async def validate_token(self) -> bool:
        resp = await self._client.get(
            "/me",
            params={"access_token": self.access_token},
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Internal: photo / video publishing
    # ------------------------------------------------------------------

    async def _publish_photo(
        self, message: str, photo_url: str, extra: Dict[str, Any],
    ) -> PublishResult:
        resp = await self._client.post(
            f"/{self._page_id}/photos",
            params={"access_token": self.access_token},
            json={
                "url": photo_url,
                "message": message,
            },
        )
        return self._parse_response(resp)

    async def _publish_multi_photo(
        self, message: str, photo_urls: List[str], extra: Dict[str, Any],
    ) -> PublishResult:
        """Upload multiple photos as unpublished, then create a multi-photo post."""
        photo_ids: List[str] = []
        for url in photo_urls[:10]:
            resp = await self._client.post(
                f"/{self._page_id}/photos",
                params={"access_token": self.access_token},
                json={"url": url, "published": False},
            )
            body = self._safe_json(resp)
            if "id" in body:
                photo_ids.append(body["id"])
            else:
                logger.warning("Photo upload failed: %s", body)

        if not photo_ids:
            return PublishResult(
                status=PublishStatus.FAILED,
                platform=self.platform_name,
                error_message="All photo uploads failed",
            )

        # Create the multi-photo post
        payload: Dict[str, Any] = {"message": message}
        for i, pid in enumerate(photo_ids):
            payload[f"attached_media[{i}]"] = f'{{"media_fbid":"{pid}"}}'

        resp = await self._client.post(
            f"/{self._page_id}/feed",
            params={"access_token": self.access_token},
            data=payload,
        )
        return self._parse_response(resp)

    async def _publish_video(
        self, description: str, video_url: str, extra: Dict[str, Any],
    ) -> PublishResult:
        resp = await self._client.post(
            f"/{self._page_id}/videos",
            params={"access_token": self.access_token},
            json={
                "file_url": video_url,
                "description": description,
                "title": extra.get("title", ""),
            },
        )
        return self._parse_response(resp)

    # ------------------------------------------------------------------
    # Internal: search helpers
    # ------------------------------------------------------------------

    async def _fetch_tagged_posts(self, cursor: Optional[str]) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "fields": "id,message,created_time,from{id,name},permalink_url",
            "access_token": self.access_token,
            "limit": 25,
        }
        if cursor:
            params["after"] = cursor

        resp = await self._client.get(f"/{self._page_id}/tagged", params=params)
        body = self._safe_json(resp)
        items: List[MentionItem] = []
        for post in body.get("data", []):
            author = post.get("from", {})
            items.append(
                MentionItem(
                    mention_id=post["id"],
                    platform=self.platform_name,
                    author_id=author.get("id"),
                    author_name=author.get("name"),
                    text=post.get("message", ""),
                    url=post.get("permalink_url"),
                    created_at=self._parse_dt(post.get("created_time")),
                )
            )
        paging = body.get("paging", {}).get("cursors", {})
        return {"items": items, "next_cursor": paging.get("after")}

    async def _fetch_feed_filtered(
        self,
        keywords: List[str],
        since: Optional[datetime],
        cursor: Optional[str],
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "fields": "id,message,created_time,from{id,name},permalink_url",
            "access_token": self.access_token,
            "limit": 100,
        }
        if since:
            params["since"] = int(since.timestamp())
        if cursor:
            params["after"] = cursor

        resp = await self._client.get(f"/{self._page_id}/feed", params=params)
        body = self._safe_json(resp)
        items: List[MentionItem] = []
        kw_lower = [k.lower() for k in keywords]

        for post in body.get("data", []):
            msg = (post.get("message") or "").lower()
            if any(kw in msg for kw in kw_lower):
                author = post.get("from", {})
                items.append(
                    MentionItem(
                        mention_id=post["id"],
                        platform=self.platform_name,
                        author_id=author.get("id"),
                        author_name=author.get("name"),
                        text=post.get("message", ""),
                        url=post.get("permalink_url"),
                        created_at=self._parse_dt(post.get("created_time")),
                    )
                )
        paging = body.get("paging", {}).get("cursors", {})
        return {"items": items, "next_cursor": paging.get("after")}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_response(self, resp: httpx.Response) -> PublishResult:
        body = self._safe_json(resp)
        if resp.status_code == 200 and ("id" in body or "post_id" in body):
            post_id = body.get("id") or body.get("post_id")
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=post_id,
                url=f"https://www.facebook.com/{post_id}" if post_id else None,
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        error = body.get("error", {})
        if resp.status_code == 429 or error.get("code") in (4, 32):
            return PublishResult(
                status=PublishStatus.RATE_LIMITED,
                platform=self.platform_name,
                error_message=error.get("message", "Rate limited"),
                raw_response=body,
            )
        if resp.status_code == 401 or error.get("code") == 190:
            return PublishResult(
                status=PublishStatus.TOKEN_EXPIRED,
                platform=self.platform_name,
                error_message=error.get("message", "Token expired"),
                raw_response=body,
            )
        return PublishResult(
            status=PublishStatus.FAILED,
            platform=self.platform_name,
            error_message=error.get("message", resp.text[:500]),
            error_code=str(error.get("code", resp.status_code)),
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
