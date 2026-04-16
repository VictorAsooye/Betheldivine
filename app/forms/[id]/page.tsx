"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import FormRenderer, { type FormSchema } from "@/components/FormRenderer";

interface PublicForm {
  id: string;
  name: string;
  description?: string;
  schema: FormSchema;
}

export default function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/forms/${id}/public`)
      .then((r) => { if (!r.ok) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((d) => { if (d) setForm(d); setLoading(false); });
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/forms/${id}/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Submission failed");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f7f9fc", padding: "40px 16px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "#8e9ab0", fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>Loading form…</p>
          </div>
        )}

        {notFound && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#1a2e4a", marginBottom: "8px" }}>
              Form Not Available
            </p>
            <p style={{ color: "#8e9ab0", fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>
              This form may have been deactivated or the link is invalid.
            </p>
          </div>
        )}

        {submitted && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              backgroundColor: "#f0faf5", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2d8a5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#1a2e4a", marginBottom: "8px" }}>
              Submitted Successfully
            </p>
            <p style={{ color: "#8e9ab0", fontSize: "14px", fontFamily: "system-ui, sans-serif", marginBottom: "32px" }}>
              Thank you. Your response has been received by Bethel Divine Healthcare Services.
            </p>
            <div style={{ height: "1px", backgroundColor: "#dce2ec", margin: "0 auto 24px", maxWidth: "200px" }} />
            <p style={{ color: "#8e9ab0", fontSize: "12px", fontFamily: "system-ui, sans-serif" }}>
              Bethel Divine Healthcare Services, LLC · License R4205
            </p>
          </div>
        )}

        {!loading && !notFound && !submitted && form && (
          <>
            <FormRenderer
              schema={form.schema}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
            {error && (
              <div style={{
                marginTop: "12px", padding: "12px 16px", borderRadius: "8px",
                backgroundColor: "#fef2f2", border: "1px solid #fca5a5",
                color: "#c0392b", fontSize: "14px", fontFamily: "system-ui, sans-serif",
              }}>
                {error}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
