import asyncio

from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.community_tasks.poll_all_active_configs")
def poll_all_active_configs():
    """Poll all active listening configs across all organizations.
    Called by Celery Beat every 5 minutes."""
    from app.services.community.listener_service import ListenerService

    async def _poll():
        listener = ListenerService()
        results = await listener.poll_all_active()
        return {"polls_completed": len(results), "results": results}

    return asyncio.get_event_loop().run_until_complete(_poll())


@celery_app.task(name="app.tasks.community_tasks.poll_single_config")
def poll_single_config(config_id: str):
    """Poll a single listening config."""
    from app.services.community.listener_service import ListenerService

    async def _poll():
        listener = ListenerService()
        return await listener.poll_config(config_id)

    return asyncio.get_event_loop().run_until_complete(_poll())


@celery_app.task(name="app.tasks.community_tasks.generate_and_respond")
def generate_and_respond(mention_id: str, mention_text: str, platform: str,
                         tone: str, guidelines: str | None,
                         access_token: str, refresh_token: str | None,
                         account_id: str, metadata: dict,
                         platform_post_id: str):
    """Generate an AI response and auto-publish it."""
    from app.services.community.response_generator import ResponseGenerator
    from app.services.platforms.factory import get_adapter

    async def _respond():
        generator = ResponseGenerator()
        response_text = await generator.generate(
            mention_text=mention_text,
            platform=platform,
            tone=tone,
            guidelines=guidelines,
        )

        adapter = get_adapter(platform, access_token, refresh_token, account_id, metadata)
        result = await adapter.publish_reply(
            in_reply_to_id=platform_post_id,
            text=response_text,
        )

        return {
            "mention_id": mention_id,
            "response_text": response_text,
            "platform_response_id": result.platform_post_id,
            "platform_response_url": result.platform_post_url,
        }

    return asyncio.get_event_loop().run_until_complete(_respond())
