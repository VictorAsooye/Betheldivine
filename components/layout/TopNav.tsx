"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
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
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  greetingName?: string;
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

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  owner: "Owner",
  employee: "Employee",
};

// Time-of-day greeting + a light rotating subtitle, same idea as Claude's own greeting.
const GREETING_COPY = {
  morning: {
    greet: "Good morning",
    sub: ["Here's where things stand today.", "Let's see what's on deck.", "Ready when you are."],
  },
  afternoon: {
    greet: "Good afternoon",
    sub: ["Everything's tracking as expected.", "Here's where things stand.", "All quiet for now."],
  },
  evening: {
    greet: "Good evening",
    sub: ["Wrapping up for the day.", "Here's a quick look before you go.", "Things are steady tonight."],
  },
  night: {
    greet: "Good evening",
    sub: ["Everything's quiet right now.", "Nothing urgent tonight."],
  },
} as const;

function timeBucket(hour: number): keyof typeof GREETING_COPY {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

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

export default function TopNav({
  role,
  userName,
  title,
  subtitle,
  actions,
  backHref,
  backLabel,
  greetingName,
}: TopNavProps) {
  const pathname = usePathname();
  const items = NAV[role] ?? [];

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hover shows the sidebar temporarily; clicking the toggle pins it open
  // independent of the mouse, so the two controls never fight each other.
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const sidebarOpen = pinned || hovering;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openSidebar = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovering(true);
  };
  const scheduleCloseSidebar = () => {
    closeTimer.current = setTimeout(() => setHovering(false), 220);
  };

  const [greeting, setGreeting] = useState<{ line: string; sub: string } | null>(null);
  useEffect(() => {
    if (!greetingName) return;
    const bucket = timeBucket(new Date().getHours());
    const copy = GREETING_COPY[bucket];
    const sub = copy.sub[Math.floor(Math.random() * copy.sub.length)];
    setGreeting({ line: `${copy.greet}, ${greetingName}.`, sub });
  }, [greetingName]);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <>
      {/* Desktop hover-out sidebar */}
      <div className="hidden md:block">
        <div
          className="fixed top-0 left-0 bottom-0 w-4 z-30"
          onMouseEnter={openSidebar}
          onMouseLeave={scheduleCloseSidebar}
        />
        <button
          type="button"
          onClick={() => setPinned((p) => !p)}
          aria-label="Toggle navigation"
          aria-expanded={sidebarOpen}
          className="fixed top-4 left-4 z-50 w-9 h-9 rounded-lg bg-paper border border-line2 flex items-center justify-center text-muted hover:text-ink shadow-sm"
        >
          <Menu className="w-4 h-4" />
        </button>
        <aside
          onMouseEnter={openSidebar}
          onMouseLeave={scheduleCloseSidebar}
          className={`fixed top-0 left-0 bottom-0 w-60 bg-navy text-white z-40 flex flex-col py-5 shadow-2xl transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-2.5 px-5 pb-5">
            <div className="w-[30px] h-[30px] rounded-full border border-gold flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold text-[14px]" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>B</span>
            </div>
            <span className="text-[13px] leading-tight text-white">Bethel Divine<br />Healthcare Services</span>
          </div>
          <nav className="flex flex-col flex-1">
            {items.map((item) => {
              const active = isActiveHref(pathname, item.href, role);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium border-l-2 transition-colors ${
                    active
                      ? "border-gold text-gold bg-white/5"
                      : "border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2.5 px-5 pt-3 mt-2 border-t border-white/10">
            <div className="w-[26px] h-[26px] rounded-full bg-white/10 border border-gold/40 flex items-center justify-center flex-shrink-0">
              <span className="text-gold text-[10px] font-bold">{initials(userName)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-white font-medium truncate">{userName ?? "You"}</p>
              <p className="text-[10.5px] text-white/50">{ROLE_LABEL[role]}</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Persistent top-right avatar chip (all breakpoints) */}
      <div className="fixed top-4 right-5 z-30" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="w-8 h-8 rounded-full bg-slateWash border border-line2 flex items-center justify-center shadow-sm"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="text-slate text-[12px] font-semibold">{initials(userName)}</span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-48 bg-paper border border-line2 rounded-lg shadow-lg py-1 z-50"
          >
            {userName && (
              <p className="px-3 py-2 text-[13px] text-ink font-medium truncate border-b border-line2">
                {userName}
              </p>
            )}
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-muted hover:text-ink hover:bg-slateWash transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Page heading — normal content flow, no chrome bar */}
      <div className="pt-16 pb-4 px-6 pr-16">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink mb-1"
          >
            <ArrowLeft className="w-3 h-3" />
            {backLabel ?? "Back"}
          </Link>
        )}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {greetingName ? (
              <>
                <h1 className="text-[28px] text-ink leading-tight truncate" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
                  {greeting?.line ?? ` `}
                </h1>
                <p className="text-[13px] text-muted mt-0.5 truncate">{greeting?.sub ?? " "}</p>
              </>
            ) : (
              <>
                {title && (
                  <h1 className="text-[22px] text-ink leading-tight truncate" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-[13px] text-muted mt-0.5 truncate">{subtitle}</p>}
              </>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </div>

      {/* Mobile bottom tab bar — unchanged */}
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
    </>
  );
}
