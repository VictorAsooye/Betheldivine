import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import EmployeeFormsList from "@/components/forms/EmployeeFormsList";

export default async function EmployeeFormsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="employee" title="Forms" subtitle="Forms assigned to you" userName={profile?.full_name}>
      <EmployeeFormsList />
    </PageShell>
  );
}
