import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import SignatureSettings from "@/components/settings/SignatureSettings";

export default async function EmployeeSignaturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="employee" title="My Signature" subtitle="Used to sign forms and documents" userName={profile?.full_name}>
      <SignatureSettings fullName={profile?.full_name} />
    </PageShell>
  );
}
