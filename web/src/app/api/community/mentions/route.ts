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
// GET /api/community/mentions  --  List mentions (filterable)
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
    const platform = searchParams.get("platform");
    const status = searchParams.get("status"); // replied / unreplied
    const sentiment = searchParams.get("sentiment");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("community_mentions")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId!)
      .order("detected_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) query = query.eq("platform", platform);
    if (sentiment) query = query.eq("sentiment", sentiment);
    if (status === "replied") query = query.eq("is_replied", true);
    if (status === "unreplied") query = query.eq("is_replied", false);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error("GET /api/community/mentions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
