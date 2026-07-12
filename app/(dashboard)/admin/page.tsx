import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import PageShell from "@/components/layout/PageShell";
import { getCarePlanAlertData } from "@/lib/care-plans/stale-clients";
import SolaSupportChat from "@/components/chat/SolaSupportChat";
import { AlertTriangle } from "lucide-react";

function statusFromExpiry(expiry: string): "expired" | "soon" | "current" {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "current";
}

interface LicenseRow {
  id: string;
  license_name: string;
  expiry_date: string;
  profiles?: { full_name?: string } | null;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const profilePromise = user
    ? service.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : Promise.resolve({ data: null });

  const [profileRes, { data: expiringLicenses }, carePlanData] = await Promise.all([
    profilePromise,
    service
      .from("licenses")
      .select("id, license_name, expiry_date, profiles!licenses_holder_id_fkey(full_name)")
      .order("expiry_date", { ascending: true })
      .limit(4),
    getCarePlanAlertData(),
  ]);

  const profile = (profileRes as { data: { full_name?: string } | null }).data;
  const licenses = (expiringLicenses as LicenseRow[] | null) ?? [];

  const expiredLicense = licenses.find((l) => statusFromExpiry(l.expiry_date) === "expired");
  const overdueCarePlan = carePlanData.stalePlans[0] ?? carePlanData.noPlans[0] ?? null;

  return (
    <PageShell role="admin" greetingName={profile?.full_name?.split(" ")[0] ?? "there"} userName={profile?.full_name}>
      <div className="space-y-4 max-w-6xl">
        {expiredLicense && (
          <div className="w-full bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="size-4 text-warning-text flex-shrink-0" />
            <p className="text-[13px] text-warning-text">
              {expiredLicense.license_name} held by {expiredLicense.profiles?.full_name ?? "Organization"} is expired — action needed.{" "}
              <Link href="/admin/licenses" className="text-gold font-medium">Start renewal →</Link>
            </p>
          </div>
        )}
        {overdueCarePlan && (
          <div className="w-full bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="size-4 text-warning-text flex-shrink-0" />
            <p className="text-[13px] text-warning-text">
              {overdueCarePlan.clientName}&apos;s care plan is overdue —{" "}
              {overdueCarePlan.status === "no_plan" ? "no plan on file" : `last updated ${overdueCarePlan.daysSincePlan} days ago`}.{" "}
              <Link href="/admin/forms?open=client_care_plan" className="text-gold font-medium">Send form →</Link>
            </p>
          </div>
        )}

        <SolaSupportChat role="admin" />
      </div>
    </PageShell>
  );
}
