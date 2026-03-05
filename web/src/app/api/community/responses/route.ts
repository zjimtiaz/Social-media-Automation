import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

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
// GET /api/community/responses  --  List community responses
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
    const offset = (page - 1) * limit;

    // We need to join through community_mentions to scope by org
    // First get mention IDs for this org
    const { data: mentions } = await supabase
      .from("community_mentions")
      .select("id")
      .eq("organization_id", orgId!);

    const mentionIds = (mentions ?? []).map((m) => m.id);

    if (mentionIds.length === 0) {
      return NextResponse.json({ data: [], count: 0 });
    }

    let query = supabase
      .from("community_responses")
      .select("*", { count: "exact" })
      .in("mention_id", mentionIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error("GET /api/community/responses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/community/responses  --  Generate a response via Python service
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

    const { mentionId, tone } = body;

    if (!mentionId) {
      return NextResponse.json(
        { error: "mentionId is required" },
        { status: 400 }
      );
    }

    // Verify the mention exists and belongs to this org
    const { data: mention, error: mentionError } = await supabase
      .from("community_mentions")
      .select("*")
      .eq("id", mentionId)
      .eq("organization_id", orgId!)
      .single();

    if (mentionError || !mention) {
      return NextResponse.json({ error: "Mention not found" }, { status: 404 });
    }

    const python = getPythonClient();
    const result = await python.generateResponse({
      mentionId: mention.id,
      mentionText: mention.text,
      platform: mention.platform,
      tone,
    });

    // Save the generated response to the database
    const { data: savedResponse, error: saveError } = await supabase
      .from("community_responses")
      .insert({
        mention_id: mentionId,
        generated_text: result.text,
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        { error: "Failed to save generated response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: savedResponse }, { status: 201 });
  } catch (error) {
    if (error instanceof PythonServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 502 }
      );
    }
    console.error("POST /api/community/responses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
