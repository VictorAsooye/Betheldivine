import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { carePlanSubmittedTemplate } from "@/lib/email/templates";
import { generateCarePlanPdf } from "@/lib/pdf/care-plan-pdf";

// Keep the function alive long enough for PDF generation + Resend call.
// Default is 10s (Hobby) / 60s (Pro). 30s is safe on both and prevents
// Vercel from killing the function mid-email on a cold start.
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
  const { data: inserted, error } = await service
    .from("static_form_submissions")
    .insert({ form_type, data, submitted_by: user.id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch submitter's name for the email
  const { data: profile } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const submittedBy = profile?.full_name ?? profile?.email ?? "Unknown";
  const submittedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  // Build email template
  const clientName = String((data as Record<string, unknown>)["client_full_name"] ?? "client");
  const safeFileName = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const emailTemplate = carePlanSubmittedTemplate({
    formData: data as Record<string, unknown>,
    submissionId: inserted.id,
    submittedBy,
    submittedAt,
  });

  // Generate PDF — if it fails, fall through and send email without attachment.
  // Both steps are awaited before returning so Vercel keeps the function alive
  // for the full duration. The client will wait ~3-8s for the 201 — the UI
  // shows a "generating PDF" loading state to set expectations.
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateCarePlanPdf(
      data as Record<string, unknown>,
      submittedBy,
      submittedAt
    );
    console.log("[static-forms] PDF generated, size:", pdfBuffer.length);
  } catch (pdfErr) {
    console.error("[static-forms] PDF generation failed, sending email without attachment:", pdfErr);
  }

  try {
    await sendEmail({
      to: "betheldivinehealthcare@gmail.com",
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      actorId: user.id,
      ...(pdfBuffer
        ? { attachments: [{ filename: `care-plan-${safeFileName}.pdf`, content: pdfBuffer }] }
        : {}),
    });
    console.log("[static-forms] Email sent", pdfBuffer ? "with PDF attachment" : "without PDF (generation failed)");
  } catch (emailErr) {
    console.error("[static-forms] Email send failed:", emailErr);
  }

  // Response is sent AFTER both awaits above — function is guaranteed alive.
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
