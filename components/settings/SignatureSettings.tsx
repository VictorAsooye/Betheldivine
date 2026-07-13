"use client";

import { useEffect, useState } from "react";
import SignaturePad from "@/components/signature/SignaturePad";
import SignatureDisplay from "@/components/signature/SignatureDisplay";
import type { SignatureValue } from "@/components/signature/types";

interface Props {
  fullName?: string | null;
}

export default function SignatureSettings({ fullName }: Props) {
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/signatures")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setSignature(d ?? null);
        setEditing(!d);
      })
      .catch(() => setError("Couldn't load your signature"))
      .finally(() => setLoading(false));
  }, []);

  async function save(sig: SignatureValue) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sig),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save signature");
      }
      setSignature(sig);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save signature");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="bg-paper border border-line2 rounded-xl p-6 text-[13px] text-muted">Loading…</div>;
  }

  return (
    <div className="max-w-lg">
      <div className="bg-paper border border-line2 rounded-xl p-6">
        {editing ? (
          <SignaturePad
            defaultName={fullName ?? ""}
            initialValue={signature ?? undefined}
            onSave={save}
            onCancel={signature ? () => setEditing(false) : undefined}
            saving={saving}
          />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <SignatureDisplay signature={signature} />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[13px] font-medium text-navy bg-white border border-line2 rounded-lg px-3 py-1.5 flex-shrink-0"
            >
              Replace
            </button>
          </div>
        )}
        {error && <p className="text-[12px] text-danger-text mt-2">{error}</p>}
      </div>
      <p className="text-[12px] text-muted mt-3">
        This signature is used whenever you sign a form or document. Updating it doesn&apos;t change anything you&apos;ve already signed.
      </p>
    </div>
  );
}
