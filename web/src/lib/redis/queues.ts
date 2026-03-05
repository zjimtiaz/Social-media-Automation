import { Queue } from "bullmq";
import { getRedisClient } from "./client";

// ---------------------------------------------------------------------------
// Queue names
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  WEBHOOK_INGEST: "webhook-ingest",
  CONTENT_GENERATION: "content-generation",
  SCHEDULED_PUBLISH: "scheduled-publish",
  COMMUNITY_POLL: "community-poll",
  AD_METRICS_PULL: "ad-metrics-pull",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ---------------------------------------------------------------------------
// Job data types
// ---------------------------------------------------------------------------

export interface WebhookIngestJobData {
  endpointId: string;
  platform: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface ContentGenerationJobData {
  organizationId: string;
  triggerId: string;
  platform: string;
  contentType: string;
  context: Record<string, unknown>;
}

export interface ScheduledPublishJobData {
  contentId: string;
  versionId: string;
  platform: string;
  scheduledFor: string;
  connectionId: string;
}

export interface CommunityPollJobData {
  organizationId: string;
  configId: string;
  platform: string;
  keywords: string[];
}

export interface AdMetricsPullJobData {
  organizationId: string;
  campaignId: string;
  platform: string;
  connectionId: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ---------------------------------------------------------------------------
// Queue factory
// ---------------------------------------------------------------------------

const queues = new Map<string, Queue>();

function getOrCreateQueue<T extends object>(name: string): Queue<T> {
  if (queues.has(name)) {
    return queues.get(name)! as Queue<T>;
  }

  const connection = getRedisClient();

  const queue = new Queue<T>(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 3600, // keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // keep failed jobs for 7 days
      },
    },
  });

  queues.set(name, queue);
  return queue;
}

// ---------------------------------------------------------------------------
// Typed queue getters
// ---------------------------------------------------------------------------

export function getWebhookIngestQueue() {
  return getOrCreateQueue<WebhookIngestJobData>(QUEUE_NAMES.WEBHOOK_INGEST);
}

export function getContentGenerationQueue() {
  return getOrCreateQueue<ContentGenerationJobData>(
    QUEUE_NAMES.CONTENT_GENERATION
  );
}

export function getScheduledPublishQueue() {
  return getOrCreateQueue<ScheduledPublishJobData>(
    QUEUE_NAMES.SCHEDULED_PUBLISH
  );
}

export function getCommunityPollQueue() {
  return getOrCreateQueue<CommunityPollJobData>(QUEUE_NAMES.COMMUNITY_POLL);
}

export function getAdMetricsPullQueue() {
  return getOrCreateQueue<AdMetricsPullJobData>(QUEUE_NAMES.AD_METRICS_PULL);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function closeAllQueues(): Promise<void> {
  const closing = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closing);
  queues.clear();
}
