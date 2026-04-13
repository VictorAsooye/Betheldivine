"use client";

import { useEffect, useState } from "react";
import type { License } from "./LicenseTable";

interface EmployeeRow {
  id: string;
  profile_id: string;
  profiles?: { full_name?: string };
}

interface LicenseModalProps {
  onClose: () => void;
  onSaved: (license: License) => void;
  editing?: License | null;
}

const ORG_PLACEHOLDER_ID = "__organization__";

export default function LicenseModal({ onClose, onSaved, editing }: LicenseModalProps) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [form, setForm] = useState({
    holder_id: editing?.holder_id ?? "",
    holder_type: editing?.holder_type ?? "employee",
    license_name: editing?.license_name ?? "",
    license_number: editing?.license_number ?? "",
    issuing_authority: editing?.issuing_authority ?? "",
    issued_date: editing?.issued_date ?? "",
    expiry_date: editing?.expiry_date ?? "",
    notes: editing?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none";
  const inputStyle = { borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" };

  function set(key: string, value: string) {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleHolderChange(value: string) {
    if (value === ORG_PLACEHOLDER_ID) {
      // We'll use the admin's own profile_id for organization licenses
      // The holder_type distinguishes them
      setForm((f) => ({ ...f, holder_id: value, holder_type: "organization" }));
    } else {
      setForm((f) => ({ ...f, holder_id: value, holder_type: "employee" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.holder_id || !form.license_name || !form.expiry_date) {
      setError("Holder, license name, and expiry date are required.");
      return;
    }

    setSaving(true);
    setError(null);

    // For organization licenses, we need a real profile ID
    // Use the holder_id as-is unless it's the placeholder
    let holderId = form.holder_id;
    let holderType = form.holder_type;

    if (form.holder_id === ORG_PLACEHOLDER_ID) {
      // Use current user's profile as the org license holder
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      holderId = me?.id ?? "";
      holderType = "organization";
    }

    const payload = {
      holder_id: holderId,
      holder_type: holderType,
      license_name: form.license_name,
      license_number: form.license_number,
      issuing_authority: form.issuing_authority,
      issued_date: form.issued_date || null,
      expiry_date: form.expiry_date,
      notes: form.notes || null,
    };

    const url = editing ? `/api/licenses/${editing.id}` : "/api/licenses";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to save license.");
      setSaving(false);
      return;
    }

    onSaved(data);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
          <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
            {editing ? "Edit License" : "Add License"}
          </h2>
          <button onClick={onClose} style={{ color: "#8e9ab0" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Holder</label>
            <select
              value={form.holder_type === "organization" ? ORG_PLACEHOLDER_ID : form.holder_id}
              onChange={(e) => handleHolderChange(e.target.value)}
              required className={inputCls} style={inputStyle}>
              <option value="">Select holder…</option>
              <option value={ORG_PLACEHOLDER_ID}>— Organization —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.profile_id}>{e.profiles?.full_name ?? e.profile_id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>License Name</label>
            <input type="text" value={form.license_name} onChange={(e) => set("license_name", e.target.value)}
              placeholder="e.g. CNA Certification" required className={inputCls} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>License Number</label>
              <input type="text" value={form.license_number} onChange={(e) => set("license_number", e.target.value)}
                placeholder="Optional" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Issuing Authority</label>
              <input type="text" value={form.issuing_authority} onChange={(e) => set("issuing_authority", e.target.value)}
                placeholder="e.g. MD Board of Nursing" className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Issued Date</label>
              <input type="date" value={form.issued_date} onChange={(e) => set("issued_date", e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)}
                required className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={2} placeholder="Optional notes…"
              className={inputCls} style={{ ...inputStyle, resize: "none" }} />
          </div>

          {error && <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-60"
              style={{ backgroundColor: "#1a2e4a" }}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add License"}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold font-sans border"
              style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
