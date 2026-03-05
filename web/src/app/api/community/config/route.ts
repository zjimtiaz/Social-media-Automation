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

  if (authError || !user) return { orgId: null, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { orgId: null, error: "Profile not found" };

  return { orgId: profile.organization_id, error: null };
}

// ---------------------------------------------------------------------------
// GET /api/community/config  --  List listening configs
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const isActive = searchParams.get("is_active");

    let query = supabase
      .from("listening_configs")
      .select("*")
      .eq("organization_id", orgId!)
      .order("created_at", { ascending: false });

    if (platform) query = query.eq("platform", platform);
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/community/config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/community/config  --  Create listening config
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { platform, keywords, excluded_keywords, language, region, poll_interval_minutes } = body;

    if (!platform || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "platform and keywords (non-empty array) are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("listening_configs")
      .insert({
        organization_id: orgId!,
        platform,
        keywords,
        excluded_keywords: excluded_keywords ?? [],
        language: language ?? null,
        region: region ?? null,
        is_active: true,
        poll_interval_minutes: poll_interval_minutes ?? 15,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/community/config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/community/config  --  Update listening config
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { orgId, error: authErr } = await getOrgId(supabase);

    if (authErr) {
      return NextResponse.json({ error: authErr }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const allowedFields = [
      "keywords",
      "excluded_keywords",
      "language",
      "region",
      "is_active",
      "poll_interval_minutes",
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
      .from("listening_configs")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", orgId!)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Config not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/community/config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
