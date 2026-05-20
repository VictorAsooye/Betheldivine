"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

interface SetupChecklistProps {
  hasBranding: boolean;
  hasLicense: boolean;
  hasForm: boolean;
  hasFormSent: boolean;
  hasDocument: boolean;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
}

export default function SetupChecklist({
  hasBranding,
  hasLicense,
  hasForm,
  hasFormSent,
  hasDocument,
}: SetupChecklistProps) {
  const items: ChecklistItem[] = [
    { label: "Company branding set", done: hasBranding, href: "/owner/settings/branding" },
    { label: "First license added", done: hasLicense, href: "/owner/licenses/add" },
    { label: "First form created with Sola AI", done: hasForm, href: "/owner/forms" },
    { label: "First form sent", done: hasFormSent, href: "/owner/forms" },
    { label: "Upload your first document", done: hasDocument, href: "/owner/documents/upload" },
  ];

  const count = items.filter((i) => i.done).length;
  if (count === 5) return null;

  return (
    <div className="bg-paper border border-line2 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-ink">Getting started</h2>
        <span className="text-muted text-[12px]">{count}/5 complete</span>
      </div>

      <div className="w-full bg-line rounded-full h-2 my-4">
        <div
          className="bg-gold rounded-full h-2"
          style={{ width: `${(count / 5) * 100}%` }}
        />
      </div>

      <div>
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 py-2 border-b border-line last:border-0"
          >
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-success-text flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-line2 flex-shrink-0" />
            )}
            <span
              className={`text-[13px] flex-1 ${
                item.done ? "text-ink2 line-through" : "text-ink"
              }`}
            >
              {item.label}
            </span>
            {!item.done && (
              <Link href={item.href} className="text-gold text-[12px] flex-shrink-0">
                Do it now →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
