"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Clock,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

interface ContentApproval {
  id: string;
  title: string;
  text: string;
  platform: string;
  content_type: string;
  submitted_by: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
}

const mockItems: ContentApproval[] = [
  {
    id: "1",
    title: "Product Launch Tweet",
    text: "Exciting news! Our latest product update brings 3 new features you've been requesting. Check out the blog post for all the details.",
    platform: "twitter",
    content_type: "text",
    submitted_by: "John Doe",
    submitted_at: "2025-06-01T10:00:00Z",
    status: "pending",
  },
  {
    id: "2",
    title: "Instagram Carousel - Summer Sale",
    text: "Summer is here and so are our biggest deals! Swipe to see all the amazing offers waiting for you.",
    platform: "instagram",
    content_type: "carousel",
    submitted_by: "Jane Smith",
    submitted_at: "2025-06-02T14:00:00Z",
    status: "pending",
  },
  {
    id: "3",
    title: "LinkedIn Thought Leadership Post",
    text: "5 Key Trends Shaping Social Media Marketing in 2025. Here's what every marketer needs to know...",
    platform: "linkedin",
    content_type: "article",
    submitted_by: "John Doe",
    submitted_at: "2025-05-30T10:00:00Z",
    status: "approved",
  },
];

export default function ContentApprovalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const pendingCount = mockItems.filter((i) => i.status === "pending").length;
  const selectedItem = mockItems.find((i) => i.id === selectedId);

  const handleApprove = (id: string) => {
    // Would call API
    alert(`Approved item ${id}`);
  };

  const handleReject = (id: string) => {
    // Would call API
    alert(`Rejected item ${id} with note: ${reviewNote}`);
    setReviewNote("");
  };

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
            Content Approvals
          </h2>
          <p className="text-sm text-gray-500">
            {pendingCount} items pending review
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {mockItems.map((item) => {
            const platformDef = PLATFORMS.find((p) => p.id === item.platform);
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {item.title}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
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
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {item.text}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span style={{ color: platformDef?.color }}>
                        {platformDef?.name}
                      </span>
                      <span>--</span>
                      <span>{item.submitted_by}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div>
          {selectedItem ? (
            <div className="sticky top-20 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">
                  {selectedItem.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Submitted by {selectedItem.submitted_by} on{" "}
                  {new Date(selectedItem.submitted_at).toLocaleDateString()}
                </p>
              </div>

              {/* Content preview */}
              <div className="p-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedItem.text}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                  <span className="capitalize">{selectedItem.content_type}</span>
                  <span>--</span>
                  <span>
                    {PLATFORMS.find((p) => p.id === selectedItem.platform)?.name}
                  </span>
                </div>

                {selectedItem.status === "pending" && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Review Note (optional)
                      </label>
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={3}
                        placeholder="Add a note for the submitter..."
                        className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(selectedItem.id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(selectedItem.id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
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
                <Eye className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Select an item to review
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
