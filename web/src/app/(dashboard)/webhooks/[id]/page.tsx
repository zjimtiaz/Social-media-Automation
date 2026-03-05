"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Webhook,
  Check,
  X,
  Clock,
  RefreshCw,
  Copy,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface WebhookEvent {
  id: string;
  event_type: string;
  status: "success" | "failed" | "pending";
  status_code: number | null;
  payload_preview: string;
  response_time_ms: number | null;
  created_at: string;
}

const mockEvents: WebhookEvent[] = [
  {
    id: "evt_1",
    event_type: "mention",
    status: "success",
    status_code: 200,
    payload_preview: '{"type":"mention","author":"@sarahj","text":"Just discovered @yourbrand..."}',
    response_time_ms: 124,
    created_at: "2025-06-05T14:30:00Z",
  },
  {
    id: "evt_2",
    event_type: "reply",
    status: "success",
    status_code: 200,
    payload_preview: '{"type":"reply","author":"@mikechen","in_reply_to":"@yourbrand"}',
    response_time_ms: 89,
    created_at: "2025-06-05T13:45:00Z",
  },
  {
    id: "evt_3",
    event_type: "mention",
    status: "failed",
    status_code: 500,
    payload_preview: '{"type":"mention","author":"@techfan","text":"Anyone tried @yourbrand?"}',
    response_time_ms: 5002,
    created_at: "2025-06-05T12:00:00Z",
  },
  {
    id: "evt_4",
    event_type: "dm",
    status: "success",
    status_code: 200,
    payload_preview: '{"type":"dm","author":"@customer","message":"Hi, I need help with..."}',
    response_time_ms: 156,
    created_at: "2025-06-05T11:30:00Z",
  },
  {
    id: "evt_5",
    event_type: "mention",
    status: "success",
    status_code: 200,
    payload_preview: '{"type":"mention","author":"@emily_d","text":"Love @yourbrand new feature!"}',
    response_time_ms: 95,
    created_at: "2025-06-05T10:15:00Z",
  },
  {
    id: "evt_6",
    event_type: "reply",
    status: "failed",
    status_code: 503,
    payload_preview: '{"type":"reply","author":"@user123","in_reply_to":"@yourbrand"}',
    response_time_ms: null,
    created_at: "2025-06-05T09:00:00Z",
  },
  {
    id: "evt_7",
    event_type: "mention",
    status: "success",
    status_code: 200,
    payload_preview: '{"type":"mention","author":"@dev_guru","text":"Just wrote about @yourbrand"}',
    response_time_ms: 112,
    created_at: "2025-06-04T16:30:00Z",
  },
];

const statusIcons = {
  success: CheckCircle,
  failed: XCircle,
  pending: Clock,
};

const statusClasses = {
  success: "text-green-500",
  failed: "text-red-500",
  pending: "text-yellow-500",
};

export default function WebhookDetailPage() {
  const params = useParams();
  const webhookId = params.id as string;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const webhook = {
    id: webhookId,
    platform: "X (Twitter)",
    url: "https://api.yourbrand.com/webhooks/twitter",
    events: ["mention", "reply", "dm"],
    is_active: true,
    secret: "whsec_***************************abc",
    created_at: "2025-05-01T10:00:00Z",
  };

  const successCount = mockEvents.filter((e) => e.status === "success").length;
  const failedCount = mockEvents.filter((e) => e.status === "failed").length;
  const avgResponseTime = Math.round(
    mockEvents
      .filter((e) => e.response_time_ms !== null)
      .reduce((sum, e) => sum + (e.response_time_ms ?? 0), 0) /
      mockEvents.filter((e) => e.response_time_ms !== null).length
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/webhooks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Webhook: {webhook.platform}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <code className="text-xs text-gray-500">{webhook.url}</code>
            <button
              onClick={() => handleCopy(webhook.url, "url")}
              className="text-gray-400 hover:text-gray-600"
            >
              {copiedId === "url" ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                webhook.is_active ? "bg-green-500" : "bg-gray-400"
              )}
            />
            <p className="text-sm font-semibold text-gray-900">
              {webhook.is_active ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Success Rate</p>
          <p className="text-sm font-semibold text-gray-900">
            {((successCount / mockEvents.length) * 100).toFixed(0)}%
            <span className="text-xs font-normal text-gray-400 ml-1">
              ({successCount}/{mockEvents.length})
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Failed</p>
          <p className="text-sm font-semibold text-red-600">{failedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Avg Response</p>
          <p className="text-sm font-semibold text-gray-900">{avgResponseTime}ms</p>
        </div>
      </div>

      {/* Webhook config */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Configuration
          </h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Secret</span>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                {webhook.secret}
              </code>
              <button
                onClick={() => handleCopy(webhook.secret, "secret")}
                className="text-gray-400 hover:text-gray-600"
              >
                {copiedId === "secret" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Events</span>
            <div className="flex gap-1">
              {webhook.events.map((event) => (
                <span
                  key={event}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Created</span>
            <span className="text-sm text-gray-900">
              {new Date(webhook.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Recent events log */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Recent Events
          </h3>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {mockEvents.map((event) => {
            const StatusIcon = statusIcons[event.status];
            return (
              <div key={event.id}>
                <button
                  onClick={() =>
                    setExpandedEvent(
                      expandedEvent === event.id ? null : event.id
                    )
                  }
                  className="flex w-full items-center gap-4 px-6 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <StatusIcon
                    className={cn("h-5 w-5 shrink-0", statusClasses[event.status])}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {event.event_type}
                      </span>
                      {event.status_code && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-xs font-mono",
                            event.status === "success"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          )}
                        >
                          {event.status_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.created_at).toLocaleString()}
                      {event.response_time_ms && (
                        <span className="ml-2">
                          {event.response_time_ms}ms
                        </span>
                      )}
                    </p>
                  </div>
                </button>
                {expandedEvent === event.id && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Payload Preview
                    </p>
                    <pre className="rounded-lg bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto">
                      {JSON.stringify(JSON.parse(event.payload_preview), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
