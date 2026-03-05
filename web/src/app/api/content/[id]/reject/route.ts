import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/content/[id]/reject
 *
 * Reject a piece of content. Updates both the content status
 * and the corresponding approval_queue_items entry.
 * Expects body: { rejection_reason?: string }
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

    // Only owners, admins, and editors can reject
    if (!["owner", "admin", "editor"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to reject content" },
        { status: 403 }
      );
    }

    // Verify the content exists and belongs to this org
    const { data: content, error: contentError } = await supabase
      .from("generated_content")
      .select("id, status")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.status === "published") {
      return NextResponse.json(
        { error: "Cannot reject published content" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.rejection_reason ?? null;

    const now = new Date().toISOString();

    // Update content status to rejected
    const { data: updatedContent, error: updateError } = await supabase
      .from("generated_content")
      .update({
        status: "rejected",
        metadata: {
          ...((content as Record<string, unknown>).metadata ?? {}),
          rejection_reason: rejectionReason,
        },
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to reject content" },
        { status: 500 }
      );
    }

    // Update the approval queue item
    await supabase
      .from("approval_queue_items")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        review_note: rejectionReason,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("content_id", id)
      .eq("status", "pending");

    return NextResponse.json({ data: updatedContent });
  } catch (error) {
    console.error("POST /api/content/[id]/reject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
