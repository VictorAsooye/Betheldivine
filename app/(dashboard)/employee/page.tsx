import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ActionLink from "@/components/ActionLink";

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, assigned_clients")
    .eq("profile_id", user!.id)
    .maybeSingle();

  // Count this week's shifts
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let shiftCount = 0;
  if (employee) {
    const { count } = await supabase
      .from("shifts")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .gte("scheduled_start", weekStart.toISOString())
      .lte("scheduled_start", weekEnd.toISOString());
    shiftCount = count ?? 0;
  }

  const firstName = profile?.full_name?.split(" ")[0];
  const greeting = firstName ? `Welcome, ${firstName}` : "Welcome";

  return (
    <div>
      <PageHeader title={greeting} subtitle="Your schedule, clients, and care logs" />
      <div className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Shifts This Week"
            value={shiftCount}
            accent="#1a2e4a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Assigned Clients"
            value={employee?.assigned_clients?.length ?? 0}
            accent="#2d8a5e"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Employee Status"
            value={employee ? "Active" : "Setup Needed"}
            accent={employee ? "#2d8a5e" : "#c8991a"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <ActionLink href="/employee/forms" label="Submit a Form" />
              <ActionLink href="/employee/documents" label="View Documents" />
              <ActionLink href="/employee/licenses" label="My Licenses" />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              This Week
            </h2>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
              {shiftCount === 0
                ? "No shifts scheduled this week."
                : `You have ${shiftCount} shift${shiftCount !== 1 ? "s" : ""} this week.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
