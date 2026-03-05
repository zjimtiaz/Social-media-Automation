from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "social_media_automation",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.content_tasks",
        "app.tasks.media_tasks",
        "app.tasks.publishing_tasks",
        "app.tasks.community_tasks",
        "app.tasks.ad_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_queue="default",
    task_routes={
        "app.tasks.content_tasks.*": {"queue": "content-generation"},
        "app.tasks.media_tasks.*": {"queue": "media-generation"},
        "app.tasks.publishing_tasks.*": {"queue": "platform-publish"},
        "app.tasks.community_tasks.*": {"queue": "community-listen"},
        "app.tasks.ad_tasks.*": {"queue": "ad-management"},
    },
)

# Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "poll-community-every-5-minutes": {
        "task": "app.tasks.community_tasks.poll_all_active_configs",
        "schedule": 300.0,  # 5 minutes
    },
    "pull-ad-metrics-every-15-minutes": {
        "task": "app.tasks.ad_tasks.pull_all_active_metrics",
        "schedule": 900.0,  # 15 minutes
    },
    "publish-scheduled-content": {
        "task": "app.tasks.publishing_tasks.publish_scheduled_content",
        "schedule": 60.0,  # every minute
    },
}
