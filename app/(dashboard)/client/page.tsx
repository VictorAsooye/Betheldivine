import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ActionLink from "@/components/ActionLink";
import { createClient } from "@/lib/supabase/server";

export default async function ClientDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0];
  const greeting = firstName ? `Hello, ${firstName}` : "Hello";

  return (
    <div>
      <PageHeader
        title={greeting}
        subtitle="Your care summary, payments, and history"
      />

      <div className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Current Balance"
            value="$0.00"
            accent="#1a2e4a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Upcoming Visits"
            value="—"
            accent="#2d8a5e"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Medications Today"
            value="—"
            accent="#c8991a"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="bg-white rounded-xl border p-6"
            style={{ borderColor: "#dce2ec" }}
          >
            <h2
              className="text-base font-semibold mb-2"
              style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
            >
              Monthly Payment
            </h2>
            <p className="text-sm font-sans mb-4" style={{ color: "#8e9ab0" }}>
              Secure Stripe-powered payments are available in Phase 4.
            </p>
            <div
              className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed"
              style={{ borderColor: "#dce2ec" }}
            >
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Pay Balance — Coming Phase 4</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Quick Links
            </h2>
            <div className="space-y-2">
              <ActionLink href="/client/payments" label="Make a Payment" />
              <ActionLink href="/client/reports" label="Submit a Report" />
              <ActionLink href="/client/history" label="View Care History" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
