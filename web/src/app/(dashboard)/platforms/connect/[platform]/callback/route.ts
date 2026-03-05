import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const TOKEN_ENDPOINTS: Record<string, string> = {
  x: "https://api.twitter.com/2/oauth2/token",
  facebook: "https://graph.facebook.com/v22.0/oauth/access_token",
  instagram: "https://graph.facebook.com/v22.0/oauth/access_token",
  linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
  reddit: "https://www.reddit.com/api/v1/access_token",
  youtube: "https://oauth2.googleapis.com/token",
};

const CLIENT_SECRETS: Record<string, { idEnv: string; secretEnv: string }> = {
  x: { idEnv: "X_CLIENT_ID", secretEnv: "X_CLIENT_SECRET" },
  facebook: { idEnv: "FACEBOOK_APP_ID", secretEnv: "FACEBOOK_APP_SECRET" },
  instagram: { idEnv: "FACEBOOK_APP_ID", secretEnv: "FACEBOOK_APP_SECRET" },
  linkedin: { idEnv: "LINKEDIN_CLIENT_ID", secretEnv: "LINKEDIN_CLIENT_SECRET" },
  reddit: { idEnv: "REDDIT_CLIENT_ID", secretEnv: "REDDIT_CLIENT_SECRET" },
  youtube: { idEnv: "GOOGLE_CLIENT_ID", secretEnv: "GOOGLE_CLIENT_SECRET" },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/platforms?error=${error || "no_code"}`);
  }

  const tokenEndpoint = TOKEN_ENDPOINTS[platform];
  const secrets = CLIENT_SECRETS[platform];
  if (!tokenEndpoint || !secrets) {
    return NextResponse.redirect(`${url.origin}/platforms?error=unsupported_platform`);
  }

  const clientId = process.env[secrets.idEnv]!;
  const clientSecret = process.env[secrets.secretEnv]!;
  const redirectUri = `${url.origin}/platforms/connect/${platform}/callback`;

  try {
    // Exchange code for token
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    if (platform === "x") {
      tokenBody.set("code_verifier", "challenge");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (platform === "reddit") {
      headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    }

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers,
      body: tokenBody.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${url.origin}/platforms?error=token_exchange_failed`);
    }

    // Save to database
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${url.origin}/login`);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.redirect(`${url.origin}/platforms?error=no_organization`);
    }

    await supabase.from("platform_connections").upsert({
      organization_id: profile.organization_id,
      platform,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      account_name: tokenData.screen_name || tokenData.name || platform,
      account_id: tokenData.user_id || tokenData.id || "default",
      is_active: true,
    }, {
      onConflict: "organization_id,platform,account_id",
    });

    return NextResponse.redirect(`${url.origin}/platforms?connected=${platform}`);
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err);
    return NextResponse.redirect(`${url.origin}/platforms?error=callback_failed`);
  }
}
