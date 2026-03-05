import { Worker, type ConnectionOptions } from "bullmq";
import { getPythonClient } from "@/lib/python-client";

export function webhookIngestWorker(connection: ConnectionOptions) {
  return new Worker(
    "webhook-ingest",
    async (job) => {
      const { organizationId, triggerEventId, triggerData, targetPlatforms, contentTypes } = job.data;

      const client = getPythonClient();

      const result = await client.generateContent({
        organization_id: organizationId,
        trigger_event_id: triggerEventId,
        trigger_data: triggerData,
        target_platforms: targetPlatforms,
        content_types: contentTypes,
      });

      return result;
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 10, duration: 1000 },
    }
  );
}
