import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import EmployeesTable from "@/components/users/EmployeesTable";

export default async function OwnerEmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="owner" title="Employees" subtitle="Your care team roster" userName={profile?.full_name}>
      <EmployeesTable />
    </PageShell>
  );
}
