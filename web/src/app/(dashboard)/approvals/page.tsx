"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  FileText,
  Users,
  Megaphone,
  MessageSquare,
  Clock,
} from "lucide-react";

type ApprovalStatus = "pending" | "approved" | "rejected" | "revision_requested" | "auto_approved";
type ItemType = "content" | "response" | "ad";
type TabId = "all" | "content" | "community" | "ads";

interface MockApproval {
  id: string;
  item_type: ItemType;
  status: ApprovalStatus;
  title: string;
  preview: string;
  platform: string;
  submitted_by: string;
  submitted_at: string;
}

const statusConfig: Record<ApprovalStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  revision_requested: { label: "Revision", className: "bg-orange-100 text-orange-700" },
  auto_approved: { label: "Auto-Approved", className: "bg-blue-100 text-blue-700" },
};

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: Filter },
  { id: "content", label: "Content", icon: FileText },
  { id: "community", label: "Community Responses", icon: MessageSquare },
  { id: "ads", label: "Ad Campaigns", icon: Megaphone },
];

const mockApprovals: MockApproval[] = [
  {
    id: "1",
    item_type: "content",
    status: "pending",
    title: "Product Launch Tweet",
    preview: "Exciting news! Our latest product update brings 3 new features...",
    platform: "twitter",
    submitted_by: "John Doe",
    submitted_at: "2025-06-01T10:00:00Z",
  },
  {
    id: "2",
    item_type: "response",
    status: "pending",
    title: "Reply to @customer_support",
    preview: "Thank you for reaching out! We'd love to help you with that issue...",
    platform: "twitter",
    submitted_by: "AI Assistant",
    submitted_at: "2025-06-02T09:00:00Z",
  },
  {
    id: "3",
    item_type: "content",
    status: "pending",
    title: "Instagram Carousel - Summer Sale",
    preview: "Summer is here and so are our biggest deals! Swipe to see...",
    platform: "instagram",
    submitted_by: "Jane Smith",
    submitted_at: "2025-06-02T14:00:00Z",
  },
  {
    id: "4",
    item_type: "ad",
    status: "pending",
    title: "Q3 Awareness Campaign",
    preview: "Brand awareness campaign targeting 18-35 demographic with $5,000 budget",
    platform: "facebook",
    submitted_by: "Marketing Team",
    submitted_at: "2025-06-03T08:00:00Z",
  },
  {
    id: "5",
    item_type: "content",
    status: "approved",
    title: "LinkedIn Article - Industry Trends",
    preview: "5 Key Trends Shaping Social Media Marketing in 2025...",
    platform: "linkedin",
    submitted_by: "John Doe",
    submitted_at: "2025-05-30T10:00:00Z",
  },
  {
    id: "6",
    item_type: "response",
    status: "rejected",
    title: "Reply to @unhappy_user",
    preview: "We understand your frustration. Let us make it right...",
    platform: "twitter",
    submitted_by: "AI Assistant",
    submitted_at: "2025-05-29T16:00:00Z",
  },
];

function getItemTypeIcon(type: ItemType) {
  switch (type) {
    case "content":
      return FileText;
    case "response":
      return MessageSquare;
    case "ad":
      return Megaphone;
  }
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const filtered = mockApprovals.filter((item) => {
    if (activeTab === "content" && item.item_type !== "content") return false;
    if (activeTab === "community" && item.item_type !== "response") return false;
    if (activeTab === "ads" && item.item_type !== "ad") return false;
    if (platformFilter !== "all" && item.platform !== platformFilter) return false;
    return true;
  });

  const pendingCount = mockApprovals.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
        <Clock className="h-5 w-5 text-yellow-600" />
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">{pendingCount} items</span> pending
          your review
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = mockApprovals.filter((a) => {
              if (tab.id === "all") return true;
              if (tab.id === "content") return a.item_type === "content";
              if (tab.id === "community") return a.item_type === "response";
              if (tab.id === "ads") return a.item_type === "ad";
              return false;
            }).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={cn(
                    "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium",
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Platform filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPlatformFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              platformFilter === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All Platforms
          </button>
          {PLATFORMS.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatformFilter(p.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                platformFilter === p.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Approval items */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              No items to review
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              All caught up! Check back later for new items.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const TypeIcon = getItemTypeIcon(item.item_type);
            const platformDef = PLATFORMS.find((p) => p.id === item.platform);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <TypeIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            statusConfig[item.status].className
                          )}
                        >
                          {statusConfig[item.status].label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {item.preview}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${platformDef?.color}15`,
                            color: platformDef?.color,
                          }}
                        >
                          {platformDef?.name}
                        </span>
                        <span>by {item.submitted_by}</span>
                        <span>
                          {new Date(item.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {item.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <Eye className="h-4 w-4" />
                        Review
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
