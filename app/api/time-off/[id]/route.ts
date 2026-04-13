import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { timeOffApprovedTemplate, timeOffDeniedTemplate } from "@/lib/email/templates";

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

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status } = body;

  if (!["approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "Status must be approved or denied" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("time_off_requests")
    .update({ status, reviewed_by: user.id })
    .eq("id", params.id)
    .select(`
      id, status, start_date, end_date, reason,
      employees(profiles(full_name, email))
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emp = data.employees as { profiles?: { full_name?: string; email?: string } } | null;
  const empName = emp?.profiles?.full_name ?? "Employee";
  const empEmail = emp?.profiles?.email;

  // Send email notification to employee
  if (empEmail) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const tpl = status === "approved"
      ? timeOffApprovedTemplate({
          name: empName,
          startDate: data.start_date,
          endDate: data.end_date,
          approvedBy: adminProfile?.full_name ?? "Admin",
        })
      : timeOffDeniedTemplate({
          name: empName,
          startDate: data.start_date,
          endDate: data.end_date,
        });

    sendEmail({ to: empEmail, subject: tpl.subject, html: tpl.html, actorId: user.id }).catch(() => {});
  }

  await writeAuditLog({
    actorId: user.id,
    action: `TIME_OFF_${status.toUpperCase()}`,
    targetTable: "time_off_requests",
    targetId: params.id,
    metadata: { status, employee_name: emp?.profiles?.full_name, start_date: data.start_date, end_date: data.end_date },
  });

  return NextResponse.json(data);
}
