"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import FormRenderer, { type FormSchema } from "@/components/FormRenderer";
import { Sparkles } from "lucide-react";

interface FormItem {
  id: string;
  name: string;
  schema: FormSchema;
}

export default function OwnerFillFormPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<FormItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [assisting, setAssisting] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [suggestedValues, setSuggestedValues] = useState<Record<string, unknown>>({});
  const [suggestedFieldIds, setSuggestedFieldIds] = useState<Set<string>>(new Set());
  const [prefillVersion, setPrefillVersion] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/forms").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
    ]).then(([forms, me]) => {
      const f = Array.isArray(forms) ? forms.find((x: FormItem) => x.id === formId) : null;
      setForm(f ?? null);
      setUserName(me?.full_name ?? null);
      setLoading(false);
    });
  }, [formId]);

  async function handleAssist() {
    if (!description.trim()) return;
    setAssisting(true);
    setAssistError(null);
    try {
      const res = await fetch("/api/ai/prefill-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, description }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Couldn't fill that in");
      setSuggestedValues(d.values ?? {});
      setSuggestedFieldIds(new Set(Object.keys(d.values ?? {})));
      setPrefillVersion((v) => v + 1);
    } catch (e) {
      setAssistError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAssisting(false);
    }
  }

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Submission failed");
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      role="owner"
      title={form?.name ?? "Loading…"}
      subtitle={submitted ? undefined : "Fill it out yourself, or get a head start below."}
      userName={userName}
      backHref="/owner/forms"
      backLabel="Forms"
    >
      <div className="max-w-2xl mx-auto pb-10">
        {loading ? (
          <p className="text-[13px] text-muted">Loading form…</p>
        ) : !form ? (
          <p className="text-[13px] text-muted">Form not found.</p>
        ) : submitted ? (
          <div className="text-center py-16">
            <p className="text-[16px] font-medium text-ink mb-1">Submitted</p>
            <p className="text-[13px] text-muted">Thanks — this has been recorded.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border border-line2 rounded-xl px-4 py-3 mb-6">
              <div className="size-6 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                <Sparkles className="size-3 text-gold" />
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who's this for?"
                className="flex-1 text-[13px] bg-transparent text-ink placeholder:text-ink3 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAssist}
                disabled={assisting || !description.trim()}
                className="flex-shrink-0 bg-gold text-navy rounded-lg px-3.5 py-1.5 text-[12px] font-semibold disabled:opacity-50"
              >
                {assisting ? "Filling…" : "Fill with Sola"}
              </button>
            </div>
            {assistError && <p className="text-[12px] text-danger-text mb-4">{assistError}</p>}

            <FormRenderer
              key={prefillVersion}
              schema={form.schema}
              values={suggestedValues}
              suggestedFieldIds={suggestedFieldIds}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
            {submitError && <p className="text-[12px] text-danger-text mt-3">{submitError}</p>}
          </>
        )}
      </div>
    </PageShell>
  );
}
