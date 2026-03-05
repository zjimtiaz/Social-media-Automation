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
// GET /api/ads/campaigns  --  List campaigns (paginated, filterable)
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
    const objective = searchParams.get("objective");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("ad_campaigns")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId!)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (platform) query = query.eq("platform", platform);
    if (objective) query = query.eq("objective", objective);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error("GET /api/ads/campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/ads/campaigns  --  Create campaign draft
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

    const {
      platform,
      connectionId,
      name,
      objective,
      daily_budget,
      total_budget,
      currency,
      start_date,
      end_date,
      targeting,
    } = body;

    if (!platform || !connectionId || !name || !objective) {
      return NextResponse.json(
        { error: "platform, connectionId, name, and objective are required" },
        { status: 400 }
      );
    }

    // Verify the connection belongs to this org
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("id")
      .eq("id", connectionId)
      .eq("organization_id", orgId!)
      .eq("is_active", true)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "Platform connection not found or inactive" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({
        organization_id: orgId!,
        platform,
        connection_id: connectionId,
        name,
        objective,
        status: "draft",
        daily_budget: daily_budget ?? null,
        total_budget: total_budget ?? null,
        currency: currency ?? "USD",
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        targeting: targeting ?? {},
        metadata: {},
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/ads/campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
