import type {
  Organization,
  Profile,
  PlatformConnection,
  WebhookEndpoint,
  TriggerEvent,
  GeneratedContent,
  ContentVersion,
  ListeningConfig,
  CommunityMention,
  CommunityResponse,
  AdCampaign,
  AdSet,
  AdMetric,
  ApprovalQueueItem,
  ActivityLog,
  ApiKey,
} from "./database";

// ---------------------------------------------------------------------------
// Generic envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  organizationName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  settings?: Record<string, unknown>;
}

export type OrganizationResponse = Organization;

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface UpdateProfileRequest {
  full_name?: string;
  avatar_url?: string | null;
  preferences?: Record<string, unknown>;
}

export interface InviteMemberRequest {
  email: string;
  role: Profile["role"];
}

export type ProfileResponse = Profile;

// ---------------------------------------------------------------------------
// Platform connections
// ---------------------------------------------------------------------------

export interface CreateConnectionRequest {
  platform: string;
  authCode: string;
  redirectUri: string;
}

export interface UpdateConnectionRequest {
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export type ConnectionResponse = PlatformConnection;

export interface OAuthStartResponse {
  authUrl: string;
  state: string;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface CreateWebhookRequest {
  platform: string;
  url: string;
  events: string[];
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  is_active?: boolean;
}

export type WebhookResponse = WebhookEndpoint;

// ---------------------------------------------------------------------------
// Trigger events
// ---------------------------------------------------------------------------

export type TriggerEventResponse = TriggerEvent;

export interface TriggerEventFilters extends PaginationParams {
  platform?: string;
  eventType?: string;
  status?: TriggerEvent["status"];
  startDate?: string;
  endDate?: string;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export interface GenerateContentRequest {
  platform: string;
  contentType: string;
  triggerEventId?: string;
  tone?: string;
  maxLength?: number;
  context?: Record<string, unknown>;
}

export interface UpdateContentRequest {
  original_text?: string;
  media_urls?: string[];
  tone?: string;
  status?: GeneratedContent["status"];
  metadata?: Record<string, unknown>;
}

export type ContentResponse = GeneratedContent & {
  versions: ContentVersion[];
};

export interface ContentFilters extends PaginationParams {
  platform?: string;
  contentType?: string;
  status?: GeneratedContent["status"];
  startDate?: string;
  endDate?: string;
}

export interface PublishContentRequest {
  contentId: string;
  versionId: string;
  scheduledFor?: string;
}

export interface PublishContentResponse {
  success: boolean;
  platformPostId: string;
  publishedAt: string;
}

// ---------------------------------------------------------------------------
// Content versions
// ---------------------------------------------------------------------------

export interface CreateVersionRequest {
  contentId: string;
  platform: string;
  text: string;
  media_urls?: string[];
  metadata?: Record<string, unknown>;
}

export type VersionResponse = ContentVersion;

// ---------------------------------------------------------------------------
// Listening / community
// ---------------------------------------------------------------------------

export interface CreateListeningConfigRequest {
  platform: string;
  keywords: string[];
  excluded_keywords?: string[];
  language?: string;
  region?: string;
  poll_interval_minutes?: number;
}

export interface UpdateListeningConfigRequest {
  keywords?: string[];
  excluded_keywords?: string[];
  language?: string;
  region?: string;
  is_active?: boolean;
  poll_interval_minutes?: number;
}

export type ListeningConfigResponse = ListeningConfig;

export type MentionResponse = CommunityMention & {
  response?: CommunityResponse | null;
};

export interface MentionFilters extends PaginationParams {
  platform?: string;
  sentiment?: CommunityMention["sentiment"];
  isReplied?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface GenerateReplyRequest {
  mentionId: string;
  tone?: string;
}

export interface ApproveReplyRequest {
  responseId: string;
  finalText?: string;
}

export type CommunityResponseResponse = CommunityResponse;

// ---------------------------------------------------------------------------
// Ad campaigns
// ---------------------------------------------------------------------------

export interface CreateCampaignRequest {
  platform: string;
  connectionId: string;
  name: string;
  objective: string;
  daily_budget?: number;
  total_budget?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  targeting?: Record<string, unknown>;
}

export interface UpdateCampaignRequest {
  name?: string;
  status?: AdCampaign["status"];
  daily_budget?: number;
  total_budget?: number;
  start_date?: string;
  end_date?: string;
  targeting?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type CampaignResponse = AdCampaign & {
  adSets: AdSet[];
  metrics?: AdMetricsSummary;
};

export interface CampaignFilters extends PaginationParams {
  platform?: string;
  status?: AdCampaign["status"];
  objective?: string;
}

// ---------------------------------------------------------------------------
// Ad sets
// ---------------------------------------------------------------------------

export interface CreateAdSetRequest {
  campaignId: string;
  name: string;
  targeting?: Record<string, unknown>;
  daily_budget?: number;
  bid_strategy?: string;
  creative_content_id?: string;
}

export interface UpdateAdSetRequest {
  name?: string;
  status?: AdSet["status"];
  targeting?: Record<string, unknown>;
  daily_budget?: number;
  bid_strategy?: string;
  creative_content_id?: string;
}

export type AdSetResponse = AdSet;

// ---------------------------------------------------------------------------
// Ad metrics
// ---------------------------------------------------------------------------

export type AdMetricResponse = AdMetric;

export interface AdMetricsFilters {
  campaignId?: string;
  adSetId?: string;
  startDate: string;
  endDate: string;
  granularity?: "daily" | "weekly" | "monthly";
}

export interface AdMetricsSummary {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
  averageCpm: number;
}

// ---------------------------------------------------------------------------
// Approval queue
// ---------------------------------------------------------------------------

export interface ReviewApprovalRequest {
  status: "approved" | "rejected" | "revision_requested";
  reviewNote?: string;
}

export type ApprovalQueueItemResponse = ApprovalQueueItem & {
  content?: GeneratedContent | null;
  response?: CommunityResponse | null;
};

export interface ApprovalFilters extends PaginationParams {
  itemType?: ApprovalQueueItem["item_type"];
  status?: ApprovalQueueItem["status"];
}

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

export type ActivityLogResponse = ActivityLog;

export interface ActivityLogFilters extends PaginationParams {
  action?: string;
  resourceType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expires_at?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  /** The raw key is only returned once at creation time. */
  rawKey: string;
}

export type ApiKeyResponse = ApiKey;

// ---------------------------------------------------------------------------
// Dashboard / analytics
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalContentPublished: number;
  totalMentions: number;
  totalAdSpend: number;
  activeCampaigns: number;
  pendingApprovals: number;
  contentByPlatform: Record<string, number>;
  mentionSentiment: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  recentActivity: ActivityLog[];
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  value: number;
}

export interface AnalyticsRequest {
  startDate: string;
  endDate: string;
  platform?: string;
  granularity?: "daily" | "weekly" | "monthly";
}

export interface AnalyticsResponse {
  impressions: AnalyticsTimeSeriesPoint[];
  engagement: AnalyticsTimeSeriesPoint[];
  reach: AnalyticsTimeSeriesPoint[];
  clicks: AnalyticsTimeSeriesPoint[];
}
