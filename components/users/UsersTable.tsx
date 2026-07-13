"use client";

import { useEffect, useState } from "react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = ["pending", "employee", "owner", "admin"];

const ROLE_BADGE: Record<string, string> = {
  pending: "bg-warning-bg text-warning-text",
  employee: "bg-success-bg text-success-text",
  owner: "bg-slateWash text-slate",
  admin: "bg-danger-bg text-danger-text",
};

export default function UsersTable() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const d = await res.json();
    setUsers(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { fetchUsers(); }, []);

  async function updateRole(id: string, role: string) {
    setSaving(id + "-role");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) setUsers((p) => p.map((u) => u.id === id ? { ...u, role } : u));
    setSaving(null);
  }

  async function toggleActive(id: string, current: boolean) {
    setSaving(id + "-active");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) setUsers((p) => p.map((u) => u.id === id ? { ...u, is_active: !current } : u));
    setSaving(null);
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 bg-paper border border-line2 rounded-lg px-3 py-2 text-[13px] text-ink outline-none"
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-paper border border-line2 rounded-lg px-3 py-2 text-[13px] text-ink">
          <option value="all">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      <div className="bg-paper border border-line2 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr] px-5 py-3 border-b border-line bg-paper2 text-[11px] uppercase tracking-wide text-muted">
          <span>User</span><span>Role</span><span>Change role</span><span>Status</span><span>Joined</span>
        </div>
        {loading ? (
          <p className="text-[13px] text-muted p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-muted p-8 text-center">No users found.</p>
        ) : (
          filtered.map((u) => (
            <div key={u.id} className="grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr] px-5 py-4 items-center border-b border-line last:border-b-0 hover:bg-paper2">
              <div className="min-w-0">
                <p className="text-[13px] text-ink2 font-medium truncate">{u.full_name ?? "—"}</p>
                <p className="text-[12px] text-muted truncate">{u.email ?? "—"}</p>
              </div>
              <span><span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[u.role] ?? ROLE_BADGE.pending}`}>{u.role}</span></span>
              <span>
                <select
                  value={u.role}
                  disabled={saving === u.id + "-role"}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  className="bg-paper2 border border-line2 rounded-lg px-2 py-1 text-[13px] outline-none disabled:opacity-50"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </span>
              <span>
                <button
                  onClick={() => toggleActive(u.id, u.is_active)}
                  disabled={saving === u.id + "-active"}
                  className={`text-[11px] px-2 py-0.5 rounded-full disabled:opacity-50 ${u.is_active ? "bg-success-bg text-success-text" : "bg-paper2 text-muted"}`}
                >
                  {u.is_active ? "Active" : "Inactive"}
                </button>
              </span>
              <span className="text-[13px] text-muted">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
