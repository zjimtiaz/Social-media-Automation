"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { CommunityMention, ListeningConfig } from "@/types/database";
import { useRealtime } from "./use-realtime";

interface UseMentionsOptions {
  platform?: string;
  status?: string;
}

export function useMentions(options: UseMentionsOptions = {}) {
  const [mentions, setMentions] = useState<CommunityMention[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  const fetchMentions = useCallback(async () => {
    let query = supabase
      .from("community_mentions")
      .select("*")
      .order("discovered_at", { ascending: false })
      .limit(100);

    if (options.platform) query = query.eq("platform", options.platform);
    if (options.status) query = query.eq("status", options.status);

    const { data } = await query;
    if (data) setMentions(data as CommunityMention[]);
    setLoading(false);
  }, [supabase, options.platform, options.status]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  useRealtime({
    table: "community_mentions",
    onInsert: () => fetchMentions(),
  });

  return { mentions, loading, refresh: fetchMentions };
}

export function useListeningConfigs() {
  const [configs, setConfigs] = useState<ListeningConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  const fetchConfigs = useCallback(async () => {
    const { data } = await supabase
      .from("listening_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setConfigs(data as ListeningConfig[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const createConfig = async (config: Partial<ListeningConfig>) => {
    const { data, error } = await supabase
      .from("listening_configs")
      .insert(config)
      .select()
      .single();

    if (!error) await fetchConfigs();
    return { data, error };
  };

  const updateConfig = async (id: string, updates: Partial<ListeningConfig>) => {
    const { data, error } = await supabase
      .from("listening_configs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (!error) await fetchConfigs();
    return { data, error };
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase
      .from("listening_configs")
      .delete()
      .eq("id", id);

    if (!error) await fetchConfigs();
    return { error };
  };

  return { configs, loading, createConfig, updateConfig, deleteConfig, refresh: fetchConfigs };
}
