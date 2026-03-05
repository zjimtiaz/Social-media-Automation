"""
Platform adapter factory.

Provides a single entry-point ``get_adapter()`` that returns the correct
``PlatformAdapter`` subclass for a given platform key, already configured
with the caller's credentials.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.services.platforms.base import PlatformAdapter
from app.services.platforms.facebook_adapter import FacebookAdapter
from app.services.platforms.instagram_adapter import InstagramAdapter
from app.services.platforms.linkedin_adapter import LinkedInAdapter
from app.services.platforms.quora_adapter import QuoraAdapter
from app.services.platforms.reddit_adapter import RedditAdapter
from app.services.platforms.x_adapter import XAdapter
from app.services.platforms.youtube_adapter import YouTubeAdapter

# Canonical mapping of platform key -> adapter class
_ADAPTER_MAP: Dict[str, type[PlatformAdapter]] = {
    "x": XAdapter,
    "twitter": XAdapter,           # alias
    "instagram": InstagramAdapter,
    "facebook": FacebookAdapter,
    "linkedin": LinkedInAdapter,
    "reddit": RedditAdapter,
    "youtube": YouTubeAdapter,
    "quora": QuoraAdapter,
}


def get_adapter(
    platform: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    account_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> PlatformAdapter:
    """Instantiate and return the adapter for *platform*.

    Parameters
    ----------
    platform:
        Lower-case platform key (``x``, ``instagram``, ``facebook``,
        ``linkedin``, ``reddit``, ``youtube``, ``quora``).
    access_token:
        OAuth access token for the target account.
    refresh_token:
        OAuth refresh token (if available).
    account_id:
        Platform-specific account / page / channel ID.
    metadata:
        Any extra metadata the adapter may need (app secrets, default
        subreddit, etc.).

    Returns
    -------
    PlatformAdapter
        A fully-configured adapter ready for use.

    Raises
    ------
    ValueError
        If *platform* is not recognised.
    """
    key = platform.lower().strip()
    adapter_cls = _ADAPTER_MAP.get(key)
    if adapter_cls is None:
        available = sorted(set(_ADAPTER_MAP.keys()) - {"twitter"})
        raise ValueError(
            f"Unknown platform '{platform}'. "
            f"Supported platforms: {available}"
        )

    return adapter_cls(
        access_token=access_token,
        refresh_token=refresh_token,
        account_id=account_id,
        metadata=metadata,
    )


def supported_platforms() -> list[str]:
    """Return a sorted list of canonical platform keys."""
    return sorted(set(_ADAPTER_MAP.keys()) - {"twitter"})
