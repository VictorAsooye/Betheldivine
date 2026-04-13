"use client";

import { useState } from "react";

export interface License {
  id: string;
  holder_id: string;
  holder_type: "employee" | "organization";
  license_name: string;
  license_number: string;
  issuing_authority: string;
  issued_date: string | null;
  expiry_date: string;
  status: "active" | "expiring_soon" | "expired";
  document_url: string | null;
  notes: string | null;
  created_at: string;
  profiles?: { full_name?: string; email?: string };
}

const STATUS_BADGE = {
  active:        { bg: "#f0faf5", color: "#2d8a5e", label: "Active" },
  expiring_soon: { bg: "#fdf8ec", color: "#c8991a", label: "Expiring Soon" },
  expired:       { bg: "#fef2f2", color: "#c0392b", label: "Expired" },
};

function daysUntil(dateStr: string) {
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

interface LicenseTableProps {
  licenses: License[];
  showHolder?: boolean;
  onEdit?: (l: License) => void;
  onDelete?: (id: string) => void;
}

export default function LicenseTable({ licenses, showHolder = true, onEdit, onDelete }: LicenseTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHolder, setFilterHolder] = useState("all");

  const filtered = licenses.filter((l) => {
    const name = (l.profiles?.full_name ?? "Organization").toLowerCase();
    const matchSearch =
      l.license_name.toLowerCase().includes(search.toLowerCase()) ||
      l.license_number.toLowerCase().includes(search.toLowerCase()) ||
      name.includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchHolder = filterHolder === "all" || l.holder_type === filterHolder;
    return matchSearch && matchStatus && matchHolder;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or license number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border text-sm font-sans outline-none"
          style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm font-sans outline-none"
          style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
        {showHolder && (
          <select value={filterHolder} onChange={(e) => setFilterHolder(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm font-sans outline-none"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a", backgroundColor: "#f7f9fc" }}>
            <option value="all">All holders</option>
            <option value="employee">Employee</option>
            <option value="organization">Organization</option>
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm font-sans" style={{ color: "#8e9ab0" }}>
            {licenses.length === 0 ? "No licenses added yet." : "No licenses match your search."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                {showHolder && (
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Holder</th>
                )}
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>License</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Issuing Authority</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Expiry</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Days Left</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Status</th>
                {(onEdit || onDelete) && (
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const badge = STATUS_BADGE[l.status];
                const days = daysUntil(l.expiry_date);
                return (
                  <tr key={l.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #dce2ec" : "none" }}>
                    {showHolder && (
                      <td className="px-5 py-4">
                        <p className="text-sm font-sans font-medium" style={{ color: "#1a2e4a" }}>
                          {l.holder_type === "organization" ? "Organization" : (l.profiles?.full_name ?? "—")}
                        </p>
                        <p className="text-xs font-sans capitalize" style={{ color: "#8e9ab0" }}>{l.holder_type}</p>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <p className="text-sm font-sans font-medium" style={{ color: "#1a2e4a" }}>{l.license_name}</p>
                      {l.license_number && (
                        <p className="text-xs font-sans font-mono" style={{ color: "#8e9ab0" }}>#{l.license_number}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      {l.issuing_authority || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-sans" style={{ color: "#1a2e4a" }}>
                      {new Date(l.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-sm font-sans font-semibold"
                      style={{ color: days < 0 ? "#c0392b" : days <= 30 ? "#c8991a" : "#2d8a5e" }}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    {(onEdit || onDelete) && (
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          {onEdit && (
                            <button onClick={() => onEdit(l)}
                              className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg border"
                              style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}>
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(l.id)}
                              className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg border"
                              style={{ borderColor: "#fca5a5", color: "#c0392b" }}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
