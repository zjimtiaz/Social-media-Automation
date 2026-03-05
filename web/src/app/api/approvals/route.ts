import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/approvals
 *
 * List pending approval queue items (filterable by item_type, platform, status).
 * Query params: ?page=1&limit=20&item_type=content&status=pending&platform=twitter
 */
export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const itemType = searchParams.get("item_type");
    const status = searchParams.get("status") ?? "pending";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("approval_queue_items")
      .select("*", { count: "exact" })
      .eq("organization_id", profile.organization_id)
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (itemType) query = query.eq("item_type", itemType);

    const { data: items, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich items with their related content or response
    const enrichedItems = await Promise.all(
      (items ?? []).map(async (item) => {
        let content = null;
        let response = null;

        if (item.item_type === "content" && item.content_id) {
          const { data } = await supabase
            .from("generated_content")
            .select("*")
            .eq("id", item.content_id)
            .single();
          content = data;
        }

        if (item.item_type === "response" && item.response_id) {
          const { data } = await supabase
            .from("community_responses")
            .select("*")
            .eq("id", item.response_id)
            .single();
          response = data;
        }

        return { ...item, content, response };
      })
    );

    return NextResponse.json({ data: enrichedItems, count });
  } catch (error) {
    console.error("GET /api/approvals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
