import { Worker } from "bullmq";
import { getRedisConnection } from "@/lib/redis/client";
import { webhookIngestWorker } from "./webhook-ingest.worker";
import { scheduledPublishWorker } from "./scheduled-publish.worker";
import { communityPollWorker } from "./community-poll.worker";
import { adMetricsPullWorker } from "./ad-metrics-pull.worker";

const connection = getRedisConnection();

const workers = [
  webhookIngestWorker(connection),
  scheduledPublishWorker(connection),
  communityPollWorker(connection),
  adMetricsPullWorker(connection),
];

console.log(`Started ${workers.length} BullMQ workers`);

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
