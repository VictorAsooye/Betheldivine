"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import FormRenderer, { type FormSchema } from "@/components/FormRenderer";

interface Form {
  id: string;
  name: string;
  description?: string;
  schema: FormSchema;
}

export default function ClientReportsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Form | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((d) => { setForms(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  async function handleSubmit(data: Record<string, unknown>) {
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/forms/${selected.id}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error ?? "Submission failed.");
    } else {
      setSubmitted(selected.name);
      setSelected(null);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <PageHeader title="Submit a Report" subtitle="File incident or care reports" />

      <div className="p-8">
        {submitted && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-sans font-semibold"
            style={{ backgroundColor: "#f0faf5", border: "1px solid #a7dfc4", color: "#2d8a5e" }}>
            ✓ "{submitted}" submitted successfully. Thank you.
            <button onClick={() => setSubmitted(null)} className="ml-3 underline text-xs">Dismiss</button>
          </div>
        )}

        {selected ? (
          <div className="max-w-2xl">
            <button onClick={() => setSelected(null)}
              className="text-sm font-sans font-semibold flex items-center gap-1 mb-6"
              style={{ color: "#8e9ab0" }}>
              ← Back to reports
            </button>
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
                {selected.name}
              </h2>
              {selected.description && (
                <p className="text-sm font-sans mb-5" style={{ color: "#8e9ab0" }}>{selected.description}</p>
              )}
              {error && <p className="text-sm font-sans mb-4" style={{ color: "#c0392b" }}>{error}</p>}
              <FormRenderer schema={selected.schema} onSubmit={handleSubmit} submitting={submitting} />
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading…</p>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No reports available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {forms.map((form) => (
              <button key={form.id} onClick={() => setSelected(form)}
                className="text-left bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
                style={{ borderColor: "#dce2ec" }}>
                <h3 className="text-sm font-semibold font-sans mb-1" style={{ color: "#1a2e4a" }}>{form.name}</h3>
                {form.description && (
                  <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{form.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
