import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { carePlanSubmittedTemplate } from "@/lib/email/templates";
import { generateCarePlanPdf } from "@/lib/pdf/care-plan-pdf";
import {
  generateCarePlanFilename,
  generateCarePlanStoragePath,
} from "@/lib/care-plans/filename";

// Keep the function alive long enough for PDF generation + Resend call +
// storage upload. Default is 10s (Hobby) / 60s (Pro). 30s is safe for both.
export const maxDuration = 30;

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { form_type?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { form_type, data } = body;
  if (!form_type || !data) {
    return NextResponse.json({ error: "form_type and data are required" }, { status: 400 });
  }

  const service = getServiceClient();

  // ── 1. Save form submission ──────────────────────────────────────────────
  const { data: inserted, error } = await service
    .from("static_form_submissions")
    .insert({ form_type, data, submitted_by: user.id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 2. Resolve submitter name ────────────────────────────────────────────
  const { data: profile } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const submittedBy = profile?.full_name ?? profile?.email ?? "Unknown";
  const submittedAtDate = new Date();
  const submittedAt = submittedAtDate.toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  // ── 3. Build standardized filename (shared by storage + email attachment) ─
  const clientFullName = String((data as Record<string, unknown>)["client_full_name"] ?? "client");
  const filename = generateCarePlanFilename(clientFullName, inserted.id, submittedAtDate);
  const storagePath = generateCarePlanStoragePath(user.id, filename);

  // ── 4. Build email template ──────────────────────────────────────────────
  const emailTemplate = carePlanSubmittedTemplate({
    formData: data as Record<string, unknown>,
    submissionId: inserted.id,
    submittedBy,
    submittedAt,
  });

  // ── 5. Generate PDF ──────────────────────────────────────────────────────
  // If generation fails, continue — email is primary, storage is archival.
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateCarePlanPdf(
      data as Record<string, unknown>,
      submittedBy,
      submittedAt
    );
    console.log("[static-forms] PDF generated, size:", pdfBuffer.length);
  } catch (pdfErr) {
    console.error("[static-forms] PDF generation failed:", pdfErr);
  }

  // ── 6. Archive PDF to Supabase Storage ───────────────────────────────────
  // Storage is archival — failures are logged but never block the email send.
  if (pdfBuffer) {
    let uploadedPath: string | null = null;

    try {
      const { error: uploadErr } = await service.storage
        .from("care-plans")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadErr) {
        console.error("[static-forms] Storage upload failed:", uploadErr.message);
      } else {
        uploadedPath = storagePath;
        console.log("[static-forms] PDF archived to storage:", storagePath);
      }
    } catch (storageErr) {
      console.error("[static-forms] Storage upload threw:", storageErr);
    }

    // ── 7. Insert care_plan_documents metadata row ────────────────────────
    // Only insert if upload succeeded. If DB insert fails, delete the
    // orphaned file from storage so the two never drift out of sync.
    if (uploadedPath) {
      try {
        const { error: docErr } = await service
          .from("care_plan_documents")
          .insert({
            care_plan_submission_id: inserted.id,
            client_id: null,              // no UUID in form data; backfillable later
            storage_path: uploadedPath,
            filename,
            file_size_bytes: pdfBuffer.length,
            submitted_by: user.id,
            submitted_at: submittedAtDate.toISOString(),
          });

        if (docErr) {
          console.error("[static-forms] care_plan_documents insert failed:", docErr.message);
          // Delete the orphaned storage file
          const { error: deleteErr } = await service.storage
            .from("care-plans")
            .remove([uploadedPath]);
          if (deleteErr) {
            console.error("[static-forms] Orphan cleanup failed:", deleteErr.message);
          } else {
            console.log("[static-forms] Orphaned storage file cleaned up:", uploadedPath);
          }
        } else {
          console.log("[static-forms] care_plan_documents row inserted");
        }
      } catch (docErr) {
        console.error("[static-forms] care_plan_documents insert threw:", docErr);
      }
    }
  }

  // ── 8. Send email ────────────────────────────────────────────────────────
  // Always runs — even if PDF generation or storage failed.
  // Uses the standardized filename for the attachment (same as storage).
  try {
    await sendEmail({
      to: "betheldivinehealthcare@gmail.com",
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      actorId: user.id,
      ...(pdfBuffer
        ? { attachments: [{ filename, content: pdfBuffer }] }
        : {}),
    });
    console.log(
      "[static-forms] Email sent",
      pdfBuffer ? `with attachment: ${filename}` : "without PDF (generation failed)"
    );
  } catch (emailErr) {
    console.error("[static-forms] Email send failed:", emailErr);
  }

  // Response sent only after all awaits complete — Vercel stays alive.
  return NextResponse.json({ success: true, id: inserted.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role — admin or owner only
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const form_type = searchParams.get("form_type");

  const service = getServiceClient();
  let query = service
    .from("static_form_submissions")
    .select("id, form_type, data, submitted_by, created_at")
    .order("created_at", { ascending: false });

  if (form_type) {
    query = query.eq("form_type", form_type);
  }

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch profiles for all submitters in one query
  const submitterIds = Array.from(new Set(rows.map((r) => r.submitted_by).filter(Boolean)));
  const { data: profiles } = await service
    .from("profiles")
    .select("id, full_name, email")
    .in("id", submitterIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const enriched = rows.map((row) => ({
    ...row,
    profiles: profileMap.get(row.submitted_by) ?? null,
  }));

  return NextResponse.json(enriched);
}
