"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Shield,
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

interface SidebarProps {
  role: Role;
  userName?: string | null;
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Forms", href: "/admin/forms", icon: FileText },
    { label: "Documents", href: "/admin/documents", icon: FolderOpen },
    { label: "Licenses", href: "/admin/licenses", icon: Shield },
    { label: "Users", href: "/admin/users", icon: Users },
  ],
  owner: [
    { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { label: "Forms", href: "/owner/forms", icon: FileText },
    { label: "Documents", href: "/owner/documents", icon: FolderOpen },
    { label: "Licenses", href: "/owner/licenses", icon: Shield },
    { label: "Users", href: "/owner/employees", icon: Users },
    { label: "Settings", href: "/owner/settings/branding", icon: Settings },
  ],
  employee: [
    { label: "Dashboard", href: "/employee", icon: LayoutDashboard },
    { label: "Forms", href: "/employee/forms", icon: FileText },
    { label: "Documents", href: "/employee/documents", icon: FolderOpen },
    { label: "My Licenses", href: "/employee/licenses", icon: Shield },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  owner: "Operations Owner",
  employee: "Care Employee",
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

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV[role] ?? [];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col bg-navy w-[204px] flex-shrink-0 h-full">
        {/* Logo area */}
        <div className="px-4 py-5 flex items-center gap-2.5">
          <div
            className="w-[30px] h-[30px] rounded-lg bg-gold flex items-center justify-center flex-shrink-0"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <span className="text-navy font-bold text-[16px]">B</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-[13px] font-medium leading-tight truncate">Bethel Divine</p>
            <p className="text-muted text-[11px] leading-tight truncate">{ROLE_LABEL[role]}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 mt-3 overflow-y-auto">
          <p className="text-[10px] uppercase text-muted tracking-widest px-3 mb-2">Menu</p>
          <div className="space-y-0.5">
            {items.map((item) => {
              const active = isActiveHref(pathname, item.href, role);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[7px] text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-gold text-navy font-semibold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
              <span className="text-navy text-[12px] font-semibold">{initials(userName)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-[13px] font-medium truncate leading-tight">{userName || "User"}</p>
              <p className="text-muted text-[11px] truncate leading-tight">{ROLE_LABEL[role]}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy flex flex-row border-t border-white/10">
        {items.slice(0, 5).map((item) => {
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
    </>
  );
}
