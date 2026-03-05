import { NextResponse } from "next/server";

const OAUTH_CONFIGS: Record<string, { authUrl: string; scopes: string; clientIdEnv: string }> = {
  x: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: "tweet.read tweet.write users.read offline.access",
    clientIdEnv: "X_CLIENT_ID",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v22.0/dialog/oauth",
    scopes: "pages_manage_posts,pages_read_engagement,pages_show_list,ads_management",
    clientIdEnv: "FACEBOOK_APP_ID",
  },
  instagram: {
    authUrl: "https://www.facebook.com/v22.0/dialog/oauth",
    scopes: "instagram_basic,instagram_content_publish,instagram_manage_comments,pages_show_list",
    clientIdEnv: "FACEBOOK_APP_ID",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: "openid profile w_member_social r_organization_social",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
  },
  reddit: {
    authUrl: "https://www.reddit.com/api/v1/authorize",
    scopes: "identity submit read privatemessages",
    clientIdEnv: "REDDIT_CLIENT_ID",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl",
    clientIdEnv: "GOOGLE_CLIENT_ID",
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const config = OAUTH_CONFIGS[platform];

  if (!config) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return NextResponse.json({ error: "Platform not configured" }, { status: 500 });
  }

  const redirectUri = `${new URL(request.url).origin}/platforms/connect/${platform}/callback`;
  const state = crypto.randomUUID();

  const params2 = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes,
    state,
  });

  if (platform === "x") {
    params2.set("code_challenge", "challenge");
    params2.set("code_challenge_method", "plain");
  }

  if (platform === "reddit") {
    params2.set("duration", "permanent");
  }

  return NextResponse.redirect(`${config.authUrl}?${params2.toString()}`);
}
