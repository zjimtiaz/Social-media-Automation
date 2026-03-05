"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { createSupabaseClient } from "@/lib/supabase/client";

interface DashboardShellProps {
  children: React.ReactNode;
  orgName: string;
  userName: string;
  userAvatar?: string | null;
}

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/content": "Content",
  "/content/new": "Create Content",
  "/approvals": "Approvals",
  "/approvals/content": "Content Approvals",
  "/approvals/community": "Community Approvals",
  "/approvals/ads": "Ad Approvals",
  "/community": "Community",
  "/community/config": "Listening Configuration",
  "/ads": "Ad Campaigns",
  "/ads/new": "Create Campaign",
  "/platforms": "Platforms",
  "/webhooks": "Webhooks",
  "/settings": "Settings",
  "/settings/api-keys": "API Keys",
  "/settings/team": "Team",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Handle dynamic routes
  if (pathname.startsWith("/content/")) return "Content Detail";
  if (pathname.startsWith("/ads/")) return "Campaign Detail";
  if (pathname.startsWith("/community/")) return "Community Mentions";
  if (pathname.startsWith("/webhooks/")) return "Webhook Detail";

  return "Dashboard";
}

export function DashboardShell({
  children,
  orgName,
  userName,
  userAvatar,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        orgName={orgName}
        userName={userName}
        userAvatar={userAvatar}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={getPageTitle(pathname)}
          userName={userName}
          userAvatar={userAvatar}
          onMenuToggle={toggleSidebar}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
