"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

interface FormItem {
  id: string;
  name: string;
  target_role: string;
  is_active: boolean;
}

export default function EmployeeFormsList() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [fRes, sRes] = await Promise.all([
        fetch("/api/forms"),
        fetch("/api/auth/me"),
      ]);
      const fData = await fRes.json();
      setForms(Array.isArray(fData) ? fData : []);
      // Best-effort: submission state comes from the forms API not exposing it for
      // employees, so we leave the "Done" detection to the dashboard. Here all
      // active assigned forms show as Open.
      void sRes;
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-[13px] text-muted">Loading forms…</p>;

  if (forms.length === 0) {
    return (
      <div className="bg-paper border border-line2 rounded-xl p-8 text-center">
        <p className="text-[13px] text-muted">No forms assigned to you right now.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {forms.map((f) => {
        const done = submitted.has(f.id);
        return (
          <div key={f.id} className="bg-paper border border-line2 rounded-xl p-4 flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-md bg-info-bg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-info-text" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink truncate">{f.name}</p>
              <p className="text-[12px] text-muted">Sent by admin</p>
            </div>
            {done ? (
              <span className="text-[12px] text-muted">Done</span>
            ) : (
              <Link href={`/forms/${f.id}`} className="text-gold border border-gold rounded-lg px-3 py-1.5 text-[12px] font-medium">Open</Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
