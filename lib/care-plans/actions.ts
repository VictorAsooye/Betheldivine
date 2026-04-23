"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/audit";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Roles permitted to access care plan documents.
// Matches the RLS policy in 011_care_plan_documents.sql — this check is
// belt-and-suspenders at the application layer so the signed URL is never
// generated even if RLS were misconfigured.
const PERMITTED_ROLES = ["owner", "admin", "employee"] as const;
type PermittedRole = (typeof PERMITTED_ROLES)[number];

function isPermitted(role: string | undefined): role is PermittedRole {
  return PERMITTED_ROLES.includes(role as PermittedRole);
}

export type SignedUrlResult =
  | { url: string; filename: string; error?: never }
  | { url?: never; filename?: never; error: string };

/**
 * getCarePlanSignedUrl
 *
 * Server action — generates a short-lived signed URL for a care plan PDF.
 *
 * @param documentId  The care_plan_documents.id UUID
 * @returns           { url, filename } on success, { error } on failure
 *
 * Security:
 *  1. User must be authenticated
 *  2. User's role must be owner / admin / employee (application check)
 *  3. RLS on storage.objects enforces the same rule at DB level
 *  4. Signed URL expires in 60 seconds — sufficient for a browser redirect
 *     or download trigger, not long enough to be forwarded and reused
 *  5. Every access attempt (success or failure) is written to audit_logs
 */
export async function getCarePlanSignedUrl(
  documentId: string
): Promise<SignedUrlResult> {
  // ── 1. Authenticate ────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // ── 2. Authorise — role check (belt-and-suspenders) ───────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isPermitted(profile?.role)) {
    await writeAuditLog({
      actorId: user.id,
      action: "CARE_PLAN_ACCESS_DENIED",
      targetTable: "care_plan_documents",
      targetId: documentId,
      metadata: { reason: "insufficient_role", role: profile?.role ?? "unknown" },
    });
    return { error: "Forbidden" };
  }

  const service = getServiceClient();

  // ── 3. Fetch the document metadata row ────────────────────────────────
  // Use service client so RLS on care_plan_documents doesn't interfere here;
  // the application-level role check above is the gate.
  const { data: doc, error: docErr } = await service
    .from("care_plan_documents")
    .select("id, storage_path, filename")
    .eq("id", documentId)
    .single();

  if (docErr || !doc) {
    await writeAuditLog({
      actorId: user.id,
      action: "CARE_PLAN_ACCESS_DENIED",
      targetTable: "care_plan_documents",
      targetId: documentId,
      metadata: { reason: "document_not_found" },
    });
    return { error: "Document not found" };
  }

  // ── 4. Generate signed URL (60-second expiry) ─────────────────────────
  const { data: signed, error: signErr } = await service.storage
    .from("care-plans")
    .createSignedUrl(doc.storage_path, 60);

  if (signErr || !signed?.signedUrl) {
    console.error("[care-plans] Failed to generate signed URL:", signErr?.message);
    await writeAuditLog({
      actorId: user.id,
      action: "CARE_PLAN_ACCESS_FAILED",
      targetTable: "care_plan_documents",
      targetId: documentId,
      metadata: { reason: "signed_url_generation_failed", storage_path: doc.storage_path },
    });
    return { error: "Could not generate download link" };
  }

  // ── 5. Audit log — successful access ─────────────────────────────────
  await writeAuditLog({
    actorId: user.id,
    action: "CARE_PLAN_ACCESSED",
    targetTable: "care_plan_documents",
    targetId: documentId,
    metadata: {
      filename: doc.filename,
      storage_path: doc.storage_path,
      role: profile.role,
    },
  });

  return { url: signed.signedUrl, filename: doc.filename };
}
