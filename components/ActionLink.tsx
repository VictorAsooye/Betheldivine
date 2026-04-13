"use client";

interface ActionLinkProps {
  href: string;
  label: string;
}

export default function ActionLink({ href, label }: ActionLinkProps) {
  return (
    <a
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-lg font-sans text-sm transition-colors cursor-pointer"
      style={{ color: "#1a2e4a", backgroundColor: "#f7f9fc" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#dce2ec")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f7f9fc")}
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  );
}
