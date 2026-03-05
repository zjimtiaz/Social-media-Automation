-- RLS Policies: users can only access data within their organization

-- Organizations
CREATE POLICY "Users can view their org" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles
CREATE POLICY "Users can view profiles in their org" ON public.profiles
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Platform connections
CREATE POLICY "Org members can view connections" ON public.platform_connections
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage connections" ON public.platform_connections
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- Generated content
CREATE POLICY "Org members can view content" ON public.generated_content
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Members can manage content" ON public.generated_content
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','member')
    )
  );

-- Content versions
CREATE POLICY "Org members can view versions" ON public.content_versions
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM public.generated_content
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Webhook endpoints
CREATE POLICY "Org members can view webhooks" ON public.webhook_endpoints
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage webhooks" ON public.webhook_endpoints
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- Trigger events
CREATE POLICY "Org members can view triggers" ON public.trigger_events
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Listening configs
CREATE POLICY "Org members can view listening configs" ON public.listening_configs
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Members can manage listening configs" ON public.listening_configs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','member')
    )
  );

-- Community mentions
CREATE POLICY "Org members can view mentions" ON public.community_mentions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Community responses
CREATE POLICY "Org members can view responses" ON public.community_responses
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Members can manage responses" ON public.community_responses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','member')
    )
  );

-- Ad campaigns
CREATE POLICY "Org members can view campaigns" ON public.ad_campaigns
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage campaigns" ON public.ad_campaigns
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- Ad sets
CREATE POLICY "Org members can view ad sets" ON public.ad_sets
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.ad_campaigns
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Ad metrics
CREATE POLICY "Org members can view metrics" ON public.ad_metrics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.ad_campaigns
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Approval queue
CREATE POLICY "Org members can view approvals" ON public.approval_queue
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage approvals" ON public.approval_queue
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- Activity log
CREATE POLICY "Org members can view activity" ON public.activity_log
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- API keys
CREATE POLICY "Org members can view API keys" ON public.api_keys
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage API keys" ON public.api_keys
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin')
    )
  );
