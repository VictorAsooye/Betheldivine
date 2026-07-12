"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

type Role = "admin" | "owner" | "employee";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface TopNavProps {
  role: Role;
  userName?: string | null;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { label: "Home", href: "/admin", icon: LayoutDashboard },
    { label: "Forms", href: "/admin/forms", icon: FileText },
    { label: "File Cabinet", href: "/admin/documents", icon: FolderOpen },
    { label: "Users", href: "/admin/users", icon: Users },
  ],
  owner: [
    { label: "Home", href: "/owner", icon: LayoutDashboard },
    { label: "Forms", href: "/owner/forms", icon: FileText },
    { label: "File Cabinet", href: "/owner/documents", icon: FolderOpen },
    { label: "Users", href: "/owner/employees", icon: Users },
    { label: "Settings", href: "/owner/settings/branding", icon: Settings },
  ],
  employee: [
    { label: "Home", href: "/employee", icon: LayoutDashboard },
    { label: "Forms", href: "/employee/forms", icon: FileText },
    { label: "File Cabinet", href: "/employee/documents", icon: FolderOpen },
  ],
};

function initials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isActiveHref(pathname: string, href: string, role: Role): boolean {
  const root = `/${role}`;
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopNav({ role, userName, title, subtitle, actions }: TopNavProps) {
  const pathname = usePathname();
  const items = NAV[role] ?? [];

  return (
    <header className="bg-paper border-b border-line2 flex-shrink-0">
      {/* Brand row */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[30px] h-[30px] rounded-lg bg-gold flex items-center justify-center flex-shrink-0">
            <span className="text-navy font-bold text-[16px]" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>B</span>
          </div>
          <p className="text-ink text-[15px] font-medium truncate" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            Bethel Divine Healthcare Services
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slateWash flex items-center justify-center flex-shrink-0">
          <span className="text-slate text-[12px] font-semibold">{initials(userName)}</span>
        </div>
      </div>

      {/* Tab row */}
      <nav className="hidden md:flex items-center gap-1 px-6">
        {items.map((item) => {
          const active = isActiveHref(pathname, item.href, role);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] border-b-2 transition-colors ${
                active
                  ? "border-gold text-ink font-semibold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Page title row */}
      <div className="flex items-end justify-between gap-4 px-6 py-4 border-t border-line">
        <div className="min-w-0">
          <h1 className="text-[22px] text-ink leading-tight truncate" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            {title}
          </h1>
          {subtitle && <p className="text-[13px] text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy flex flex-row border-t border-white/10">
        {items.map((item) => {
          const active = isActiveHref(pathname, item.href, role);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 ${
                active ? "text-gold" : "text-white/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
