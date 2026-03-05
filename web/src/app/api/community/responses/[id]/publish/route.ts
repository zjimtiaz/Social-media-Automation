import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

/**
 * POST /api/community/responses/[id]/publish
 *
 * Publish an approved community response via the Python service.
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

    // Fetch the response and its associated mention
    const { data: response, error: responseError } = await supabase
      .from("community_responses")
      .select("*, community_mentions!inner(id, platform, organization_id)")
      .eq("id", id)
      .single();

    if (responseError || !response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const mentionData = response.community_mentions as unknown as {
      id: string;
      platform: string;
      organization_id: string;
    };

    if (mentionData.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    if (response.status !== "approved") {
      return NextResponse.json(
        { error: "Response must be approved before publishing" },
        { status: 400 }
      );
    }

    // Find a platform connection
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("platform", mentionData.platform)
      .eq("is_active", true)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: `No active connection found for platform: ${mentionData.platform}` },
        { status: 400 }
      );
    }

    const python = getPythonClient();
    const result = await python.publishResponse({
      responseId: id,
      mentionId: mentionData.id,
      platform: mentionData.platform,
      connectionId: connection.id,
    });

    // Update response status
    if (result.success) {
      const now = new Date().toISOString();

      await supabase
        .from("community_responses")
        .update({
          status: "published",
          platform_reply_id: result.platformReplyId,
          published_at: result.publishedAt,
          updated_at: now,
        })
        .eq("id", id);

      // Mark the mention as replied
      await supabase
        .from("community_mentions")
        .update({ is_replied: true })
        .eq("id", mentionData.id);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof PythonServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 502 }
      );
    }
    console.error("POST /api/community/responses/[id]/publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
