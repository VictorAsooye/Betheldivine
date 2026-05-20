"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BethelLogo from "@/components/BethelLogo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

interface SidebarProps {
  role: string;
  userName?: string | null;
  userEmail?: string | null;
  onNavigate?: () => void;
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{children}</span>;
}

const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Forms",
    href: "/admin/forms",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Documents",
    href: "/admin/documents",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </NavIcon>
    ),
    children: [
      {
        label: "Care Plans",
        href: "/admin/documents/care-plans",
        icon: (
          <NavIcon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </NavIcon>
        ),
      },
    ],
  },
  {
    label: "Licenses",
    href: "/admin/licenses",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      </NavIcon>
    ),
  },
];

const ownerNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/owner",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Forms",
    href: "/owner/forms",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Documents",
    href: "/owner/documents",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </NavIcon>
    ),
    children: [
      {
        label: "Care Plans",
        href: "/owner/documents/care-plans",
        icon: (
          <NavIcon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </NavIcon>
        ),
      },
    ],
  },
  {
    label: "Licenses",
    href: "/owner/licenses",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Users",
    href: "/owner/employees",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </NavIcon>
    ),
  },
];

const employeeNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/employee",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Forms",
    href: "/employee/forms",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: "Documents",
    href: "/employee/documents",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </NavIcon>
    ),
    children: [
      {
        label: "Care Plans",
        href: "/employee/documents/care-plans",
        icon: (
          <NavIcon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </NavIcon>
        ),
      },
    ],
  },
  {
    label: "My Licenses",
    href: "/employee/licenses",
    icon: (
      <NavIcon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      </NavIcon>
    ),
  },
];

const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  owner: ownerNav,
  employee: employeeNav,
};

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  owner: "Operations Owner",
  employee: "Care Employee",
};

export default function Sidebar({ role, userName, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role] ?? [];

  return (
    <aside
      className="flex flex-col w-64 min-h-screen flex-shrink-0"
      style={{ backgroundColor: "#122038" }}
    >
      {/* Brand */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <BethelLogo variant="icon" width={38} className="flex-shrink-0" />
          <div>
            <p
              className="text-white text-sm font-bold leading-tight"
              style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
            >
              Bethel Divine
            </p>
            <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
              Healthcare Services
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans font-medium transition-all relative"
                style={{
                  color: isActive ? "#ffffff" : "#8e9ab0",
                  backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                }}
              >
                {/* Gold left border for active */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ backgroundColor: "#c8991a" }}
                  />
                )}
                {item.icon}
                {item.label}
              </Link>

              {/* Sub-items — always visible when the parent has children */}
              {item.children && item.children.length > 0 && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {item.children.map((child) => {
                    const isChildActive =
                      pathname === child.href ||
                      pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className="flex items-center gap-2.5 pl-5 pr-3 py-2 rounded-lg text-xs font-sans font-medium transition-all relative"
                        style={{
                          color: isChildActive ? "#ffffff" : "#6b7a90",
                          backgroundColor: isChildActive
                            ? "rgba(255,255,255,0.06)"
                            : "transparent",
                          borderLeft: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {isChildActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                            style={{ backgroundColor: "#c8991a" }}
                          />
                        )}
                        {child.icon}
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold font-sans flex-shrink-0"
            style={{ backgroundColor: "#223a5e" }}
          >
            {userName ? userName.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold font-sans truncate leading-tight">
              {userName || "User"}
            </p>
            <p className="text-xs font-sans truncate" style={{ color: "#8e9ab0" }}>
              {roleLabel[role] ?? role}
            </p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-sans transition-all"
            style={{ color: "#8e9ab0" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#8e9ab0";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
