"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/constants";
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";

type ContentStatus = "draft" | "pending_approval" | "approved" | "published" | "rejected";
type ViewMode = "table" | "grid";

interface MockContent {
  id: string;
  platform: string;
  content_type: string;
  original_text: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending_approval: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  published: { label: "Published", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

// Mock data for UI demonstration
const mockContent: MockContent[] = [
  {
    id: "1",
    platform: "twitter",
    content_type: "text",
    original_text: "Exciting news! Our latest product update brings 3 new features you've been requesting...",
    status: "published",
    created_at: "2025-06-01T10:00:00Z",
    updated_at: "2025-06-01T12:00:00Z",
  },
  {
    id: "2",
    platform: "instagram",
    content_type: "image",
    original_text: "Behind the scenes of our team building event! #teamwork #company",
    status: "pending_approval",
    created_at: "2025-06-02T09:00:00Z",
    updated_at: "2025-06-02T09:30:00Z",
  },
  {
    id: "3",
    platform: "linkedin",
    content_type: "article",
    original_text: "5 Tips for Growing Your Business with Social Media Automation in 2025",
    status: "draft",
    created_at: "2025-06-03T14:00:00Z",
    updated_at: "2025-06-03T14:00:00Z",
  },
  {
    id: "4",
    platform: "facebook",
    content_type: "video",
    original_text: "Watch our CEO discuss the future of AI-powered marketing...",
    status: "approved",
    created_at: "2025-06-04T08:00:00Z",
    updated_at: "2025-06-04T10:00:00Z",
  },
  {
    id: "5",
    platform: "twitter",
    content_type: "thread",
    original_text: "Thread: Here's why content automation is the future of social media management...",
    status: "rejected",
    created_at: "2025-06-05T11:00:00Z",
    updated_at: "2025-06-05T15:00:00Z",
  },
];

export default function ContentPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockContent.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (platformFilter !== "all" && item.platform !== platformFilter) return false;
    if (typeFilter !== "all" && item.content_type !== typeFilter) return false;
    if (searchQuery && !item.original_text.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const getPlatformName = (id: string) =>
    PLATFORMS.find((p) => p.id === id)?.name ?? id;
  const getTypeName = (id: string) =>
    CONTENT_TYPES.find((t) => t.id === id)?.label ?? id;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "table" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/content/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Content
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">No content found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters."
              : "Get started by creating your first piece of content."}
          </p>
          <Link
            href="/content/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Content
          </Link>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item, idx) => (
                <tr key={item.id} className={cn(idx % 2 === 1 && "bg-gray-50/50", "hover:bg-blue-50/30 transition-colors")}>
                  <td className="px-6 py-4">
                    <p className="max-w-xs truncate text-sm font-medium text-gray-900">
                      {item.original_text}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getPlatformName(item.platform)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getTypeName(item.content_type)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        statusConfig[item.status].className
                      )}
                    >
                      {statusConfig[item.status].label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/content/${item.id}`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/content/${item.id}`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/content/${item.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">
                  {getPlatformName(item.platform)}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusConfig[item.status].className
                  )}
                >
                  {statusConfig[item.status].label}
                </span>
              </div>
              <p className="line-clamp-3 text-sm text-gray-700 mb-3">
                {item.original_text}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{getTypeName(item.content_type)}</span>
                <span>{new Date(item.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
