import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import LicensesManager from "@/components/licenses/LicensesManager";

export default async function AdminLicensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="admin" title="Licenses" subtitle="Track and renew certifications" userName={profile?.full_name} backHref="/admin/documents" backLabel="File Cabinet">
      <LicensesManager role="admin" />
    </PageShell>
  );
}
