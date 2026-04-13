import { createClient } from "@/lib/supabase/server";

export async function writeAuditLog({
  actorId,
  action,
  targetTable,
  targetId,
  metadata = {},
}: {
  actorId: string;
  action: string;
  targetTable: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      action,
      target_table: targetTable,
      target_id: targetId,
      metadata,
    });
  } catch (err) {
    // Audit failures should never break the main operation
    console.error("[audit] Failed to write audit log:", err);
  }
}
