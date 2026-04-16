"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  owner:    { label: "Owner",    color: "#7c3aed", bg: "#f7f0fa", border: "#d8b4fe" },
  employee: { label: "Employee", color: "#2d8a5e", bg: "#f0faf5", border: "#a7dfc4" },
  client:   { label: "Client",   color: "#2AADAD", bg: "#f0f8fa", border: "#a5d4dc" },
};

interface ViewAsBannerProps {
  adminRole: string; // the logged-in user's actual role
}

export default function ViewAsBanner({ adminRole }: ViewAsBannerProps) {
  const pathname = usePathname();

  // Only show when admin is on a non-admin path
  if (adminRole !== "admin") return null;

  const previewRole = Object.keys(ROLE_LABELS).find((r) => pathname.startsWith(`/${r}`));
  if (!previewRole) return null;

  const meta = ROLE_LABELS[previewRole];

  return (
    <div className="flex items-center justify-between px-5 py-2 text-sm font-sans"
      style={{ backgroundColor: meta.bg, borderBottom: `1px solid ${meta.border}` }}>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
        <span style={{ color: meta.color }}>
          <strong>View As:</strong> {meta.label} — you&apos;re previewing what a {meta.label.toLowerCase()} sees. Your data is read-only safe.
        </span>
      </div>
      <Link href="/admin"
        className="flex items-center gap-1.5 font-semibold px-3 py-1 rounded-lg text-xs"
        style={{ color: meta.color, backgroundColor: meta.border + "66", border: `1px solid ${meta.border}` }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Admin
      </Link>
    </div>
  );
}
