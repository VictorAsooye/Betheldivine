import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

interface InviteBody {
  emails?: string[];
}

interface InviteResult {
  invited: number;
  errors: string[];
}

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest): Promise<NextResponse<InviteResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ invited: 0, errors: ["Unauthorized"] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ invited: 0, errors: ["Forbidden"] }, { status: 403 });
  }

  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ invited: 0, errors: ["Invalid JSON"] }, { status: 400 });
  }

  const emails = Array.isArray(body.emails) ? body.emails : [];
  if (emails.length === 0) {
    return NextResponse.json({ invited: 0, errors: ["No emails provided"] }, { status: 400 });
  }

  const service = getService();

  // Company name for the invitation email.
  const { data: branding } = await service
    .from("company_branding")
    .select("company_name")
    .eq("org_id", user.id)
    .maybeSingle();
  const companyName =
    (branding as { company_name?: string } | null)?.company_name ?? "Bethel Divine Healthcare";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com";
  const registerUrl = `${baseUrl}/register`;

  let invited = 0;
  const errors: string[] = [];

  for (const rawEmail of emails) {
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) {
      errors.push(`Invalid email: ${rawEmail}`);
      continue;
    }

    // Skip if a profile with this email already exists.
    const { data: existing } = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      errors.push(`${email} already has an account`);
      continue;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1C1A16;">
        <p>Hello,</p>
        <p><strong>${companyName}</strong> has invited you to join their portal.</p>
        <p>Create your account to access forms, documents, and your credentials in one place.</p>
        <p><a href="${registerUrl}" style="background:#C9A84C;color:#0D1B2A;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Accept invite & register</a></p>
        <p style="color:#8C8576;font-size:12px;">Or copy this link: ${registerUrl}</p>
      </div>`;

    const result = await sendEmail({
      to: email,
      subject: `${companyName} invited you to their portal`,
      html,
      actorId: user.id,
    });

    if (result.success) {
      invited += 1;
      await service.from("audit_logs").insert({
        actor_id: user.id,
        action: "user_invited",
        target_table: "profiles",
        target_id: user.id,
        metadata: { email },
      });
    } else {
      errors.push(`Failed to invite ${email}: ${result.error ?? "unknown error"}`);
    }
  }

  return NextResponse.json({ invited, errors });
}
