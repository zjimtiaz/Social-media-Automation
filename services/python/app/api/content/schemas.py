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


class ContentType(str, Enum):
    text = "text"
    image = "image"
    video = "video"
    carousel = "carousel"
    story = "story"
    reel = "reel"


class ContentStatus(str, Enum):
    draft = "draft"
    pending_review = "pending_review"
    approved = "approved"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"


# ---------------------------------------------------------------------------
# Content generation
# ---------------------------------------------------------------------------

class GenerateContentRequest(BaseModel):
    organization_id: str = Field(..., description="UUID of the organization")
    trigger_data: dict[str, Any] = Field(
        ...,
        description=(
            "Contextual data that triggered generation "
            "(e.g. trending topic, calendar event, RSS item)"
        ),
    )
    target_platforms: list[Platform] = Field(
        ..., min_length=1, description="Platforms to generate content for"
    )
    content_types: list[ContentType] = Field(
        ..., min_length=1, description="Types of content to produce"
    )
    brand_voice_id: str | None = Field(
        None, description="Optional brand-voice profile to apply"
    )
    language: str = Field("en", description="ISO-639-1 language code")


class GeneratedPiece(BaseModel):
    platform: Platform
    content_type: ContentType
    title: str | None = None
    body: str
    hashtags: list[str] = Field(default_factory=list)
    media_prompt: str | None = Field(
        None,
        description="Prompt for downstream image/video generation if needed",
    )
    estimated_engagement_score: float | None = Field(
        None, ge=0, le=1, description="AI-estimated engagement score 0-1"
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class GenerateContentResponse(BaseModel):
    organization_id: str
    content_group_id: str = Field(
        ..., description="Shared ID linking all pieces in this generation batch"
    )
    pieces: list[GeneratedPiece]
    token_usage: dict[str, int] = Field(
        default_factory=dict,
        description="Token usage breakdown (prompt_tokens, completion_tokens)",
    )
    created_at: datetime


# ---------------------------------------------------------------------------
# Variant generation
# ---------------------------------------------------------------------------

class GenerateVariantsRequest(BaseModel):
    organization_id: str
    source_content_id: str = Field(
        ..., description="ID of the existing content piece to derive variants from"
    )
    target_platforms: list[Platform] = Field(
        ..., min_length=1, description="Platforms to create variants for"
    )
    tone_adjustments: dict[str, str] = Field(
        default_factory=dict,
        description="Per-platform tone overrides, e.g. {'linkedin': 'professional'}",
    )
    max_variants_per_platform: int = Field(
        1, ge=1, le=5, description="How many variants to produce per platform"
    )


class GenerateVariantsResponse(BaseModel):
    organization_id: str
    source_content_id: str
    variants: list[GeneratedPiece]
    token_usage: dict[str, int] = Field(default_factory=dict)
    created_at: datetime
