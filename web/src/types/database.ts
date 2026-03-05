// ---------------------------------------------------------------------------
// Supabase database types  --  matches the DB schema
// ---------------------------------------------------------------------------

/** Convenience wrapper so the Supabase client can be generic-typed. */
export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization };
      profiles: { Row: Profile };
      platform_connections: { Row: PlatformConnection };
      webhook_endpoints: { Row: WebhookEndpoint };
      trigger_events: { Row: TriggerEvent };
      generated_content: { Row: GeneratedContent };
      content_versions: { Row: ContentVersion };
      listening_configs: { Row: ListeningConfig };
      community_mentions: { Row: CommunityMention };
      community_responses: { Row: CommunityResponse };
      ad_campaigns: { Row: AdCampaign };
      ad_sets: { Row: AdSet };
      ad_metrics: { Row: AdMetric };
      approval_queue_items: { Row: ApprovalQueueItem };
      activity_logs: { Row: ActivityLog };
      api_keys: { Row: ApiKey };
    };
  };
}

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: "free" | "starter" | "pro" | "enterprise";
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  avatar_url: string | null;
  role: "owner" | "admin" | "editor" | "viewer";
  email: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlatformConnection {
  id: string;
  organization_id: string;
  platform: string;
  account_name: string;
  account_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  scopes: string[];
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpoint {
  id: string;
  organization_id: string;
  platform: string;
  url: string;
  secret_encrypted: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriggerEvent {
  id: string;
  organization_id: string;
  webhook_endpoint_id: string | null;
  platform: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface GeneratedContent {
  id: string;
  organization_id: string;
  trigger_event_id: string | null;
  platform: string;
  content_type: string;
  original_text: string;
  media_urls: string[];
  tone: string | null;
  metadata: Record<string, unknown>;
  status: "draft" | "pending_approval" | "approved" | "published" | "rejected";
  published_at: string | null;
  platform_post_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  platform: string;
  text: string;
  media_urls: string[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ListeningConfig {
  id: string;
  organization_id: string;
  platform: string;
  keywords: string[];
  excluded_keywords: string[];
  language: string | null;
  region: string | null;
  is_active: boolean;
  poll_interval_minutes: number;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMention {
  id: string;
  organization_id: string;
  listening_config_id: string;
  platform: string;
  external_id: string;
  author_name: string;
  author_handle: string | null;
  author_avatar_url: string | null;
  text: string;
  url: string | null;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentiment_score: number | null;
  is_replied: boolean;
  detected_at: string;
  created_at: string;
}

export interface CommunityResponse {
  id: string;
  mention_id: string;
  generated_text: string;
  final_text: string | null;
  status: "draft" | "pending_approval" | "approved" | "published" | "rejected";
  platform_reply_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  organization_id: string;
  platform: string;
  connection_id: string;
  name: string;
  objective: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  platform_campaign_id: string | null;
  daily_budget: number | null;
  total_budget: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  targeting: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdSet {
  id: string;
  campaign_id: string;
  platform_ad_set_id: string | null;
  name: string;
  status: "active" | "paused" | "archived";
  targeting: Record<string, unknown>;
  daily_budget: number | null;
  bid_strategy: string | null;
  creative_content_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdMetric {
  id: string;
  campaign_id: string;
  ad_set_id: string | null;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number | null;
  frequency: number | null;
  video_views: number | null;
  engagement_rate: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApprovalQueueItem {
  id: string;
  organization_id: string;
  content_id: string | null;
  response_id: string | null;
  item_type: "content" | "response";
  status: "pending" | "approved" | "rejected" | "revision_requested" | "auto_approved";
  submitted_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
