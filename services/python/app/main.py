from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.router import api_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    docs_url="/internal/docs" if settings.debug else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_service_key(request: Request, call_next):
    if request.url.path == "/internal/health":
        return await call_next(request)

    service_key = request.headers.get("X-Service-Key")
    if service_key != settings.service_key:
        raise HTTPException(status_code=403, detail="Invalid service key")

    return await call_next(request)


app.include_router(api_router, prefix="/internal")
