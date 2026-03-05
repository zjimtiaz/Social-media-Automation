-- Ad campaigns
CREATE TABLE public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta','reddit')),
  platform_campaign_id TEXT,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','active','paused','completed','archived','failed')),

  -- Budget
  budget_type TEXT NOT NULL CHECK (budget_type IN ('daily','lifetime')),
  budget_amount_cents INTEGER NOT NULL,
  budget_currency TEXT NOT NULL DEFAULT 'USD',
  spent_amount_cents INTEGER NOT NULL DEFAULT 0,

  -- Scheduling
  start_date DATE,
  end_date DATE,

  -- Targeting
  targeting JSONB DEFAULT '{}',

  -- Content reference
  content_id UUID REFERENCES public.generated_content(id),
  ad_creative JSONB,

  -- Review
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ad sets within campaigns
CREATE TABLE public.ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  platform_adset_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  budget_amount_cents INTEGER,
  targeting JSONB DEFAULT '{}',
  bid_strategy TEXT,
  bid_amount_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ad performance metrics
CREATE TABLE public.ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  ad_set_id UUID REFERENCES public.ad_sets(id),
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend_cents INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  ctr REAL,
  cpc_cents INTEGER,
  cpm_cents INTEGER,
  roas REAL,
  raw_metrics JSONB DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, ad_set_id, date)
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_metrics ENABLE ROW LEVEL SECURITY;
