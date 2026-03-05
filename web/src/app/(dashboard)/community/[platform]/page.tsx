"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  Reply,
  ExternalLink,
  TrendingUp,
  Clock,
} from "lucide-react";

type Sentiment = "positive" | "negative" | "neutral" | "mixed";

const sentimentConfig: Record<
  Sentiment,
  { label: string; icon: React.ElementType; className: string }
> = {
  positive: { label: "Positive", icon: ThumbsUp, className: "bg-green-100 text-green-700" },
  negative: { label: "Negative", icon: ThumbsDown, className: "bg-red-100 text-red-700" },
  neutral: { label: "Neutral", icon: Minus, className: "bg-gray-100 text-gray-700" },
  mixed: { label: "Mixed", icon: MessageSquare, className: "bg-yellow-100 text-yellow-700" },
};

interface PlatformMention {
  id: string;
  author_name: string;
  author_handle: string;
  text: string;
  sentiment: Sentiment;
  sentiment_score: number;
  is_replied: boolean;
  url: string;
  detected_at: string;
}

const mockMentionsByPlatform: Record<string, PlatformMention[]> = {
  twitter: [
    {
      id: "1",
      author_name: "Sarah Johnson",
      author_handle: "@sarahj",
      text: "Just discovered @yourbrand and I'm blown away by how easy it is to manage all our social channels!",
      sentiment: "positive",
      sentiment_score: 0.92,
      is_replied: true,
      url: "#",
      detected_at: "2025-06-05T09:00:00Z",
    },
    {
      id: "2",
      author_name: "Mike Chen",
      author_handle: "@mikechen",
      text: "Waited 3 hours for a response from @yourbrand support. Not happy.",
      sentiment: "negative",
      sentiment_score: 0.15,
      is_replied: false,
      url: "#",
      detected_at: "2025-06-05T10:30:00Z",
    },
  ],
  reddit: [
    {
      id: "3",
      author_name: "techfan_2025",
      author_handle: "u/techfan_2025",
      text: "Has anyone compared yourbrand with competitor? Looking for honest reviews about social media automation tools.",
      sentiment: "neutral",
      sentiment_score: 0.5,
      is_replied: false,
      url: "#",
      detected_at: "2025-06-04T16:00:00Z",
    },
  ],
  facebook: [
    {
      id: "4",
      author_name: "Emily Davis",
      author_handle: "Emily Davis",
      text: "The new AI content generation feature from yourbrand is interesting but I found some issues with the Instagram integration.",
      sentiment: "mixed",
      sentiment_score: 0.45,
      is_replied: true,
      url: "#",
      detected_at: "2025-06-04T11:00:00Z",
    },
  ],
};

export default function PlatformMentionsPage() {
  const params = useParams();
  const platformId = params.platform as string;
  const platformDef = PLATFORMS.find((p) => p.id === platformId);
  const mentions = mockMentionsByPlatform[platformId] ?? [];

  const sentimentBreakdown = {
    positive: mentions.filter((m) => m.sentiment === "positive").length,
    negative: mentions.filter((m) => m.sentiment === "negative").length,
    neutral: mentions.filter((m) => m.sentiment === "neutral").length,
    mixed: mentions.filter((m) => m.sentiment === "mixed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: platformDef?.color ?? "#666" }}
          >
            {platformDef?.name.charAt(0) ?? "?"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {platformDef?.name ?? platformId} Mentions
            </h2>
            <p className="text-sm text-gray-500">
              {mentions.length} mention{mentions.length !== 1 ? "s" : ""} detected
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(sentimentBreakdown) as [Sentiment, number][]).map(
          ([key, count]) => {
            const config = sentimentConfig[key];
            const Icon = config.icon;
            return (
              <div key={key} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Mention list */}
      {mentions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            No mentions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            No mentions have been detected for this platform yet.
          </p>
          <Link
            href="/community/config"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Configure Listening
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((mention) => {
            const sentiment = sentimentConfig[mention.sentiment];
            const SentimentIcon = sentiment.icon;
            return (
              <div
                key={mention.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
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
                    <div className="mt-3 flex items-center gap-4">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(mention.detected_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Score: {(mention.sentiment_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
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
          })}
        </div>
      )}
    </div>
  );
}
