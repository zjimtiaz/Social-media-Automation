"""
Quora platform adapter (draft-only).

Quora does not provide an official public API for posting content.
This adapter operates in **draft-only** mode: it formats and stores
content ready for manual posting via the Quora web interface or
browser extension, and provides basic web-scraping-based mention search.

If Quora releases an official API in the future, this adapter can be
upgraded to use it.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

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


class QuoraAdapter(PlatformAdapter):
    """Quora adapter (draft-only -- no official API).

    Publishes always return ``PENDING`` status indicating the content
    has been prepared as a draft but requires manual posting.
    """

    def __init__(
        self,
        access_token: str = "",
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(access_token, refresh_token, account_id, metadata)
        self._username = account_id or metadata.get("username", "") if metadata else ""

    @property
    def platform_name(self) -> str:
        return "quora"

    # ------------------------------------------------------------------
    # Publishing (draft-only)
    # ------------------------------------------------------------------

    async def publish_post(
        self,
        text: str,
        media_urls: Optional[List[str]] = None,
        content_type: ContentType = ContentType.TEXT,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Prepare a Quora answer / post as a draft.

        Since Quora has no public posting API, this returns the
        formatted content with a ``PENDING`` status so the user can
        copy-paste or use a browser automation tool to publish.

        ``extra`` may contain:
          - ``question_url``: URL of the Quora question to answer
          - ``question_text``: the question being answered
          - ``space``: Quora Space name to post to
        """
        extra = extra or {}
        question_url = extra.get("question_url", "")
        question_text = extra.get("question_text", "")

        # Format the draft
        draft: Dict[str, Any] = {
            "platform": self.platform_name,
            "content_type": "answer" if question_url else "post",
            "text": text,
            "question_url": question_url,
            "question_text": question_text,
            "media_urls": media_urls or [],
            "space": extra.get("space"),
            "created_at": datetime.utcnow().isoformat(),
        }

        logger.info(
            "Quora draft created  question=%s  text_len=%d",
            question_url or "(post)",
            len(text),
        )

        return PublishResult(
            status=PublishStatus.PENDING,
            platform=self.platform_name,
            platform_post_id=None,
            url=question_url or None,
            error_message=(
                "Quora does not provide a public API. Content has been "
                "saved as a draft for manual posting."
            ),
            raw_response=draft,
            published_at=None,
        )

    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Prepare a reply/comment as a draft."""
        draft: Dict[str, Any] = {
            "platform": self.platform_name,
            "content_type": "comment",
            "parent_id": parent_id,
            "text": text,
            "created_at": datetime.utcnow().isoformat(),
        }

        logger.info("Quora reply draft  parent=%s  text_len=%d", parent_id, len(text))

        return PublishResult(
            status=PublishStatus.PENDING,
            platform=self.platform_name,
            platform_post_id=None,
            error_message=(
                "Quora does not provide a public API. Reply has been "
                "saved as a draft for manual posting."
            ),
            raw_response=draft,
        )

    # ------------------------------------------------------------------
    # Search (limited)
    # ------------------------------------------------------------------

    async def search_mentions(
        self,
        keywords: List[str],
        since: Optional[datetime] = None,
        cursor: Optional[str] = None,
        max_results: int = 50,
    ) -> SearchResult:
        """Search Quora for mentions of keywords.

        Since there is no official API, this uses Quora's public search
        URL and parses the results. In production, this could be backed
        by a headless browser or third-party Quora scraping service.

        For now, returns an empty result set with a note.
        """
        import httpx

        mentions: List[MentionItem] = []

        # Attempt a lightweight search via Quora's public search endpoint
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0),
                follow_redirects=True,
            ) as client:
                for keyword in keywords[:3]:
                    search_url = f"https://www.quora.com/search?q={keyword}"
                    resp = await client.get(
                        search_url,
                        headers={
                            "User-Agent": (
                                "Mozilla/5.0 (compatible; SocialMediaBot/1.0)"
                            ),
                            "Accept": "text/html",
                        },
                    )
                    # Quora's search results are rendered client-side (React),
                    # so a simple HTTP GET won't yield structured data.
                    # We log this limitation and return empty results.
                    if resp.status_code == 200:
                        logger.debug(
                            "Quora search page fetched for '%s' (%d bytes)",
                            keyword,
                            len(resp.text),
                        )
                    else:
                        logger.warning(
                            "Quora search failed for '%s': %d",
                            keyword,
                            resp.status_code,
                        )
        except Exception as exc:
            logger.warning("Quora search error: %s", exc)

        return SearchResult(
            platform=self.platform_name,
            mentions=mentions,
            next_cursor=None,
            error_message=(
                "Quora does not offer a public search API. For production "
                "use, integrate a headless browser or third-party service."
            ),
        )

    # ------------------------------------------------------------------
    # Token management (no-op for Quora)
    # ------------------------------------------------------------------

    async def refresh_access_token_grant(self) -> TokenRefreshResult:
        return TokenRefreshResult(
            access_token="",
            error_message="Quora does not use OAuth tokens.",
        )

    async def validate_token(self) -> bool:
        # No token to validate
        return True

    async def close(self) -> None:
        pass
