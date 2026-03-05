"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Users,
  Shield,
  MoreHorizontal,
  Mail,
  Crown,
  Trash2,
} from "lucide-react";

type Role = "owner" | "admin" | "editor" | "viewer";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  joined_at: string;
  last_active_at: string | null;
}

const roleConfig: Record<Role, { label: string; className: string; description: string }> = {
  owner: {
    label: "Owner",
    className: "bg-orange-100 text-orange-700",
    description: "Full access, billing, and member management",
  },
  admin: {
    label: "Admin",
    className: "bg-purple-100 text-purple-700",
    description: "Full access except billing and org deletion",
  },
  editor: {
    label: "Editor",
    className: "bg-blue-100 text-blue-700",
    description: "Create and manage content, campaigns, and responses",
  },
  viewer: {
    label: "Viewer",
    className: "bg-gray-100 text-gray-700",
    description: "Read-only access to all resources",
  },
};

const mockTeam: TeamMember[] = [
  {
    id: "1",
    full_name: "John Doe",
    email: "john@yourbrand.com",
    avatar_url: null,
    role: "owner",
    joined_at: "2025-01-01T00:00:00Z",
    last_active_at: "2025-06-05T14:30:00Z",
  },
  {
    id: "2",
    full_name: "Jane Smith",
    email: "jane@yourbrand.com",
    avatar_url: null,
    role: "admin",
    joined_at: "2025-02-15T10:00:00Z",
    last_active_at: "2025-06-05T12:00:00Z",
  },
  {
    id: "3",
    full_name: "Mike Wilson",
    email: "mike@yourbrand.com",
    avatar_url: null,
    role: "editor",
    joined_at: "2025-03-20T09:00:00Z",
    last_active_at: "2025-06-04T16:00:00Z",
  },
  {
    id: "4",
    full_name: "Sarah Johnson",
    email: "sarah@yourbrand.com",
    avatar_url: null,
    role: "editor",
    joined_at: "2025-04-10T14:00:00Z",
    last_active_at: "2025-06-03T11:00:00Z",
  },
  {
    id: "5",
    full_name: "Alex Brown",
    email: "alex@yourbrand.com",
    avatar_url: null,
    role: "viewer",
    joined_at: "2025-05-01T08:00:00Z",
    last_active_at: "2025-06-02T09:00:00Z",
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState(mockTeam);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const handleInvite = () => {
    if (!inviteEmail) return;
    const newMember: TeamMember = {
      id: `m_${Date.now()}`,
      full_name: inviteEmail.split("@")[0],
      email: inviteEmail,
      avatar_url: null,
      role: inviteRole,
      joined_at: new Date().toISOString(),
      last_active_at: null,
    };
    setMembers((prev) => [...prev, newMember]);
    setShowInvite(false);
    setInviteEmail("");
    setInviteRole("editor");
  };

  const handleChangeRole = (memberId: string, newRole: Role) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    setEditingRole(null);
  };

  const handleRemove = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
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
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members
            </h2>
            <p className="text-sm text-gray-500">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Invite Team Member
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            {/* Role descriptions */}
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {roleConfig[inviteRole].label}:
                </span>{" "}
                {roleConfig[inviteRole].description}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  member.full_name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {member.full_name}
                  </p>
                  {member.role === "owner" && (
                    <Crown className="h-3.5 w-3.5 text-orange-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Role badge / selector */}
                {editingRole === member.id ? (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleChangeRole(member.id, e.target.value as Role)
                    }
                    onBlur={() => setEditingRole(null)}
                    autoFocus
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <button
                    onClick={() =>
                      member.role !== "owner" && setEditingRole(member.id)
                    }
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                      roleConfig[member.role].className,
                      member.role !== "owner" && "cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-200"
                    )}
                    disabled={member.role === "owner"}
                  >
                    {roleConfig[member.role].label}
                  </button>
                )}

                {/* Last active */}
                <span className="hidden sm:block text-xs text-gray-400 w-24 text-right">
                  {member.last_active_at
                    ? new Date(member.last_active_at).toLocaleDateString()
                    : "Never"}
                </span>

                {/* Remove */}
                {member.role !== "owner" && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role reference */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Role Permissions
            </h3>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {(Object.entries(roleConfig) as [Role, typeof roleConfig.owner][]).map(
            ([role, config]) => (
              <div key={role} className="flex items-center gap-3 px-6 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium w-20 justify-center",
                    config.className
                  )}
                >
                  {config.label}
                </span>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
