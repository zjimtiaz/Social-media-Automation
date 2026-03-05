import { Worker, type ConnectionOptions } from "bullmq";
import { getPythonClient } from "@/lib/python-client";

export function adMetricsPullWorker(connection: ConnectionOptions) {
  return new Worker(
    "ad-metrics-pull",
    async (job) => {
      const { campaignId, platform, platformCampaignId, adAccountId, accessToken } = job.data;

      const client = getPythonClient();
      const result = await client.pullAdMetrics({
        campaign_id: campaignId,
        platform,
        platform_campaign_id: platformCampaignId,
        ad_account_id: adAccountId,
        access_token: accessToken,
      });

      return result;
    },
    {
      connection,
      concurrency: 5,
    }
  );
}
