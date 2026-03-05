from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AdPlatform(str, Enum):
    meta = "meta"
    reddit = "reddit"


class CampaignStatus(str, Enum):
    draft = "draft"
    pending = "pending"
    active = "active"
    paused = "paused"
    completed = "completed"
    error = "error"


class CampaignObjective(str, Enum):
    awareness = "awareness"
    traffic = "traffic"
    engagement = "engagement"
    leads = "leads"
    conversions = "conversions"
    app_installs = "app_installs"
    video_views = "video_views"


class BudgetType(str, Enum):
    daily = "daily"
    lifetime = "lifetime"


# ---------------------------------------------------------------------------
# Launch campaign
# ---------------------------------------------------------------------------

class TargetingSpec(BaseModel):
    age_min: int | None = Field(None, ge=13, le=65)
    age_max: int | None = Field(None, ge=13, le=65)
    genders: list[str] = Field(default_factory=list, description="e.g. ['male','female','all']")
    locations: list[str] = Field(
        default_factory=list,
        description="Country codes or location IDs",
    )
    interests: list[str] = Field(default_factory=list)
    custom_audiences: list[str] = Field(
        default_factory=list,
        description="IDs of custom/lookalike audiences on the platform",
    )
    subreddits: list[str] = Field(
        default_factory=list,
        description="Reddit-specific: target subreddits",
    )
    platform_specific: dict[str, Any] = Field(default_factory=dict)


class AdCreative(BaseModel):
    headline: str = Field(..., max_length=255)
    body: str = Field(..., max_length=2000)
    call_to_action: str | None = Field(None, description="e.g. 'LEARN_MORE', 'SHOP_NOW'")
    image_url: str | None = None
    video_url: str | None = None
    landing_url: str = Field(..., description="Destination URL")
    display_url: str | None = Field(None, description="Visible shortened URL")


class LaunchCampaignRequest(BaseModel):
    organization_id: str
    campaign_id: str = Field(
        ..., description="Internal campaign UUID (for tracking)"
    )
    platform: AdPlatform
    ad_account_id: str = Field(
        ..., description="Platform-specific ad account identifier"
    )
    name: str = Field(..., min_length=1, max_length=255)
    objective: CampaignObjective
    budget_type: BudgetType
    budget_amount_cents: int = Field(
        ..., gt=0, description="Budget in cents (e.g. 5000 = $50.00)"
    )
    currency: str = Field("USD", max_length=3)
    start_date: datetime
    end_date: datetime | None = None
    targeting: TargetingSpec
    creatives: list[AdCreative] = Field(..., min_length=1)
    platform_settings: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional platform-specific campaign settings",
    )


class LaunchCampaignResponse(BaseModel):
    organization_id: str
    campaign_id: str
    platform: AdPlatform
    platform_campaign_id: str = Field(
        ..., description="Campaign ID returned by the ad platform"
    )
    platform_ad_set_ids: list[str] = Field(
        default_factory=list,
        description="Ad-set / ad-group IDs created on the platform",
    )
    platform_ad_ids: list[str] = Field(
        default_factory=list,
        description="Individual ad IDs created on the platform",
    )
    status: CampaignStatus
    launched_at: datetime


# ---------------------------------------------------------------------------
# Update status
# ---------------------------------------------------------------------------

class UpdateStatusRequest(BaseModel):
    organization_id: str
    campaign_id: str
    platform: AdPlatform
    platform_campaign_id: str
    new_status: CampaignStatus = Field(
        ..., description="Target status (e.g. 'paused', 'active')"
    )


class UpdateStatusResponse(BaseModel):
    organization_id: str
    campaign_id: str
    platform: AdPlatform
    platform_campaign_id: str
    previous_status: CampaignStatus
    current_status: CampaignStatus
    updated_at: datetime


# ---------------------------------------------------------------------------
# Update budget
# ---------------------------------------------------------------------------

class UpdateBudgetRequest(BaseModel):
    organization_id: str
    campaign_id: str
    platform: AdPlatform
    platform_campaign_id: str
    budget_type: BudgetType
    new_budget_amount_cents: int = Field(..., gt=0)
    currency: str = Field("USD", max_length=3)


class UpdateBudgetResponse(BaseModel):
    organization_id: str
    campaign_id: str
    platform: AdPlatform
    platform_campaign_id: str
    previous_budget_cents: int
    current_budget_cents: int
    budget_type: BudgetType
    currency: str
    updated_at: datetime


# ---------------------------------------------------------------------------
# Pull metrics
# ---------------------------------------------------------------------------

class PullMetricsRequest(BaseModel):
    """Used for the batch endpoint (POST /pull-metrics-batch)."""
    organization_id: str
    date_from: datetime | None = Field(
        None, description="Start of reporting window (defaults to last 24h)"
    )
    date_to: datetime | None = Field(
        None, description="End of reporting window (defaults to now)"
    )


class CampaignMetrics(BaseModel):
    campaign_id: str
    platform: AdPlatform
    platform_campaign_id: str
    impressions: int = 0
    clicks: int = 0
    spend_cents: int = Field(0, description="Spend in cents")
    currency: str = "USD"
    ctr: float = Field(0, description="Click-through rate as a percentage")
    cpc_cents: float = Field(0, description="Cost per click in cents")
    cpm_cents: float = Field(0, description="Cost per mille in cents")
    conversions: int = 0
    cost_per_conversion_cents: float = 0
    reach: int = 0
    frequency: float = 0
    video_views: int | None = None
    engagement_rate: float | None = None
    platform_specific_metrics: dict[str, Any] = Field(default_factory=dict)
    date_from: datetime
    date_to: datetime
    fetched_at: datetime


class PullMetricsResponse(BaseModel):
    organization_id: str
    campaign_id: str
    metrics: CampaignMetrics
    fetched_at: datetime


class PullMetricsBatchResponse(BaseModel):
    organization_id: str
    total_campaigns: int
    successful: int
    failed: int
    results: list[CampaignMetrics]
    errors: list[dict[str, str]] = Field(
        default_factory=list,
        description="List of {campaign_id, error} for campaigns that failed",
    )
    fetched_at: datetime
