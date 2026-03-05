from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Service
    app_name: str = "Social Media Automation - Python Service"
    debug: bool = False
    service_key: str = "change-me-in-production"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AI Providers
    anthropic_api_key: str = ""
    stability_api_key: str = ""
    replicate_api_token: str = ""

    # Claude defaults
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4096

    # Platform OAuth (stored in DB, these are app-level credentials)
    x_client_id: str = ""
    x_client_secret: str = ""
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""

    # Meta Ads
    meta_ads_account_id: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
