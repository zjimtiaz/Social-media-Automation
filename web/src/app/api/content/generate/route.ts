import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

/**
 * POST /api/content/generate
 *
 * Proxy to Python service generateContent.
 * Expects: { platform, contentType, triggerEventId?, tone?, maxLength?, context? }
 */
export async function POST(request: Request) {
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

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { platform, contentType, triggerEventId, tone, maxLength, context } = body;

    if (!platform || !contentType) {
      return NextResponse.json(
        { error: "platform and contentType are required" },
        { status: 400 }
      );
    }

    const python = getPythonClient();
    const result = await python.generateContent({
      organizationId: profile.organization_id,
      platform,
      contentType,
      triggerContext: {
        ...(context ?? {}),
        triggerEventId: triggerEventId ?? null,
      },
      tone,
      maxLength,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof PythonServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 502 }
      );
    }
    console.error("POST /api/content/generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
