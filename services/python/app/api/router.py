from fastapi import APIRouter

from app.api.health.router import router as health_router
from app.api.content.router import router as content_router
from app.api.community.router import router as community_router
from app.api.publishing.router import router as publishing_router
from app.api.ads.router import router as ads_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["health"])
api_router.include_router(content_router, prefix="/content", tags=["content"])
api_router.include_router(community_router, prefix="/community", tags=["community"])
api_router.include_router(publishing_router, prefix="/publishing", tags=["publishing"])
api_router.include_router(ads_router, prefix="/ads", tags=["ads"])
