from fastapi import APIRouter
import redis.asyncio as aioredis

from app.config import get_settings

router = APIRouter()


@router.get("")
async def health_check():
    settings = get_settings()
    checks = {"status": "healthy", "services": {}}

    # Check Redis
    try:
        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        checks["services"]["redis"] = "connected"
        await r.aclose()
    except Exception as e:
        checks["services"]["redis"] = f"error: {str(e)}"
        checks["status"] = "degraded"

    # Check AI providers
    checks["services"]["anthropic"] = "configured" if settings.anthropic_api_key else "not configured"
    checks["services"]["stability"] = "configured" if settings.stability_api_key else "not configured"
    checks["services"]["replicate"] = "configured" if settings.replicate_api_token else "not configured"

    return checks
