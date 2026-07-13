"use client";

import { useState } from "react";
import { PenLine, X } from "lucide-react";
import SignaturePad from "@/components/signature/SignaturePad";
import type { SignatureValue } from "@/components/signature/types";

interface Props {
  fullName?: string | null;
  hasSignature: boolean;
  dismissed: boolean;
}

export default function SignaturePromptBanner({ fullName, hasSignature, dismissed }: Props) {
  const [hasSig, setHasSig] = useState(hasSignature);
  const [isDismissed, setIsDismissed] = useState(dismissed);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (hasSig || isDismissed) return null;

  async function dismiss() {
    setIsDismissed(true);
    fetch("/api/signatures", { method: "PATCH" }).catch(() => {});
  }

  async function save(sig: SignatureValue) {
    setSaving(true);
    try {
      const res = await fetch("/api/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sig),
      });
      if (res.ok) {
        setHasSig(true);
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (open) {
    return (
      <div className="bg-paper border border-line2 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-medium text-ink">Create your signature</p>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        <SignaturePad defaultName={fullName ?? ""} onSave={save} onCancel={() => setOpen(false)} saving={saving} />
      </div>
    );
  }

  return (
    <div className="bg-paper border border-line2 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
        <PenLine className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink font-medium">Add your signature</p>
        <p className="text-[12px] text-muted">Sign forms and documents in one click, next time you need to.</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-semibold text-navy bg-white border border-line2 rounded-lg px-3 py-1.5 flex-shrink-0"
      >
        Create
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-muted hover:text-ink flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
