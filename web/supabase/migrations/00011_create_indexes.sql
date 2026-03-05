-- Performance indexes
CREATE INDEX idx_generated_content_org_status ON public.generated_content(organization_id, status);
CREATE INDEX idx_generated_content_org_platform ON public.generated_content(organization_id, target_platform);
CREATE INDEX idx_generated_content_scheduled ON public.generated_content(scheduled_publish_at) WHERE status = 'scheduled';
CREATE INDEX idx_community_mentions_org_status ON public.community_mentions(organization_id, status);
CREATE INDEX idx_community_mentions_platform_postid ON public.community_mentions(platform, platform_post_id);
CREATE INDEX idx_approval_queue_org_status ON public.approval_queue(organization_id, status);
CREATE INDEX idx_approval_queue_platform ON public.approval_queue(platform, status);
CREATE INDEX idx_ad_campaigns_org_status ON public.ad_campaigns(organization_id, status);
CREATE INDEX idx_ad_metrics_campaign_date ON public.ad_metrics(campaign_id, date);
CREATE INDEX idx_trigger_events_org_status ON public.trigger_events(organization_id, status);
CREATE INDEX idx_activity_log_org_created ON public.activity_log(organization_id, created_at DESC);
