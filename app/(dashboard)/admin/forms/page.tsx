import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import FormsManager from "@/components/forms/FormsManager";

export default async function AdminFormsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="admin" title="Forms" subtitle="Build, send, and track forms" userName={profile?.full_name}>
      <FormsManager role="admin" />
    </PageShell>
  );
}
