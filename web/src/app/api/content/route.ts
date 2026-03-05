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
// GET /api/content  --  List content (paginated, filterable)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const contentType = searchParams.get("content_type");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("generated_content")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId!)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (platform) query = query.eq("platform", platform);
    if (contentType) query = query.eq("content_type", contentType);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error("GET /api/content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/content  --  Create manual content
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { orgId, userId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { platform, content_type, original_text, media_urls, tone, metadata } = body;

    if (!platform || !content_type || !original_text) {
      return NextResponse.json(
        { error: "platform, content_type, and original_text are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("generated_content")
      .insert({
        organization_id: orgId!,
        platform,
        content_type,
        original_text,
        media_urls: media_urls ?? [],
        tone: tone ?? null,
        metadata: metadata ?? {},
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
