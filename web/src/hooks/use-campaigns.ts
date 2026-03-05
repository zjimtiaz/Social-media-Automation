"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { AdCampaign, AdMetric } from "@/types/database";

interface UseCampaignsOptions {
  status?: string;
  platform?: string;
}

export function useCampaigns(options: UseCampaignsOptions = {}) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  const fetchCampaigns = useCallback(async () => {
    let query = supabase
      .from("ad_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (options.status) query = query.eq("status", options.status);
    if (options.platform) query = query.eq("platform", options.platform);

    const { data } = await query;
    if (data) setCampaigns(data as AdCampaign[]);
    setLoading(false);
  }, [supabase, options.status, options.platform]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, refresh: fetchCampaigns };
}

export function useCampaignMetrics(campaignId: string) {
  const [metrics, setMetrics] = useState<AdMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("ad_metrics")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("date", { ascending: true });

      if (data) setMetrics(data as AdMetric[]);
      setLoading(false);
    };

    fetch();
  }, [campaignId, supabase]);

  return { metrics, loading };
}
