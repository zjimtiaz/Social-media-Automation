"""
Instagram Graph API platform adapter.

Implements the two-step container-based publishing flow, comment replies,
and hashtag/mention search via the Instagram Graph API.
"""

from __future__ import annotations

import asyncio
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


class InstagramAdapter(PlatformAdapter):
    """Instagram Graph API adapter (via Facebook Graph API)."""

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        # account_id = Instagram Business Account ID
        self._ig_user_id = account_id
        self._client = httpx.AsyncClient(
            base_url=GRAPH_API,
            timeout=httpx.Timeout(60.0),
        )

    @property
    def platform_name(self) -> str:
        return "instagram"

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
        """Publish to Instagram (requires at least one image or video).

        Instagram does not support text-only posts, so ``media_urls``
        must contain at least one URL.

        For a carousel, pass multiple URLs and set
        ``content_type=ContentType.CAROUSEL``.
        """
        extra = extra or {}
        if not media_urls:
            return PublishResult(
                status=PublishStatus.FAILED,
                platform=self.platform_name,
                error_message="Instagram requires at least one media URL.",
            )

        if content_type == ContentType.CAROUSEL and len(media_urls) > 1:
            return await self._publish_carousel(text, media_urls, extra)

        if content_type in (ContentType.REEL, ContentType.VIDEO):
            return await self._publish_reel(text, media_urls[0], extra)

        # Default: single image post
        return await self._publish_single_image(text, media_urls[0], extra)

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to a comment on Instagram."""
        resp = await self._client.post(
            f"/{parent_id}/replies",
            params={"access_token": self.access_token},
            json={"message": text},
        )
        body = self._safe_json(resp)
        if resp.status_code == 200 and "id" in body:
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=body["id"],
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        return self._error_result(resp, body)

    # ------------------------------------------------------------------
    # Mention search
    # ------------------------------------------------------------------

    async def search_mentions(
        self,
        keywords: List[str],
        since: Optional[datetime] = None,
        cursor: Optional[str] = None,
        max_results: int = 50,
    ) -> SearchResult:
        """Search for mentions via Instagram mentions API and hashtag search.

        The Graph API exposes ``/{ig-user-id}/tags`` for posts the user
        is tagged in, and ``/{ig-hashtag-id}/recent_media`` for hashtag
        search.
        """
        mentions: List[MentionItem] = []

        # 1. Tagged posts (mentions)
        tagged = await self._fetch_tagged_media(cursor)
        mentions.extend(tagged.get("items", []))
        next_cursor = tagged.get("next_cursor")

        # 2. Hashtag search for each keyword (limited by IG: 30 per 7 days)
        for kw in keywords[:2]:  # limit to avoid rate-limit
            hashtag_mentions = await self._search_hashtag(kw)
            mentions.extend(hashtag_mentions)

        # Apply since filter client-side
        if since:
            mentions = [
                m for m in mentions
                if m.created_at and m.created_at >= since
            ]

        return SearchResult(
            platform=self.platform_name,
            mentions=mentions[:max_results],
            next_cursor=next_cursor,
        )

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def refresh_access_token_grant(self) -> TokenRefreshResult:
        """Exchange a long-lived token for a new long-lived token.

        Instagram (via Facebook) long-lived tokens can be refreshed
        once they are at least 24 hours old and not yet expired.
        """
        resp = await self._client.get(
            "/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": self.metadata.get("app_id", ""),
                "client_secret": self.metadata.get("app_secret", ""),
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
            f"/{self._ig_user_id}",
            params={
                "fields": "id,username",
                "access_token": self.access_token,
            },
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Publishing internals
    # ------------------------------------------------------------------

    async def _publish_single_image(
        self, caption: str, image_url: str, extra: Dict[str, Any],
    ) -> PublishResult:
        """Two-step single image publish: create container -> publish."""
        # Step 1: create media container
        container_resp = await self._client.post(
            f"/{self._ig_user_id}/media",
            params={"access_token": self.access_token},
            json={
                "image_url": image_url,
                "caption": caption,
                "location_id": extra.get("location_id"),
            },
        )
        container = self._safe_json(container_resp)
        if "id" not in container:
            return self._error_result(container_resp, container)

        creation_id = container["id"]

        # Step 2: wait for container to be ready and publish
        await self._wait_for_container(creation_id)

        publish_resp = await self._client.post(
            f"/{self._ig_user_id}/media_publish",
            params={"access_token": self.access_token},
            json={"creation_id": creation_id},
        )
        body = self._safe_json(publish_resp)
        if publish_resp.status_code == 200 and "id" in body:
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=body["id"],
                url=f"https://www.instagram.com/p/{body['id']}/",
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        return self._error_result(publish_resp, body)

    async def _publish_reel(
        self, caption: str, video_url: str, extra: Dict[str, Any],
    ) -> PublishResult:
        """Publish a Reel (video) via container flow."""
        container_resp = await self._client.post(
            f"/{self._ig_user_id}/media",
            params={"access_token": self.access_token},
            json={
                "video_url": video_url,
                "caption": caption,
                "media_type": "REELS",
                "share_to_feed": extra.get("share_to_feed", True),
                "cover_url": extra.get("cover_url"),
                "thumb_offset": extra.get("thumb_offset", 0),
            },
        )
        container = self._safe_json(container_resp)
        if "id" not in container:
            return self._error_result(container_resp, container)

        creation_id = container["id"]
        await self._wait_for_container(creation_id, poll_interval=5.0, timeout=300.0)

        publish_resp = await self._client.post(
            f"/{self._ig_user_id}/media_publish",
            params={"access_token": self.access_token},
            json={"creation_id": creation_id},
        )
        body = self._safe_json(publish_resp)
        if publish_resp.status_code == 200 and "id" in body:
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=body["id"],
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        return self._error_result(publish_resp, body)

    async def _publish_carousel(
        self, caption: str, media_urls: List[str], extra: Dict[str, Any],
    ) -> PublishResult:
        """Publish a carousel (up to 10 images/videos)."""
        children_ids: List[str] = []
        for url in media_urls[:10]:
            is_video = any(url.lower().endswith(ext) for ext in (".mp4", ".mov"))
            child_payload: Dict[str, Any] = {
                "is_carousel_item": True,
            }
            if is_video:
                child_payload["video_url"] = url
                child_payload["media_type"] = "VIDEO"
            else:
                child_payload["image_url"] = url

            resp = await self._client.post(
                f"/{self._ig_user_id}/media",
                params={"access_token": self.access_token},
                json=child_payload,
            )
            body = self._safe_json(resp)
            if "id" not in body:
                return self._error_result(resp, body)
            children_ids.append(body["id"])

        # Create carousel container
        carousel_resp = await self._client.post(
            f"/{self._ig_user_id}/media",
            params={"access_token": self.access_token},
            json={
                "media_type": "CAROUSEL",
                "caption": caption,
                "children": children_ids,
            },
        )
        carousel = self._safe_json(carousel_resp)
        if "id" not in carousel:
            return self._error_result(carousel_resp, carousel)

        creation_id = carousel["id"]
        await self._wait_for_container(creation_id)

        publish_resp = await self._client.post(
            f"/{self._ig_user_id}/media_publish",
            params={"access_token": self.access_token},
            json={"creation_id": creation_id},
        )
        body = self._safe_json(publish_resp)
        if publish_resp.status_code == 200 and "id" in body:
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=body["id"],
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        return self._error_result(publish_resp, body)

    async def _wait_for_container(
        self,
        container_id: str,
        poll_interval: float = 2.0,
        timeout: float = 120.0,
    ) -> None:
        """Poll until an IG media container is FINISHED (ready to publish)."""
        elapsed = 0.0
        while elapsed < timeout:
            resp = await self._client.get(
                f"/{container_id}",
                params={
                    "fields": "status_code",
                    "access_token": self.access_token,
                },
            )
            body = self._safe_json(resp)
            status = body.get("status_code", "")
            if status == "FINISHED":
                return
            if status == "ERROR":
                logger.error("IG container error: %s", body)
                return
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
        logger.warning("IG container %s timed out after %.0fs", container_id, timeout)

    # ------------------------------------------------------------------
    # Search internals
    # ------------------------------------------------------------------

    async def _fetch_tagged_media(self, cursor: Optional[str]) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "fields": "id,caption,timestamp,username,media_url,permalink",
            "access_token": self.access_token,
        }
        if cursor:
            params["after"] = cursor

        resp = await self._client.get(f"/{self._ig_user_id}/tags", params=params)
        body = self._safe_json(resp)
        items: List[MentionItem] = []
        for m in body.get("data", []):
            items.append(
                MentionItem(
                    mention_id=m["id"],
                    platform=self.platform_name,
                    author_name=m.get("username"),
                    text=m.get("caption", ""),
                    url=m.get("permalink"),
                    created_at=self._parse_dt(m.get("timestamp")),
                )
            )
        paging = body.get("paging", {}).get("cursors", {})
        return {"items": items, "next_cursor": paging.get("after")}

    async def _search_hashtag(self, keyword: str) -> List[MentionItem]:
        """Search by hashtag: resolve hashtag ID, then get recent media."""
        # Resolve hashtag ID
        resp = await self._client.get(
            "/ig_hashtag_search",
            params={
                "user_id": self._ig_user_id,
                "q": keyword.lstrip("#"),
                "access_token": self.access_token,
            },
        )
        body = self._safe_json(resp)
        hashtag_data = body.get("data", [])
        if not hashtag_data:
            return []

        hashtag_id = hashtag_data[0]["id"]

        # Recent media for hashtag
        media_resp = await self._client.get(
            f"/{hashtag_id}/recent_media",
            params={
                "user_id": self._ig_user_id,
                "fields": "id,caption,timestamp,permalink",
                "access_token": self.access_token,
            },
        )
        media_body = self._safe_json(media_resp)
        items: List[MentionItem] = []
        for m in media_body.get("data", []):
            items.append(
                MentionItem(
                    mention_id=m["id"],
                    platform=self.platform_name,
                    text=m.get("caption", ""),
                    url=m.get("permalink"),
                    created_at=self._parse_dt(m.get("timestamp")),
                    metadata={"hashtag": keyword},
                )
            )
        return items

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _error_result(self, resp: httpx.Response, body: Dict[str, Any]) -> PublishResult:
        error = body.get("error", {})
        if resp.status_code == 429 or error.get("code") == 4:
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
