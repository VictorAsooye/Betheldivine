import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { newUserRequestTemplate } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  const { name, email } = await request.json();
  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all admins and owners
  const { data: recipients } = await service
    .from("profiles")
    .select("full_name, email")
    .in("role", ["admin", "owner"])
    .eq("is_active", true);

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ success: true });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com";
  const usersUrl = `${baseUrl}/admin/users`;

  // Send to all admins + owners in parallel
  await Promise.allSettled(
    recipients.map((recipient) => {
      const tpl = newUserRequestTemplate({
        adminName: recipient.full_name ?? "Admin",
        newUserName: name,
        newUserEmail: email,
        usersUrl,
      });
      return sendEmail({ to: recipient.email, subject: tpl.subject, html: tpl.html });
    })
  );

  return NextResponse.json({ success: true });
}
