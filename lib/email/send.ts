import { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "your_resend_api_key") return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

interface Attachment {
  filename: string;
  content: Buffer | string; // Buffer for binary, base64 string also accepted
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  actorId?: string; // for audit log
  attachments?: Attachment[];
}

export async function sendEmail({
  to,
  subject,
  html,
  actorId,
  attachments,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const client = getResend();
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@betheldivine.com";

  if (!client) {
    console.log(`[Email] Resend not configured. Would send to: ${to} — Subject: ${subject}`);
    return { success: true };
  }

  try {
    const { error } = await client.emails.send({
      from, to, subject, html,
      ...(attachments?.length ? { attachments } : {}),
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      await writeEmailAuditLog(actorId, to, subject, false, error.message);
      return { success: false, error: error.message };
    }

    await writeEmailAuditLog(actorId, to, subject, true);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email] Exception:", message);
    await writeEmailAuditLog(actorId, to, subject, false, message);
    return { success: false, error: message };
  }
}

async function writeEmailAuditLog(
  actorId: string | undefined,
  to: string,
  subject: string,
  success: boolean,
  errorMessage?: string
) {
  if (!actorId) return;
  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await service.from("audit_logs").insert({
      actor_id: actorId,
      action: success ? "EMAIL_SENT" : "EMAIL_FAILED",
      target_table: "email",
      target_id: actorId,
      metadata: { to, subject, ...(errorMessage ? { error: errorMessage } : {}) },
    });
  } catch {
    // never throw from audit
  }
}
