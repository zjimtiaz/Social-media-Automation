import asyncio
from celery import shared_task

from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="app.tasks.content_tasks.generate_content")
def generate_content(self, organization_id: str, trigger_event_id: str,
                     target_platforms: list[str], content_types: list[str],
                     trigger_data: dict):
    """Generate AI content for specified platforms and content types."""
    from app.services.ai.claude_service import ClaudeService
    from app.services.publishing.formatter_service import FormatterService

    async def _generate():
        claude = ClaudeService()
        formatter = FormatterService()
        results = []

        for platform in target_platforms:
            for content_type in content_types:
                if content_type == "short_text":
                    text = await claude.generate_short_text(
                        prompt_data=trigger_data,
                        platform=platform,
                        tone="professional",
                    )
                elif content_type == "long_article":
                    text = await claude.generate_article(
                        prompt_data=trigger_data,
                        platform=platform,
                    )
                else:
                    continue

                formatted = formatter.format_for_platform(text, platform, content_type)
                results.append({
                    "platform": platform,
                    "content_type": content_type,
                    "title": formatted.get("title"),
                    "body": formatted["body"],
                    "hashtags": formatted.get("hashtags", []),
                })

        return results

    return asyncio.get_event_loop().run_until_complete(_generate())


@celery_app.task(bind=True, name="app.tasks.content_tasks.generate_platform_variants")
def generate_platform_variants(self, content_id: str, source_text: str,
                                target_platforms: list[str]):
    """Generate platform-specific variants of existing content."""
    from app.services.ai.claude_service import ClaudeService
    from app.services.publishing.formatter_service import FormatterService

    async def _generate():
        claude = ClaudeService()
        formatter = FormatterService()
        variants = []

        for platform in target_platforms:
            adapted = await claude.generate_short_text(
                prompt_data={"text": source_text},
                platform=platform,
                tone="professional",
            )
            formatted = formatter.format_for_platform(adapted, platform, "short_text")
            variants.append({
                "platform": platform,
                "body": formatted["body"],
                "hashtags": formatted.get("hashtags", []),
            })

        return variants

    return asyncio.get_event_loop().run_until_complete(_generate())
