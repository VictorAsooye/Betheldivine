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
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fdf8ec", color: "#c8991a" },
  approved: { bg: "#f0faf5", color: "#2d8a5e" },
  denied:   { bg: "#fef2f2", color: "#c0392b" },
};

export default function EmployeeTimeOffPage() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });

  async function fetchRequests() {
    const res = await fetch("/api/time-off");
    const data = await res.json();
    setRequests(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError("End date must be on or after start date.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit request.");
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    setShowForm(false);
    setForm({ start_date: "", end_date: "", reason: "" });
    fetchRequests();
    setSubmitting(false);
  }

  const inputStyle = { borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" };

  return (
    <div>
      <PageHeader
        title="Time Off Requests"
        subtitle="Submit and track your time off"
        action={
          <button
            onClick={() => { setShowForm(!showForm); setError(null); setSuccess(false); }}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold font-sans"
            style={{ backgroundColor: "#1a2e4a" }}
          >
            {showForm ? "Cancel" : "+ Request Time Off"}
          </button>
        }
      />

      <div className="p-8 space-y-6">
        {success && (
          <div className="px-4 py-3 rounded-lg text-sm font-sans" style={{ backgroundColor: "#f0faf5", color: "#2d8a5e", border: "1px solid #2d8a5e" }}>
            Time off request submitted successfully.
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              New Time Off Request
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Start Date</label>
                  <input type="date" required value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>End Date</label>
                  <input type="date" required value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3} placeholder="Briefly explain the reason for your time off request…"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none resize-none" style={inputStyle} />
              </div>
              {error && (
                <p className="text-sm font-sans px-3 py-2 rounded-lg" style={{ color: "#c0392b", backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>{error}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-lg border text-sm font-semibold font-sans" style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60" style={{ backgroundColor: "#1a2e4a" }}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Request history */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              My Requests
            </h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "#f7f9fc" }} />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No requests yet. Submit your first above.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {requests.map((req) => {
                const style = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;
                return (
                  <div key={req.id} className="px-6 py-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                        {req.start_date} — {req.end_date}
                      </p>
                      {req.reason && (
                        <p className="text-xs font-sans mt-0.5" style={{ color: "#8e9ab0" }}>{req.reason}</p>
                      )}
                      <p className="text-xs font-sans mt-1" style={{ color: "#8e9ab0" }}>
                        Submitted {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full capitalize ml-4 flex-shrink-0"
                      style={{ backgroundColor: style.bg, color: style.color }}>
                      {req.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
