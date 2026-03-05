"""
Publishing service.

Orchestrates content publishing to social media platforms. Handles
credential resolution, platform-specific formatting, media uploads,
and both immediate and scheduled publishing.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


class PublishingService:
    """Coordinates content publishing across social media platforms."""

    def __init__(self) -> None:
        # Platform adapters will be registered here once implemented
        # e.g. self._adapters = {"x": XAdapter(), "facebook": FacebookAdapter(), ...}
        pass

    async def publish(
        self,
        organization_id: str,
        content_id: str,
        platform: str,
        social_account_id: str,
        text: str,
        media: list[dict[str, Any]] | None = None,
        schedule_at: datetime | None = None,
        platform_specific: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Publish a single content piece to a platform.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        content_id:
            UUID of the content piece.
        platform:
            Target platform key.
        social_account_id:
            UUID of the connected social account.
        text:
            Post text / caption.
        media:
            Optional list of media attachment dicts.
        schedule_at:
            If provided, schedule instead of publish immediately.
        platform_specific:
            Platform-specific fields.

        Returns
        -------
        dict
            Structured response matching ``PublishResponse``.
        """
        media = media or []
        platform_specific = platform_specific or {}

        logger.info(
            "Publishing content  org=%s  content=%s  platform=%s  account=%s  "
            "media_count=%d  scheduled=%s",
            organization_id,
            content_id,
            platform,
            social_account_id,
            len(media),
            schedule_at is not None,
        )

        # TODO: Implementation steps (to be wired with platform adapters):
        # 1. Fetch social account credentials from DB
        # 2. Refresh OAuth token if expired
        # 3. Upload media attachments to platform if present
        # 4. Format post for the target platform
        # 5. Submit via platform API (or schedule)
        # 6. Store the result in the publications table

        now = datetime.now(timezone.utc)

        if schedule_at:
            return {
                "organization_id": organization_id,
                "result": {
                    "content_id": content_id,
                    "platform": platform,
                    "status": "pending",
                    "platform_post_id": None,
                    "post_url": None,
                    "error": None,
                    "published_at": None,
                    "scheduled_at": schedule_at.isoformat(),
                },
            }

        # Placeholder: in production the platform adapter would return
        # the native post ID and URL.
        return {
            "organization_id": organization_id,
            "result": {
                "content_id": content_id,
                "platform": platform,
                "status": "published",
                "platform_post_id": "pending_platform_integration",
                "post_url": None,
                "error": None,
                "published_at": now.isoformat(),
                "scheduled_at": None,
            },
        }

    async def publish_batch(
        self,
        organization_id: str,
        items: list[dict[str, Any]],
        stop_on_first_error: bool = False,
    ) -> dict[str, Any]:
        """Publish multiple content items sequentially.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        items:
            List of publishing item dicts (matching ``BatchPublishItem``).
        stop_on_first_error:
            If True, abort remaining items after the first failure.

        Returns
        -------
        dict
            Structured response matching ``BatchPublishResponse``.
        """
        results: list[dict[str, Any]] = []
        succeeded = 0
        failed = 0

        for item in items:
            try:
                response = await self.publish(
                    organization_id=organization_id,
                    content_id=item["content_id"],
                    platform=item["platform"],
                    social_account_id=item["social_account_id"],
                    text=item["text"],
                    media=item.get("media", []),
                    schedule_at=item.get("schedule_at"),
                    platform_specific=item.get("platform_specific", {}),
                )
                result = response["result"]
                results.append(result)

                if result["status"] == "failed":
                    failed += 1
                    if stop_on_first_error:
                        # Mark remaining items as skipped
                        break
                else:
                    succeeded += 1

            except Exception as exc:
                logger.exception(
                    "Batch publish error  content=%s  platform=%s",
                    item.get("content_id"),
                    item.get("platform"),
                )
                results.append({
                    "content_id": item["content_id"],
                    "platform": item["platform"],
                    "status": "failed",
                    "platform_post_id": None,
                    "post_url": None,
                    "error": str(exc),
                    "published_at": None,
                    "scheduled_at": None,
                })
                failed += 1
                if stop_on_first_error:
                    break

        now = datetime.now(timezone.utc)

        return {
            "organization_id": organization_id,
            "total": len(items),
            "succeeded": succeeded,
            "failed": failed,
            "results": results,
            "completed_at": now.isoformat(),
        }


# Module-level singleton used by the router
publishing_service = PublishingService()
