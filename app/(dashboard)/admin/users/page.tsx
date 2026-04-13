"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = ["pending", "client", "employee", "owner", "admin"];

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fdf8ec", color: "#c8991a" },
  client:   { bg: "#f0f4ff", color: "#1a2e4a" },
  employee: { bg: "#f0faf5", color: "#2d8a5e" },
  owner:    { bg: "#f7f0fa", color: "#7c3aed" },
  admin:    { bg: "#fef2f2", color: "#c0392b" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const d = await res.json();
      setUsers(Array.isArray(d) ? d : []);
    } catch {
      setError("Could not load users. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function updateRole(id: string, role: string) {
    setSaving(id + "-role");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
    }
    setSaving(null);
  }

  async function toggleActive(id: string, current: boolean) {
    setSaving(id + "-active");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: !current } : u));
    }
    setSaving(null);
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const pendingCount = users.filter((u) => u.role === "pending").length;

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage accounts, assign roles, and approve new users"
      />

      <div className="p-8">
        {pendingCount > 0 && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-sans flex items-center gap-2"
            style={{ backgroundColor: "#fdf8ec", border: "1px solid #f0d080", color: "#c8991a" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              <strong>{pendingCount}</strong> account{pendingCount !== 1 ? "s" : ""} waiting for role assignment.
            </span>
            <button onClick={() => setFilterRole("pending")}
              className="ml-2 underline font-semibold" style={{ color: "#c8991a" }}>
              Show pending
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
          >
            <option value="all">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
          {loading ? (
            <div className="p-8 text-center text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading users…</div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
              <button onClick={fetchUsers} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm font-sans" style={{ color: "#8e9ab0" }}>No users found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Current Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Change Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.pending;
                  return (
                    <tr key={u.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #dce2ec" : "none" }}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                          {u.full_name ?? "—"}
                        </p>
                        <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{u.email ?? "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full capitalize"
                          style={{ backgroundColor: badge.bg, color: badge.color }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={u.role}
                          disabled={saving === u.id + "-role"}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border text-sm font-sans outline-none disabled:opacity-50"
                          style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleActive(u.id, u.is_active)}
                          disabled={saving === u.id + "-active"}
                          className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full disabled:opacity-50"
                          style={{
                            backgroundColor: u.is_active ? "#f0faf5" : "#f7f9fc",
                            color: u.is_active ? "#2d8a5e" : "#8e9ab0",
                            border: `1px solid ${u.is_active ? "#a7dfc4" : "#dce2ec"}`,
                          }}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm font-sans" style={{ color: "#8e9ab0" }}>
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
