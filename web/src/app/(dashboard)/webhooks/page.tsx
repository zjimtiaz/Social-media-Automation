"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  Plus,
  Webhook,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface MockWebhook {
  id: string;
  platform: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
}

const mockWebhooks: MockWebhook[] = [
  {
    id: "wh_1",
    platform: "twitter",
    url: "https://api.yourbrand.com/webhooks/twitter",
    events: ["mention", "reply", "dm"],
    is_active: true,
    created_at: "2025-05-01T10:00:00Z",
    last_triggered_at: "2025-06-05T14:30:00Z",
  },
  {
    id: "wh_2",
    platform: "facebook",
    url: "https://api.yourbrand.com/webhooks/facebook",
    events: ["comment", "message", "reaction"],
    is_active: true,
    created_at: "2025-04-15T14:00:00Z",
    last_triggered_at: "2025-06-05T12:00:00Z",
  },
  {
    id: "wh_3",
    platform: "instagram",
    url: "https://api.yourbrand.com/webhooks/instagram",
    events: ["comment", "mention"],
    is_active: false,
    created_at: "2025-03-20T09:00:00Z",
    last_triggered_at: "2025-05-30T08:00:00Z",
  },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState(mockWebhooks);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [newPlatform, setNewPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("");

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = (id: string) => {
    setWebhooks((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, is_active: !w.is_active } : w
      )
    );
  };

  const handleDelete = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const handleCreate = () => {
    if (!newPlatform || !newUrl) return;
    const newWh: MockWebhook = {
      id: `wh_${Date.now()}`,
      platform: newPlatform,
      url: newUrl,
      events: newEvents.split(",").map((e) => e.trim()).filter(Boolean),
      is_active: true,
      created_at: new Date().toISOString(),
      last_triggered_at: null,
    };
    setWebhooks((prev) => [newWh, ...prev]);
    setShowCreateForm(false);
    setNewPlatform("");
    setNewUrl("");
    setNewEvents("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {webhooks.length} webhook endpoint{webhooks.length !== 1 ? "s" : ""}{" "}
          configured
        </p>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Endpoint
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Create Webhook Endpoint
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select platform...</option>
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Events (comma-separated)
                </label>
                <input
                  type="text"
                  value={newEvents}
                  onChange={(e) => setNewEvents(e.target.value)}
                  placeholder="mention, reply, comment"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://api.example.com/webhooks/..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newPlatform || !newUrl}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Create Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Webhook className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            No webhook endpoints
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first endpoint to start receiving events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => {
            const platformDef = PLATFORMS.find((p) => p.id === wh.platform);
            return (
              <div
                key={wh.id}
                className={cn(
                  "rounded-xl border bg-white p-5 shadow-sm transition-all",
                  wh.is_active
                    ? "border-gray-200"
                    : "border-gray-100 opacity-60"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold"
                      style={{
                        backgroundColor: platformDef?.color ?? "#666",
                      }}
                    >
                      {platformDef?.name.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {platformDef?.name ?? wh.platform}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            wh.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              wh.is_active ? "bg-green-500" : "bg-gray-400"
                            )}
                          />
                          {wh.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="text-xs text-gray-500 truncate max-w-sm">
                          {wh.url}
                        </code>
                        <button
                          onClick={() => handleCopy(wh.url, wh.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedId === wh.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {wh.events.map((event) => (
                          <span
                            key={event}
                            className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                      {wh.last_triggered_at && (
                        <p className="mt-1 text-xs text-gray-400">
                          Last triggered{" "}
                          {new Date(wh.last_triggered_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/webhooks/${wh.id}`}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="View events"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleToggle(wh.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title={wh.is_active ? "Deactivate" : "Activate"}
                    >
                      {wh.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
