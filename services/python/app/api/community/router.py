from fastapi import APIRouter, HTTPException

from app.api.community.schemas import (
    AnalyzeSentimentRequest,
    AnalyzeSentimentResponse,
    GenerateResponseRequest,
    GenerateResponseResponse,
    PollAllRequest,
    PollAllResponse,
    PollRequest,
    PollResponse,
    PublishResponseRequest,
    PublishResponseResponse,
)
from app.services.community import community_service

router = APIRouter()


@router.post("/poll", response_model=PollResponse)
async def poll_mentions(request: PollRequest):
    """Execute one polling cycle for a specific community listening configuration.

    Connects to the configured platform, fetches new mentions/comments since
    the last poll, and stores them for processing.
    """
    try:
        result = await community_service.poll(
            organization_id=request.organization_id,
            listening_config_id=request.listening_config_id,
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
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Polling failed: {exc}",
        )


@router.post("/poll-all", response_model=PollAllResponse)
async def poll_all_configs(request: PollAllRequest):
    """Poll all active community listening configurations for an organisation.

    Iterates through every active listening config, executes a poll cycle for
    each, and returns aggregated results.
    """
    try:
        result = await community_service.poll_all(
            organization_id=request.organization_id,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Poll-all failed: {exc}",
        )


@router.post("/generate-response", response_model=GenerateResponseResponse)
async def generate_response(request: GenerateResponseRequest):
    """Generate an AI-drafted response for a community mention.

    Uses the organisation's brand voice and context from the original mention
    to craft a suitable reply, along with alternative options.
    """
    try:
        result = await community_service.generate_response(
            organization_id=request.organization_id,
            mention_id=request.mention_id,
            response_tone=request.response_tone,
            additional_context=request.additional_context,
            max_length=request.max_length,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Response generation failed: {exc}",
        )


@router.post("/publish-response", response_model=PublishResponseResponse)
async def publish_response(request: PublishResponseRequest):
    """Publish an approved response to the platform where the mention originated.

    Posts the final response text using the specified social account's
    credentials and returns the platform-native response ID.
    """
    try:
        result = await community_service.publish_response(
            organization_id=request.organization_id,
            mention_id=request.mention_id,
            response_text=request.response_text,
            social_account_id=request.social_account_id,
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
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Publishing response failed: {exc}",
        )


@router.post("/analyze-sentiment", response_model=AnalyzeSentimentResponse)
async def analyze_sentiment(request: AnalyzeSentimentRequest):
    """Analyse sentiment and risk level for a mention or raw text.

    Provide either a stored mention_id or raw text. Returns sentiment
    classification, risk assessment, extracted topics, and an urgency flag.
    """
    if not request.mention_id and not request.text:
        raise HTTPException(
            status_code=422,
            detail="Either mention_id or text must be provided",
        )

    try:
        result = await community_service.analyze_sentiment(
            organization_id=request.organization_id,
            mention_id=request.mention_id,
            text=request.text,
            include_topics=request.include_topics,
        )
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Sentiment analysis failed: {exc}",
        )
