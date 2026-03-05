// ---------------------------------------------------------------------------
// HTTP client for the Python FastAPI micro-service
// ---------------------------------------------------------------------------

export interface PythonServiceConfig {
  baseUrl: string;
  serviceKey: string;
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Request / response helpers
// ---------------------------------------------------------------------------

interface GenerateContentRequest {
  organizationId: string;
  platform: string;
  contentType: string;
  triggerContext: Record<string, unknown>;
  tone?: string;
  maxLength?: number;
}

interface GenerateContentResponse {
  contentId: string;
  text: string;
  mediaUrls: string[];
  metadata: Record<string, unknown>;
}

interface GenerateVariantsRequest {
  contentId: string;
  platforms: string[];
  count?: number;
}

interface GenerateVariantsResponse {
  variants: Array<{
    versionId: string;
    platform: string;
    text: string;
    mediaUrls: string[];
  }>;
}

interface PublishContentRequest {
  contentId: string;
  versionId: string;
  platform: string;
  connectionId: string;
  scheduledFor?: string;
}

interface PublishContentResponse {
  success: boolean;
  platformPostId: string;
  publishedAt: string;
}

interface PublishBatchRequest {
  items: PublishContentRequest[];
}

interface PublishBatchResponse {
  results: Array<PublishContentResponse & { contentId: string }>;
}

interface PollCommunityRequest {
  organizationId: string;
  configId: string;
  platform: string;
  keywords: string[];
  since?: string;
}

interface PollCommunityResponse {
  mentions: Array<{
    externalId: string;
    platform: string;
    author: string;
    text: string;
    sentiment: string;
    detectedAt: string;
  }>;
}

interface GenerateResponseRequest {
  mentionId: string;
  mentionText: string;
  platform: string;
  tone?: string;
}

interface GenerateResponseResponse {
  responseId: string;
  text: string;
}

interface PublishResponseRequest {
  responseId: string;
  mentionId: string;
  platform: string;
  connectionId: string;
}

interface PublishResponseResponse {
  success: boolean;
  platformReplyId: string;
  publishedAt: string;
}

interface AnalyzeSentimentRequest {
  texts: string[];
}

interface AnalyzeSentimentResponse {
  results: Array<{
    text: string;
    sentiment: "positive" | "negative" | "neutral";
    score: number;
  }>;
}

interface LaunchAdRequest {
  organizationId: string;
  campaignId: string;
  platform: string;
  connectionId: string;
  objective: string;
  budget: number;
  targeting: Record<string, unknown>;
  creativeContentId: string;
}

interface LaunchAdResponse {
  success: boolean;
  platformCampaignId: string;
  platformAdSetId: string;
  launchedAt: string;
}

interface UpdateAdStatusRequest {
  campaignId: string;
  platform: string;
  connectionId: string;
  status: "active" | "paused" | "archived";
}

interface UpdateAdStatusResponse {
  success: boolean;
  updatedAt: string;
}

interface UpdateAdBudgetRequest {
  campaignId: string;
  platform: string;
  connectionId: string;
  dailyBudget?: number;
  totalBudget?: number;
}

interface UpdateAdBudgetResponse {
  success: boolean;
  updatedAt: string;
}

interface PullAdMetricsRequest {
  campaignId: string;
  platform: string;
  connectionId: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface PullAdMetricsResponse {
  metrics: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
  }>;
}

interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  services: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------

export class PythonServiceClient {
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly timeout: number;

  constructor(config?: Partial<PythonServiceConfig>) {
    this.baseUrl = (
      config?.baseUrl ?? process.env.PYTHON_SERVICE_URL ?? ""
    ).replace(/\/+$/, "");
    this.serviceKey = config?.serviceKey ?? process.env.SERVICE_KEY ?? "";
    this.timeout = config?.timeout ?? 30_000;

    if (!this.baseUrl) {
      throw new Error(
        "PYTHON_SERVICE_URL is not configured. Set the environment variable or pass baseUrl in config."
      );
    }
  }

