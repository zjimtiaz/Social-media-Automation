"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS, CAMPAIGN_OBJECTIVES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Megaphone,
  Eye,
  DollarSign,
  Target,
  Calendar,
} from "lucide-react";

interface AdApproval {
  id: string;
  campaign_name: string;
  platform: string;
  objective: string;
  total_budget: number;
  daily_budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  targeting_summary: string;
  submitted_by: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
}

const mockItems: AdApproval[] = [
  {
    id: "1",
    campaign_name: "Q3 Brand Awareness Push",
    platform: "facebook",
    objective: "awareness",
    total_budget: 5000,
    daily_budget: 100,
    currency: "USD",
    start_date: "2025-07-01",
    end_date: "2025-08-15",
    targeting_summary: "Age 18-35, US, Interests: Technology, Social Media",
    submitted_by: "Marketing Team",
    submitted_at: "2025-06-03T08:00:00Z",
    status: "pending",
  },
  {
    id: "2",
    campaign_name: "Summer Sale Conversions",
    platform: "instagram",
    objective: "conversions",
    total_budget: 3000,
    daily_budget: 75,
    currency: "USD",
    start_date: "2025-06-15",
    end_date: "2025-07-31",
    targeting_summary: "Age 25-45, US & UK, Interests: Shopping, E-commerce",
    submitted_by: "Ad Operations",
    submitted_at: "2025-06-02T11:00:00Z",
    status: "pending",
  },
  {
    id: "3",
    campaign_name: "LinkedIn Lead Gen",
    platform: "linkedin",
    objective: "lead_generation",
    total_budget: 8000,
    daily_budget: 200,
    currency: "USD",
    start_date: "2025-06-10",
    end_date: "2025-07-10",
    targeting_summary: "Job titles: Marketing Director, CMO; Industries: SaaS, Tech",
    submitted_by: "Marketing Team",
    submitted_at: "2025-06-01T14:00:00Z",
    status: "approved",
  },
];

export default function AdApprovalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const selectedItem = mockItems.find((i) => i.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/approvals"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Ad Campaign Approvals
          </h2>
          <p className="text-sm text-gray-500">
            Review and approve ad campaigns before they go live
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {mockItems.map((item) => {
            const platformDef = PLATFORMS.find((p) => p.id === item.platform);
            const objective = CAMPAIGN_OBJECTIVES.find((o) => o.id === item.objective);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full text-left rounded-xl border bg-white p-4 shadow-sm transition-all",
                  selectedId === item.id
                    ? "border-blue-300 ring-1 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                    <Megaphone className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {item.campaign_name}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                          item.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : item.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {platformDef?.name} -- {objective?.label}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-medium text-gray-600">
                        {formatCurrency(item.total_budget, item.currency)}
                      </span>
                      <span>{item.submitted_by}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div>
          {selectedItem ? (
            <div className="sticky top-20 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">
                  {selectedItem.campaign_name}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <Target className="h-3.5 w-3.5" />
                      Platform
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {PLATFORMS.find((p) => p.id === selectedItem.platform)?.name}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <Megaphone className="h-3.5 w-3.5" />
                      Objective
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {CAMPAIGN_OBJECTIVES.find((o) => o.id === selectedItem.objective)?.label}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Total Budget
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(selectedItem.total_budget, selectedItem.currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Daily Budget
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(selectedItem.daily_budget, selectedItem.currency)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Schedule
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedItem.start_date).toLocaleDateString()} -{" "}
                    {new Date(selectedItem.end_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Target className="h-3.5 w-3.5" />
                    Targeting
                  </div>
                  <p className="text-sm text-gray-700">
                    {selectedItem.targeting_summary}
                  </p>
                </div>

                {selectedItem.status === "pending" && (
                  <>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                      placeholder="Review note (optional)..."
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <div className="text-center">
                <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Select a campaign to review
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
