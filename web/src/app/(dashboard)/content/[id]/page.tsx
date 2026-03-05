"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  ArrowLeft,
  Edit,
  Save,
  Send,
  Eye,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Check,
  X,
  Clock,
  Sparkles,
} from "lucide-react";

type ContentStatus = "draft" | "pending_approval" | "approved" | "published" | "rejected";

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending_approval: { label: "Pending Approval", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  published: { label: "Published", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activePreview, setActivePreview] = useState("twitter");

  // Mock data
  const content = {
    id: params.id as string,
    platform: "twitter",
    content_type: "text",
    original_text:
      "Exciting news! Our latest product update brings 3 new features you've been requesting. Check out the blog post for all the details.",
    status: "approved" as ContentStatus,
    tone: "professional",
    media_urls: [] as string[],
    created_at: "2025-06-01T10:00:00Z",
    updated_at: "2025-06-01T12:00:00Z",
    created_by: "John Doe",
  };

  const [editText, setEditText] = useState(content.original_text);

  const versions = [
    {
      id: "v1",
      platform: "twitter",
      version_number: 1,
      text: content.original_text,
      is_active: true,
      created_at: "2025-06-01T10:00:00Z",
    },
    {
      id: "v2",
      platform: "instagram",
      version_number: 1,
      text: "Exciting news! Our latest product update brings 3 new features you've been requesting. Check out our bio link for all the details. #ProductUpdate #Innovation",
      is_active: true,
      created_at: "2025-06-01T10:30:00Z",
    },
    {
      id: "v3",
      platform: "linkedin",
      version_number: 1,
      text: "We're excited to announce our latest product update, featuring 3 new features that our community has been eagerly requesting. These improvements reflect our commitment to listening to your feedback and continuously improving our platform. Read the full breakdown on our blog.",
      is_active: true,
      created_at: "2025-06-01T11:00:00Z",
    },
  ];

  const previewPlatforms = ["twitter", "instagram", "linkedin"];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/content"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Content #{content.id}
              </h2>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusConfig[content.status].className
                )}
              >
                {statusConfig[content.status].label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Created {new Date(content.created_at).toLocaleDateString()} by{" "}
              {content.created_by}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {content.status === "approved" && (
            <button className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
              <Send className="h-4 w-4" />
              Publish Now
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(content.original_text);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Content editor/viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Original Content
              </h3>
            </div>
            <div className="p-6">
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm leading-relaxed text-gray-700">
                  {content.original_text}
                </p>
              )}
            </div>
          </div>

          {/* Platform previews */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Platform Previews
              </h3>
            </div>
            <div className="border-b border-gray-100">
              <div className="flex gap-1 px-4 pt-2">
                {previewPlatforms.map((platform) => {
                  const pDef = PLATFORMS.find((p) => p.id === platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => setActivePreview(platform)}
                      className={cn(
                        "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                        activePreview === platform
                          ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {pDef?.name ?? platform}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-6">
              {versions
                .filter((v) => v.platform === activePreview)
                .map((version) => (
                  <div key={version.id}>
                    {/* Mock platform preview card */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-10 w-10 rounded-full bg-gray-300" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Your Brand
                          </p>
                          <p className="text-xs text-gray-500">
                            @yourbrand
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {version.text}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                        <span>
                          {version.text.length} characters
                        </span>
                        <span>
                          Version {version.version_number}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              {versions.filter((v) => v.platform === activePreview).length === 0 && (
                <div className="py-8 text-center">
                  <Eye className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No version for this platform yet
                  </p>
                  <button className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate version
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            </div>
            <div className="divide-y divide-gray-50 p-4">
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Platform</span>
                <span className="text-sm font-medium text-gray-900">
                  {PLATFORMS.find((p) => p.id === content.platform)?.name}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {content.content_type}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Tone</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {content.tone}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(content.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Updated</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(content.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Version history */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Version History
              </h3>
            </div>
            <div className="space-y-2 p-4">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      v.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {v.version_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 capitalize">
                      {PLATFORMS.find((p) => p.id === v.platform)?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(v.created_at).toLocaleString()}
                    </p>
                  </div>
                  {v.is_active && (
                    <span className="text-xs font-medium text-green-600">
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {[
                  { action: "Content approved", time: "Jun 1, 12:00 PM", icon: Check },
                  { action: "Submitted for approval", time: "Jun 1, 10:30 AM", icon: Send },
                  { action: "Content created", time: "Jun 1, 10:00 AM", icon: Clock },
                ].map((event, idx) => {
                  const Icon = event.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <Icon className="h-3 w-3 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">{event.action}</p>
                        <p className="text-xs text-gray-400">{event.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
