import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import DocumentsBrowser from "@/components/documents/DocumentsBrowser";

export default async function EmployeeDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="employee" title="Documents" subtitle="Files and care plans" userName={profile?.full_name}>
      <DocumentsBrowser role="employee" />
    </PageShell>
  );
}
