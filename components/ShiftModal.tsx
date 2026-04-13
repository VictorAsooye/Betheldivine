"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  position?: string;
  profiles?: { full_name?: string };
}
interface Client {
  id: string;
  profiles?: { full_name?: string };
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function ShiftModal({ onClose, onCreated }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    employee_id: "",
    client_id: "",
    scheduled_start: "",
    scheduled_end: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([emps, cls]) => {
      setEmployees(Array.isArray(emps) ? emps : []);
      setClients(Array.isArray(cls) ? cls : []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (new Date(form.scheduled_end) <= new Date(form.scheduled_start)) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create shift.");
      setLoading(false);
      return;
    }
    onCreated();
    onClose();
  }

  const inputStyle = {
    borderColor: "#dce2ec",
    color: "#1a2e4a",
    backgroundColor: "#f7f9fc",
  };
  const labelStyle = { color: "#1a2e4a" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(18,32,56,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" style={{ border: "1px solid #dce2ec" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
          <h2 className="text-lg font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
            Schedule Shift
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Employee */}
          <div>
            <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Employee</label>
            <select
              required
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
              style={inputStyle}
            >
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profiles?.full_name ?? emp.id}
                  {emp.position ? ` — ${emp.position}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Client</label>
            <select
              required
              value={form.client_id}
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
              style={inputStyle}
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c as { profiles?: { full_name?: string } }).profiles?.full_name ?? c.id}
                </option>
              ))}
            </select>
          </div>

          {/* Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Start</label>
              <input
                type="datetime-local"
                required
                value={form.scheduled_start}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_start: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>End</label>
              <input
                type="datetime-local"
                required
                value={form.scheduled_end}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_end: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-1.5 font-sans" style={labelStyle}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any special instructions…"
              className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-sm font-sans px-3 py-2 rounded-lg" style={{ color: "#c0392b", backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border text-sm font-semibold font-sans"
              style={{ borderColor: "#dce2ec", color: "#8e9ab0" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60"
              style={{ backgroundColor: "#1a2e4a" }}
            >
              {loading ? "Saving…" : "Create Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
