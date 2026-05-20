import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import DocumentUploader from "@/components/documents/DocumentUploader";

export default async function OwnerUploadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  return (
    <PageShell role="owner" title="Upload documents" subtitle="Sola AI files them for you" userName={profile?.full_name}>
      <DocumentUploader role="owner" />
    </PageShell>
  );
}
