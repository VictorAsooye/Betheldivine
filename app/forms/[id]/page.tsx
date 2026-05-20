"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import FormRenderer, { type FormSchema } from "@/components/FormRenderer";

interface Branding {
  company_name?: string | null;
  tagline?: string | null;
  address?: string | null;
  email?: string | null;
  logo_storage_path?: string | null;
  brand_color?: string | null;
}

interface PublicForm {
  id: string;
  name: string;
  description?: string;
  schema: FormSchema;
  branding?: Branding | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function logoPublicUrl(path?: string | null): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/branding/${path}`;
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
            {/* Branded header */}
            <div className="bg-navy px-6 py-4 flex items-center justify-between" style={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
              <div className="flex items-center gap-3">
                {logoPublicUrl(form.branding?.logo_storage_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPublicUrl(form.branding?.logo_storage_path)!} alt="Logo" className="w-8 h-8 rounded-md object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-gold flex items-center justify-center" style={{ fontFamily: "Georgia, serif" }}>
                    <span className="text-navy font-bold">B</span>
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-[14px]">{form.branding?.company_name ?? "Bethel Divine Healthcare"}</p>
                  {form.branding?.tagline && <p className="text-white/60 text-[12px]">{form.branding.tagline}</p>}
                </div>
              </div>
              <div className="text-right">
                {form.branding?.address && <p className="text-white/60 text-[11px]">{form.branding.address}</p>}
                {form.branding?.email && <p className="text-white/60 text-[11px]">{form.branding.email}</p>}
              </div>
            </div>
            {/* Gold title bar */}
            <div className="bg-gold py-2 px-6">
              <p className="text-navy text-[14px] font-semibold">{form.name}</p>
            </div>

            <FormRenderer
              schema={form.schema}
              onSubmit={handleSubmit}
              submitting={submitting}
            />

            {/* Footer */}
            <div className="px-6 py-3 border-t border-line flex justify-between text-[11px] text-muted">
              <span>{form.branding?.company_name ?? "Bethel Divine Healthcare"}</span>
              <span>Form ID: {form.id.substring(0, 8)} · Powered by Sola</span>
            </div>

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
