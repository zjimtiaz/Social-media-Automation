"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Key,
  Copy,
  Check,
  Trash2,
  Shield,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

interface MockApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const mockKeys: MockApiKey[] = [
  {
    id: "key_1",
    name: "Production API",
    key_prefix: "sk_prod_abc1",
    scopes: ["content:read", "content:write", "campaigns:read"],
    is_active: true,
    last_used_at: "2025-06-05T14:30:00Z",
    expires_at: null,
    created_at: "2025-03-01T10:00:00Z",
  },
  {
    id: "key_2",
    name: "Staging API",
    key_prefix: "sk_test_xyz2",
    scopes: ["content:read", "content:write"],
    is_active: true,
    last_used_at: "2025-06-04T09:00:00Z",
    expires_at: "2025-12-31T23:59:59Z",
    created_at: "2025-04-15T14:00:00Z",
  },
  {
    id: "key_3",
    name: "Analytics Readonly",
    key_prefix: "sk_prod_def3",
    scopes: ["analytics:read"],
    is_active: false,
    last_used_at: "2025-05-20T16:00:00Z",
    expires_at: "2025-06-01T00:00:00Z",
    created_at: "2025-01-10T09:00:00Z",
  },
];

const availableScopes = [
  "content:read",
  "content:write",
  "campaigns:read",
  "campaigns:write",
  "community:read",
  "community:write",
  "analytics:read",
  "settings:read",
  "settings:write",
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(mockKeys);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleCreate = () => {
    if (!newKeyName || newKeyScopes.length === 0) return;
    const fakeKey = `sk_prod_${Math.random().toString(36).slice(2, 14)}`;
    const newKey: MockApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key_prefix: fakeKey.slice(0, 12),
      scopes: newKeyScopes,
      is_active: true,
      last_used_at: null,
      expires_at: newKeyExpiry || null,
      created_at: new Date().toISOString(),
    };
    setKeys((prev) => [newKey, ...prev]);
    setCreatedKey(fakeKey);
    setNewKeyName("");
    setNewKeyScopes([]);
    setNewKeyExpiry("");
  };

  const handleRevoke = (id: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, is_active: false } : k))
    );
  };

  const handleDelete = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <p className="text-sm text-gray-500">
              Manage API keys for programmatic access
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setCreatedKey(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Created key notice */}
      {createdKey && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">
                API Key Created
              </p>
              <p className="text-xs text-green-600 mt-1">
                Copy this key now. It won&apos;t be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-mono text-green-800">
                  {createdKey}
                </code>
                <button
                  onClick={() => handleCopy(createdKey, "newKey")}
                  className="text-green-600 hover:text-green-700"
                >
                  {copiedId === "newKey" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="text-green-400 hover:text-green-600"
            >
              <span className="sr-only">Dismiss</span>
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && !createdKey && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Create New API Key
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API Key"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {availableScopes.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      newKeyScopes.includes(scope)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration (optional)
              </label>
              <input
                type="date"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                disabled={!newKeyName || newKeyScopes.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <Key className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              No API keys
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create an API key to get started with programmatic access.
            </p>
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className={cn(
                "rounded-xl border bg-white p-5 shadow-sm",
                key.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      {key.name}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        key.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {key.is_active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-xs text-gray-500">
                      {key.key_prefix}...
                    </code>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    {key.last_used_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last used{" "}
                        {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    {key.expires_at && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Expires{" "}
                        {new Date(key.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      Created{" "}
                      {new Date(key.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {key.is_active && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
