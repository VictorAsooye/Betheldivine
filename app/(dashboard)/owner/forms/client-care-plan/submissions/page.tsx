"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";

interface Submission {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  profiles?: { full_name?: string; email?: string };
}

function formatValue(val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.join(", ") || "—";
  return String(val);
}

export default function OwnerClientCarePlanSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/static-forms?form_type=client_care_plan").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
    ]).then(([subs, me]) => {
      setSubmissions(Array.isArray(subs) ? subs : []);
      setUserName(me?.full_name ?? null);
      setLoading(false);
    });
  }, []);

  return (
    <PageShell
      role="owner"
      title="Client Care Plan — Submissions"
      subtitle={`${submissions.length} submission${submissions.length !== 1 ? "s" : ""}`}
      userName={userName}
      backHref="/owner/forms"
      backLabel="Forms"
    >
      <div className="w-full max-w-3xl mx-auto pb-10">
        {loading ? (
          <p className="text-[13px] text-muted">Loading submissions…</p>
        ) : submissions.length === 0 ? (
          <div className="bg-paper border border-line2 rounded-xl p-8 text-center">
            <p className="text-[13px] text-muted">No submissions yet for this form.</p>
          </div>
        ) : (
          <div>
            {submissions.map((sub) => (
              <div key={sub.id} className="border-b border-line">
                <button
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                  className="w-full text-left py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink truncate">
                      {sub.profiles?.full_name ?? sub.profiles?.email ?? "Unknown"}
                    </p>
                    <p className="text-[12px] text-muted">
                      {new Date(sub.created_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <a
                      href={`/print/care-plan/${sub.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[12px] font-semibold text-sage hover:text-gold transition"
                    >
                      PDF
                    </a>
                    <span className="text-muted text-[12px]">{expanded === sub.id ? "Hide" : "View"}</span>
                  </div>
                </button>
                {expanded === sub.id && (
                  <div className="pb-4 grid grid-cols-2 gap-x-6 gap-y-3">
                    {Object.entries(sub.data).map(([key, value]) => {
                      const display = formatValue(value);
                      if (display === "—") return null;
                      return (
                        <div key={key}>
                          <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-0.5">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="text-[13px] text-ink">{display}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
