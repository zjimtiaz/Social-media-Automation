import asyncio

from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.ad_tasks.pull_all_active_metrics")
def pull_all_active_metrics():
    """Pull metrics for all active ad campaigns.
    Called by Celery Beat every 15 minutes."""
    # Query DB for active campaigns, pull metrics from each platform
    pass


@celery_app.task(name="app.tasks.ad_tasks.pull_campaign_metrics")
def pull_campaign_metrics(campaign_id: str, platform: str,
                          platform_campaign_id: str, ad_account_id: str,
                          access_token: str):
    """Pull metrics for a single campaign from its platform."""
    from app.services.ads.meta_ads_service import MetaAdsService
    from app.services.ads.reddit_ads_service import RedditAdsService

    async def _pull():
        if platform == "meta":
            service = MetaAdsService(access_token=access_token, ad_account_id=ad_account_id)
            metrics = await service.get_campaign_insights(platform_campaign_id)
        elif platform == "reddit":
            service = RedditAdsService(access_token=access_token)
            metrics = await service.get_campaign_metrics(platform_campaign_id)
        else:
            return {"error": f"Unknown ad platform: {platform}"}

        return {
            "campaign_id": campaign_id,
            "platform": platform,
            "metrics": metrics,
        }

    return asyncio.get_event_loop().run_until_complete(_pull())


@celery_app.task(name="app.tasks.ad_tasks.launch_campaign")
def launch_campaign(campaign_id: str, platform: str, campaign_data: dict,
                    access_token: str, ad_account_id: str = ""):
    """Launch a campaign on the ad platform."""
    from app.services.ads.meta_ads_service import MetaAdsService
    from app.services.ads.reddit_ads_service import RedditAdsService

    async def _launch():
        if platform == "meta":
            service = MetaAdsService(access_token=access_token, ad_account_id=ad_account_id)
            result = await service.create_campaign(campaign_data)
        elif platform == "reddit":
            service = RedditAdsService(access_token=access_token)
            result = await service.create_campaign(campaign_data)
        else:
            return {"error": f"Unknown ad platform: {platform}"}

        return {
            "campaign_id": campaign_id,
            "platform": platform,
            "platform_campaign_id": result.get("id"),
            "result": result,
        }

    return asyncio.get_event_loop().run_until_complete(_launch())
