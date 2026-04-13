"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LicenseTable, { type License } from "@/components/LicenseTable";
import LicenseModal from "@/components/LicenseModal";

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/licenses");
      if (!res.ok) throw new Error("Failed to load licenses");
      const d = await res.json();
      setLicenses(Array.isArray(d) ? d : []);
    } catch {
      setError("Could not load licenses. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const expiring = licenses.filter((l) => l.status === "expiring_soon" || l.status === "expired");

  async function handleDelete(id: string) {
    if (!confirm("Delete this license?")) return;
    await fetch(`/api/licenses/${id}`, { method: "DELETE" });
    setLicenses((prev) => prev.filter((l) => l.id !== id));
  }

  function handleSaved(license: License) {
    setLicenses((prev) => {
      const idx = prev.findIndex((l) => l.id === license.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = license;
        return next;
      }
      return [license, ...prev];
    });
    setShowModal(false);
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="License & Certification Tracker"
        subtitle="Track all organization and employee licenses"
        actionLabel="Add License"
        onAction={() => { setEditing(null); setShowModal(true); }}
      />

      <div className="p-8">
        {expiring.length > 0 && (
          <div className="mb-6 px-4 py-3 rounded-lg flex items-start gap-3"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-semibold font-sans" style={{ color: "#c0392b" }}>
                {expiring.length} license{expiring.length !== 1 ? "s" : ""} require attention
              </p>
              <p className="text-xs font-sans mt-0.5" style={{ color: "#c0392b" }}>
                {expiring.filter((l) => l.status === "expired").length} expired · {expiring.filter((l) => l.status === "expiring_soon").length} expiring soon
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading licenses…</div>
        ) : error ? (
          <div className="bg-white rounded-xl border p-8 space-y-3" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
            <button onClick={load} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
          </div>
        ) : (
          <LicenseTable
            licenses={licenses}
            showHolder
            onEdit={(l) => { setEditing(l); setShowModal(true); }}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showModal && (
        <LicenseModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