  // ---- private helpers ---------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.serviceKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new PythonServiceError(
          `Python service responded with ${response.status}: ${errorBody}`,
          response.status,
          errorBody
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof PythonServiceError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PythonServiceError(
          `Request to ${path} timed out after ${this.timeout}ms`,
          408
        );
      }
      throw new PythonServiceError(
        `Failed to reach Python service: ${
          error instanceof Error ? error.message : String(error)
        }`,
        0
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---- content generation ------------------------------------------------

  async generateContent(
    data: GenerateContentRequest
  ): Promise<GenerateContentResponse> {
    return this.request<GenerateContentResponse>(
      "POST",
      "/api/v1/content/generate",
      data
    );
  }

  async generateVariants(
    data: GenerateVariantsRequest
  ): Promise<GenerateVariantsResponse> {
    return this.request<GenerateVariantsResponse>(
      "POST",
      "/api/v1/content/variants",
      data
    );
  }

  // ---- publishing --------------------------------------------------------

  async publishContent(
    data: PublishContentRequest
  ): Promise<PublishContentResponse> {
    return this.request<PublishContentResponse>(
      "POST",
      "/api/v1/publish",
      data
    );
  }

  async publishBatch(
    data: PublishBatchRequest
  ): Promise<PublishBatchResponse> {
    return this.request<PublishBatchResponse>(
      "POST",
      "/api/v1/publish/batch",
      data
    );
  }

  // ---- community / listening ---------------------------------------------

  async pollCommunity(
    data: PollCommunityRequest
  ): Promise<PollCommunityResponse> {
    return this.request<PollCommunityResponse>(
      "POST",
      "/api/v1/community/poll",
      data
    );
  }

  async generateResponse(
    data: GenerateResponseRequest
  ): Promise<GenerateResponseResponse> {
    return this.request<GenerateResponseResponse>(
      "POST",
      "/api/v1/community/generate-response",
      data
    );
  }

  async publishResponse(
    data: PublishResponseRequest
  ): Promise<PublishResponseResponse> {
    return this.request<PublishResponseResponse>(
      "POST",
      "/api/v1/community/publish-response",
      data
    );
  }

  async analyzeSentiment(
    data: AnalyzeSentimentRequest
  ): Promise<AnalyzeSentimentResponse> {
    return this.request<AnalyzeSentimentResponse>(
      "POST",
      "/api/v1/community/sentiment",
      data
    );
  }

  // ---- ads ---------------------------------------------------------------

  async launchAd(data: LaunchAdRequest): Promise<LaunchAdResponse> {
    return this.request<LaunchAdResponse>("POST", "/api/v1/ads/launch", data);
  }

  async updateAdStatus(
    data: UpdateAdStatusRequest
  ): Promise<UpdateAdStatusResponse> {
    return this.request<UpdateAdStatusResponse>(
      "PATCH",
      "/api/v1/ads/status",
      data
    );
  }

  async updateAdBudget(
    data: UpdateAdBudgetRequest
  ): Promise<UpdateAdBudgetResponse> {
    return this.request<UpdateAdBudgetResponse>(
      "PATCH",
      "/api/v1/ads/budget",
      data
    );
  }

  async pullAdMetrics(
    data: PullAdMetricsRequest
  ): Promise<PullAdMetricsResponse> {
    return this.request<PullAdMetricsResponse>(
      "POST",
      "/api/v1/ads/metrics",
      data
    );
  }

  // ---- health ------------------------------------------------------------

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>("GET", "/health");
  }
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class PythonServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "PythonServiceError";
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: PythonServiceClient | null = null;

export function getPythonClient(
  config?: Partial<PythonServiceConfig>
): PythonServiceClient {
  if (!instance) {
    instance = new PythonServiceClient(config);
  }
  return instance;
}
