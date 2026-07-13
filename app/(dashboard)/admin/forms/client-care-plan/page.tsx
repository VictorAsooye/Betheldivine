"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import ClientCarePlanForm from "@/components/forms/ClientCarePlanForm";

export default function AdminClientCarePlanPage() {
  const searchParams = useSearchParams();
  const prefillName = searchParams.get("prefill_name");

  const [userName, setUserName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((me) => setUserName(me?.full_name ?? null));
  }, []);

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/static-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_type: "client_care_plan", data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }
      const body = await res.json();
      setSubmissionId(body.id ?? null);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      role="admin"
      title="Client Care Plan"
      subtitle={submitted ? undefined : "Client assessment, care goals, and scheduled services"}
      userName={userName}
      backHref="/admin/forms"
      backLabel="Forms"
    >
      <div className="w-full max-w-3xl mx-auto pb-10">
        {submitted ? (
          <div className="text-center py-16">
            <p className="text-[16px] font-medium text-ink mb-1">Submitted</p>
            <p className="text-[13px] text-muted mb-5">The care plan has been saved and emailed to the office.</p>
            {submissionId && (
              <a
                href={`/print/care-plan/${submissionId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-gold text-navy rounded-lg px-4 py-2 text-[13px] font-semibold"
              >
                Download PDF
              </a>
            )}
          </div>
        ) : (
          <>
            <ClientCarePlanForm
              onSubmit={handleSubmit}
              submitting={submitting}
              initialData={prefillName ? { client_full_name: prefillName } : undefined}
            />
            {error && <p className="text-[12px] text-danger-text mt-3">{error}</p>}
          </>
        )}
      </div>
    </PageShell>
  );
}
