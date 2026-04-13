"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface Submission {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  profiles?: { full_name?: string; email?: string };
}

interface Form {
  id: string;
  name: string;
  schema: { title: string; fields: Array<{ id: string; label: string }> };
}

function formatValue(val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.join(", ") || "—";
  return String(val);
}

export default function OwnerFormSubmissionsPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/forms").then((r) => r.json()),
      fetch(`/api/forms/${formId}/submissions`).then((r) => r.json()),
    ]).then(([forms, subs]) => {
      const f = Array.isArray(forms) ? forms.find((x: Form) => x.id === formId) : null;
      setForm(f ?? null);
      setSubmissions(Array.isArray(subs) ? subs : []);
      setLoading(false);
    });
  }, [formId]);

  const fields = form?.schema?.fields ?? [];

  return (
    <div>
      <PageHeader
        title={form ? `${form.name} — Submissions` : "Form Submissions"}
        subtitle={`${submissions.length} submission${submissions.length !== 1 ? "s" : ""}`}
        action={
          <Link href="/owner/forms"
            className="text-sm font-sans font-semibold px-4 py-2 rounded-lg border"
            style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}>
            ← Back to Forms
          </Link>
        }
      />

      <div className="p-8">
        {loading ? (
          <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading submissions…</p>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No submissions yet for this form.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: "#dce2ec" }}>
                <button
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                      {sub.profiles?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
                      {sub.profiles?.email} · {new Date(sub.created_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="2"
                    style={{ transform: expanded === sub.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expanded === sub.id && (
                  <div className="px-5 pb-5 border-t" style={{ borderColor: "#dce2ec" }}>
                    <div className="pt-4 space-y-3">
                      {fields.length > 0 ? fields.map((field) => (
                        <div key={field.id}>
                          <p className="text-xs font-semibold font-sans mb-0.5" style={{ color: "#8e9ab0" }}>
                            {field.label}
                          </p>
                          <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>
                            {formatValue(sub.data[field.id])}
                          </p>
                        </div>
                      )) : Object.entries(sub.data).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs font-semibold font-sans mb-0.5" style={{ color: "#8e9ab0" }}>
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm font-sans" style={{ color: "#1a2e4a" }}>
                            {formatValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
