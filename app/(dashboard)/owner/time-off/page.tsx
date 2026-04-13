"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface TimeOffRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: string;
  created_at: string;
  employees?: {
    profiles?: { full_name?: string; email?: string };
  } | null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fdf8ec", color: "#c8991a" },
  approved: { bg: "#f0faf5", color: "#2d8a5e" },
  denied:   { bg: "#fef2f2", color: "#c0392b" },
};

export default function OwnerTimeOffPage() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function fetchRequests() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/time-off");
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load time off requests. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleAction(id: string, status: "approved" | "denied") {
    setActionId(id);
    await fetch(`/api/time-off/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchRequests();
    setActionId(null);
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Time Off Requests"
        subtitle={`${pending.length} pending review`}
      />
      <div className="p-8 space-y-6">
        {/* Pending */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
          <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Pending Approval
            </h2>
            {pending.length > 0 && (
              <span className="text-xs font-semibold font-sans px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdf8ec", color: "#c8991a" }}>
                {pending.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 rounded-lg animate-pulse" style={{ backgroundColor: "#f7f9fc" }} />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
              <button onClick={fetchRequests} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
            </div>
          ) : pending.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No pending requests. All caught up!</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {pending.map((req) => {
                const emp = (req.employees as { profiles?: { full_name?: string; email?: string } } | null)?.profiles;
                return (
                  <div key={req.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                          {emp?.full_name ?? "Employee"}
                        </p>
                        <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{emp?.email}</p>
                        <p className="text-sm font-sans mt-1" style={{ color: "#1a2e4a" }}>
                          {req.start_date} → {req.end_date}
                        </p>
                        {req.reason && (
                          <p className="text-xs font-sans mt-1 italic" style={{ color: "#8e9ab0" }}>{req.reason}</p>
                        )}
                        <p className="text-xs font-sans mt-1" style={{ color: "#8e9ab0" }}>
                          Submitted {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAction(req.id, "approved")}
                          disabled={actionId === req.id}
                          className="px-4 py-2 rounded-lg text-white text-xs font-semibold font-sans disabled:opacity-60"
                          style={{ backgroundColor: "#2d8a5e" }}
                        >
                          {actionId === req.id ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "denied")}
                          disabled={actionId === req.id}
                          className="px-4 py-2 rounded-lg text-white text-xs font-semibold font-sans disabled:opacity-60"
                          style={{ backgroundColor: "#c0392b" }}
                        >
                          {actionId === req.id ? "…" : "Deny"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolved */}
        {resolved.length > 0 && (
          <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
              <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
                Resolved Requests
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {resolved.map((req) => {
                const style = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;
                const emp = (req.employees as { profiles?: { full_name?: string } } | null)?.profiles;
                return (
                  <div key={req.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                        {emp?.full_name ?? "Employee"} — {req.start_date} → {req.end_date}
                      </p>
                      {req.reason && <p className="text-xs font-sans italic" style={{ color: "#8e9ab0" }}>{req.reason}</p>}
                    </div>
                    <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full capitalize ml-4 flex-shrink-0"
                      style={{ backgroundColor: style.bg, color: style.color }}>
                      {req.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
