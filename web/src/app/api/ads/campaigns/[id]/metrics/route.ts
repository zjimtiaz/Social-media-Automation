import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/ads/campaigns/[id]/metrics
 *
 * Retrieve metrics for a specific campaign.
 * Query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&ad_set_id=xxx
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify the campaign belongs to this org
    const { data: campaign } = await supabase
      .from("ad_campaigns")
      .select("id")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const adSetId = searchParams.get("ad_set_id");

    let query = supabase
      .from("ad_metrics")
      .select("*")
      .eq("campaign_id", id)
      .order("date", { ascending: true });

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
    if (adSetId) query = query.eq("ad_set_id", adSetId);

    const { data: metrics, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute summary
    const items = metrics ?? [];
    const summary =
      items.length > 0
        ? {
            totalImpressions: items.reduce((s, m) => s + m.impressions, 0),
            totalClicks: items.reduce((s, m) => s + m.clicks, 0),
            totalSpend: items.reduce((s, m) => s + m.spend, 0),
            totalConversions: items.reduce((s, m) => s + m.conversions, 0),
            averageCtr:
              items.reduce((s, m) => s + m.ctr, 0) / items.length,
            averageCpc:
              items.reduce((s, m) => s + m.cpc, 0) / items.length,
            averageCpm:
              items.reduce((s, m) => s + m.cpm, 0) / items.length,
          }
        : null;

    return NextResponse.json({ data: { metrics: items, summary } });
  } catch (error) {
    console.error("GET /api/ads/campaigns/[id]/metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
