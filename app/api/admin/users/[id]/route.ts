import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { roleAssignedTemplate, roleAssignedOwnerNotificationTemplate } from "@/lib/email/templates";

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

    // Email the user about their new role
    const userTpl = roleAssignedTemplate({
      name: data.full_name ?? "Team Member",
      newRole: role,
      loginUrl: `${baseUrl}/login`,
    });
    sendEmail({ to: data.email, subject: userTpl.subject, html: userTpl.html, actorId: user.id }).catch(() => {});

    // Fetch admin's name for the notification
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Notify all owners
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: owners } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("role", "owner")
      .eq("is_active", true);

    if (owners && owners.length > 0) {
      Promise.allSettled(
        owners.map((owner) => {
          const tpl = roleAssignedOwnerNotificationTemplate({
            ownerName: owner.full_name ?? "Owner",
            userName: data.full_name ?? "User",
            userEmail: data.email,
            newRole: role,
            assignedBy: adminProfile?.full_name ?? "Admin",
          });
          return sendEmail({ to: owner.email, subject: tpl.subject, html: tpl.html });
        })
      ).catch(() => {});
    }
  }

  return NextResponse.json(data);
}
