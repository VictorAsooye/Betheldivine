import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { roleAssignedTemplate } from "@/lib/email/templates";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role, is_active } = body;

  const validRoles = ["admin", "owner", "employee", "client", "pending"];
  if (role !== undefined && !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "USER_UPDATED",
    targetTable: "profiles",
    targetId: params.id,
    metadata: updates,
  });

  // Send role-change email if role was updated
  if (role !== undefined && data.email) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com";
    const tpl = roleAssignedTemplate({
      name: data.full_name ?? "Team Member",
      newRole: role,
      loginUrl: `${baseUrl}/login`,
    });
    sendEmail({ to: data.email, subject: tpl.subject, html: tpl.html, actorId: user.id }).catch(() => {});
  }

  return NextResponse.json(data);
}
