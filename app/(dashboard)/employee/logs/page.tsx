"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";

interface Client {
  id: string;
  profiles?: { full_name?: string };
}
interface MedLog {
  id: string;
  medication_name: string;
  dosage?: string;
  administered_at: string;
  status: string;
  notes?: string;
  clients?: { profiles?: { full_name?: string } } | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  given:   { bg: "#f0faf5", color: "#2d8a5e" },
  refused: { bg: "#fef2f2", color: "#c0392b" },
  missed:  { bg: "#fdf8ec", color: "#c8991a" },
};

export default function EmployeeLogsPage() {
  const searchParams = useSearchParams();
  const preselectedClient = searchParams.get("client") ?? "";

  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<MedLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    client_id: preselectedClient,
    medication_name: "",
    dosage: "",
    administered_at: new Date().toISOString().slice(0, 16),
    status: "given",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : []));
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoadingLogs(true);
    const res = await fetch("/api/medication-logs");
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoadingLogs(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const res = await fetch("/api/medication-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to submit log.");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setShowForm(false);
    setForm({ client_id: "", medication_name: "", dosage: "", administered_at: new Date().toISOString().slice(0, 16), status: "given", notes: "" });
    fetchLogs();
    setSubmitting(false);
  }

  const inputStyle = { borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" };

  return (
    <div>
      <PageHeader
        title="Medication Logs"
        subtitle="Record and review medication administration"
        action={
          <button
            onClick={() => { setShowForm(!showForm); setError(null); setSuccess(false); }}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold font-sans"
            style={{ backgroundColor: "#1a2e4a" }}
          >
            {showForm ? "Cancel" : "+ Add Log"}
          </button>
        }
      />

      <div className="p-8 space-y-6">
        {success && (
          <div className="px-4 py-3 rounded-lg text-sm font-sans" style={{ backgroundColor: "#f0faf5", color: "#2d8a5e", border: "1px solid #2d8a5e" }}>
            Medication log submitted successfully.
          </div>
        )}

        {/* Log form */}
        {showForm && (
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              New Medication Log
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Client</label>
                  <select required value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle}>
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.profiles?.full_name ?? c.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle}>
                    <option value="given">Given</option>
                    <option value="refused">Refused</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Medication Name</label>
                  <input required type="text" value={form.medication_name} onChange={(e) => setForm((f) => ({ ...f, medication_name: e.target.value }))}
                    placeholder="e.g. Metformin" className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Dosage</label>
                  <input type="text" value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                    placeholder="e.g. 500mg" className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Administered At</label>
                  <input type="datetime-local" value={form.administered_at} onChange={(e) => setForm((f) => ({ ...f, administered_at: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Notes</label>
                  <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes…" className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none" style={inputStyle} />
                </div>
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
                  {submitting ? "Submitting…" : "Submit Log"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Logs list */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Recent Logs
            </h2>
          </div>
          {loadingLogs ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: "#f7f9fc" }} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No medication logs yet. Add the first one above.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {logs.map((log) => {
                const badge = STATUS_COLORS[log.status] ?? STATUS_COLORS.given;
                const clientName = (log.clients as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ?? "—";
                return (
                  <div key={log.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                        {log.medication_name}{log.dosage ? ` · ${log.dosage}` : ""}
                      </p>
                      <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
                        {clientName} · {new Date(log.administered_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                      {log.notes && <p className="text-xs italic font-sans mt-0.5" style={{ color: "#8e9ab0" }}>{log.notes}</p>}
                    </div>
                    <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full capitalize ml-4 flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.color }}>
                      {log.status}
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
