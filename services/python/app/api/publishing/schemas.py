from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Platform(str, Enum):
    x = "x"
    facebook = "facebook"
    instagram = "instagram"
    linkedin = "linkedin"
    reddit = "reddit"
    youtube = "youtube"
    tiktok = "tiktok"


class PublishStatus(str, Enum):
    pending = "pending"
    published = "published"
    failed = "failed"
    partially_published = "partially_published"


class MediaAttachment(BaseModel):
    url: str = Field(..., description="Public URL of the media asset")
    media_type: str = Field(
        ..., description="MIME type (e.g. 'image/png', 'video/mp4')"
    )
    alt_text: str | None = Field(None, description="Accessibility alt text")
    thumbnail_url: str | None = None


# ---------------------------------------------------------------------------
# Publish single
# ---------------------------------------------------------------------------

class PublishRequest(BaseModel):
    organization_id: str = Field(..., description="UUID of the organization")
    content_id: str = Field(
        ..., description="UUID of the content piece to publish"
    )
    platform: Platform
    social_account_id: str = Field(
        ..., description="UUID of the connected social account to post from"
    )
    text: str = Field(..., min_length=1, description="Post text / caption")
    media: list[MediaAttachment] = Field(
        default_factory=list, description="Optional media attachments"
    )
    schedule_at: datetime | None = Field(
        None,
        description="If provided, schedule the post instead of publishing immediately",
    )
    platform_specific: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Platform-specific fields (e.g. subreddit for Reddit, "
            "link_url for LinkedIn articles, visibility for YouTube)"
        ),
    )


class PublishResult(BaseModel):
    content_id: str
    platform: Platform
    status: PublishStatus
    platform_post_id: str | None = Field(
        None, description="Native post ID returned by the platform"
    )
    post_url: str | None = Field(
        None, description="Public URL of the published post"
    )
    error: str | None = None
    published_at: datetime | None = None
    scheduled_at: datetime | None = None


class PublishResponse(BaseModel):
    organization_id: str
    result: PublishResult


# ---------------------------------------------------------------------------
# Publish batch
# ---------------------------------------------------------------------------

class BatchPublishItem(BaseModel):
    content_id: str
    platform: Platform
    social_account_id: str
    text: str = Field(..., min_length=1)
    media: list[MediaAttachment] = Field(default_factory=list)
    schedule_at: datetime | None = None
    platform_specific: dict[str, Any] = Field(default_factory=dict)


class BatchPublishRequest(BaseModel):
    organization_id: str
    items: list[BatchPublishItem] = Field(
        ..., min_length=1, description="List of content items to publish"
    )
    stop_on_first_error: bool = Field(
        False,
        description="If True, abort remaining publishes on first failure",
    )


class BatchPublishResponse(BaseModel):
    organization_id: str
    total: int
    succeeded: int
    failed: int
    results: list[PublishResult]
    completed_at: datetime
