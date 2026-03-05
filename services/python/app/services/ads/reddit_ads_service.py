"""
Reddit Ads API service.

Implements campaign and ad group creation, creative management,
status updates, and metrics retrieval via the Reddit Ads API.

Reddit Ads API docs: https://ads-api.reddit.com/docs/
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

ADS_API = "https://ads-api.reddit.com/api/v3"
OAUTH_TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
USER_AGENT = "SocialMediaAutomation/1.0"


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------

@dataclass
class RedditCampaignResult:
    campaign_id: str = ""
    ad_group_ids: List[str] = field(default_factory=list)
    ad_ids: List[str] = field(default_factory=list)
    status: str = "created"
    errors: List[str] = field(default_factory=list)


@dataclass
class RedditMetricsResult:
    campaign_id: str = ""
    impressions: int = 0
    clicks: int = 0
    spend_micros: int = 0          # in microdollars (1/1_000_000 of a dollar)
    ecpm_micros: int = 0
    ctr: float = 0.0
    conversions: int = 0
    video_viewable_impressions: int = 0
    video_fully_viewed: int = 0
    date_range: Dict[str, str] = field(default_factory=dict)
    raw_data: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class RedditAdsService:
    """Reddit Ads API client for campaign lifecycle management."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client_id = settings.reddit_client_id
        self._client_secret = settings.reddit_client_secret
        self._client = httpx.AsyncClient(
            base_url=ADS_API,
            timeout=httpx.Timeout(30.0),
            headers={"User-Agent": USER_AGENT},
        )

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    async def _get_ads_token(self, refresh_token: str) -> Optional[str]:
        """Exchange a refresh token for an ads-scoped access token."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                OAUTH_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                auth=(self._client_id, self._client_secret),
                headers={"User-Agent": USER_AGENT},
            )
        body = resp.json() if resp.status_code == 200 else {}
        return body.get("access_token")

    def _auth_headers(self, access_token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Full campaign creation
    # ------------------------------------------------------------------

    async def create_full_campaign(
        self,
        access_token: str,
        ad_account_id: str,
        *,
        name: str,
        objective: str = "CONVERSIONS",
        daily_budget_micros: int = 20_000_000,  # $20 in microdollars
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        targeting: Optional[Dict[str, Any]] = None,
        creative_config: Optional[Dict[str, Any]] = None,
    ) -> RedditCampaignResult:
        """Create a campaign with ad group and ad creative.

        Parameters
        ----------
        access_token : str
            Reddit OAuth token with ``ads`` scope.
        ad_account_id : str
            Reddit advertiser account ID.
        name : str
            Campaign name.
        objective : str
            AWARENESS, CONSIDERATION, or CONVERSIONS.
        daily_budget_micros : int
            Daily budget in microdollars.
        start_time / end_time : str
            ISO-8601 timestamps.
        targeting : dict
            Reddit targeting spec (subreddits, interests, locations, etc.).
        creative_config : dict
            Ad creative content (headline, body, url, thumbnail_url, etc.).
        """
        result = RedditCampaignResult()
        targeting = targeting or {}
        creative_config = creative_config or {}
        headers = self._auth_headers(access_token)

        # 1. Create campaign
        campaign_id = await self._create_campaign(
            headers, ad_account_id, name, objective,
        )
        if not campaign_id:
            result.errors.append("Campaign creation failed")
            return result
        result.campaign_id = campaign_id

        # 2. Create ad group
        ad_group_id = await self._create_ad_group(
            headers,
            ad_account_id,
            campaign_id=campaign_id,
            name=f"{name} - Ad Group",
            daily_budget_micros=daily_budget_micros,
            start_time=start_time,
            end_time=end_time,
            targeting=targeting,
        )
        if not ad_group_id:
            result.errors.append("Ad group creation failed")
            return result
        result.ad_group_ids.append(ad_group_id)

        # 3. Create ad (creative)
        ad_id = await self._create_ad(
            headers,
            ad_account_id,
            ad_group_id=ad_group_id,
            name=f"{name} - Ad",
            **creative_config,
        )
        if not ad_id:
            result.errors.append("Ad creation failed")
            return result
        result.ad_ids.append(ad_id)
        result.status = "active"

        logger.info(
            "Reddit campaign created  campaign=%s  ad_group=%s  ad=%s",
            campaign_id, ad_group_id, ad_id,
        )
        return result

    # ------------------------------------------------------------------
    # Campaign
    # ------------------------------------------------------------------

    async def _create_campaign(
        self,
        headers: Dict[str, str],
        ad_account_id: str,
        name: str,
        objective: str,
    ) -> Optional[str]:
        payload = {
            "name": name,
            "objective": objective,
            "is_paid": True,
            "configured_status": "PAUSED",
        }
        resp = await self._client.post(
            f"/ad_accounts/{ad_account_id}/campaigns",
            headers=headers,
            json=payload,
        )
        body = self._safe_json(resp)
        data = body.get("data", {})
        if data.get("id"):
            return data["id"]
        logger.error("Reddit campaign creation failed: %s", body)
        return None

    async def update_campaign_status(
        self,
        access_token: str,
        ad_account_id: str,
        campaign_id: str,
        status: str,
    ) -> bool:
        """Update campaign status (ACTIVE, PAUSED, etc.)."""
        headers = self._auth_headers(access_token)
        resp = await self._client.put(
            f"/ad_accounts/{ad_account_id}/campaigns/{campaign_id}",
            headers=headers,
            json={"configured_status": status},
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Ad Group
    # ------------------------------------------------------------------

    async def _create_ad_group(
        self,
        headers: Dict[str, str],
        ad_account_id: str,
        *,
        campaign_id: str,
        name: str,
        daily_budget_micros: int,
        start_time: Optional[str],
        end_time: Optional[str],
        targeting: Dict[str, Any],
    ) -> Optional[str]:
        payload: Dict[str, Any] = {
            "campaign_id": campaign_id,
            "name": name,
            "bid_strategy": "CPM",
            "goal_type": "IMPRESSIONS",
            "daily_budget_micro": daily_budget_micros,
            "configured_status": "PAUSED",
            "target": self._build_targeting(targeting),
        }
        if start_time:
            payload["start_time"] = start_time
        if end_time:
            payload["end_time"] = end_time

        resp = await self._client.post(
            f"/ad_accounts/{ad_account_id}/ad_groups",
            headers=headers,
            json=payload,
        )
        body = self._safe_json(resp)
        data = body.get("data", {})
        if data.get("id"):
            return data["id"]
        logger.error("Reddit ad group creation failed: %s", body)
        return None

    async def update_ad_group_budget(
        self,
        access_token: str,
        ad_account_id: str,
        ad_group_id: str,
        daily_budget_micros: int,
    ) -> bool:
        headers = self._auth_headers(access_token)
        resp = await self._client.put(
            f"/ad_accounts/{ad_account_id}/ad_groups/{ad_group_id}",
            headers=headers,
            json={"daily_budget_micro": daily_budget_micros},
        )
        return resp.status_code == 200

    # ------------------------------------------------------------------
    # Ad (Creative)
    # ------------------------------------------------------------------

    async def _create_ad(
        self,
        headers: Dict[str, str],
        ad_account_id: str,
        *,
        ad_group_id: str,
        name: str,
        headline: str = "",
        body_text: str = "",
        url: str = "",
        thumbnail_url: str = "",
        call_to_action: str = "LEARN_MORE",
        **kwargs: Any,
    ) -> Optional[str]:
        payload = {
            "ad_group_id": ad_group_id,
            "name": name,
            "configured_status": "PAUSED",
            "post_url": url,
            "headline": headline,
            "click_url": url,
            "thumbnail_url": thumbnail_url,
            "call_to_action": call_to_action,
        }
        resp = await self._client.post(
            f"/ad_accounts/{ad_account_id}/ads",
            headers=headers,
            json=payload,
        )
        body = self._safe_json(resp)
        data = body.get("data", {})
        if data.get("id"):
            return data["id"]
        logger.error("Reddit ad creation failed: %s", body)
        return None

    # ------------------------------------------------------------------
    # Reporting / Metrics
    # ------------------------------------------------------------------

    async def get_campaign_metrics(
        self,
        access_token: str,
        ad_account_id: str,
        campaign_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> RedditMetricsResult:
        """Fetch performance metrics for a Reddit campaign.

        Parameters
        ----------
        date_from / date_to : str
            Date strings in YYYY-MM-DD format.
        """
        headers = self._auth_headers(access_token)
        params: Dict[str, Any] = {
            "entity": "CAMPAIGN",
            "id": campaign_id,
        }
        if date_from:
            params["starts_at"] = date_from
        if date_to:
            params["ends_at"] = date_to

        resp = await self._client.get(
            f"/ad_accounts/{ad_account_id}/reports",
            headers=headers,
            params=params,
        )
        body = self._safe_json(resp)
        data = body.get("data", [{}])
        row = data[0] if data else {}

        return RedditMetricsResult(
            campaign_id=campaign_id,
            impressions=int(row.get("impressions", 0)),
            clicks=int(row.get("clicks", 0)),
            spend_micros=int(row.get("spend_micros", 0)),
            ecpm_micros=int(row.get("ecpm_micros", 0)),
            ctr=float(row.get("ctr", 0.0)),
            conversions=int(row.get("conversions", 0)),
            video_viewable_impressions=int(row.get("video_viewable_impressions", 0)),
            video_fully_viewed=int(row.get("video_fully_viewed", 0)),
            date_range={"from": date_from or "", "to": date_to or ""},
            raw_data=row,
        )

    # ------------------------------------------------------------------
    # Targeting helper
    # ------------------------------------------------------------------

    @staticmethod
    def _build_targeting(targeting: Dict[str, Any]) -> Dict[str, Any]:
        """Build a Reddit targeting specification.

        Accepts user-friendly keys and converts them to API format.
        """
        spec: Dict[str, Any] = {}

        # Subreddit targeting
        if "subreddits" in targeting:
            spec["subreddit"] = {
                "ids": targeting["subreddits"],  # list of subreddit IDs or names
            }

        # Interest targeting
        if "interests" in targeting:
            spec["interest"] = {
                "ids": targeting["interests"],
            }

        # Location targeting
        if "countries" in targeting:
            spec["geo"] = {
                "country": targeting["countries"],  # e.g. ["US", "CA"]
            }
        if "regions" in targeting:
            spec.setdefault("geo", {})["region"] = targeting["regions"]

        # Device targeting
        if "devices" in targeting:
            spec["device"] = targeting["devices"]  # e.g. ["DESKTOP", "MOBILE"]

        # Platform / OS targeting
        if "os" in targeting:
            spec["os"] = targeting["os"]  # e.g. ["IOS", "ANDROID"]

        # Community targeting (broad community topics)
        if "communities" in targeting:
            spec["community"] = {
                "ids": targeting["communities"],
            }

        return spec

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_json(resp: httpx.Response) -> Dict[str, Any]:
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text[:2000]}

    async def close(self) -> None:
        await self._client.aclose()
