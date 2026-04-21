import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { carePlanSubmittedTemplate } from "@/lib/email/templates";

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

  // Send email notification — fire and forget (don't block the response)
  const emailTemplate = carePlanSubmittedTemplate({
    formData: data as Record<string, unknown>,
    submissionId: inserted.id,
    submittedBy,
    submittedAt,
  });

  sendEmail({
    to: "betheldivinehealthcare@gmail.com",
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    actorId: user.id,
  }).catch((err) => console.error("[static-forms] Email send failed:", err));

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
