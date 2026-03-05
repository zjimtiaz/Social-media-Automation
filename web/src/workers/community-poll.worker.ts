import { Worker, type ConnectionOptions } from "bullmq";
import { getPythonClient } from "@/lib/python-client";

export function communityPollWorker(connection: ConnectionOptions) {
  return new Worker(
    "community-poll",
    async (job) => {
      const { organizationId } = job.data;

      const client = getPythonClient();
      const result = await client.pollCommunity({ organization_id: organizationId });

      return result;
    },
    {
      connection,
      concurrency: 2,
    }
  );
}
