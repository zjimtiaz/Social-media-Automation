"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Save,
  Building2,
  Key,
  Users,
  CreditCard,
  ArrowRight,
} from "lucide-react";

const planConfig = {
  free: {
    label: "Free",
    price: "$0/mo",
    className: "bg-gray-100 text-gray-700",
  },
  starter: {
    label: "Starter",
    price: "$29/mo",
    className: "bg-blue-100 text-blue-700",
  },
  pro: {
    label: "Pro",
    price: "$99/mo",
    className: "bg-purple-100 text-purple-700",
  },
  enterprise: {
    label: "Enterprise",
    price: "Custom",
    className: "bg-orange-100 text-orange-700",
  },
};

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("My Organization");
  const [orgSlug, setOrgSlug] = useState("my-organization");
  const [isSaving, setIsSaving] = useState(false);

  const currentPlan: keyof typeof planConfig = "pro";
  const plan = planConfig[currentPlan];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const settingsLinks = [
    {
      href: "/settings/api-keys",
      icon: Key,
      label: "API Keys",
      description: "Manage API keys for external integrations",
    },
    {
      href: "/settings/team",
      icon: Users,
      label: "Team Members",
      description: "Manage team members and their roles",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Organization Settings */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Organization Settings
            </h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">app.yourbrand.com/</span>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
                {orgName.charAt(0)}
              </div>
              <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Upload Logo
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Subscription Plan
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-sm font-semibold",
                  plan.className
                )}
              >
                {plan.label}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {plan.price}
              </span>
            </div>
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Manage Subscription
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Team Members", value: "10", limit: "25" },
              { label: "Platforms", value: "3", limit: "8" },
              { label: "Content/mo", value: "45", limit: "500" },
              { label: "API Calls/mo", value: "1.2k", limit: "50k" },
            ].map((usage) => (
              <div key={usage.label} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">{usage.label}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {usage.value}{" "}
                  <span className="text-xs font-normal text-gray-400">
                    / {usage.limit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="space-y-3">
        {settingsLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                <Icon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {link.label}
                </h3>
                <p className="text-xs text-gray-500">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
