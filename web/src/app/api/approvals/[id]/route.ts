import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/approvals/[id]
 *
 * Approve or reject an approval queue item.
 * Expects body: { action: "approve" | "reject", notes?: string }
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
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { action, notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch the approval queue item
    const { data: item, error: itemError } = await supabase
      .from("approval_queue_items")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Approval item not found" }, { status: 404 });
    }

    if (item.status !== "pending") {
      return NextResponse.json(
        { error: `Item has already been ${item.status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update the approval queue item
    const { data: updatedItem, error: updateError } = await supabase
      .from("approval_queue_items")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        review_note: notes ?? null,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update approval item" },
        { status: 500 }
      );
    }

    // Also update the related content or response status
    if (item.item_type === "content" && item.content_id) {
      const contentStatus = action === "approve" ? "approved" : "rejected";
      const contentUpdate: Record<string, unknown> = {
        status: contentStatus,
        updated_at: now,
      };

      if (action === "reject" && notes) {
        // We need to read current metadata first to merge
        const { data: currentContent } = await supabase
          .from("generated_content")
          .select("metadata")
          .eq("id", item.content_id)
          .single();

        contentUpdate.metadata = {
          ...((currentContent?.metadata as Record<string, unknown>) ?? {}),
          rejection_reason: notes,
        };
      }

      await supabase
        .from("generated_content")
        .update(contentUpdate)
        .eq("id", item.content_id);
    }

    if (item.item_type === "response" && item.response_id) {
      const responseStatus = action === "approve" ? "approved" : "rejected";
      await supabase
        .from("community_responses")
        .update({
          status: responseStatus,
          updated_at: now,
        })
        .eq("id", item.response_id);
    }

    return NextResponse.json({ data: updatedItem });
  } catch (error) {
    console.error("POST /api/approvals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
