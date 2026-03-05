"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";

interface CommunityApproval {
  id: string;
  mention_author: string;
  mention_handle: string;
  mention_text: string;
  mention_sentiment: "positive" | "negative" | "neutral" | "mixed";
  response_text: string;
  platform: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
}

const sentimentConfig = {
  positive: { label: "Positive", icon: ThumbsUp, className: "bg-green-100 text-green-700" },
  negative: { label: "Negative", icon: ThumbsDown, className: "bg-red-100 text-red-700" },
  neutral: { label: "Neutral", icon: Minus, className: "bg-gray-100 text-gray-700" },
  mixed: { label: "Mixed", icon: MessageSquare, className: "bg-yellow-100 text-yellow-700" },
};

const mockItems: CommunityApproval[] = [
  {
    id: "1",
    mention_author: "Sarah Johnson",
    mention_handle: "@sarahj",
    mention_text: "Has anyone tried @yourbrand's new feature? Looks interesting but I have some questions about pricing.",
    mention_sentiment: "neutral",
    response_text: "Hi Sarah! Thanks for your interest. We'd be happy to answer your pricing questions. Our plans start at $29/month and scale based on usage. Would you like to schedule a quick demo?",
    platform: "twitter",
    submitted_at: "2025-06-02T09:00:00Z",
    status: "pending",
  },
  {
    id: "2",
    mention_author: "Mike Chen",
    mention_handle: "@mikechen",
    mention_text: "Just had a terrible experience with @yourbrand's support team. Waited 3 hours for a response!",
    mention_sentiment: "negative",
    response_text: "Hi Mike, we sincerely apologize for the long wait time. That's not the experience we want you to have. Our team lead is looking into this, and we'd like to make it right. Can you DM us your ticket number?",
    platform: "twitter",
    submitted_at: "2025-06-02T14:00:00Z",
    status: "pending",
  },
  {
    id: "3",
    mention_author: "Emily Davis",
    mention_handle: "@emilydavis",
    mention_text: "Love how @yourbrand has completely transformed our social media workflow. Game changer!",
    mention_sentiment: "positive",
    response_text: "Thank you so much, Emily! We're thrilled to hear that our platform is making a real difference for your team. If you ever have suggestions for how we can improve, we're all ears!",
    platform: "twitter",
    submitted_at: "2025-06-01T16:00:00Z",
    status: "approved",
  },
];

export default function CommunityApprovalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedResponse, setEditedResponse] = useState("");

  const selectedItem = mockItems.find((i) => i.id === selectedId);

  const selectItem = (item: CommunityApproval) => {
    setSelectedId(item.id);
    setEditedResponse(item.response_text);
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
            Community Response Approvals
          </h2>
          <p className="text-sm text-gray-500">
            Review AI-generated responses before they are posted
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {mockItems.map((item) => {
            const sentiment = sentimentConfig[item.mention_sentiment];
            const SentimentIcon = sentiment.icon;
            return (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                className={cn(
                  "w-full text-left rounded-xl border bg-white p-4 shadow-sm transition-all",
                  selectedId === item.id
                    ? "border-blue-300 ring-1 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {item.mention_author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.mention_author}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.mention_handle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        sentiment.className
                      )}
                    >
                      <SentimentIcon className="h-3 w-3" />
                      {sentiment.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
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
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.mention_text}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <span>
                    {PLATFORMS.find((p) => p.id === item.platform)?.name}
                  </span>
                  <span>--</span>
                  <span>{new Date(item.submitted_at).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Review panel */}
        <div>
          {selectedItem ? (
            <div className="sticky top-20 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="text-sm font-semibold text-gray-900">
                  Response Review
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Original mention */}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Original Mention
                  </p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedItem.mention_author}
                      </span>
                      <span className="text-xs text-gray-400">
                        {selectedItem.mention_handle}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {selectedItem.mention_text}
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Proposed Response
                  </p>
                  {selectedItem.status === "pending" ? (
                    <textarea
                      value={editedResponse}
                      onChange={(e) => setEditedResponse(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-blue-50 p-3">
                      <p className="text-sm text-gray-700">
                        {selectedItem.response_text}
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                      <CheckCircle className="h-4 w-4" />
                      Approve & Send
                    </button>
                    <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <div className="text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Select a response to review
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
