"""
Abstract base class for platform adapters.

Every social-media platform adapter implements ``PlatformAdapter`` so the
rest of the system can publish content, search mentions, and manage tokens
through a uniform interface.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class ContentType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    LINK = "link"
    CAROUSEL = "carousel"
    STORY = "story"
    REEL = "reel"


class PublishStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"          # e.g. Instagram container not yet ready
    RATE_LIMITED = "rate_limited"
    TOKEN_EXPIRED = "token_expired"


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------

@dataclass
class PublishResult:
    """Returned by ``publish_post`` and ``publish_reply``."""

    status: PublishStatus
    platform: str
    platform_post_id: Optional[str] = None
    url: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)
    published_at: Optional[datetime] = None


@dataclass
class MentionItem:
    """A single mention / comment found by ``search_mentions``."""

    mention_id: str
    platform: str
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    text: str = ""
    url: Optional[str] = None
    created_at: Optional[datetime] = None
    parent_id: Optional[str] = None         # thread parent
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchResult:
    """Returned by ``search_mentions``."""

    platform: str
    mentions: List[MentionItem] = field(default_factory=list)
    next_cursor: Optional[str] = None       # pagination token
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TokenRefreshResult:
    """Returned by ``refresh_access_token``."""

    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None        # seconds
    error_message: Optional[str] = None


# ---------------------------------------------------------------------------
# Abstract adapter
# ---------------------------------------------------------------------------

class PlatformAdapter(abc.ABC):
    """Interface that every platform-specific adapter must implement."""

    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.account_id = account_id
        self.metadata = metadata or {}

    # ---- Publishing ----

    @abc.abstractmethod
    async def publish_post(
        self,
        text: str,
        media_urls: Optional[List[str]] = None,
        content_type: ContentType = ContentType.TEXT,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Publish a new post / tweet / video etc."""
        ...

    @abc.abstractmethod
    async def publish_reply(
        self,
        parent_id: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PublishResult:
        """Reply to an existing post or comment."""
        ...

    # ---- Mention search ----

    @abc.abstractmethod
    async def search_mentions(
        self,
        keywords: List[str],
        since: Optional[datetime] = None,
        cursor: Optional[str] = None,
        max_results: int = 50,
    ) -> SearchResult:
        """Search the platform for mentions of the given keywords."""
        ...

    # ---- Token management ----

    @abc.abstractmethod
    async def refresh_access_token_grant(self) -> TokenRefreshResult:
        """Use the refresh token to obtain a new access token."""
        ...

    @abc.abstractmethod
    async def validate_token(self) -> bool:
        """Return True if the current access token is still valid."""
        ...

    # ---- Lifecycle ----

    async def close(self) -> None:
        """Clean up resources (HTTP clients, etc.)."""
        pass

    # ---- Helpers ----

    @property
    @abc.abstractmethod
    def platform_name(self) -> str:
        """Return a canonical lower-case platform key (e.g. ``"x"``)."""
        ...
