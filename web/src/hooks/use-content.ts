"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { GeneratedContent } from "@/types/database";

interface UseContentOptions {
  status?: string;
  platform?: string;
  contentType?: string;
  page?: number;
  limit?: number;
}

export function useContent(options: UseContentOptions = {}) {
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const supabase = createSupabaseClient();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const fetchContent = useCallback(async () => {
    let query = supabase
      .from("generated_content")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (options.status) query = query.eq("status", options.status);
    if (options.platform) query = query.eq("target_platform", options.platform);
    if (options.contentType) query = query.eq("content_type", options.contentType);

    const { data, count: totalCount } = await query;

    if (data) {
      setContent(data as GeneratedContent[]);
      setCount(totalCount ?? 0);
    }
    setLoading(false);
  }, [supabase, options.status, options.platform, options.contentType, page, limit]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const generateContent = async (body: {
    target_platforms: string[];
    content_types: string[];
    trigger_data: Record<string, any>;
  }) => {
    const response = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) await fetchContent();
    return response.json();
  };

  return { content, loading, count, generateContent, refresh: fetchContent };
}

export function useSingleContent(id: string) {
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("generated_content")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setContent(data as GeneratedContent);
      setLoading(false);
    };

    fetch();
  }, [id, supabase]);

  return { content, loading };
}
