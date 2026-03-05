import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/community/responses/[id]/approve
 *
 * Approve a community response.
 * Expects optional body: { finalText?: string }
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

    if (!["owner", "admin", "editor"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to approve responses" },
        { status: 403 }
      );
    }

    // Verify the response exists and belongs to this org (via mention)
    const { data: response, error: responseError } = await supabase
      .from("community_responses")
      .select("*, community_mentions!inner(organization_id)")
      .eq("id", id)
      .single();

    if (responseError || !response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    // Type assertion for the joined data
    const mentionData = response.community_mentions as unknown as { organization_id: string };
    if (mentionData.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const finalText = body.finalText ?? null;
    const now = new Date().toISOString();

    const { data: updatedResponse, error: updateError } = await supabase
      .from("community_responses")
      .update({
        status: "approved",
        final_text: finalText ?? response.generated_text,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to approve response" },
        { status: 500 }
      );
    }

    // Update any related approval queue items
    await supabase
      .from("approval_queue_items")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("response_id", id)
      .eq("status", "pending");

    return NextResponse.json({ data: updatedResponse });
  } catch (error) {
    console.error("POST /api/community/responses/[id]/approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
