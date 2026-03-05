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
// GET /api/content/[id]  --  Single content item
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

    const { data, error } = await supabase
      .from("generated_content")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId!)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Fetch associated versions
    const { data: versions } = await supabase
      .from("content_versions")
      .select("*")
      .eq("content_id", id)
      .order("version_number", { ascending: false });

    return NextResponse.json({ data: { ...data, versions: versions ?? [] } });
  } catch (error) {
    console.error("GET /api/content/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/content/[id]  --  Update content
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

    // Only allow updating specific fields
    const allowedFields = [
      "original_text",
      "media_urls",
      "tone",
      "status",
      "metadata",
      "platform",
      "content_type",
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
      .from("generated_content")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", orgId!)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Content not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/content/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/content/[id]  --  Delete content
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

    // Delete associated versions first
    await supabase.from("content_versions").delete().eq("content_id", id);

    // Delete associated approval queue items
    await supabase.from("approval_queue_items").delete().eq("content_id", id);

    const { error } = await supabase
      .from("generated_content")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId!);

    if (error) {
      return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/content/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
