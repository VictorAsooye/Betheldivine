import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import DocumentsBrowser from "@/components/documents/DocumentsBrowser";

export default async function AdminDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="admin" title="Documents" subtitle="Files, folders, and care plans" userName={profile?.full_name}>
      <DocumentsBrowser role="admin" />
    </PageShell>
  );
}
