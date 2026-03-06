import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session");
  const isAdmin = adminCookie?.value === "zuhra_admin_authenticated";

  // Admin bypass: skip Supabase auth entirely
  if (isAdmin) {
    return (
      <DashboardShell
        orgName="Admin Organization"
        userName="Zuhra (Admin)"
        userAvatar={null}
      >
        {children}
      </DashboardShell>
    );
  }

  // Regular Supabase auth flow
  try {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/login");
    }

    // Fetch user profile (may fail if tables don't exist yet)
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fetch organization
    const { data: org } = profile?.organization_id
      ? await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single()
      : { data: null };

    const orgName = org?.name ?? "My Organization";
    const userName = profile?.full_name ?? user.email ?? "User";
    const userAvatar = profile?.avatar_url ?? null;

    return (
      <DashboardShell
        orgName={orgName}
        userName={userName}
        userAvatar={userAvatar}
      >
        {children}
      </DashboardShell>
    );
  } catch {
    redirect("/login");
  }
}
