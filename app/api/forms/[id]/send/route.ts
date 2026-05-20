import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

interface SendBody {
  employeeIds?: string[];
  formId?: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const formId = body.formId ?? params.id;
  const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds : [];

  if (employeeIds.length === 0) {
    return NextResponse.json({ error: "employeeIds is required" }, { status: 400 });
  }

  const service = getService();

  // Resolve company name for the email subject.
  const { data: branding } = await service
    .from("company_branding")
    .select("company_name")
    .eq("org_id", user.id)
    .maybeSingle();
  const companyName =
    (branding as { company_name?: string } | null)?.company_name ?? "Bethel Divine Healthcare";

  // Verify the form exists.
  const { data: form } = await service
    .from("forms")
    .select("id, name")
    .eq("id", formId)
    .single();

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com";
  const formUrl = `${baseUrl}/forms/${formId}`;

  const { data: profiles } = await service
    .from("profiles")
    .select("id, full_name, email")
    .in("id", employeeIds);

  const profileMap = new Map<string, ProfileRow>(
    ((profiles as ProfileRow[]) ?? []).map((p) => [p.id, p])
  );

  let sent = 0;
  const errors: string[] = [];

  for (const employeeId of employeeIds) {
    const recipient = profileMap.get(employeeId);
    if (!recipient?.email) {
      errors.push(`No email for recipient ${employeeId}`);
      continue;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1C1A16;">
        <p>Hello ${recipient.full_name ?? "there"},</p>
        <p>${companyName} has sent you a form to complete: <strong>${form.name}</strong>.</p>
        <p><a href="${formUrl}" style="background:#C9A84C;color:#0D1B2A;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open the form</a></p>
        <p style="color:#8C8576;font-size:12px;">Or copy this link: ${formUrl}</p>
      </div>`;

    const result = await sendEmail({
      to: recipient.email,
      subject: `${companyName} sent you a form`,
      html,
      actorId: user.id,
    });

    if (result.success) {
      sent += 1;
      await service.from("audit_logs").insert({
        actor_id: user.id,
        action: "form_sent",
        target_table: "forms",
        target_id: formId,
        metadata: { recipient_id: employeeId, recipient_email: recipient.email },
      });
    } else {
      errors.push(`Failed to send to ${recipient.email}: ${result.error ?? "unknown error"}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
