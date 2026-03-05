-- Webhook endpoints for external app data ingestion
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  event_type TEXT NOT NULL DEFAULT 'generic',
  content_template JSONB,
  auto_platforms TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Trigger events (incoming data from webhooks, queues, etc.)
CREATE TABLE public.trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('webhook','queue','community_listen','manual','scheduled')),
  webhook_endpoint_id UUID REFERENCES public.webhook_endpoints(id),
  raw_payload JSONB NOT NULL,
  parsed_payload JSONB,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','completed','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trigger_events ENABLE ROW LEVEL SECURITY;
