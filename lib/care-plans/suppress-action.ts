"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * suppressCarePlanAlert
 *
 * Sets suppress_care_plan_alert = true on the given clients row.
 * That client will no longer appear in the care plan status widget.
 * Only owner and admin roles can call this.
 *
 * To un-suppress: set suppress_care_plan_alert = false directly in Supabase
 * or add an admin UI later.
 */
export async function suppressCarePlanAlert(clientId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    throw new Error("Forbidden");
  }

  const service = getServiceClient();
  const { error } = await service
    .from("clients")
    .update({ suppress_care_plan_alert: true })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
}
