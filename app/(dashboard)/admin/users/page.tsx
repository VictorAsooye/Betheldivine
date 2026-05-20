import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import UsersTable from "@/components/users/UsersTable";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="admin" title="Users & Roles" subtitle="Manage accounts and assign roles" userName={profile?.full_name}>
      <UsersTable />
    </PageShell>
  );
}
