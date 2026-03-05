import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * POST /api/webhooks/[slug]
 *
 * Ingests webhook events from external platforms.
 * Authenticated via API key in the Authorization header (not JWT).
 * Writes a trigger_event row to Supabase and returns 202 Accepted.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace("Bearer ", "");

    // Hash the API key to look it up in the database
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const supabase = await createSupabaseServer();

    // Validate the API key
    const { data: keyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (keyError || !keyRecord) {
      return NextResponse.json(
        { error: "Invalid or inactive API key" },
        { status: 401 }
      );
    }

    // Check if the key has expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "API key has expired" },
        { status: 401 }
      );
    }

    // Check that the webhook scope is allowed
    if (
      keyRecord.scopes.length > 0 &&
      !keyRecord.scopes.includes("webhooks") &&
      !keyRecord.scopes.includes("*")
    ) {
      return NextResponse.json(
        { error: "API key does not have webhook scope" },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid or missing JSON body" },
        { status: 400 }
      );
    }

    // Find the webhook endpoint matching this slug
    const { data: endpoint } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("organization_id", keyRecord.organization_id)
      .eq("is_active", true)
      .limit(1)
      .single();

    // Write the trigger event
    const { data: triggerEvent, error: insertError } = await supabase
      .from("trigger_events")
      .insert({
        organization_id: keyRecord.organization_id,
        webhook_endpoint_id: endpoint?.id ?? null,
        platform: body.platform ?? slug,
        event_type: body.event_type ?? "webhook",
        payload: body,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create trigger event" },
        { status: 500 }
      );
    }

    // Update last_used_at on the API key
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    return NextResponse.json(
      { data: { id: triggerEvent.id, status: "accepted" } },
      { status: 202 }
    );
  } catch (error) {
    console.error("Webhook ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
