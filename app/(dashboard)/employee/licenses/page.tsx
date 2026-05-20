import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import LicensesManager from "@/components/licenses/LicensesManager";

export default async function EmployeeLicensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="employee" title="My Licenses" subtitle="Your certifications and renewals" userName={profile?.full_name}>
      <LicensesManager role="employee" />
    </PageShell>
  );
}
