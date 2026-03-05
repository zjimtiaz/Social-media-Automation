import asyncio
from celery import shared_task

from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="app.tasks.media_tasks.generate_image",
                 max_retries=3, default_retry_delay=30)
def generate_image(self, content_id: str, prompt: str, platform: str):
    """Generate an image using Stability AI."""
    from app.services.ai.stability_service import StabilityService

    PLATFORM_ASPECTS = {
        "x": "16:9",
        "instagram": "1:1",
        "facebook": "16:9",
        "linkedin": "1.91:1",
        "reddit": "16:9",
        "youtube": "16:9",
    }

    async def _generate():
        stability = StabilityService()
        aspect = PLATFORM_ASPECTS.get(platform, "16:9")
        image_data = await stability.generate_image(
            prompt=prompt,
            aspect_ratio=aspect,
            style="photographic",
        )
        return {
            "content_id": content_id,
            "image_data": image_data,
            "platform": platform,
        }

    try:
        return asyncio.get_event_loop().run_until_complete(_generate())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, name="app.tasks.media_tasks.generate_video",
                 max_retries=10, default_retry_delay=60)
def generate_video(self, content_id: str, prompt: str, duration: int = 15):
    """Generate a short video using Replicate."""
    from app.services.ai.replicate_service import ReplicateService

    async def _generate():
        replicate_svc = ReplicateService()
        prediction = await replicate_svc.generate_video(
            prompt=prompt,
            duration=duration,
            resolution="720p",
        )
        return {
            "content_id": content_id,
            "prediction_id": prediction["id"],
            "status": prediction["status"],
        }

    try:
        return asyncio.get_event_loop().run_until_complete(_generate())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, name="app.tasks.media_tasks.check_video_status",
                 max_retries=30, default_retry_delay=30)
def check_video_status(self, content_id: str, prediction_id: str):
    """Poll Replicate for video generation completion."""
    from app.services.ai.replicate_service import ReplicateService

    async def _check():
        replicate_svc = ReplicateService()
        result = await replicate_svc.check_prediction(prediction_id)
        if result["status"] == "succeeded":
            video_url = await replicate_svc.get_video_url(prediction_id)
            return {"content_id": content_id, "video_url": video_url, "status": "completed"}
        elif result["status"] == "failed":
            return {"content_id": content_id, "status": "failed", "error": result.get("error")}
        else:
            raise Exception("Video still processing")

    try:
        return asyncio.get_event_loop().run_until_complete(_check())
    except Exception as exc:
        raise self.retry(exc=exc)
