"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  Search,
  Filter,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ExternalLink,
  Reply,
  Settings,
  TrendingUp,
} from "lucide-react";

type Sentiment = "positive" | "negative" | "neutral" | "mixed";

interface MockMention {
  id: string;
  platform: string;
  author_name: string;
  author_handle: string;
  text: string;
  sentiment: Sentiment;
  sentiment_score: number;
  is_replied: boolean;
  url: string;
  detected_at: string;
}

const sentimentConfig: Record<
  Sentiment,
  { label: string; icon: React.ElementType; className: string; dotClass: string }
> = {
  positive: {
    label: "Positive",
    icon: ThumbsUp,
    className: "bg-green-100 text-green-700",
    dotClass: "bg-green-500",
  },
  negative: {
    label: "Negative",
    icon: ThumbsDown,
    className: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    className: "bg-gray-100 text-gray-700",
    dotClass: "bg-gray-400",
  },
  mixed: {
    label: "Mixed",
    icon: MessageSquare,
    className: "bg-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-500",
  },
};

const mockMentions: MockMention[] = [
  {
    id: "1",
    platform: "twitter",
    author_name: "Sarah Johnson",
    author_handle: "@sarahj",
    text: "Just discovered @yourbrand and I'm blown away by how easy it is to manage all our social channels!",
    sentiment: "positive",
    sentiment_score: 0.92,
    is_replied: true,
    url: "https://twitter.com/sarahj/status/123",
    detected_at: "2025-06-05T09:00:00Z",
  },
  {
    id: "2",
    platform: "twitter",
    author_name: "Mike Chen",
    author_handle: "@mikechen",
    text: "Waited 3 hours for a response from @yourbrand support. Not happy.",
    sentiment: "negative",
    sentiment_score: 0.15,
    is_replied: false,
    url: "https://twitter.com/mikechen/status/124",
    detected_at: "2025-06-05T10:30:00Z",
  },
  {
    id: "3",
    platform: "reddit",
    author_name: "techfan_2025",
    author_handle: "u/techfan_2025",
    text: "Has anyone compared yourbrand with competitor? Looking for honest reviews about social media automation tools.",
    sentiment: "neutral",
    sentiment_score: 0.5,
    is_replied: false,
    url: "https://reddit.com/r/socialmedia/post123",
    detected_at: "2025-06-04T16:00:00Z",
  },
  {
    id: "4",
    platform: "facebook",
    author_name: "Emily Davis",
    author_handle: "Emily Davis",
    text: "The new AI content generation feature from yourbrand is interesting but I found some issues with the Instagram integration.",
    sentiment: "mixed",
    sentiment_score: 0.45,
    is_replied: true,
    url: "https://facebook.com/posts/abc",
    detected_at: "2025-06-04T11:00:00Z",
  },
  {
    id: "5",
    platform: "linkedin",
    author_name: "David Park",
    author_handle: "David Park",
    text: "Great webinar by the yourbrand team on AI-powered content strategies. Really useful insights for B2B marketers.",
    sentiment: "positive",
    sentiment_score: 0.85,
    is_replied: false,
    url: "https://linkedin.com/posts/abc",
    detected_at: "2025-06-03T14:00:00Z",
  },
];

export default function CommunityPage() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [repliedFilter, setRepliedFilter] = useState<string>("all");

  const filtered = mockMentions.filter((m) => {
    if (platformFilter !== "all" && m.platform !== platformFilter) return false;
    if (sentimentFilter !== "all" && m.sentiment !== sentimentFilter) return false;
    if (repliedFilter === "replied" && !m.is_replied) return false;
    if (repliedFilter === "unreplied" && m.is_replied) return false;
    if (searchQuery && !m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const sentimentCounts = {
    positive: mockMentions.filter((m) => m.sentiment === "positive").length,
    negative: mockMentions.filter((m) => m.sentiment === "negative").length,
    neutral: mockMentions.filter((m) => m.sentiment === "neutral").length,
    mixed: mockMentions.filter((m) => m.sentiment === "mixed").length,
  };

  return (
    <div className="space-y-6">
      {/* Sentiment overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.entries(sentimentCounts) as [Sentiment, number][]).map(
          ([key, count]) => {
            const config = sentimentConfig[key];
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      config.className
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">{config.label}</p>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Actions bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search mentions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Link
          href="/community/config"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configure Listening
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter className="h-4 w-4" />
        </div>
        {/* Platform pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setPlatformFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              platformFilter === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {PLATFORMS.slice(0, 6).map((p) => (
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

        <div className="h-4 w-px bg-gray-200" />

        {/* Sentiment filter */}
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          value={repliedFilter}
          onChange={(e) => setRepliedFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All</option>
          <option value="replied">Replied</option>
          <option value="unreplied">Unreplied</option>
        </select>
      </div>

      {/* Mentions list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              No mentions found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or configure new keywords.
            </p>
          </div>
        ) : (
          filtered.map((mention) => {
            const sentiment = sentimentConfig[mention.sentiment];
            const SentimentIcon = sentiment.icon;
            const platformDef = PLATFORMS.find((p) => p.id === mention.platform);

            return (
              <div
                key={mention.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {mention.author_name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {mention.author_name}
                      </span>
                      <span className="text-sm text-gray-400">
                        {mention.author_handle}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          sentiment.className
                        )}
                      >
                        <SentimentIcon className="h-3 w-3" />
                        {sentiment.label}
                      </span>
                      {mention.is_replied && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          <Reply className="h-3 w-3" />
                          Replied
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                      {mention.text}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      <span
                        style={{ color: platformDef?.color }}
                        className="font-medium"
                      >
                        {platformDef?.name}
                      </span>
                      <span>
                        {new Date(mention.detected_at).toLocaleString()}
                      </span>
                      <span>
                        Score: {(mention.sentiment_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!mention.is_replied && (
                      <button className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                        <Reply className="h-3.5 w-3.5" />
                        Reply
                      </button>
                    )}
                    <a
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
