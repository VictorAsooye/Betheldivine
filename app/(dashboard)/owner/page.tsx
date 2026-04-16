import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ActionLink from "@/components/ActionLink";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerDashboard() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [
    { count: employeeCount },
    { count: clientCount },
    { count: shiftCount },
    { count: pendingTimeOff },
    { count: licenseAlertCount },
  ] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("shifts").select("*", { count: "exact", head: true })
      .gte("scheduled_start", today + "T00:00:00")
      .lte("scheduled_start", today + "T23:59:59"),
    supabase.from("time_off_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("licenses").select("*", { count: "exact", head: true })
      .in("status", ["expiring_soon", "expired"]),
  ]);

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Manage your team, clients, and schedule"
      />

      <div className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Employees"
            value={employeeCount ?? 0}
            accent="#1a2e4a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Active Clients"
            value={clientCount ?? 0}
            accent="#2d8a5e"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Shifts Today"
            value={shiftCount ?? 0}
            accent="#c8991a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Pending Time Off"
            value={pendingTimeOff ?? 0}
            accent="#2AADAD"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
                Quick Actions
              </h2>
              <div className="space-y-2">
                <ActionLink href="/owner/employees" label="View Employee Roster" />
                <ActionLink href="/owner/clients" label="Manage Clients" />
                <ActionLink href="/owner/schedule" label="Open Schedule" />
                <ActionLink href="/owner/time-off" label="Review Time Off Requests" />
                <ActionLink href="/owner/licenses" label="License Tracker" />
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
                      <p className="text-sm font-semibold font-sans" style={{ color: "#c0392b" }}>
                        Licenses Requiring Attention
                      </p>
                      <p className="text-xs font-sans mt-0.5" style={{ color: "#c0392b" }}>
                        {licenseAlertCount} license{(licenseAlertCount ?? 0) !== 1 ? "s" : ""} expiring soon or expired
                      </p>
                    </div>
                  </div>
                  <Link href="/owner/licenses"
                    className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: "#c0392b", color: "#ffffff" }}>
                    View All
                  </Link>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
                Today&apos;s Overview
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>Scheduled shifts</span>
                  <span className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{shiftCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>Pending time-off requests</span>
                  <span className="text-sm font-semibold font-sans" style={{ color: (pendingTimeOff ?? 0) > 0 ? "#c8991a" : "#1a2e4a" }}>{pendingTimeOff ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-sans" style={{ color: "#1a2e4a" }}>License alerts</span>
                  <span className="text-sm font-semibold font-sans" style={{ color: (licenseAlertCount ?? 0) > 0 ? "#c0392b" : "#2d8a5e" }}>{licenseAlertCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
