"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS, CAMPAIGN_OBJECTIVES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Megaphone,
  MoreHorizontal,
  Pause,
  Play,
  Eye,
  TrendingUp,
} from "lucide-react";

type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

interface MockCampaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: CampaignStatus;
  total_budget: number;
  spent: number;
  currency: string;
  start_date: string;
  end_date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  active: { label: "Active", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500" },
};

const mockCampaigns: MockCampaign[] = [
  {
    id: "1",
    name: "Summer Sale 2025",
    platform: "facebook",
    objective: "conversions",
    status: "active",
    total_budget: 5000,
    spent: 2340,
    currency: "USD",
    start_date: "2025-06-01",
    end_date: "2025-07-31",
    impressions: 125000,
    clicks: 3200,
    ctr: 2.56,
  },
  {
    id: "2",
    name: "Brand Awareness Q3",
    platform: "instagram",
    objective: "awareness",
    status: "active",
    total_budget: 8000,
    spent: 1200,
    currency: "USD",
    start_date: "2025-07-01",
    end_date: "2025-09-30",
    impressions: 89000,
    clicks: 1800,
    ctr: 2.02,
  },
  {
    id: "3",
    name: "LinkedIn Lead Gen",
    platform: "linkedin",
    objective: "lead_generation",
    status: "paused",
    total_budget: 3000,
    spent: 1500,
    currency: "USD",
    start_date: "2025-05-15",
    end_date: "2025-06-30",
    impressions: 45000,
    clicks: 900,
    ctr: 2.0,
  },
  {
    id: "4",
    name: "Twitter Engagement",
    platform: "twitter",
    objective: "engagement",
    status: "completed",
    total_budget: 2000,
    spent: 2000,
    currency: "USD",
    start_date: "2025-04-01",
    end_date: "2025-05-31",
    impressions: 200000,
    clicks: 5600,
    ctr: 2.8,
  },
  {
    id: "5",
    name: "Product Launch Teaser",
    platform: "tiktok",
    objective: "video_views",
    status: "draft",
    total_budget: 4000,
    spent: 0,
    currency: "USD",
    start_date: "2025-07-15",
    end_date: "2025-08-15",
    impressions: 0,
    clicks: 0,
    ctr: 0,
  },
];

export default function AdsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockCampaigns.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Link
          href="/ads/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {["all", "active", "paused", "draft", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
              statusFilter === status
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {status === "all" ? "All Status" : status}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            No campaigns found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first ad campaign to get started.
          </p>
          <Link
            href="/ads/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const platformDef = PLATFORMS.find(
              (p) => p.id === campaign.platform
            );
            const objective = CAMPAIGN_OBJECTIVES.find(
              (o) => o.id === campaign.objective
            );
            const budgetPercent =
              campaign.total_budget > 0
                ? (campaign.spent / campaign.total_budget) * 100
                : 0;

            return (
              <Link
                key={campaign.id}
                href={`/ads/${campaign.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold"
                      style={{ backgroundColor: platformDef?.color }}
                    >
                      {platformDef?.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {campaign.name}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            statusConfig[campaign.status].className
                          )}
                        >
                          {statusConfig[campaign.status].label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>{platformDef?.name}</span>
                        <span>--</span>
                        <span>{objective?.label}</span>
                        <span>--</span>
                        <span>
                          {new Date(campaign.start_date).toLocaleDateString()} -{" "}
                          {new Date(campaign.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Budget progress */}
                    <div className="w-40">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Budget</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(campaign.spent, campaign.currency)} /{" "}
                          {formatCurrency(campaign.total_budget, campaign.currency)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            budgetPercent > 90
                              ? "bg-red-500"
                              : budgetPercent > 70
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="hidden sm:flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {campaign.impressions.toLocaleString()}
                        </p>
                        <p className="text-gray-400">Impressions</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {campaign.clicks.toLocaleString()}
                        </p>
                        <p className="text-gray-400">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {campaign.ctr}%
                        </p>
                        <p className="text-gray-400">CTR</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
