import { Worker, type ConnectionOptions } from "bullmq";
import { getPythonClient } from "@/lib/python-client";

export function scheduledPublishWorker(connection: ConnectionOptions) {
  return new Worker(
    "scheduled-publish",
    async (job) => {
      const { contentId, platform, accessToken, refreshToken, accountId, metadata, text, mediaUrls, title } = job.data;

      const client = getPythonClient();

      const result = await client.publishContent({
        content_id: contentId,
        platform,
        access_token: accessToken,
        refresh_token: refreshToken,
        account_id: accountId,
        metadata,
        text,
        media_urls: mediaUrls,
        title,
      });

      return result;
    },
    {
      connection,
      concurrency: 3,
    }
  );
}
