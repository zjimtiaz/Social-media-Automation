"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS, CAMPAIGN_OBJECTIVES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Pause,
  Play,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  BarChart3,
  Target,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Mock chart data
const dailyMetrics = [
  { date: "Jun 1", impressions: 4200, clicks: 120, spend: 85 },
  { date: "Jun 2", impressions: 5100, clicks: 145, spend: 92 },
  { date: "Jun 3", impressions: 4800, clicks: 135, spend: 88 },
  { date: "Jun 4", impressions: 6200, clicks: 180, spend: 105 },
  { date: "Jun 5", impressions: 5500, clicks: 160, spend: 95 },
  { date: "Jun 6", impressions: 7100, clicks: 210, spend: 112 },
  { date: "Jun 7", impressions: 6800, clicks: 195, spend: 108 },
  { date: "Jun 8", impressions: 5900, clicks: 170, spend: 98 },
  { date: "Jun 9", impressions: 7500, clicks: 225, spend: 118 },
  { date: "Jun 10", impressions: 8200, clicks: 240, spend: 125 },
  { date: "Jun 11", impressions: 7800, clicks: 230, spend: 120 },
  { date: "Jun 12", impressions: 8500, clicks: 260, spend: 130 },
  { date: "Jun 13", impressions: 9100, clicks: 275, spend: 138 },
  { date: "Jun 14", impressions: 8700, clicks: 265, spend: 132 },
];

const conversionData = [
  { date: "Jun 1", conversions: 12, ctr: 2.8 },
  { date: "Jun 2", conversions: 15, ctr: 2.84 },
  { date: "Jun 3", conversions: 11, ctr: 2.81 },
  { date: "Jun 4", conversions: 18, ctr: 2.9 },
  { date: "Jun 5", conversions: 14, ctr: 2.91 },
  { date: "Jun 6", conversions: 22, ctr: 2.96 },
  { date: "Jun 7", conversions: 19, ctr: 2.87 },
  { date: "Jun 8", conversions: 16, ctr: 2.88 },
  { date: "Jun 9", conversions: 24, ctr: 3.0 },
  { date: "Jun 10", conversions: 26, ctr: 2.93 },
  { date: "Jun 11", conversions: 23, ctr: 2.95 },
  { date: "Jun 12", conversions: 28, ctr: 3.06 },
  { date: "Jun 13", conversions: 30, ctr: 3.02 },
  { date: "Jun 14", conversions: 27, ctr: 3.05 },
];

type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  active: { label: "Active", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500" },
};

export default function AdDetailPage() {
  const params = useParams();

  // Mock campaign data
  const campaign = {
    id: params.id as string,
    name: "Summer Sale 2025",
    platform: "facebook",
    objective: "conversions",
    status: "active" as CampaignStatus,
    total_budget: 5000,
    spent: 2340,
    daily_budget: 100,
    currency: "USD",
    start_date: "2025-06-01",
    end_date: "2025-07-31",
    targeting: {
      age: "18-35",
      locations: "United States",
      interests: "Technology, Social Media, E-commerce",
    },
    metrics: {
      impressions: 125000,
      clicks: 3200,
      conversions: 285,
      ctr: 2.56,
      cpc: 0.73,
      cpm: 18.72,
      reach: 98000,
    },
  };

  const budgetPercent = (campaign.spent / campaign.total_budget) * 100;
  const platformDef = PLATFORMS.find((p) => p.id === campaign.platform);
  const objectiveDef = CAMPAIGN_OBJECTIVES.find(
    (o) => o.id === campaign.objective
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ads"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {campaign.name}
              </h2>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusConfig[campaign.status].className
                )}
              >
                {statusConfig[campaign.status].label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {platformDef?.name} -- {objectiveDef?.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "active" ? (
            <button className="inline-flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors">
              <Pause className="h-4 w-4" />
              Pause Campaign
            </button>
          ) : campaign.status === "paused" ? (
            <button className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
              <Play className="h-4 w-4" />
              Resume Campaign
            </button>
          ) : null}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: "Impressions", value: campaign.metrics.impressions.toLocaleString(), icon: Eye },
          { label: "Clicks", value: campaign.metrics.clicks.toLocaleString(), icon: MousePointer },
          { label: "Conversions", value: campaign.metrics.conversions.toLocaleString(), icon: Target },
          { label: "CTR", value: `${campaign.metrics.ctr}%`, icon: TrendingUp },
          { label: "CPC", value: `$${campaign.metrics.cpc}`, icon: DollarSign },
          { label: "CPM", value: `$${campaign.metrics.cpm}`, icon: BarChart3 },
          { label: "Reach", value: campaign.metrics.reach?.toLocaleString() ?? "N/A", icon: Eye },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <Icon className="h-3.5 w-3.5" />
                {metric.label}
              </div>
              <p className="text-lg font-bold text-gray-900">{metric.value}</p>
            </div>
          );
        })}
      </div>

      {/* Budget allocation */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Budget Allocation
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">
                {formatCurrency(campaign.spent, campaign.currency)} spent
              </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(campaign.total_budget, campaign.currency)} total
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-3 rounded-full transition-all",
                  budgetPercent > 90
                    ? "bg-red-500"
                    : budgetPercent > 70
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                )}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>{budgetPercent.toFixed(1)}% used</span>
              <span>
                {formatCurrency(
                  campaign.total_budget - campaign.spent,
                  campaign.currency
                )}{" "}
                remaining
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Daily budget</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(campaign.daily_budget, campaign.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Impressions & Clicks */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Impressions & Clicks
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Impressions"
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend over time */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Daily Spend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`$${value}`, "Spend"]}
                />
                <Bar
                  dataKey="spend"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Spend ($)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Conversions
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="conversions"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Conversions"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CTR trend */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            CTR Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  domain={[2.5, 3.5]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`${value}%`, "CTR"]}
                />
                <Line
                  type="monotone"
                  dataKey="ctr"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 3 }}
                  name="CTR (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Campaign Details
            </h3>
          </div>
          <div className="divide-y divide-gray-50 p-6">
            {[
              { label: "Platform", value: platformDef?.name },
              { label: "Objective", value: objectiveDef?.label },
              {
                label: "Schedule",
                value: `${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`,
              },
              {
                label: "Total Budget",
                value: formatCurrency(campaign.total_budget, campaign.currency),
              },
              {
                label: "Daily Budget",
                value: formatCurrency(campaign.daily_budget, campaign.currency),
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2.5">
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Targeting</h3>
          </div>
          <div className="divide-y divide-gray-50 p-6">
            {[
              { label: "Age Range", value: campaign.targeting.age },
              { label: "Locations", value: campaign.targeting.locations },
              { label: "Interests", value: campaign.targeting.interests },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2.5">
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-xs">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
