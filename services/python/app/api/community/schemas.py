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


class SentimentLabel(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"
    mixed = "mixed"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class MentionType(str, Enum):
    mention = "mention"
    reply = "reply"
    comment = "comment"
    direct_message = "direct_message"
    review = "review"


# ---------------------------------------------------------------------------
# Poll
# ---------------------------------------------------------------------------

class PollRequest(BaseModel):
    organization_id: str = Field(..., description="UUID of the organization")
    listening_config_id: str = Field(
        ..., description="UUID of the community listening configuration to poll"
    )


class DiscoveredMention(BaseModel):
    platform: Platform
    platform_mention_id: str = Field(
        ..., description="Native ID of the mention on the platform"
    )
    mention_type: MentionType
    author_handle: str
    author_name: str | None = None
    text: str
    url: str | None = None
    parent_id: str | None = Field(
        None, description="Parent post/comment ID for threaded conversations"
    )
    posted_at: datetime
    raw_data: dict[str, Any] = Field(default_factory=dict)


class PollResponse(BaseModel):
    organization_id: str
    listening_config_id: str
    platform: Platform
    mentions_found: int
    mentions: list[DiscoveredMention]
    next_cursor: str | None = Field(
        None, description="Pagination cursor for the next poll cycle"
    )
    polled_at: datetime


# ---------------------------------------------------------------------------
# Poll all
# ---------------------------------------------------------------------------

class PollAllRequest(BaseModel):
    organization_id: str


class PollAllResponse(BaseModel):
    organization_id: str
    configs_polled: int
    total_mentions_found: int
    results: list[PollResponse]
    polled_at: datetime


# ---------------------------------------------------------------------------
# Generate response
# ---------------------------------------------------------------------------

class GenerateResponseRequest(BaseModel):
    organization_id: str
    mention_id: str = Field(
        ..., description="Internal ID of the mention to respond to"
    )
    response_tone: str | None = Field(
        None,
        description="Optional tone directive (e.g. 'empathetic', 'professional')",
    )
    additional_context: str | None = Field(
        None, description="Extra context to feed the AI when drafting a reply"
    )
    max_length: int | None = Field(
        None, ge=1, le=2000, description="Maximum character length of the response"
    )


class GenerateResponseResponse(BaseModel):
    organization_id: str
    mention_id: str
    suggested_response: str
    confidence_score: float = Field(
        ..., ge=0, le=1, description="AI confidence in the response quality"
    )
    alternative_responses: list[str] = Field(
        default_factory=list,
        description="Up to 2 alternative response drafts",
    )
    token_usage: dict[str, int] = Field(default_factory=dict)
    created_at: datetime


# ---------------------------------------------------------------------------
# Publish response
# ---------------------------------------------------------------------------

class PublishResponseRequest(BaseModel):
    organization_id: str
    mention_id: str
    response_text: str = Field(
        ..., min_length=1, max_length=2000, description="Final approved response text"
    )
    social_account_id: str = Field(
        ..., description="UUID of the connected social account to post from"
    )


class PublishResponseResponse(BaseModel):
    organization_id: str
    mention_id: str
    platform: Platform
    platform_response_id: str = Field(
        ..., description="Native ID of the published response on the platform"
    )
    response_url: str | None = None
    published_at: datetime


# ---------------------------------------------------------------------------
# Analyze sentiment
# ---------------------------------------------------------------------------

class AnalyzeSentimentRequest(BaseModel):
    organization_id: str
    mention_id: str | None = Field(
        None, description="Analyze a single stored mention by ID"
    )
    text: str | None = Field(
        None, description="Raw text to analyze (used when mention_id is not provided)"
    )
    include_topics: bool = Field(
        True, description="Whether to extract key topics from the text"
    )


class SentimentResult(BaseModel):
    sentiment: SentimentLabel
    sentiment_score: float = Field(
        ..., ge=-1, le=1,
        description="Numeric sentiment score from -1 (very negative) to 1 (very positive)",
    )
    risk_level: RiskLevel
    risk_factors: list[str] = Field(
        default_factory=list,
        description="Identified risk factors (e.g. 'brand_criticism', 'legal_threat')",
    )
    topics: list[str] = Field(
        default_factory=list,
        description="Key topics extracted from the text",
    )
    requires_urgent_attention: bool = False
    explanation: str | None = Field(
        None, description="Brief AI explanation of the analysis"
    )


class AnalyzeSentimentResponse(BaseModel):
    organization_id: str
    mention_id: str | None = None
    result: SentimentResult
    token_usage: dict[str, int] = Field(default_factory=dict)
    analyzed_at: datetime
