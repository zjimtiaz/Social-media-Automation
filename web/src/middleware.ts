import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin bypass: if admin_session cookie exists, allow everything
  const adminCookie = request.cookies.get("admin_session");
  const isAdmin = adminCookie?.value === "zuhra_admin_authenticated";

  if (isAdmin) {
    // Redirect admin away from auth pages to dashboard
    const isAuthRoute = pathname === "/login" || pathname === "/signup";
    if (isAuthRoute) {
      const overviewUrl = request.nextUrl.clone();
      overviewUrl.pathname = "/overview";
      return NextResponse.redirect(overviewUrl);
    }
    return NextResponse.next();
  }

  // If Supabase is not configured, let all requests through
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  try {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { supabaseResponse, user } = await updateSession(request);

    // Protected routes: redirect unauthenticated users to /login
    const isProtected = pathname.startsWith("/overview") ||
      pathname.startsWith("/content") ||
      pathname.startsWith("/approvals") ||
      pathname.startsWith("/community") ||
      pathname.startsWith("/ads") ||
      pathname.startsWith("/platforms") ||
      pathname.startsWith("/webhooks") ||
      pathname.startsWith("/settings");

    if (isProtected && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Auth routes: redirect authenticated users to overview
    const isAuthRoute = pathname === "/login" || pathname === "/signup";
    if (isAuthRoute && user) {
      const overviewUrl = request.nextUrl.clone();
      overviewUrl.pathname = "/overview";
      return NextResponse.redirect(overviewUrl);
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
