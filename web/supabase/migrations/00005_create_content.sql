-- Generated content
CREATE TABLE public.generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_event_id UUID REFERENCES public.trigger_events(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('short_text','long_article','image','video','carousel')),
  target_platform TEXT NOT NULL CHECK (target_platform IN ('x','instagram','facebook','linkedin','quora','reddit','youtube')),

  -- Text content
  title TEXT,
  body TEXT,
  hashtags TEXT[],

  -- Media references
  media_urls TEXT[],
  media_storage_paths TEXT[],
  thumbnail_url TEXT,

  -- AI metadata
  ai_provider TEXT,
  ai_model TEXT,
  ai_prompt TEXT,
  ai_params JSONB,
  generation_cost_cents INTEGER DEFAULT 0,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN (
    'generating','generated','in_review','approved','rejected',
    'scheduled','publishing','published','failed'
  )),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  scheduled_publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- Platform response
  platform_post_id TEXT,
  platform_post_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content version history
CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.generated_content(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  body TEXT,
  media_urls TEXT[],
  edited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
