import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import SolaSupportChat from "@/components/chat/SolaSupportChat";

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();

  const { data: pickUp } = await supabase
    .from("form_submissions")
    .select("id, form_id, created_at")
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastFormLabel: string | undefined;
  if (pickUp) {
    const { data: f } = await supabase.from("forms").select("name").eq("id", pickUp.form_id).maybeSingle();
    lastFormLabel = (f as { name?: string } | null)?.name;
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <PageShell role="employee" greetingName={firstName} userName={profile?.full_name}>
      <div className="space-y-4 max-w-5xl">
        <SolaSupportChat
          role="employee"
          lastFormHref={pickUp ? "/employee/forms" : null}
          lastFormLabel={lastFormLabel}
        />
      </div>
    </PageShell>
  );
}
