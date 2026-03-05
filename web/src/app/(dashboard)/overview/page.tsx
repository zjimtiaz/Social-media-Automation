import { createSupabaseServer } from "@/lib/supabase/server";
import { OverviewClient } from "./overview-client";

export default async function OverviewPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  const orgId = profile?.organization_id;

  // Fetch stats in parallel
  const [contentRes, approvalsRes, campaignsRes, mentionsRes, activityRes] =
    await Promise.all([
      supabase
        .from("generated_content")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId ?? ""),
      supabase
        .from("approval_queue_items")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId ?? "")
        .eq("status", "pending"),
      supabase
        .from("ad_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId ?? "")
        .eq("status", "active"),
      supabase
        .from("community_mentions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId ?? ""),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("organization_id", orgId ?? "")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const stats = {
    totalContent: contentRes.count ?? 0,
    pendingApprovals: approvalsRes.count ?? 0,
    activeCampaigns: campaignsRes.count ?? 0,
    communityMentions: mentionsRes.count ?? 0,
  };

  const recentActivity = activityRes.data ?? [];

  return <OverviewClient stats={stats} recentActivity={recentActivity} />;
}
