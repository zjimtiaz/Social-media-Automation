from fastapi import APIRouter, HTTPException

from app.api.content.schemas import (
    GenerateContentRequest,
    GenerateContentResponse,
    GenerateVariantsRequest,
    GenerateVariantsResponse,
)
from app.services.content_generation import content_generation_service

router = APIRouter()


@router.post("/generate", response_model=GenerateContentResponse)
async def generate_content(request: GenerateContentRequest):
    """Trigger AI content generation for the specified platforms and content types.

    Accepts contextual trigger data (trending topics, calendar events, RSS items,
    etc.) and produces platform-optimised content pieces using the organisation's
    brand voice settings.
    """
    try:
        result = await content_generation_service.generate(
            organization_id=request.organization_id,
            trigger_data=request.trigger_data,
            target_platforms=[p.value for p in request.target_platforms],
            content_types=[ct.value for ct in request.content_types],
            brand_voice_id=request.brand_voice_id,
            language=request.language,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Content generation failed: {exc}",
        )


@router.post("/generate-variants", response_model=GenerateVariantsResponse)
async def generate_variants(request: GenerateVariantsRequest):
    """Generate platform-specific variants from an existing content piece.

    Takes a source content ID and produces tailored adaptations for each
    requested platform, optionally applying per-platform tone adjustments.
    """
    try:
        result = await content_generation_service.generate_variants(
            organization_id=request.organization_id,
            source_content_id=request.source_content_id,
            target_platforms=[p.value for p in request.target_platforms],
            tone_adjustments=request.tone_adjustments,
            max_variants_per_platform=request.max_variants_per_platform,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Variant generation failed: {exc}",
        )
