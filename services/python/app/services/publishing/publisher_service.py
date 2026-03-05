"""
Publisher service.

Orchestrates content publishing across social-media platforms. Handles
credential resolution, token refresh, media attachment, platform adapter
selection, and both immediate and scheduled publishing.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.platforms.base import (
    ContentType,
    PlatformAdapter,
    PublishResult,
    PublishStatus,
)
from app.services.platforms.factory import get_adapter
from app.services.publishing.formatter_service import FormatterService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration / result types
# ---------------------------------------------------------------------------

@dataclass
class PublishRequest:
    """A single publish request."""

    content_id: str
    platform: str
    text: str
    access_token: str
    refresh_token: Optional[str] = None
    account_id: Optional[str] = None
    adapter_metadata: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    content_type: str = "text"                    # text | image | video | carousel | reel | link
    schedule_at: Optional[datetime] = None
    platform_extra: Optional[Dict[str, Any]] = None  # platform-specific fields


@dataclass
class PublishOutcome:
    """Outcome of a single publish attempt."""

    content_id: str
    platform: str
    status: str                    # success | failed | pending | rate_limited | token_expired | scheduled
    platform_post_id: Optional[str] = None
    post_url: Optional[str] = None
    error: Optional[str] = None
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchPublishOutcome:
    """Outcome of a batch publish operation."""

    total: int = 0
    succeeded: int = 0
    failed: int = 0
    scheduled: int = 0
    results: List[PublishOutcome] = field(default_factory=list)
    completed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class PublisherService:
    """Coordinates content publishing across all supported platforms."""

    def __init__(self) -> None:
        self._formatter = FormatterService()

    # ------------------------------------------------------------------
    # Single publish
    # ------------------------------------------------------------------

    async def publish(self, request: PublishRequest) -> PublishOutcome:
        """Publish a single content item to a platform.

        Steps:
        1. Format the content for the target platform.
        2. Instantiate the platform adapter.
        3. Validate / refresh the token if needed.
        4. Publish via the adapter.
        5. Return the outcome.
        """
        adapter: Optional[PlatformAdapter] = None
        try:
            # 1. Format
            formatted_text = self._formatter.format_text(
                text=request.text,
                platform=request.platform,
            )

            # 2. Resolve content type
            ct = self._resolve_content_type(request.content_type)

            # 3. Instantiate adapter
            adapter = get_adapter(
                platform=request.platform,
                access_token=request.access_token,
                refresh_token=request.refresh_token,
                account_id=request.account_id,
                metadata=request.adapter_metadata,
            )

            # 4. Validate token, refresh if expired
            is_valid = await adapter.validate_token()
            if not is_valid and request.refresh_token:
                token_result = await adapter.refresh_access_token_grant()
                if token_result.error_message:
                    return PublishOutcome(
                        content_id=request.content_id,
                        platform=request.platform,
                        status="token_expired",
                        error=f"Token refresh failed: {token_result.error_message}",
                    )
                # Update adapter's token is handled internally

            # 5. Handle scheduling (store for later, don't publish now)
            if request.schedule_at:
                # Pass scheduling info to the adapter's extra params
                extra = request.platform_extra or {}
                extra["scheduled_publish_time"] = int(
                    request.schedule_at.timestamp()
                )
                result: PublishResult = await adapter.publish_post(
                    text=formatted_text,
                    media_urls=request.media_urls,
                    content_type=ct,
                    extra=extra,
                )
                return self._to_outcome(request, result, scheduled=True)

            # 6. Publish immediately
            result = await adapter.publish_post(
                text=formatted_text,
                media_urls=request.media_urls,
                content_type=ct,
                extra=request.platform_extra,
            )
            return self._to_outcome(request, result)

        except Exception as exc:
            logger.exception(
                "Publish error  content=%s  platform=%s",
                request.content_id,
                request.platform,
            )
            return PublishOutcome(
                content_id=request.content_id,
                platform=request.platform,
                status="failed",
                error=str(exc),
            )
        finally:
            if adapter:
                await adapter.close()

    # ------------------------------------------------------------------
    # Batch publish
    # ------------------------------------------------------------------

    async def publish_batch(
        self,
        requests: List[PublishRequest],
        concurrency: int = 3,
        stop_on_first_error: bool = False,
    ) -> BatchPublishOutcome:
        """Publish multiple content items, optionally in parallel.

        Parameters
        ----------
        requests:
            List of publish requests.
        concurrency:
            Maximum number of concurrent publish operations.
        stop_on_first_error:
            If True, abort remaining items after the first failure.
        """
        results: List[PublishOutcome] = []
        semaphore = asyncio.Semaphore(concurrency)

        async def _publish_with_semaphore(req: PublishRequest) -> PublishOutcome:
            async with semaphore:
                return await self.publish(req)

        if stop_on_first_error:
            # Sequential execution with early stop
            for req in requests:
                outcome = await self.publish(req)
                results.append(outcome)
                if outcome.status == "failed":
                    break
        else:
            # Concurrent execution
            tasks = [_publish_with_semaphore(r) for r in requests]
            results = await asyncio.gather(*tasks)
            results = list(results)

        succeeded = sum(1 for r in results if r.status == "success")
        failed = sum(1 for r in results if r.status == "failed")
        scheduled = sum(1 for r in results if r.status == "scheduled")

        return BatchPublishOutcome(
            total=len(requests),
            succeeded=succeeded,
            failed=failed,
            scheduled=scheduled,
            results=results,
        )

    # ------------------------------------------------------------------
    # Cross-post (same content to multiple platforms)
    # ------------------------------------------------------------------

    async def cross_post(
        self,
        text: str,
        platforms: List[Dict[str, Any]],
        content_id: str = "",
        media_urls: Optional[List[str]] = None,
        content_type: str = "text",
    ) -> BatchPublishOutcome:
        """Publish the same content to multiple platforms.

        Parameters
        ----------
        text:
            The raw content text (will be formatted per platform).
        platforms:
            List of dicts, each with ``platform``, ``access_token``,
            and optionally ``refresh_token``, ``account_id``, ``metadata``,
            ``extra``.
        content_id:
            Shared content ID for tracking.
        media_urls:
            Media URLs to attach (shared across platforms).
        content_type:
            Content type string.
        """
        requests: List[PublishRequest] = []
        for p in platforms:
            requests.append(
                PublishRequest(
                    content_id=content_id,
                    platform=p["platform"],
                    text=text,
                    access_token=p["access_token"],
                    refresh_token=p.get("refresh_token"),
                    account_id=p.get("account_id"),
                    adapter_metadata=p.get("metadata"),
                    media_urls=media_urls,
                    content_type=content_type,
                    platform_extra=p.get("extra"),
                )
            )
        return await self.publish_batch(requests)

    # ------------------------------------------------------------------
    # Reply
    # ------------------------------------------------------------------

    async def publish_reply(
        self,
        platform: str,
        parent_id: str,
        text: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        adapter_metadata: Optional[Dict[str, Any]] = None,
    ) -> PublishOutcome:
        """Publish a reply to an existing post or comment."""
        adapter: Optional[PlatformAdapter] = None
        try:
            formatted = self._formatter.format_text(text, platform)
            adapter = get_adapter(
                platform=platform,
                access_token=access_token,
                refresh_token=refresh_token,
                account_id=account_id,
                metadata=adapter_metadata,
            )

            result = await adapter.publish_reply(
                parent_id=parent_id,
                text=formatted,
            )

            return PublishOutcome(
                content_id=parent_id,
                platform=platform,
                status=result.status.value,
                platform_post_id=result.platform_post_id,
                post_url=result.url,
                error=result.error_message,
                published_at=result.published_at,
                raw_response=result.raw_response,
            )
        except Exception as exc:
            logger.exception("Reply error  platform=%s  parent=%s", platform, parent_id)
            return PublishOutcome(
                content_id=parent_id,
                platform=platform,
                status="failed",
                error=str(exc),
            )
        finally:
            if adapter:
                await adapter.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_content_type(ct_str: str) -> ContentType:
        mapping = {
            "text": ContentType.TEXT,
            "image": ContentType.IMAGE,
            "video": ContentType.VIDEO,
            "link": ContentType.LINK,
            "carousel": ContentType.CAROUSEL,
            "story": ContentType.STORY,
            "reel": ContentType.REEL,
        }
        return mapping.get(ct_str.lower(), ContentType.TEXT)

    @staticmethod
    def _to_outcome(
        request: PublishRequest,
        result: PublishResult,
        scheduled: bool = False,
    ) -> PublishOutcome:
        status = result.status.value
        if scheduled and result.status == PublishStatus.SUCCESS:
            status = "scheduled"

        return PublishOutcome(
            content_id=request.content_id,
            platform=request.platform,
            status=status,
            platform_post_id=result.platform_post_id,
            post_url=result.url,
            error=result.error_message,
            published_at=result.published_at,
            scheduled_at=request.schedule_at if scheduled else None,
            raw_response=result.raw_response,
        )
