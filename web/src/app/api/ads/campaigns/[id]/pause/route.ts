import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

/**
 * POST /api/ads/campaigns/[id]/pause
 *
 * Pause an active campaign on the platform via the Python service.
 */
export async function POST(
  _request: Request,
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

    // Fetch the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Only active campaigns can be paused" },
        { status: 400 }
      );
    }

    const python = getPythonClient();
    const result = await python.updateAdStatus({
      campaignId: id,
      platform: campaign.platform,
      connectionId: campaign.connection_id,
      status: "paused",
    });

    if (result.success) {
      await supabase
        .from("ad_campaigns")
        .update({
          status: "paused",
          updated_at: result.updatedAt,
        })
        .eq("id", id);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof PythonServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 502 }
      );
    }
    console.error("POST /api/ads/campaigns/[id]/pause error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
