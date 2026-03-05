import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/platforms/[platform]/disconnect
 *
 * Disconnect a platform by deleting or deactivating the connection.
 * Expects optional body: { connectionId?: string }
 * If connectionId is not provided, disconnects all connections for that platform.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
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

    // Only owners and admins can disconnect platforms
    if (!["owner", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can disconnect platforms" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const connectionId = body.connectionId;

    let query = supabase
      .from("platform_connections")
      .delete()
      .eq("organization_id", profile.organization_id)
      .eq("platform", platform);

    if (connectionId) {
      query = query.eq("id", connectionId);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to disconnect platform" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { platform, disconnected: true },
    });
  } catch (error) {
    console.error("POST /api/platforms/[platform]/disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
