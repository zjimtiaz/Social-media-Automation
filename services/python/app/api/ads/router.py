from fastapi import APIRouter, HTTPException, Query

from app.api.ads.schemas import (
    LaunchCampaignRequest,
    LaunchCampaignResponse,
    PullMetricsBatchResponse,
    PullMetricsRequest,
    PullMetricsResponse,
    UpdateBudgetRequest,
    UpdateBudgetResponse,
    UpdateStatusRequest,
    UpdateStatusResponse,
)
from app.services.ads import ads_service

router = APIRouter()


@router.post("/launch", response_model=LaunchCampaignResponse)
async def launch_campaign(request: LaunchCampaignRequest):
    """Create and launch an ad campaign on the specified platform (Meta or Reddit).

    Builds the campaign structure on the ad platform including the campaign,
    ad sets/groups, and individual ads from the provided creatives and
    targeting specification.
    """
    try:
        result = await ads_service.launch_campaign(
            organization_id=request.organization_id,
            campaign_id=request.campaign_id,
            platform=request.platform.value,
            ad_account_id=request.ad_account_id,
            name=request.name,
            objective=request.objective.value,
            budget_type=request.budget_type.value,
            budget_amount_cents=request.budget_amount_cents,
            currency=request.currency,
            start_date=request.start_date,
            end_date=request.end_date,
            targeting=request.targeting.model_dump(),
            creatives=[c.model_dump() for c in request.creatives],
            platform_settings=request.platform_settings,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ad platform API error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Campaign launch failed: {exc}",
        )


@router.post("/update-status", response_model=UpdateStatusResponse)
async def update_campaign_status(request: UpdateStatusRequest):
    """Update the status of an existing campaign on the ad platform.

    Supports pausing, resuming, or completing campaigns.  The status change
    is applied on the platform first, then reflected in the local database.
    """
    try:
        result = await ads_service.update_status(
            organization_id=request.organization_id,
            campaign_id=request.campaign_id,
            platform=request.platform.value,
            platform_campaign_id=request.platform_campaign_id,
            new_status=request.new_status.value,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ad platform API error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Status update failed: {exc}",
        )


@router.post("/update-budget", response_model=UpdateBudgetResponse)
async def update_campaign_budget(request: UpdateBudgetRequest):
    """Update the budget of an existing campaign on the ad platform.

    Modifies the daily or lifetime budget directly on the platform and
    returns the old and new budget values for audit logging.
    """
    try:
        result = await ads_service.update_budget(
            organization_id=request.organization_id,
            campaign_id=request.campaign_id,
            platform=request.platform.value,
            platform_campaign_id=request.platform_campaign_id,
            budget_type=request.budget_type.value,
            new_budget_amount_cents=request.new_budget_amount_cents,
            currency=request.currency,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ad platform API error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Budget update failed: {exc}",
        )


@router.get("/pull-metrics", response_model=PullMetricsResponse)
async def pull_metrics(
    organization_id: str = Query(..., description="UUID of the organization"),
    campaign_id: str = Query(..., description="Internal campaign UUID"),
    platform: str = Query(..., description="Ad platform (meta or reddit)"),
    platform_campaign_id: str = Query(
        ..., description="Campaign ID on the ad platform"
    ),
    date_from: str | None = Query(
        None, description="ISO-8601 start of reporting window"
    ),
    date_to: str | None = Query(
        None, description="ISO-8601 end of reporting window"
    ),
):
    """Pull the latest performance metrics for a single campaign.

    Fetches impressions, clicks, spend, CTR, CPC, conversions, reach, and
    other platform-specific metrics from the ad platform's reporting API.
    """
    try:
        result = await ads_service.pull_metrics(
            organization_id=organization_id,
            campaign_id=campaign_id,
            platform=platform,
            platform_campaign_id=platform_campaign_id,
            date_from=date_from,
            date_to=date_to,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ad platform API error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Metrics pull failed: {exc}",
        )


@router.post("/pull-metrics-batch", response_model=PullMetricsBatchResponse)
async def pull_metrics_batch(request: PullMetricsRequest):
    """Pull metrics for all active campaigns belonging to an organisation.

    Iterates through every active campaign in the database, fetches their
    latest metrics from the respective ad platforms, and returns aggregated
    results.  Campaigns that fail individually are reported in the errors list.
    """
    try:
        result = await ads_service.pull_metrics_batch(
            organization_id=request.organization_id,
            date_from=request.date_from,
            date_to=request.date_to,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Batch metrics pull failed: {exc}",
        )
