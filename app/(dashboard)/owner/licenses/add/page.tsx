import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import AddLicense from "@/components/licenses/AddLicense";

export default async function OwnerAddLicensePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="owner" title="Add license" subtitle="Scan, upload, or enter manually" userName={profile?.full_name} backHref="/owner/licenses" backLabel="Licenses">
      <AddLicense role="owner" />
    </PageShell>
  );
}
