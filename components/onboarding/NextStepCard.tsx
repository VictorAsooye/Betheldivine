"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface NextStepCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

export default function NextStepCard({
  title,
  description,
  href,
  icon,
}: NextStepCardProps) {
  return (
    <div className="bg-slateWash border border-slate/20 rounded-xl p-5 flex items-center gap-4 mb-4">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      <Link
        href={href}
        className="bg-slate text-white px-4 py-2 rounded-lg text-[13px] flex-shrink-0"
      >
        Do it now →
      </Link>
    </div>
  );
}
