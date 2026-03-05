"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Radio,
  Shield,
  Zap,
  AlertTriangle,
} from "lucide-react";

interface ListeningConfigItem {
  id: string;
  platform: string;
  keywords: string[];
  excluded_keywords: string[];
  is_active: boolean;
  auto_respond: boolean;
  risk_threshold: number;
  poll_interval_minutes: number;
}

const mockConfigs: ListeningConfigItem[] = [
  {
    id: "1",
    platform: "twitter",
    keywords: ["yourbrand", "@yourbrand", "our product"],
    excluded_keywords: ["spam", "giveaway"],
    is_active: true,
    auto_respond: false,
    risk_threshold: 0.3,
    poll_interval_minutes: 5,
  },
  {
    id: "2",
    platform: "reddit",
    keywords: ["yourbrand", "social media automation"],
    excluded_keywords: [],
    is_active: true,
    auto_respond: false,
    risk_threshold: 0.5,
    poll_interval_minutes: 15,
  },
  {
    id: "3",
    platform: "facebook",
    keywords: ["yourbrand"],
    excluded_keywords: [],
    is_active: false,
    auto_respond: false,
    risk_threshold: 0.3,
    poll_interval_minutes: 10,
  },
];

export default function CommunityConfigPage() {
  const [configs, setConfigs] = useState(mockConfigs);
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});
  const [newExcluded, setNewExcluded] = useState<Record<string, string>>({});

  const addKeyword = (configId: string) => {
    const keyword = newKeyword[configId]?.trim();
    if (!keyword) return;
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId
          ? { ...c, keywords: [...c.keywords, keyword] }
          : c
      )
    );
    setNewKeyword((prev) => ({ ...prev, [configId]: "" }));
  };

  const removeKeyword = (configId: string, keyword: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId
          ? { ...c, keywords: c.keywords.filter((k) => k !== keyword) }
          : c
      )
    );
  };

  const addExcluded = (configId: string) => {
    const keyword = newExcluded[configId]?.trim();
    if (!keyword) return;
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId
          ? { ...c, excluded_keywords: [...c.excluded_keywords, keyword] }
          : c
      )
    );
    setNewExcluded((prev) => ({ ...prev, [configId]: "" }));
  };

  const removeExcluded = (configId: string, keyword: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId
          ? {
              ...c,
              excluded_keywords: c.excluded_keywords.filter((k) => k !== keyword),
            }
          : c
      )
    );
  };

  const toggleActive = (configId: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId ? { ...c, is_active: !c.is_active } : c
      )
    );
  };

  const toggleAutoRespond = (configId: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId ? { ...c, auto_respond: !c.auto_respond } : c
      )
    );
  };

  const updateRiskThreshold = (configId: string, value: number) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId ? { ...c, risk_threshold: value } : c
      )
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Listening Configuration
            </h2>
            <p className="text-sm text-gray-500">
              Manage keywords and auto-response settings per platform
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Save className="h-4 w-4" />
          Save All
        </button>
      </div>

      {/* Config cards */}
      <div className="space-y-6">
        {configs.map((config) => {
          const platformDef = PLATFORMS.find((p) => p.id === config.platform);
          return (
            <div
              key={config.id}
              className={cn(
                "rounded-xl border bg-white shadow-sm transition-all",
                config.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold"
                    style={{ backgroundColor: platformDef?.color }}
                  >
                    {platformDef?.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {platformDef?.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Polling every {config.poll_interval_minutes} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">Active</span>
                    <button
                      onClick={() => toggleActive(config.id)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        config.is_active ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          config.is_active && "translate-x-5"
                        )}
                      />
                    </button>
                  </label>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Keywords */}
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Radio className="h-4 w-4 text-gray-400" />
                    Tracked Keywords
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        {kw}
                        <button
                          onClick={() => removeKeyword(config.id, kw)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-blue-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword[config.id] ?? ""}
                      onChange={(e) =>
                        setNewKeyword((prev) => ({
                          ...prev,
                          [config.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && addKeyword(config.id)
                      }
                      placeholder="Add keyword..."
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => addKeyword(config.id)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Excluded keywords */}
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Shield className="h-4 w-4 text-gray-400" />
                    Excluded Keywords
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.excluded_keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                      >
                        {kw}
                        <button
                          onClick={() => removeExcluded(config.id, kw)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-red-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {config.excluded_keywords.length === 0 && (
                      <span className="text-xs text-gray-400">
                        No excluded keywords
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newExcluded[config.id] ?? ""}
                      onChange={(e) =>
                        setNewExcluded((prev) => ({
                          ...prev,
                          [config.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && addExcluded(config.id)
                      }
                      placeholder="Add excluded keyword..."
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => addExcluded(config.id)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Auto-respond toggle */}
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Auto-respond
                      </p>
                      <p className="text-xs text-gray-400">
                        Automatically reply to low-risk mentions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAutoRespond(config.id)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      config.auto_respond ? "bg-blue-600" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        config.auto_respond && "translate-x-5"
                      )}
                    />
                  </button>
                </div>

                {/* Risk threshold slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                      Risk Threshold
                    </label>
                    <span className="text-sm font-medium text-gray-900">
                      {(config.risk_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.risk_threshold * 100}
                    onChange={(e) =>
                      updateRiskThreshold(
                        config.id,
                        Number(e.target.value) / 100
                      )
                    }
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Conservative (low)</span>
                    <span>Aggressive (high)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
