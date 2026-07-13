"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";

type Role = "admin" | "owner" | "employee";

interface License {
  id: string;
  holder_id: string;
  holder_type: string;
  license_name: string;
  license_number: string;
  issuing_authority: string;
  issued_date: string | null;
  expiry_date: string;
  status: "active" | "expiring_soon" | "expired";
  document_url: string | null;
  renewal_status?: string | null;
  profiles?: { full_name?: string } | null;
}

const RENEWAL_STEPS = ["Flagged", "Started", "In progress", "Upload doc", "Complete"];

function stepIndex(renewalStatus?: string | null): number {
  switch (renewalStatus) {
    case "started": return 1;
    case "in_progress": return 2;
    case "uploading": return 3;
    case "complete": return 4;
    default: return 0;
  }
}

function daysUntil(d: string) {
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

function statusMeta(l: License) {
  const days = daysUntil(l.expiry_date);
  if (l.status === "expired" || days < 0) return { dot: "#991B1B", cls: "bg-danger-bg text-danger-text", label: `${Math.abs(days)}d overdue` };
  if (l.status === "expiring_soon" || days <= 30) return { dot: "#92400E", cls: "bg-warning-bg text-warning-text", label: `${days}d left` };
  return { dot: "#065F46", cls: "bg-success-bg text-success-text", label: `${days}d left` };
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const FILTERS = ["All", "Action needed", "Expiring", "Expired", "Current", "Renewing"];

export default function LicensesManager({ role }: { role: Role }) {
  const showStats = role !== "employee";
  const canAdd = role !== "employee";
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acked, setAcked] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await fetch("/api/licenses");
    const d = await res.json();
    setLicenses(Array.isArray(d) ? d : []);
    setLoading(false);
    const aRes = await fetch("/api/license-acknowledgments");
    if (aRes.ok) {
      const aData = await aRes.json();
      setAcked(new Set((aData as { license_id: string }[]).map((a) => a.license_id)));
    }
  }
  useEffect(() => { load(); }, []);

  const stats = {
    expired: licenses.filter((l) => l.status === "expired").length,
    expiring: licenses.filter((l) => l.status === "expiring_soon").length,
    renewing: licenses.filter((l) => l.renewal_status && !["none", "complete"].includes(l.renewal_status ?? "none")).length,
    current: licenses.filter((l) => l.status === "active").length,
  };

  const filtered = licenses.filter((l) => {
    const name = (l.profiles?.full_name ?? "organization").toLowerCase();
    const matchSearch = l.license_name.toLowerCase().includes(search.toLowerCase()) || name.includes(search.toLowerCase());
    let matchFilter = true;
    if (filter === "Action needed") matchFilter = l.status === "expired" || l.status === "expiring_soon";
    else if (filter === "Expiring") matchFilter = l.status === "expiring_soon";
    else if (filter === "Expired") matchFilter = l.status === "expired";
    else if (filter === "Current") matchFilter = l.status === "active";
    else if (filter === "Renewing") matchFilter = !!l.renewal_status && !["none", "complete"].includes(l.renewal_status);
    return matchSearch && matchFilter;
  });

  async function startRenewal(id: string) {
    await fetch(`/api/licenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewal_status: "in_progress", renewal_started_at: new Date().toISOString() }),
    });
    setLicenses((prev) => prev.map((l) => l.id === id ? { ...l, renewal_status: "in_progress" } : l));
  }

  async function acknowledge(id: string) {
    await fetch("/api/license-acknowledgments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseId: id }),
    });
    setAcked((prev) => new Set(prev).add(id));
  }

  return (
    <div className="w-full max-w-5xl space-y-5">
      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Expired", value: stats.expired, color: "text-danger-text" },
            { label: "Expiring", value: stats.expiring, color: "text-warning-text" },
            { label: "Renewing", value: stats.renewing, color: "text-info-text" },
            { label: "Current", value: stats.current, color: "text-success-text" },
          ].map((s) => (
            <div key={s.label} className="bg-paper border border-line2 rounded-xl p-4">
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search licenses…"
          className="flex-1 min-w-[180px] bg-paper border border-line2 rounded-lg px-3 py-2 text-[13px] text-ink outline-none"
        />
        {canAdd && (
          <Link href={`/${role}/licenses/add`} className="bg-gold text-navy text-[13px] px-4 py-2 rounded-lg font-medium">Add license</Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[12px] border ${filter === f ? "bg-navy text-white border-navy" : "bg-paper border-line2 text-ink"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-[13px] text-muted">Loading licenses…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-paper border border-line2 rounded-xl p-8 text-center">
          <p className="text-[13px] text-muted">{licenses.length === 0 ? "No licenses yet." : "No licenses match."}</p>
        </div>
      ) : (
        filtered.map((l) => {
          const meta = statusMeta(l);
          const isOpen = expanded === l.id;
          const needsRenewal = l.status === "expired" || l.status === "expiring_soon";
          const isRenewing = !!l.renewal_status && !["none", "complete"].includes(l.renewal_status);
          const current = stepIndex(l.renewal_status);
          const isAcked = acked.has(l.id);

          return (
            <div key={l.id} className="mb-2">
              <button
                onClick={() => setExpanded(isOpen ? null : l.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-paper border border-line2 rounded-xl cursor-pointer text-left"
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: meta.dot }} className="flex-shrink-0" />
                <div className="w-8 h-8 rounded-md bg-warning-bg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-warning-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink truncate">{l.license_name}</p>
                  <p className="text-[13px] text-muted truncate">{l.profiles?.full_name ?? "Organization"}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </button>

              {isOpen && (
                <div className="bg-paper2 border-x border-b border-line2 rounded-b-xl px-4 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Holder", value: l.profiles?.full_name ?? "Organization" },
                      { label: "License No", value: l.license_number || "—" },
                      { label: "Issued", value: fmt(l.issued_date) },
                      { label: "Expires", value: fmt(l.expiry_date) },
                    ].map((d) => (
                      <div key={d.label}>
                        <p className="text-[10px] uppercase tracking-wide text-muted">{d.label}</p>
                        <p className="text-[13px] text-ink2 mt-0.5">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {(needsRenewal || isRenewing) && (
                    <div className="mt-5">
                      {/* Tracker */}
                      <div className="flex items-center">
                        {RENEWAL_STEPS.map((step, idx) => {
                          const done = idx <= current;
                          const isCurrent = idx === current;
                          return (
                            <div key={step} className="flex items-center flex-1 last:flex-none">
                              <div className="flex flex-col items-center">
                                <span
                                  className={isCurrent ? "animate-pulse" : ""}
                                  style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: done ? "#C9A84C" : "#D4CEC0" }}
                                />
                                <span className="text-[10px] text-muted mt-1 whitespace-nowrap">{step}</span>
                              </div>
                              {idx < RENEWAL_STEPS.length - 1 && (
                                <div className="flex-1 h-px mx-1" style={{ backgroundColor: idx < current ? "#C9A84C" : "#D4CEC0" }} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {canAdd && (
                          <button onClick={() => startRenewal(l.id)} className="bg-navy text-white rounded-lg px-4 py-2 text-[13px]">Start renewal</button>
                        )}
                        {isAcked ? (
                          <span className="text-[13px] text-success-text px-2 py-2">Acknowledged ✓</span>
                        ) : (
                          <button onClick={() => acknowledge(l.id)} className="text-[13px] text-ink2 border border-line2 rounded-lg px-4 py-2">I&apos;ve seen this</button>
                        )}
                        {l.document_url && (
                          <a href={l.document_url} target="_blank" rel="noreferrer" className="text-[13px] text-ink2 border border-line2 rounded-lg px-4 py-2">View document</a>
                        )}
                      </div>
                    </div>
                  )}

                  {!needsRenewal && !isRenewing && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {l.document_url && (
                        <a href={l.document_url} target="_blank" rel="noreferrer" className="text-[13px] text-ink2 border border-line2 rounded-lg px-4 py-2">View document</a>
                      )}
                      {!isAcked && (
                        <button onClick={() => acknowledge(l.id)} className="text-[13px] text-ink2 border border-line2 rounded-lg px-4 py-2">I&apos;ve seen this</button>
                      )}
                      {isAcked && <span className="text-[13px] text-success-text px-2 py-2">Acknowledged ✓</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
