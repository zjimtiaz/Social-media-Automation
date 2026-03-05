"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { ApprovalQueueItem } from "@/types/database";
import { useRealtime } from "./use-realtime";

interface UseApprovalsOptions {
  itemType?: "content" | "community_response" | "ad_campaign";
  platform?: string;
  status?: string;
}

export function useApprovals(options: UseApprovalsOptions = {}) {
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const supabase = createSupabaseClient();

  const fetchApprovals = useCallback(async () => {
    let query = supabase
      .from("approval_queue")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (options.itemType) {
      query = query.eq("item_type", options.itemType);
    }
    if (options.platform) {
      query = query.eq("platform", options.platform);
    }
    if (options.status) {
      query = query.eq("status", options.status);
    } else {
      query = query.eq("status", "pending");
    }

    const { data, count: totalCount } = await query;

    if (data) {
      setApprovals(data as ApprovalQueueItem[]);
      setCount(totalCount ?? 0);
    }
    setLoading(false);
  }, [supabase, options.itemType, options.platform, options.status]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  useRealtime({
    table: "approval_queue",
    onChange: () => fetchApprovals(),
  });

  const approve = async (id: string, notes?: string) => {
    const response = await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", notes }),
    });
    if (response.ok) await fetchApprovals();
    return response.ok;
  };

  const reject = async (id: string, notes?: string) => {
    const response = await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", notes }),
    });
    if (response.ok) await fetchApprovals();
    return response.ok;
  };

  return { approvals, loading, count, approve, reject, refresh: fetchApprovals };
}
