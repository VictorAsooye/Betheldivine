"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LicenseTable, { type License } from "@/components/LicenseTable";

export default function EmployeeLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLicenses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/licenses");
      if (!res.ok) throw new Error("Failed to load licenses");
      const d = await res.json();
      setLicenses(Array.isArray(d) ? d : []);
    } catch {
      setError("Could not load your licenses. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLicenses(); }, []);

  const needsAttention = licenses.filter((l) => l.status === "expiring_soon" || l.status === "expired");

  return (
    <div>
      <PageHeader
        title="My Licenses & Certifications"
        subtitle="Your current certifications and their status"
      />

      <div className="p-8">
        {needsAttention.length > 0 && (
          <div className="mb-6 px-4 py-4 rounded-lg"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>
            <p className="text-sm font-semibold font-sans mb-1" style={{ color: "#c0392b" }}>
              Action Required: {needsAttention.length} license{needsAttention.length !== 1 ? "s" : ""} need attention
            </p>
            <ul className="space-y-1">
              {needsAttention.map((l) => (
                <li key={l.id} className="text-xs font-sans" style={{ color: "#c0392b" }}>
                  • {l.license_name} — {l.status === "expired" ? "EXPIRED" : `expires ${new Date(l.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                </li>
              ))}
            </ul>
            <p className="text-xs font-sans mt-2" style={{ color: "#c0392b" }}>
              Please contact your supervisor or admin to renew these certifications.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading your licenses…</div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
            <button onClick={fetchLicenses} className="text-sm font-semibold font-sans underline" style={{ color: "#1a2e4a" }}>Retry</button>
          </div>
        ) : licenses.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No licenses on file. Contact your admin to add your certifications.</p>
          </div>
        ) : (
          <LicenseTable licenses={licenses} showHolder={false} />
        )}
      </div>
    </div>
  );
}
