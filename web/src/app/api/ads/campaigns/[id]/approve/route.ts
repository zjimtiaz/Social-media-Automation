import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

/**
 * POST /api/ads/campaigns/[id]/approve
 *
 * Approve a campaign and launch it on the platform via the Python service.
 * Expects optional body: { creativeContentId?: string }
 */
export async function POST(
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
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!["owner", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can approve campaigns" },
        { status: 403 }
      );
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

    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: `Campaign cannot be approved from status: ${campaign.status}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const creativeContentId = body.creativeContentId ?? "";

    // Launch the campaign on the platform via Python service
    const python = getPythonClient();
    const result = await python.launchAd({
      organizationId: profile.organization_id,
      campaignId: id,
      platform: campaign.platform,
      connectionId: campaign.connection_id,
      objective: campaign.objective,
      budget: campaign.daily_budget ?? campaign.total_budget ?? 0,
      targeting: campaign.targeting,
      creativeContentId,
    });

    // Update campaign status
    if (result.success) {
      const now = new Date().toISOString();

      await supabase
        .from("ad_campaigns")
        .update({
          status: "active",
          platform_campaign_id: result.platformCampaignId,
          metadata: {
            ...(campaign.metadata ?? {}),
            platform_ad_set_id: result.platformAdSetId,
            launched_at: result.launchedAt,
          },
          updated_at: now,
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
    console.error("POST /api/ads/campaigns/[id]/approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
