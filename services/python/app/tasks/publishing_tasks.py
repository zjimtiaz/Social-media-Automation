import asyncio
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="app.tasks.publishing_tasks.publish_to_platform")
def publish_to_platform(self, content_id: str, platform: str,
                        access_token: str, refresh_token: str | None,
                        account_id: str, metadata: dict,
                        text: str, media_urls: list[str] | None = None,
                        title: str | None = None):
    """Publish content to a specific platform."""
    from app.services.platforms.factory import get_adapter

    async def _publish():
        adapter = get_adapter(platform, access_token, refresh_token, account_id, metadata)
        result = await adapter.publish_post(text=text, media_urls=media_urls, title=title)
        return {
            "content_id": content_id,
            "platform": platform,
            "platform_post_id": result.platform_post_id,
            "platform_post_url": result.platform_post_url,
        }

    return asyncio.get_event_loop().run_until_complete(_publish())


@celery_app.task(bind=True, name="app.tasks.publishing_tasks.publish_reply")
def publish_reply(self, response_id: str, platform: str,
                  access_token: str, refresh_token: str | None,
                  account_id: str, metadata: dict,
                  in_reply_to_id: str, text: str):
    """Publish a reply to a community post."""
    from app.services.platforms.factory import get_adapter

    async def _reply():
        adapter = get_adapter(platform, access_token, refresh_token, account_id, metadata)
        result = await adapter.publish_reply(in_reply_to_id=in_reply_to_id, text=text)
        return {
            "response_id": response_id,
            "platform": platform,
            "platform_response_id": result.platform_post_id,
            "platform_response_url": result.platform_post_url,
        }

    return asyncio.get_event_loop().run_until_complete(_reply())


@celery_app.task(name="app.tasks.publishing_tasks.publish_scheduled_content")
def publish_scheduled_content():
    """Check for and publish any content scheduled for now or earlier."""
    # This is called by Celery Beat every minute
    # It queries the DB for content with status='scheduled' and scheduled_publish_at <= now
    # Then dispatches publish_to_platform tasks for each
    pass
