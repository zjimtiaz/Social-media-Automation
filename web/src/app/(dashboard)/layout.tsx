import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch organization
  const { data: org } = profile
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
}
