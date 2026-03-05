import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

/**
 * POST /api/content/[id]/publish
 *
 * Publish a piece of content via the Python service.
 * Expects body: { versionId, scheduledFor? }
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
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch the content to verify ownership and get platform info
    const { data: content, error: contentError } = await supabase
      .from("generated_content")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.status !== "approved") {
      return NextResponse.json(
        { error: "Content must be approved before publishing" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { versionId, scheduledFor } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "versionId is required" },
        { status: 400 }
      );
    }

    // Find a platform connection for this content's platform
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("platform", content.platform)
      .eq("is_active", true)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: `No active connection found for platform: ${content.platform}` },
        { status: 400 }
      );
    }

    const python = getPythonClient();
    const result = await python.publishContent({
      contentId: id,
      versionId,
      platform: content.platform,
      connectionId: connection.id,
      scheduledFor,
    });

    // Update content status in the database
    if (result.success) {
      await supabase
        .from("generated_content")
        .update({
          status: "published",
          published_at: result.publishedAt,
          platform_post_id: result.platformPostId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof PythonServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 502 }
      );
    }
    console.error("POST /api/content/[id]/publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
