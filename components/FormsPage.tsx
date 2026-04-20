"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import ClientCarePlanForm from "@/components/forms/ClientCarePlanForm";

const NAVY = "#1a2e4a";
const TEAL = "#2AADAD";
const BORDER = "#dce2ec";

interface Submission {
  id: string;
  form_type: string;
  data: Record<string, unknown>;
  submitted_by: string | null;
  created_at: string;
  profiles?: { full_name?: string; email?: string } | null;
}

interface Props {
  role: "admin" | "owner" | "employee";
}

export default function FormsPage({ role }: Props) {
  const [view, setView] = useState<"list" | "form" | "submissions">("list");
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isAdminOwner = role === "admin" || role === "owner";

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/static-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_type: selectedForm, data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Submission failed");
      }
      setSubmitted(true);
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadSubmissions(formType: string) {
    setLoadingSubmissions(true);
    setError(null);
    try {
      const res = await fetch(`/api/static-forms?form_type=${encodeURIComponent(formType)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load submissions");
      }
      const data = await res.json();
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingSubmissions(false);
    }
  }

  function openForm(formKey: string) {
    setSelectedForm(formKey);
    setError(null);
    setView("form");
  }

  function openSubmissions(formKey: string) {
    setSelectedForm(formKey);
    setError(null);
    setSubmissions([]);
    setView("submissions");
    loadSubmissions(formKey);
  }

  function goBack() {
    setView("list");
    setError(null);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const backBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: TEAL,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "0",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Forms"
        subtitle="Fillable healthcare forms for Bethel Divine staff"
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {/* Success banner */}
        {submitted && view === "list" && (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "6px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#166534", fontSize: "13px", fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
              Care plan submitted successfully.
            </span>
            <button
              onClick={() => setSubmitted(false)}
              style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: "16px" }}
            >
              ×
            </button>
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {/* Client Care Plan Card */}
            <div
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: "8px",
                padding: "20px",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    backgroundColor: "#e8f8f8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: NAVY,
                      fontFamily: "var(--font-lora), Georgia, serif",
                      marginBottom: "2px",
                    }}
                  >
                    Client Care Plan
                  </div>
                  <div style={{ fontSize: "11px", color: "#8e9ab0", fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                    Bethel Divine · Form CP-001
                  </div>
                </div>
              </div>

              <p style={{ fontSize: "12px", color: "#5a6a82", lineHeight: "1.5", margin: 0, fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                Client assessment, ADL levels, care goals, scheduled services, and safety considerations.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                <button
                  onClick={() => openForm("client_care_plan")}
                  style={{
                    backgroundColor: NAVY,
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                  }}
                >
                  Fill Out Form
                </button>

                {isAdminOwner && (
                  <button
                    onClick={() => openSubmissions("client_care_plan")}
                    style={{
                      background: "none",
                      border: "none",
                      color: TEAL,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                    }}
                  >
                    View Submissions
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FORM VIEW */}
        {view === "form" && (
          <div>
            <button style={backBtnStyle} onClick={goBack}>
              ← Back to Forms
            </button>

            {selectedForm === "client_care_plan" && (
              <ClientCarePlanForm onSubmit={handleSubmit} submitting={submitting} />
            )}

            {error && (
              <div
                style={{
                  marginTop: "16px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  color: "#991b1b",
                  fontSize: "13px",
                  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* SUBMISSIONS VIEW */}
        {view === "submissions" && isAdminOwner && (
          <div>
            <button style={backBtnStyle} onClick={goBack}>
              ← Back to Forms
            </button>

            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: NAVY,
                fontFamily: "var(--font-lora), Georgia, serif",
                marginBottom: "16px",
              }}
            >
              Client Care Plan — Submissions
            </h2>

            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  color: "#991b1b",
                  fontSize: "13px",
                  marginBottom: "16px",
                  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                }}
              >
                {error}
              </div>
            )}

            {loadingSubmissions && (
              <p style={{ color: "#8e9ab0", fontSize: "13px", fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                Loading submissions…
              </p>
            )}

            {!loadingSubmissions && submissions.length === 0 && !error && (
              <p style={{ color: "#8e9ab0", fontSize: "13px", fontFamily: "var(--font-source-sans), system-ui, sans-serif" }}>
                No submissions yet.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {submissions.map((sub) => {
                const expanded = expandedIds.has(sub.id);
                const submitterName = sub.profiles?.full_name ?? sub.profiles?.email ?? sub.submitted_by ?? "Unknown";
                return (
                  <div
                    key={sub.id}
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: "8px",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                    }}
                  >
                    <button
                      onClick={() => toggleExpand(sub.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 18px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: NAVY,
                            fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                          }}
                        >
                          {submitterName}
                        </div>
                        <div style={{ fontSize: "11px", color: "#8e9ab0", marginTop: "2px" }}>
                          {formatDate(sub.created_at)}
                        </div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#8e9ab0"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {expanded && (
                      <div
                        style={{
                          borderTop: `1px solid ${BORDER}`,
                          padding: "16px 18px",
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "10px 16px",
                        }}
                      >
                        {Object.entries(sub.data).map(([k, v]) => {
                          const displayVal = Array.isArray(v)
                            ? (v as string[]).join(", ")
                            : String(v ?? "");
                          if (!displayVal) return null;
                          return (
                            <div key={k}>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: "#8e9ab0",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                  marginBottom: "2px",
                                  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                                }}
                              >
                                {k.replace(/_/g, " ")}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: NAVY,
                                  fontFamily: "var(--font-source-sans), system-ui, sans-serif",
                                  wordBreak: "break-word",
                                }}
                              >
                                {displayVal}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
