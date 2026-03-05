"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Shield,
  Clock,
} from "lucide-react";

interface PlatformConnectionState {
  platform_id: string;
  connected: boolean;
  account_name: string | null;
  account_id: string | null;
  is_active: boolean;
  connected_at: string | null;
  token_expires_at: string | null;
}

const initialConnections: PlatformConnectionState[] = [
  {
    platform_id: "twitter",
    connected: true,
    account_name: "@yourbrand",
    account_id: "123456789",
    is_active: true,
    connected_at: "2025-05-01T10:00:00Z",
    token_expires_at: "2025-08-01T10:00:00Z",
  },
  {
    platform_id: "facebook",
    connected: true,
    account_name: "Your Brand Page",
    account_id: "987654321",
    is_active: true,
    connected_at: "2025-04-15T14:00:00Z",
    token_expires_at: "2025-07-15T14:00:00Z",
  },
  {
    platform_id: "instagram",
    connected: true,
    account_name: "@yourbrand_official",
    account_id: "112233445",
    is_active: false,
    connected_at: "2025-03-20T09:00:00Z",
    token_expires_at: "2025-06-20T09:00:00Z",
  },
  {
    platform_id: "linkedin",
    connected: false,
    account_name: null,
    account_id: null,
    is_active: false,
    connected_at: null,
    token_expires_at: null,
  },
  {
    platform_id: "tiktok",
    connected: false,
    account_name: null,
    account_id: null,
    is_active: false,
    connected_at: null,
    token_expires_at: null,
  },
  {
    platform_id: "youtube",
    connected: false,
    account_name: null,
    account_id: null,
    is_active: false,
    connected_at: null,
    token_expires_at: null,
  },
  {
    platform_id: "reddit",
    connected: false,
    account_name: null,
    account_id: null,
    is_active: false,
    connected_at: null,
    token_expires_at: null,
  },
  {
    platform_id: "pinterest",
    connected: false,
    account_name: null,
    account_id: null,
    is_active: false,
    connected_at: null,
    token_expires_at: null,
  },
];

export default function PlatformsPage() {
  const [connections, setConnections] = useState(initialConnections);

  const handleConnect = (platformId: string) => {
    // Would redirect to OAuth flow
    alert(`Redirecting to ${platformId} OAuth...`);
  };

  const handleDisconnect = (platformId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.platform_id === platformId
          ? {
              ...c,
              connected: false,
              account_name: null,
              account_id: null,
              is_active: false,
              connected_at: null,
              token_expires_at: null,
            }
          : c
      )
    );
  };

  const handleToggleActive = (platformId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.platform_id === platformId
          ? { ...c, is_active: !c.is_active }
          : c
      )
    );
  };

  const connectedCount = connections.filter((c) => c.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {connectedCount} of {PLATFORMS.length} platforms connected
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connections.map((conn) => {
          const platformDef = PLATFORMS.find((p) => p.id === conn.platform_id);
          if (!platformDef) return null;

          return (
            <div
              key={conn.platform_id}
              className={cn(
                "rounded-xl border bg-white p-6 shadow-sm transition-all",
                conn.connected
                  ? "border-gray-200"
                  : "border-dashed border-gray-300"
              )}
            >
              {/* Platform header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white text-lg font-bold"
                    style={{ backgroundColor: platformDef.color }}
                  >
                    {platformDef.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {platformDef.name}
                    </h3>
                    {conn.connected && conn.account_name && (
                      <p className="text-xs text-gray-500">
                        {conn.account_name}
                      </p>
                    )}
                  </div>
                </div>
                {conn.connected && (
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full",
                      conn.is_active
                        ? "bg-green-100"
                        : "bg-gray-100"
                    )}
                  >
                    {conn.is_active ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Status info */}
              {conn.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        conn.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          conn.is_active ? "bg-green-500" : "bg-gray-400"
                        )}
                      />
                      {conn.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {conn.connected_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      Connected{" "}
                      {new Date(conn.connected_at).toLocaleDateString()}
                    </div>
                  )}

                  {conn.token_expires_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Shield className="h-3.5 w-3.5" />
                      Token expires{" "}
                      {new Date(conn.token_expires_at).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleToggleActive(conn.platform_id)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        conn.is_active
                          ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      )}
                    >
                      {conn.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDisconnect(conn.platform_id)}
                      className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Connect your {platformDef.name} account to start publishing
                    and monitoring.
                  </p>
                  <button
                    onClick={() => handleConnect(conn.platform_id)}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Connect {platformDef.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
