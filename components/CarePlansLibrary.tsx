"use client";

import { useEffect, useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { getCarePlanSignedUrl } from "@/lib/care-plans/actions";

const NAVY  = "#1a2e4a";
const TEAL  = "#2AADAD";
const GRAY  = "#8e9ab0";
const BORDER = "#dce2ec";
const PAGE_SIZE = 25;

interface CarePlanDoc {
  id: string;
  filename: string;
  file_size_bytes: number | null;
  submitted_at: string;
  client_name: string | null;
  submitted_by_name: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Extract a human-readable client name from the standardized filename as fallback.
// Format: bethel-care-plan_{last}_{first}_{date}_{id}.pdf
function nameFromFilename(filename: string): string {
  const parts = filename.replace(/^bethel-care-plan_/, "").split("_");
  if (parts.length >= 2) {
    const last  = parts[0].replace(/-/g, " ");
    const first = parts[1].replace(/-/g, " ");
    const cap   = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(first)} ${cap(last)}`;
  }
  return filename;
}

export default function CarePlansLibrary() {
  const [docs, setDocs]           = useState<CarePlanDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [page, setPage]           = useState(1);
  // Track per-row loading state for signed URL actions
  const [actionLoading, setActionLoading] = useState<Record<string, "view" | "download" | null>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Load docs ──────────────────────────────────────────────────────────
  async function fetchDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/care-plan-documents");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load care plans");
      }
      const data: CarePlanDoc[] = await res.json();
      setDocs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocs(); }, []);

  // ── Derived data ────────────────────────────────────────────────────────
  const uniqueClients = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const d of docs) {
      const name = d.client_name ?? nameFromFilename(d.filename);
      if (!seen.has(name)) { seen.add(name); names.push(name); }
    }
    return names.sort();
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter((d) => {
      const displayName = d.client_name ?? nameFromFilename(d.filename);
      const matchesSearch =
        !q ||
        displayName.toLowerCase().includes(q) ||
        d.submitted_by_name.toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q);
      const matchesClient =
        clientFilter === "all" ||
        (d.client_name ?? nameFromFilename(d.filename)) === clientFilter;
      return matchesSearch && matchesClient;
    });
  }, [docs, search, clientFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, clientFilter]);

  // ── Signed URL actions ─────────────────────────────────────────────────
  async function handleAction(docId: string, mode: "view" | "download") {
    setActionLoading((prev) => ({ ...prev, [docId]: mode }));
    setActionError(null);

    const result = await getCarePlanSignedUrl(docId);

    if (result.error) {
      setActionError(result.error);
      setActionLoading((prev) => ({ ...prev, [docId]: null }));
      return;
    }

    // After the error guard above, url and filename are guaranteed present
    const url = result.url!;
    const filename = result.filename!;

    if (mode === "view") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Trigger a download by creating a temporary anchor
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setActionLoading((prev) => ({ ...prev, [docId]: null }));
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Care Plans"
        subtitle="Archived care plan PDFs — owner, admin, and employee access only"
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {/* Action error banner */}
        {actionError && (
          <div style={{
            marginBottom: "16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            color: "#991b1b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
          }}>
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: 700, fontSize: "16px", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Search + filter bar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by client name, submitted by…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: "220px",
              padding: "9px 14px",
              borderRadius: "8px",
              border: `1px solid ${BORDER}`,
              fontSize: "13px",
              color: NAVY,
              backgroundColor: "#f7f9fc",
              outline: "none",
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
            }}
          />
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: `1px solid ${BORDER}`,
              fontSize: "13px",
              color: NAVY,
              backgroundColor: "#f7f9fc",
              outline: "none",
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
              minWidth: "180px",
            }}
          >
            <option value="all">All clients</option>
            {uniqueClients.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={fetchDocs}
            disabled={loading}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: `1px solid ${BORDER}`,
              fontSize: "13px",
              color: GRAY,
              backgroundColor: "#f7f9fc",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-source-sans), system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          border: `1px solid ${BORDER}`,
          overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: GRAY, fontSize: "14px",
              fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
              Loading care plans…
            </div>
          ) : error ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ color: "#c0392b", fontSize: "14px", marginBottom: "12px",
                fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>{error}</p>
              <button onClick={fetchDocs} style={{
                color: TEAL, fontSize: "13px", fontWeight: 600, background: "none",
                border: "none", cursor: "pointer", fontFamily: "var(--font-source-sans), system-ui, sans-serif",
              }}>
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
              <p style={{ color: GRAY, fontSize: "14px",
                fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                {docs.length === 0
                  ? "No care plans archived yet. They'll appear here after the first submission."
                  : "No care plans match your search."}
              </p>
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f7f9fc", borderBottom: `1px solid ${BORDER}` }}>
                    {["Client", "Submitted", "Submitted By", "Size", "Actions"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: GRAY,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((doc, i) => {
                    const displayName = doc.client_name ?? nameFromFilename(doc.filename);
                    const isLast      = i === paginated.length - 1;
                    const rowLoading  = actionLoading[doc.id];

                    return (
                      <tr key={doc.id} style={{
                        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
                        transition: "background-color 0.1s",
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafbfd")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Client */}
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: NAVY,
                            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                          }}>
                            {displayName}
                          </div>
                          <div style={{
                            fontSize: "11px",
                            color: GRAY,
                            marginTop: "2px",
                            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                          }}>
                            {doc.filename}
                          </div>
                        </td>

                        {/* Submitted date */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          <span style={{
                            fontSize: "13px",
                            color: NAVY,
                            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                          }}>
                            {formatDate(doc.submitted_at)}
                          </span>
                        </td>

                        {/* Submitted by */}
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{
                            fontSize: "13px",
                            color: NAVY,
                            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                          }}>
                            {doc.submitted_by_name}
                          </span>
                        </td>

                        {/* File size */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          <span style={{
                            fontSize: "13px",
                            color: GRAY,
                            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                          }}>
                            {formatBytes(doc.file_size_bytes)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {/* View */}
                            <button
                              onClick={() => handleAction(doc.id, "view")}
                              disabled={!!rowLoading}
                              title="Open in new tab"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: `1px solid ${BORDER}`,
                                backgroundColor: "#fff",
                                color: NAVY,
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: rowLoading ? "not-allowed" : "pointer",
                                opacity: rowLoading && rowLoading !== "view" ? 0.5 : 1,
                                fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                                transition: "background-color 0.15s",
                              }}
                            >
                              {rowLoading === "view" ? (
                                <span style={{ display: "inline-block", width: "12px", height: "12px",
                                  border: "2px solid #dce2ec", borderTopColor: TEAL,
                                  borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                              View
                            </button>

                            {/* Download */}
                            <button
                              onClick={() => handleAction(doc.id, "download")}
                              disabled={!!rowLoading}
                              title="Download PDF"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                backgroundColor: TEAL,
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: rowLoading ? "not-allowed" : "pointer",
                                opacity: rowLoading && rowLoading !== "download" ? 0.5 : 1,
                                fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                                transition: "opacity 0.15s",
                              }}
                            >
                              {rowLoading === "download" ? (
                                <span style={{ display: "inline-block", width: "12px", height: "12px",
                                  border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                                  borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              )}
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderTop: `1px solid ${BORDER}`,
                  backgroundColor: "#fafbfd",
                }}>
                  <span style={{ fontSize: "13px", color: GRAY,
                    fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: `1px solid ${BORDER}`,
                        fontSize: "13px",
                        color: NAVY,
                        backgroundColor: "#fff",
                        cursor: safePage === 1 ? "not-allowed" : "pointer",
                        opacity: safePage === 1 ? 0.4 : 1,
                        fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: `1px solid ${BORDER}`,
                        fontSize: "13px",
                        color: NAVY,
                        backgroundColor: "#fff",
                        cursor: safePage === totalPages ? "not-allowed" : "pointer",
                        opacity: safePage === totalPages ? 0.4 : 1,
                        fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
