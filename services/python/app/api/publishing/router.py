from fastapi import APIRouter, HTTPException

from app.api.publishing.schemas import (
    BatchPublishRequest,
    BatchPublishResponse,
    PublishRequest,
    PublishResponse,
)
from app.services.publishing import publishing_service

router = APIRouter()


@router.post("/publish", response_model=PublishResponse)
async def publish_content(request: PublishRequest):
    """Publish a content piece to a specific platform.

    Handles the full publishing flow: resolves the social account credentials,
    formats the post for the target platform, uploads media if present, and
    submits the post.  Supports both immediate publishing and scheduling.
    """
    try:
        result = await publishing_service.publish(
            organization_id=request.organization_id,
            content_id=request.content_id,
            platform=request.platform.value,
            social_account_id=request.social_account_id,
            text=request.text,
            media=[m.model_dump() for m in request.media],
            schedule_at=request.schedule_at,
            platform_specific=request.platform_specific,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Platform API error: {exc}",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Publishing failed: {exc}",
        )


@router.post("/publish-batch", response_model=BatchPublishResponse)
async def publish_batch(request: BatchPublishRequest):
    """Publish content to multiple platforms in a single request.

    Processes each item sequentially (to respect platform rate limits).
    Returns per-item results including successes and failures.  When
    stop_on_first_error is True, remaining items are skipped after the
    first failure.
    """
    try:
        result = await publishing_service.publish_batch(
            organization_id=request.organization_id,
            items=[item.model_dump() for item in request.items],
            stop_on_first_error=request.stop_on_first_error,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Batch publishing failed: {exc}",
        )
