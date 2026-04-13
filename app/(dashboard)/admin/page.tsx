import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ActionLink from "@/components/ActionLink";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: userCount }, { count: activeCount }, { count: pendingCount }, { count: licenseAlertCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "pending"),
    supabase.from("licenses").select("*", { count: "exact", head: true }).in("status", ["expiring_soon", "expired"]),
  ]);

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Full system overview and control"
      />

      <div className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={userCount ?? 0}
            accent="#1a2e4a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Active Users"
            value={activeCount ?? 0}
            accent="#2d8a5e"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
          <StatCard
            label="Pending Review"
            value={pendingCount ?? 0}
            accent="#c8991a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Active Forms"
            value="—"
            accent="#1a6b7c"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
              <h2
                className="text-base font-semibold mb-4"
                style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
              >
                Quick Actions
              </h2>
              <div className="space-y-2">
                <ActionLink href="/admin/users" label="Manage Users & Roles" />
                <ActionLink href="/admin/licenses" label="License Tracker" />
                <ActionLink href="/admin/forms" label="Create Form with AI" />
                <ActionLink href="/admin/audit" label="View Audit Log" />
                <ActionLink href="/admin/settings" label="System Settings" />
              </div>
            </div>

            {/* View As */}
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
              <h2
                className="text-base font-semibold mb-1"
                style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
              >
                View As
              </h2>
              <p className="text-xs font-sans mb-4" style={{ color: "#8e9ab0" }}>
                Preview the portal exactly as each role sees it — without logging out.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { role: "owner",    href: "/owner",    label: "Owner",    icon: "👔", color: "#7c3aed", bg: "#f7f0fa", border: "#d8b4fe" },
                  { role: "employee", href: "/employee", label: "Employee", icon: "🩺", color: "#2d8a5e", bg: "#f0faf5", border: "#a7dfc4" },
                  { role: "client",   href: "/client",   label: "Client",   icon: "🏠", color: "#1a6b7c", bg: "#f0f8fa", border: "#a5d4dc" },
                ].map((item) => (
                  <Link key={item.role} href={item.href}
                    className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl border text-center transition-all hover:shadow-md"
                    style={{ borderColor: item.border, backgroundColor: item.bg }}>
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-sm font-semibold font-sans" style={{ color: item.color }}>{item.label}</span>
                    <span className="text-xs font-sans" style={{ color: item.color, opacity: 0.7 }}>View dashboard</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {(licenseAlertCount ?? 0) > 0 && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" className="mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold font-sans" style={{ color: "#c0392b" }}>Licenses Requiring Attention</p>
                      <p className="text-xs font-sans mt-0.5" style={{ color: "#c0392b" }}>
                        {licenseAlertCount} license{(licenseAlertCount ?? 0) !== 1 ? "s" : ""} expiring soon or expired
                      </p>
                    </div>
                  </div>
                  <Link href="/admin/licenses"
                    className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: "#c0392b", color: "#ffffff" }}>
                    View All
                  </Link>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2
              className="text-base font-semibold mb-4"
              style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
            >
              System Status
            </h2>
            <div className="space-y-3">
              {[
                { label: "Supabase Database", status: "Operational" },
                { label: "Authentication", status: "Operational" },
                { label: "Stripe Payments", status: "Operational" },
                { label: "EVV Integration", status: process.env.MARYLAND_EVV_API_KEY && process.env.MARYLAND_EVV_API_KEY !== "your_evv_api_key" ? "Operational" : "Needs Setup" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>{item.label}</span>
                  <span
                    className="text-xs font-semibold font-sans px-2 py-1 rounded-full"
                    style={{
                      color: item.status === "Operational" ? "#2d8a5e" : "#c0392b",
                      backgroundColor: item.status === "Operational" ? "#f0faf5" : "#fef2f2",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
