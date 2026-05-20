import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import BrandingSettings from "@/components/settings/BrandingSettings";

export default async function OwnerBrandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="owner" title="Branding" subtitle="Customize your agency's look" userName={profile?.full_name}>
      <BrandingSettings userId={user!.id} />
    </PageShell>
  );
}
