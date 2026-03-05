"""
Meta Marketing API service.

Implements the full campaign creation flow:
  Campaign -> Ad Set -> Ad Creative -> Ad

Uses the Facebook / Meta Marketing API v21.0 via httpx.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v21.0"


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CampaignObjective(str, Enum):
    AWARENESS = "OUTCOME_AWARENESS"
    TRAFFIC = "OUTCOME_TRAFFIC"
    ENGAGEMENT = "OUTCOME_ENGAGEMENT"
    LEADS = "OUTCOME_LEADS"
    APP_PROMOTION = "OUTCOME_APP_PROMOTION"
    SALES = "OUTCOME_SALES"


class CampaignStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    DELETED = "DELETED"
    ARCHIVED = "ARCHIVED"


class BillingEvent(str, Enum):
    IMPRESSIONS = "IMPRESSIONS"
    LINK_CLICKS = "LINK_CLICKS"
    POST_ENGAGEMENT = "POST_ENGAGEMENT"


class OptimizationGoal(str, Enum):
    REACH = "REACH"
    IMPRESSIONS = "IMPRESSIONS"
    LINK_CLICKS = "LINK_CLICKS"
    LANDING_PAGE_VIEWS = "LANDING_PAGE_VIEWS"
    LEAD_GENERATION = "LEAD_GENERATION"
    CONVERSIONS = "OFFSITE_CONVERSIONS"


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------

@dataclass
class CampaignResult:
    campaign_id: str
    ad_set_ids: List[str] = field(default_factory=list)
    ad_creative_ids: List[str] = field(default_factory=list)
    ad_ids: List[str] = field(default_factory=list)
    status: str = "created"
    errors: List[str] = field(default_factory=list)


@dataclass
class MetricsResult:
    campaign_id: str
    impressions: int = 0
    clicks: int = 0
    spend: float = 0.0
    reach: int = 0
    ctr: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    conversions: int = 0
    cost_per_conversion: float = 0.0
    frequency: float = 0.0
    date_start: str = ""
    date_stop: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class MetaAdsService:
    """Full-lifecycle Meta (Facebook / Instagram) ads management."""

    def __init__(self) -> None:
        settings = get_settings()
        self._ad_account_id = settings.meta_ads_account_id  # act_xxx
        self._client = httpx.AsyncClient(
            base_url=GRAPH_API,
            timeout=httpx.Timeout(30.0),
        )

    # ------------------------------------------------------------------
    # High-level: create everything
    # ------------------------------------------------------------------

    async def create_full_campaign(
        self,
        access_token: str,
        ad_account_id: str,
        *,
        name: str,
        objective: str = "OUTCOME_TRAFFIC",
        daily_budget_cents: int = 2000,       # $20.00
        currency: str = "USD",
        start_time: Optional[str] = None,     # ISO-8601
        end_time: Optional[str] = None,
        targeting: Optional[Dict[str, Any]] = None,
        creative_config: Optional[Dict[str, Any]] = None,
        page_id: str = "",
        instagram_actor_id: str = "",
    ) -> CampaignResult:
        """Create a complete campaign with ad set, creative, and ad.

        Parameters
        ----------
        access_token : str
            A valid user or system-user access token with ``ads_management``.
        ad_account_id : str
            The ad account ID (``act_XXXXXXXXX``).
        name : str
            Campaign name.
        objective : str
            One of the ``CampaignObjective`` values.
        daily_budget_cents : int
            Daily budget in the smallest currency unit.
        currency : str
            ISO 4217 currency code.
        start_time / end_time : str | None
            ISO-8601 timestamps.
        targeting : dict | None
            Meta targeting spec.  Defaults to broad targeting.
        creative_config : dict | None
            Creative content.  Must include ``title``, ``body``, ``link_url``,
            ``image_hash`` or ``image_url``.
        page_id : str
            Facebook Page ID used as the ad identity.
        instagram_actor_id : str
            Instagram account ID (optional, for IG placements).
        """
        result = CampaignResult(campaign_id="")
        creative_config = creative_config or {}
        targeting = targeting or self._default_targeting()

        # 1. Create campaign
        campaign_id = await self._create_campaign(
            access_token, ad_account_id, name, objective,
        )
        if not campaign_id:
            result.errors.append("Campaign creation failed")
            return result
        result.campaign_id = campaign_id

        # 2. Create ad set
        ad_set_id = await self._create_ad_set(
            access_token,
            ad_account_id,
            campaign_id=campaign_id,
            name=f"{name} - Ad Set",
            daily_budget_cents=daily_budget_cents,
            targeting=targeting,
            start_time=start_time,
            end_time=end_time,
        )
        if not ad_set_id:
            result.errors.append("Ad set creation failed")
            return result
        result.ad_set_ids.append(ad_set_id)

        # 3. Create ad creative
        creative_id = await self._create_ad_creative(
            access_token,
            ad_account_id,
            name=f"{name} - Creative",
            page_id=page_id,
            instagram_actor_id=instagram_actor_id,
            **creative_config,
        )
        if not creative_id:
            result.errors.append("Ad creative creation failed")
            return result
        result.ad_creative_ids.append(creative_id)

        # 4. Create ad
        ad_id = await self._create_ad(
            access_token,
            ad_account_id,
            ad_set_id=ad_set_id,
            creative_id=creative_id,
            name=f"{name} - Ad",
        )
        if not ad_id:
            result.errors.append("Ad creation failed")
            return result
        result.ad_ids.append(ad_id)
        result.status = "active"

        logger.info(
            "Meta campaign created  campaign=%s  ad_set=%s  creative=%s  ad=%s",
            campaign_id, ad_set_id, creative_id, ad_id,
        )
        return result

    # ------------------------------------------------------------------
    # Campaign CRUD
    # ------------------------------------------------------------------

    async def _create_campaign(
        self,
        access_token: str,
        ad_account_id: str,
        name: str,
        objective: str,
    ) -> Optional[str]:
        resp = await self._client.post(
            f"/{ad_account_id}/campaigns",
            params={"access_token": access_token},
            json={
                "name": name,
                "objective": objective,
                "status": "PAUSED",
                "special_ad_categories": [],
            },
        )
        body = self._safe_json(resp)
        if "id" in body:
            return body["id"]
        logger.error("Campaign creation failed: %s", body)
        return None

    async def update_campaign_status(
        self,
        access_token: str,
        campaign_id: str,
        status: str,
    ) -> bool:
        resp = await self._client.post(
            f"/{campaign_id}",
            params={"access_token": access_token},
            json={"status": status},
        )
        return resp.status_code == 200

    async def delete_campaign(
        self, access_token: str, campaign_id: str,
    ) -> bool:
        return await self.update_campaign_status(
            access_token, campaign_id, "DELETED",
        )

    # ------------------------------------------------------------------
    # Ad Set
    # ------------------------------------------------------------------

    async def _create_ad_set(
        self,
        access_token: str,
        ad_account_id: str,
        *,
        campaign_id: str,
        name: str,
        daily_budget_cents: int,
        targeting: Dict[str, Any],
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        billing_event: str = "IMPRESSIONS",
        optimization_goal: str = "LINK_CLICKS",
    ) -> Optional[str]:
        payload: Dict[str, Any] = {
            "name": name,
            "campaign_id": campaign_id,
            "daily_budget": daily_budget_cents,
            "billing_event": billing_event,
            "optimization_goal": optimization_goal,
            "targeting": targeting,
            "status": "PAUSED",
        }
        if start_time:
            payload["start_time"] = start_time
        if end_time:
            payload["end_time"] = end_time

        resp = await self._client.post(
            f"/{ad_account_id}/adsets",
            params={"access_token": access_token},
            json=payload,
        )
        body = self._safe_json(resp)
        if "id" in body:
            return body["id"]
        logger.error("Ad set creation failed: %s", body)
        return None

    async def update_ad_set_budget(
        self,
        access_token: str,
        ad_set_id: str,
        daily_budget_cents: int,
    ) -> bool:
        resp = await self._client.post(
            f"/{ad_set_id}",
            params={"access_token": access_token},
            json={"daily_budget": daily_budget_cents},
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Ad Creative
    # ------------------------------------------------------------------

    async def _create_ad_creative(
        self,
        access_token: str,
        ad_account_id: str,
        *,
        name: str,
        page_id: str,
        instagram_actor_id: str = "",
        title: str = "",
        body_text: str = "",
        link_url: str = "",
        image_hash: str = "",
        image_url: str = "",
        call_to_action_type: str = "LEARN_MORE",
        **kwargs: Any,
    ) -> Optional[str]:
        object_story_spec: Dict[str, Any] = {
            "page_id": page_id,
            "link_data": {
                "message": body_text,
                "link": link_url,
                "name": title,
                "call_to_action": {
                    "type": call_to_action_type,
                    "value": {"link": link_url},
                },
            },
        }

        if image_hash:
            object_story_spec["link_data"]["image_hash"] = image_hash
        elif image_url:
            object_story_spec["link_data"]["picture"] = image_url

        if instagram_actor_id:
            object_story_spec["instagram_actor_id"] = instagram_actor_id

        payload = {
            "name": name,
            "object_story_spec": object_story_spec,
        }

        resp = await self._client.post(
            f"/{ad_account_id}/adcreatives",
            params={"access_token": access_token},
            json=payload,
        )
        resp_body = self._safe_json(resp)
        if "id" in resp_body:
            return resp_body["id"]
        logger.error("Creative creation failed: %s", resp_body)
        return None

    # ------------------------------------------------------------------
    # Ad
    # ------------------------------------------------------------------

    async def _create_ad(
        self,
        access_token: str,
        ad_account_id: str,
        *,
        ad_set_id: str,
        creative_id: str,
        name: str,
    ) -> Optional[str]:
        payload = {
            "name": name,
            "adset_id": ad_set_id,
            "creative": {"creative_id": creative_id},
            "status": "PAUSED",
        }
        resp = await self._client.post(
            f"/{ad_account_id}/ads",
            params={"access_token": access_token},
            json=payload,
        )
        body = self._safe_json(resp)
        if "id" in body:
            return body["id"]
        logger.error("Ad creation failed: %s", body)
        return None

    # ------------------------------------------------------------------
    # Reporting / Metrics
    # ------------------------------------------------------------------

    async def get_campaign_insights(
        self,
        access_token: str,
        campaign_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> MetricsResult:
        """Fetch insights for a campaign.

        Parameters
        ----------
        date_from / date_to : str
            Date strings in YYYY-MM-DD format.
        """
        params: Dict[str, Any] = {
            "access_token": access_token,
            "fields": (
                "impressions,clicks,spend,reach,ctr,cpc,cpm,"
                "actions,cost_per_action_type,frequency"
            ),
        }
        if date_from and date_to:
            params["time_range"] = f'{{"since":"{date_from}","until":"{date_to}"}}'

        resp = await self._client.get(
            f"/{campaign_id}/insights",
            params=params,
        )
        body = self._safe_json(resp)
        data = body.get("data", [{}])[0] if body.get("data") else {}

        # Parse conversions from actions
        conversions = 0
        cost_per_conversion = 0.0
        for action in data.get("actions", []):
            if action.get("action_type") in (
                "offsite_conversion",
                "lead",
                "purchase",
            ):
                conversions += int(action.get("value", 0))
        for cpa in data.get("cost_per_action_type", []):
            if cpa.get("action_type") in (
                "offsite_conversion",
                "lead",
                "purchase",
            ):
                cost_per_conversion = float(cpa.get("value", 0))

        return MetricsResult(
            campaign_id=campaign_id,
            impressions=int(data.get("impressions", 0)),
            clicks=int(data.get("clicks", 0)),
            spend=float(data.get("spend", 0.0)),
            reach=int(data.get("reach", 0)),
            ctr=float(data.get("ctr", 0.0)),
            cpc=float(data.get("cpc", 0.0)),
            cpm=float(data.get("cpm", 0.0)),
            conversions=conversions,
            cost_per_conversion=cost_per_conversion,
            frequency=float(data.get("frequency", 0.0)),
            date_start=data.get("date_start", ""),
            date_stop=data.get("date_stop", ""),
            raw_data=data,
        )

    # ------------------------------------------------------------------
    # Image upload (required for ad creatives)
    # ------------------------------------------------------------------

    async def upload_ad_image(
        self,
        access_token: str,
        ad_account_id: str,
        image_bytes: bytes,
        filename: str = "ad_image.png",
    ) -> Optional[str]:
        """Upload an image and return its hash for use in creatives."""
        import base64

        image_b64 = base64.b64encode(image_bytes).decode()
        resp = await self._client.post(
            f"/{ad_account_id}/adimages",
            params={"access_token": access_token},
            json={"bytes": image_b64, "name": filename},
        )
        body = self._safe_json(resp)
        images = body.get("images", {})
        for img_name, img_data in images.items():
            return img_data.get("hash")
        logger.error("Image upload failed: %s", body)
        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _default_targeting() -> Dict[str, Any]:
        """Return a broad default targeting spec."""
        return {
            "geo_locations": {
                "countries": ["US"],
            },
            "age_min": 18,
            "age_max": 65,
        }

    @staticmethod
    def _safe_json(resp: httpx.Response) -> Dict[str, Any]:
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text[:2000]}

    async def close(self) -> None:
        await self._client.aclose()
