"""
Community listener service.

Orchestrates keyword-based mention polling across multiple social media
platforms. Designed to be invoked by Celery periodic tasks or on-demand
via the API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.platforms.base import MentionItem, PlatformAdapter, SearchResult
from app.services.platforms.factory import get_adapter

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration / result types
# ---------------------------------------------------------------------------

@dataclass
class ListeningConfig:
    """Configuration for a single listening rule.

    In production these are fetched from the database; this dataclass
    serves as the in-memory representation.
    """

    config_id: str
    organization_id: str
    platform: str                       # e.g. "x", "reddit"
    keywords: List[str]
    access_token: str
    refresh_token: Optional[str] = None
    account_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    last_cursor: Optional[str] = None
    last_polled_at: Optional[datetime] = None
    max_results: int = 50


@dataclass
class PollResult:
    """Result of polling a single listening config."""

    config_id: str
    platform: str
    mentions: List[MentionItem] = field(default_factory=list)
    next_cursor: Optional[str] = None
    polled_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    error: Optional[str] = None


@dataclass
class PollAllResult:
    """Aggregated result of polling all configs for an organisation."""

    organization_id: str
    results: List[PollResult] = field(default_factory=list)
    total_mentions: int = 0
    polled_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ListenerService:
    """Orchestrates keyword-based polling across social media platforms."""

    def __init__(self) -> None:
        # In production, inject a DB session or repository for reading
        # configs and persisting mentions.
        pass

    # ------------------------------------------------------------------
    # Single-config polling
    # ------------------------------------------------------------------

    async def poll_config(self, config: ListeningConfig) -> PollResult:
        """Execute one polling cycle for a single listening configuration.

        1. Instantiate the platform adapter.
        2. Search for mentions using the config's keywords.
        3. Return discovered mentions with a new cursor for next poll.
        """
        adapter: Optional[PlatformAdapter] = None
        try:
            adapter = get_adapter(
                platform=config.platform,
                access_token=config.access_token,
                refresh_token=config.refresh_token,
                account_id=config.account_id,
                metadata=config.metadata,
            )

            since = config.last_polled_at
            search_result: SearchResult = await adapter.search_mentions(
                keywords=config.keywords,
                since=since,
                cursor=config.last_cursor,
                max_results=config.max_results,
            )

            if search_result.error_message:
                logger.warning(
                    "Listener search warning  config=%s  platform=%s  error=%s",
                    config.config_id,
                    config.platform,
                    search_result.error_message,
                )

            logger.info(
                "Listener polled  config=%s  platform=%s  mentions=%d  cursor=%s",
                config.config_id,
                config.platform,
                len(search_result.mentions),
                search_result.next_cursor,
            )

            return PollResult(
                config_id=config.config_id,
                platform=config.platform,
                mentions=search_result.mentions,
                next_cursor=search_result.next_cursor,
            )

        except Exception as exc:
            logger.exception(
                "Listener error  config=%s  platform=%s",
                config.config_id,
                config.platform,
            )
            return PollResult(
                config_id=config.config_id,
                platform=config.platform,
                error=str(exc),
            )
        finally:
            if adapter:
                await adapter.close()

    # ------------------------------------------------------------------
    # Multi-config polling
    # ------------------------------------------------------------------

    async def poll_all(
        self, configs: List[ListeningConfig],
    ) -> PollAllResult:
        """Poll all listening configurations concurrently.

        Parameters
        ----------
        configs:
            All active ``ListeningConfig`` objects for an organisation.

        Returns
        -------
        PollAllResult
            Aggregated results with per-config mention lists.
        """
        if not configs:
            return PollAllResult(
                organization_id="",
                total_mentions=0,
            )

        org_id = configs[0].organization_id

        # Run all polls concurrently
        tasks = [self.poll_config(c) for c in configs]
        results: List[PollResult] = await asyncio.gather(*tasks)

        total = sum(len(r.mentions) for r in results)

        logger.info(
            "Listener poll_all  org=%s  configs=%d  total_mentions=%d",
            org_id,
            len(configs),
            total,
        )

        return PollAllResult(
            organization_id=org_id,
            results=results,
            total_mentions=total,
        )

    # ------------------------------------------------------------------
    # Token refresh helper
    # ------------------------------------------------------------------

    async def refresh_if_needed(self, config: ListeningConfig) -> ListeningConfig:
        """Validate the token and refresh it if expired.

        Returns an updated config with the new token.
        """
        adapter = get_adapter(
            platform=config.platform,
            access_token=config.access_token,
            refresh_token=config.refresh_token,
            account_id=config.account_id,
            metadata=config.metadata,
        )
        try:
            is_valid = await adapter.validate_token()
            if is_valid:
                return config

            logger.info(
                "Token expired, refreshing  config=%s  platform=%s",
                config.config_id,
                config.platform,
            )
            token_result = await adapter.refresh_access_token_grant()
            if token_result.error_message:
                logger.error(
                    "Token refresh failed  config=%s  error=%s",
                    config.config_id,
                    token_result.error_message,
                )
                return config

            config.access_token = token_result.access_token
            if token_result.refresh_token:
                config.refresh_token = token_result.refresh_token

            return config
        finally:
            await adapter.close()

    # ------------------------------------------------------------------
    # Deduplication
    # ------------------------------------------------------------------

    @staticmethod
    def deduplicate_mentions(
        mentions: List[MentionItem],
        seen_ids: Optional[set[str]] = None,
    ) -> List[MentionItem]:
        """Remove duplicate mentions based on mention_id.

        Parameters
        ----------
        mentions:
            Raw list of mentions that may contain duplicates.
        seen_ids:
            Optional set of already-processed mention IDs (e.g. from DB).
        """
        seen = set(seen_ids) if seen_ids else set()
        unique: List[MentionItem] = []
        for m in mentions:
            if m.mention_id not in seen:
                seen.add(m.mention_id)
                unique.append(m)
        return unique
