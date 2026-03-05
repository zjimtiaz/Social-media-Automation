"""
YouTube Data API v3 platform adapter.

Implements video uploading (via resumable upload), comment posting,
comment search, and OAuth token refresh.
"""

from __future__ import annotations

import json
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

API_BASE = "https://www.googleapis.com/youtube/v3"
UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3"
OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"


class YouTubeAdapter(PlatformAdapter):
    """YouTube Data API v3 adapter.

    ``account_id`` is the YouTube channel ID.
    """

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        self._channel_id = account_id
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0),
            headers=self._auth_headers(),
        )

    @property
    def platform_name(self) -> str:
        return "youtube"

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
        """Publish content to YouTube.

        For video uploads, ``extra`` should contain:
          - ``title``: video title
          - ``description``: video description (or use ``text``)
          - ``tags``: list of tags
          - ``privacy_status``: "public" | "private" | "unlisted"
          - ``category_id``: YouTube category ID (default "22" = People & Blogs)
          - ``video_bytes``: raw video bytes, OR
          - ``video_file_path``: path to a local video file

        For community posts (text only), posts to the Community tab.
        """
        extra = extra or {}

        if content_type == ContentType.VIDEO:
            return await self._upload_video(text, extra)

        # Community post (text / image)
        # Note: Community posts are not available in the Data API v3.
        # They can only be done via the YouTube Studio UI or
        # third-party integrations. We return a draft status.
        return PublishResult(
            status=PublishStatus.PENDING,
            platform=self.platform_name,
            error_message=(
                "YouTube community posts are not supported via the Data API v3. "
                "Use YouTube Studio for community posts."
            ),
        )

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to a YouTube comment.

        ``parent_id`` is the comment ID (for top-level comment replies)
        or the parent comment ID.
        """
        payload = {
            "snippet": {
                "parentId": parent_id,
                "textOriginal": text,
            }
        }
        resp = await self._client.post(
            f"{API_BASE}/comments",
            params={"part": "snippet"},
            json=payload,
        )
        return self._parse_response(resp)

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
        """Search YouTube comments for keyword mentions.

        Strategy:
        1. Search for videos matching keywords.
        2. Fetch comment threads from those videos.
        3. Filter comments that contain the keywords.

        Alternatively, if ``self._channel_id`` is set, fetches comments
        on the channel's own videos.
        """
        mentions: List[MentionItem] = []

        # Option A: search comment threads on own channel videos
        if self._channel_id:
            channel_mentions = await self._search_channel_comments(
                keywords, since, cursor, max_results,
            )
            mentions.extend(channel_mentions["items"])
            next_cursor = channel_mentions.get("next_cursor")
        else:
            # Option B: search public videos then scan their comments
            video_ids = await self._search_videos(keywords, max_results=5)
            for vid_id in video_ids:
                vid_mentions = await self._get_video_comments(vid_id, keywords)
                mentions.extend(vid_mentions)
            next_cursor = None

        # Apply since filter
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
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                },
            )

        body = self._safe_json(resp)
        if resp.status_code == 200 and "access_token" in body:
            self.access_token = body["access_token"]
            self._client.headers.update(self._auth_headers())
            return TokenRefreshResult(
                access_token=body["access_token"],
                refresh_token=body.get("refresh_token", self.refresh_token),
                expires_in=body.get("expires_in"),
            )
        return TokenRefreshResult(
            access_token=self.access_token,
            error_message=body.get("error_description", resp.text[:300]),
        )

    async def validate_token(self) -> bool:
        resp = await self._client.get(
            f"{API_BASE}/channels",
            params={"part": "id", "mine": "true"},
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Video upload
    # ------------------------------------------------------------------

    async def _upload_video(
        self, description: str, extra: Dict[str, Any],
    ) -> PublishResult:
        """Upload a video using the resumable upload protocol.

        Requires either ``video_bytes`` or ``video_file_path`` in extra.
        """
        title = extra.get("title", "Untitled")
        desc = extra.get("description", description)
        tags = extra.get("tags", [])
        privacy = extra.get("privacy_status", "private")
        category_id = extra.get("category_id", "22")

        video_metadata = {
            "snippet": {
                "title": title,
                "description": desc,
                "tags": tags,
                "categoryId": category_id,
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
            },
        }

        # Step 1: initiate resumable upload session
        init_resp = await self._client.post(
            f"{UPLOAD_BASE}/videos",
            params={
                "uploadType": "resumable",
                "part": "snippet,status",
            },
            json=video_metadata,
            headers={
                **self._auth_headers(),
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": "video/*",
            },
        )

        if init_resp.status_code not in (200, 308):
            return self._parse_response(init_resp)

        upload_url = init_resp.headers.get("Location")
        if not upload_url:
            return PublishResult(
                status=PublishStatus.FAILED,
                platform=self.platform_name,
                error_message="No upload URL returned in resumable session",
            )

        # Step 2: upload the video bytes
        video_bytes: Optional[bytes] = extra.get("video_bytes")
        if not video_bytes and extra.get("video_file_path"):
            with open(extra["video_file_path"], "rb") as f:
                video_bytes = f.read()

        if not video_bytes:
            return PublishResult(
                status=PublishStatus.FAILED,
                platform=self.platform_name,
                error_message="No video_bytes or video_file_path provided",
            )

        upload_resp = await self._client.put(
            upload_url,
            content=video_bytes,
            headers={
                "Content-Type": "video/*",
                "Content-Length": str(len(video_bytes)),
            },
        )
        return self._parse_response(upload_resp)

    # ------------------------------------------------------------------
    # Comment search helpers
    # ------------------------------------------------------------------

    async def _search_videos(
        self, keywords: List[str], max_results: int = 5,
    ) -> List[str]:
        query = " ".join(keywords)
        resp = await self._client.get(
            f"{API_BASE}/search",
            params={
                "part": "id",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "order": "date",
            },
        )
        body = self._safe_json(resp)
        return [
            item["id"]["videoId"]
            for item in body.get("items", [])
            if "videoId" in item.get("id", {})
        ]

    async def _get_video_comments(
        self, video_id: str, keywords: List[str],
    ) -> List[MentionItem]:
        resp = await self._client.get(
            f"{API_BASE}/commentThreads",
            params={
                "part": "snippet",
                "videoId": video_id,
                "maxResults": 100,
                "order": "time",
                "textFormat": "plainText",
            },
        )
        body = self._safe_json(resp)
        kw_lower = [k.lower() for k in keywords]
        mentions: List[MentionItem] = []

        for item in body.get("items", []):
            snippet = item.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
            text = snippet.get("textDisplay", "")
            if any(kw in text.lower() for kw in kw_lower):
                mentions.append(
                    MentionItem(
                        mention_id=item["id"],
                        platform=self.platform_name,
                        author_id=snippet.get("authorChannelId", {}).get("value"),
                        author_name=snippet.get("authorDisplayName"),
                        text=text,
                        url=f"https://www.youtube.com/watch?v={video_id}&lc={item['id']}",
                        created_at=self._parse_dt(snippet.get("publishedAt")),
                        metadata={"video_id": video_id, "like_count": snippet.get("likeCount", 0)},
                    )
                )
        return mentions

    async def _search_channel_comments(
        self,
        keywords: List[str],
        since: Optional[datetime],
        cursor: Optional[str],
        max_results: int,
    ) -> Dict[str, Any]:
        """Fetch comment threads on the channel's videos and filter by keyword."""
        params: Dict[str, Any] = {
            "part": "snippet",
            "allThreadsRelatedToChannelId": self._channel_id,
            "maxResults": min(max_results, 100),
            "order": "time",
            "textFormat": "plainText",
        }
        if cursor:
            params["pageToken"] = cursor

        resp = await self._client.get(f"{API_BASE}/commentThreads", params=params)
        body = self._safe_json(resp)

        kw_lower = [k.lower() for k in keywords]
        mentions: List[MentionItem] = []

        for item in body.get("items", []):
            snippet = item.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
            text = snippet.get("textDisplay", "")
            if not keywords or any(kw in text.lower() for kw in kw_lower):
                video_id = snippet.get("videoId", "")
                mentions.append(
                    MentionItem(
                        mention_id=item["id"],
                        platform=self.platform_name,
                        author_id=snippet.get("authorChannelId", {}).get("value"),
                        author_name=snippet.get("authorDisplayName"),
                        text=text,
                        url=f"https://www.youtube.com/watch?v={video_id}&lc={item['id']}",
                        created_at=self._parse_dt(snippet.get("publishedAt")),
                        metadata={"video_id": video_id},
                    )
                )

        next_page = body.get("nextPageToken")
        return {"items": mentions, "next_cursor": next_page}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _auth_headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    def _parse_response(self, resp: httpx.Response) -> PublishResult:
        body = self._safe_json(resp)
        if resp.status_code in (200, 201):
            item_id = body.get("id", "")
            kind = body.get("kind", "")
            url = None
            if "video" in kind.lower() or "snippet" in body:
                url = f"https://www.youtube.com/watch?v={item_id}"
            return PublishResult(
                status=PublishStatus.SUCCESS,
                platform=self.platform_name,
                platform_post_id=item_id,
                url=url,
                raw_response=body,
                published_at=datetime.utcnow(),
            )
        if resp.status_code == 429 or resp.status_code == 403:
            error = body.get("error", {})
            return PublishResult(
                status=PublishStatus.RATE_LIMITED,
                platform=self.platform_name,
                error_message=error.get("message", "Quota exceeded or rate limited"),
                raw_response=body,
            )
        if resp.status_code == 401:
            return PublishResult(
                status=PublishStatus.TOKEN_EXPIRED,
                platform=self.platform_name,
                error_message="Access token expired",
                raw_response=body,
            )
        error = body.get("error", {})
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
