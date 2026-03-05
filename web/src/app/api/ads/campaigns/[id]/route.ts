import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrgId(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { orgId: null, userId: null, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { orgId: null, userId: null, error: "Profile not found" };

  return { orgId: profile.organization_id, userId: user.id, error: null };
}

// ---------------------------------------------------------------------------
// GET /api/ads/campaigns/[id]  --  Single campaign
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const { data: campaign, error } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId!)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Fetch associated ad sets
    const { data: adSets } = await supabase
      .from("ad_sets")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });

    // Fetch metrics summary
    const { data: metrics } = await supabase
      .from("ad_metrics")
      .select("*")
      .eq("campaign_id", id);

    const metricsSummary = (metrics && metrics.length > 0)
      ? {
          totalImpressions: metrics.reduce((sum, m) => sum + m.impressions, 0),
          totalClicks: metrics.reduce((sum, m) => sum + m.clicks, 0),
          totalSpend: metrics.reduce((sum, m) => sum + m.spend, 0),
          totalConversions: metrics.reduce((sum, m) => sum + m.conversions, 0),
          averageCtr:
            metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length,
          averageCpc:
            metrics.reduce((sum, m) => sum + m.cpc, 0) / metrics.length,
          averageCpm:
            metrics.reduce((sum, m) => sum + m.cpm, 0) / metrics.length,
        }
      : undefined;

    return NextResponse.json({
      data: {
        ...campaign,
        adSets: adSets ?? [],
        metrics: metricsSummary,
      },
    });
  } catch (error) {
    console.error("GET /api/ads/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/ads/campaigns/[id]  --  Update campaign
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const allowedFields = [
      "name",
      "objective",
      "status",
      "daily_budget",
      "total_budget",
      "currency",
      "start_date",
      "end_date",
      "targeting",
      "metadata",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("ad_campaigns")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", orgId!)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Campaign not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/ads/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/ads/campaigns/[id]  --  Delete campaign
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    // Verify the campaign exists and is in draft status
    const { data: campaign } = await supabase
      .from("ad_campaigns")
      .select("id, status")
      .eq("id", id)
      .eq("organization_id", orgId!)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "active") {
      return NextResponse.json(
        { error: "Cannot delete an active campaign. Pause it first." },
        { status: 400 }
      );
    }

    // Delete associated metrics
    await supabase.from("ad_metrics").delete().eq("campaign_id", id);

    // Delete associated ad sets
    await supabase.from("ad_sets").delete().eq("campaign_id", id);

    // Delete the campaign
    const { error } = await supabase
      .from("ad_campaigns")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId!);

    if (error) {
      return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/ads/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
