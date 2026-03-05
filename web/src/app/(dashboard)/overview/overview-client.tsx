"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { ActivityLog } from "@/types/database";
import {
  FileText,
  CheckSquare,
  Megaphone,
  Users,
  Plus,
  Eye,
  Radio,
  ArrowRight,
} from "lucide-react";

interface OverviewClientProps {
  stats: {
    totalContent: number;
    pendingApprovals: number;
    activeCampaigns: number;
    communityMentions: number;
  };
  recentActivity: ActivityLog[];
}

const statCards = [
  {
    key: "totalContent" as const,
    label: "Total Content",
    icon: FileText,
    color: "bg-blue-50 text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    key: "pendingApprovals" as const,
    label: "Pending Approvals",
    icon: CheckSquare,
    color: "bg-yellow-50 text-yellow-600",
    iconBg: "bg-yellow-100",
  },
  {
    key: "activeCampaigns" as const,
    label: "Active Campaigns",
    icon: Megaphone,
    color: "bg-green-50 text-green-600",
    iconBg: "bg-green-100",
  },
  {
    key: "communityMentions" as const,
    label: "Community Mentions",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    iconBg: "bg-purple-100",
  },
];

const quickActions = [
  {
    label: "Create Content",
    href: "/content/new",
    icon: Plus,
    description: "Draft new content for your platforms",
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    label: "View Approvals",
    href: "/approvals",
    icon: Eye,
    description: "Review pending items in the queue",
    color: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200",
  },
  {
    label: "Configure Listening",
    href: "/community/config",
    icon: Radio,
    description: "Set up keyword monitoring",
    color: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200",
  },
];

function getActivityIcon(action: string): string {
  if (action.includes("content")) return "FileText";
  if (action.includes("campaign")) return "Megaphone";
  if (action.includes("approval")) return "CheckSquare";
  if (action.includes("mention")) return "Users";
  return "Activity";
}

export function OverviewClient({ stats, recentActivity }: OverviewClientProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {stats[card.key].toLocaleString()}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    card.iconBg
                  )}
                >
                  <Icon className={cn("h-6 w-6", card.color.split(" ")[1])} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Quick Actions
              </h2>
            </div>
            <div className="space-y-3 p-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      action.color
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{action.label}</p>
                      <p
                        className={cn(
                          "text-xs",
                          action.color.includes("text-white")
                            ? "text-blue-100"
                            : "text-gray-500"
                        )}
                      >
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Recent Activity
              </h2>
              <Link
                href="/settings"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentActivity.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    No recent activity
                  </p>
                  <p className="text-xs text-gray-400">
                    Activity will appear here as you use the platform
                  </p>
                </div>
              ) : (
                recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{log.action}</span>
                        {log.resource_type && (
                          <span className="text-gray-500">
                            {" "}
                            on {log.resource_type}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(log.created_at, "relative")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
