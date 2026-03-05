-- Community listening configuration
CREATE TABLE public.listening_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('x','instagram','facebook','linkedin','quora','reddit','youtube')),
  keywords TEXT[] NOT NULL,
  subreddits TEXT[],
  exclude_keywords TEXT[],
  poll_interval_minutes INTEGER NOT NULL DEFAULT 5,
  auto_respond BOOLEAN NOT NULL DEFAULT false,
  auto_respond_risk_threshold REAL NOT NULL DEFAULT 0.3,
  response_tone TEXT DEFAULT 'professional',
  response_guidelines TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community mentions found by listener
CREATE TABLE public.community_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  listening_config_id UUID NOT NULL REFERENCES public.listening_configs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT NOT NULL,
  platform_post_url TEXT,
  author_username TEXT,
  author_profile_url TEXT,
  post_text TEXT NOT NULL,
  matched_keywords TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive','negative','neutral','question')),
  risk_score REAL DEFAULT 0.5,
  relevance_score REAL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','auto_responded','pending_review','responded','ignored','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform, platform_post_id)
);

-- Community responses (generated or manual)
CREATE TABLE public.community_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_id UUID NOT NULL REFERENCES public.community_mentions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','rejected','failed')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_response_id TEXT,
  platform_response_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listening_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_responses ENABLE ROW LEVEL SECURITY;
