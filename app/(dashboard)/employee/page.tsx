import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/layout/PageShell";
import SolaSupportChat from "@/components/chat/SolaSupportChat";
import SignaturePromptBanner from "@/components/signature/SignaturePromptBanner";

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, signature_prompt_dismissed_at")
    .eq("id", userId)
    .single();

  const { data: signature } = await supabase
    .from("signatures")
    .select("id")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

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
      <div className="space-y-4 max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <SignaturePromptBanner
          fullName={profile?.full_name}
          hasSignature={!!signature}
          dismissed={!!profile?.signature_prompt_dismissed_at}
        />

        <SolaSupportChat
          role="employee"
          lastFormHref={pickUp ? "/employee/forms" : null}
          lastFormLabel={lastFormLabel}
          greetingName={firstName}
        />
      </div>
    </PageShell>
  );
}
