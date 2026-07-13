import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { demoIntakeNotificationTemplate } from "@/lib/email/templates";

// Public endpoint — no auth. A prospective company fills this out before
// they're a user of anything, so there's no session to check.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    company_name,
    industry,
    city_state,
    team_size,
    contact_name,
    contact_email,
    contact_phone,
    contact_role,
    pain_points,
    pain_point_details,
    sample_form_description,
    brand_color,
    tagline,
    timeline,
  } = body ?? {};

  if (!company_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
    return NextResponse.json(
      { error: "Company name, your name, and your email are required." },
      { status: 400 }
    );
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await service.from("demo_intake_submissions").insert({
    company_name,
    industry: industry ?? null,
    city_state: city_state ?? null,
    team_size: team_size ?? null,
    contact_name,
    contact_email,
    contact_phone: contact_phone ?? null,
    contact_role: contact_role ?? null,
    pain_points: Array.isArray(pain_points) ? pain_points : [],
    pain_point_details: pain_point_details ?? null,
    sample_form_description: sample_form_description ?? null,
    brand_color: brand_color ?? null,
    tagline: tagline ?? null,
    timeline: timeline ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifyEmail = process.env.DEMO_INTAKE_NOTIFY_EMAIL ?? "victor@betheldivine.com";
  const tpl = demoIntakeNotificationTemplate({
    companyName: company_name,
    industry: industry ?? "",
    cityState: city_state ?? "",
    teamSize: team_size ?? "",
    contactName: contact_name,
    contactEmail: contact_email,
    contactPhone: contact_phone ?? "",
    contactRole: contact_role ?? "",
    painPoints: Array.isArray(pain_points) ? pain_points : [],
    painPointDetails: pain_point_details ?? "",
    sampleFormDescription: sample_form_description ?? "",
    brandColor: brand_color ?? "",
    tagline: tagline ?? "",
    timeline: timeline ?? "",
  });

  // Fire-and-forget — a slow/broken email provider shouldn't fail the submission.
  sendEmail({ to: notifyEmail, subject: tpl.subject, html: tpl.html }).catch(() => {});

  return NextResponse.json({ success: true });
}
