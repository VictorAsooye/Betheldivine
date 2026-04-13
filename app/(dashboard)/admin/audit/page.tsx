"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_table: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: { full_name?: string; email?: string };
}

const ACTION_BADGE: Record<string, { bg: string; color: string }> = {
  INSERT: { bg: "#f0faf5", color: "#2d8a5e" },
  UPDATE: { bg: "#f0f4ff", color: "#1a2e4a" },
  DELETE: { bg: "#fef2f2", color: "#c0392b" },
  LOGIN:  { bg: "#fdf8ec", color: "#c8991a" },
};

function getBadge(action: string) {
  const key = Object.keys(ACTION_BADGE).find((k) => action.toUpperCase().includes(k));
  return key ? ACTION_BADGE[key] : { bg: "#f7f9fc", color: "#8e9ab0" };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState("all");

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit");
      if (!res.ok) throw new Error("Failed to load audit log");
      const d = await res.json();
      setLogs(Array.isArray(d) ? d : []);
    } catch {
      setError("Could not load audit log. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, []);

  const tables = Array.from(new Set(logs.map((l) => l.target_table))).sort();

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.target_table.toLowerCase().includes(search.toLowerCase()) ||
      (l.profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.profiles?.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTable = filterTable === "all" || l.target_table === filterTable;
    return matchSearch && matchTable;
  });

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Full system activity trail" />

      <div className="p-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by action, table, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
          />
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
          >
            <option value="all">All tables</option>
            {tables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
          {loading ? (
            <div className="p-8 text-center text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading audit log…</div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
              <button onClick={fetchLogs} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm font-sans" style={{ color: "#8e9ab0" }}>
              {logs.length === 0
                ? "No audit log entries yet. Actions taken in the system will appear here."
                : "No entries match your search."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>When</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Actor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Action</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Table</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const badge = getBadge(log.action);
                  const metaStr = Object.keys(log.metadata ?? {}).length
                    ? JSON.stringify(log.metadata, null, 0).slice(0, 80)
                    : "—";
                  return (
                    <tr key={log.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #dce2ec" : "none" }}>
                      <td className="px-5 py-3 text-sm font-sans whitespace-nowrap" style={{ color: "#8e9ab0" }}>
                        {fmt(log.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-sans font-medium" style={{ color: "#1a2e4a" }}>
                          {log.profiles?.full_name ?? "System"}
                        </p>
                        {log.profiles?.email && (
                          <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{log.profiles.email}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full uppercase"
                          style={{ backgroundColor: badge.bg, color: badge.color }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-sans font-mono" style={{ color: "#1a2e4a" }}>
                        {log.target_table}
                      </td>
                      <td className="px-5 py-3 text-xs font-sans font-mono max-w-xs truncate" style={{ color: "#8e9ab0" }}
                        title={JSON.stringify(log.metadata)}>
                        {metaStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && logs.length > 0 && (
          <p className="mt-3 text-xs font-sans" style={{ color: "#8e9ab0" }}>
            Showing {filtered.length} of {logs.length} entries
          </p>
        )}
      </div>
    </div>
  );
}
