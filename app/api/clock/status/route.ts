import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!employee) {
    return NextResponse.json({ clocked_in: false, no_employee_record: true });
  }

  // Get last clock event
  const { data: lastEvent } = await supabase
    .from("clock_events")
    .select("id, event_type, timestamp, shift_id, client_id")
    .eq("employee_id", employee.id)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastEvent || lastEvent.event_type === "clock_out") {
    // Look for today's upcoming shift
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayShift } = await supabase
      .from("shifts")
      .select("id, client_id, scheduled_start, scheduled_end, clients(id, profiles(full_name))")
      .eq("employee_id", employee.id)
      .in("status", ["scheduled", "active"])
      .gte("scheduled_start", todayStart.toISOString())
      .lte("scheduled_start", todayEnd.toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      clocked_in: false,
      employee_id: employee.id,
      today_shift: todayShift ?? null,
    });
  }

  // Currently clocked in — get shift & client details
  const { data: shift } = lastEvent.shift_id
    ? await supabase
        .from("shifts")
        .select("id, client_id, scheduled_start, scheduled_end, clients(id, profiles(full_name))")
        .eq("id", lastEvent.shift_id)
        .single()
    : { data: null };

  let clientName = "Unknown Client";
  if (shift && Array.isArray(shift.clients)) {
    const c = shift.clients[0] as { profiles?: { full_name?: string } } | undefined;
    clientName = c?.profiles?.full_name ?? "Unknown Client";
  } else if (shift && shift.clients && typeof shift.clients === "object") {
    const c = shift.clients as { profiles?: { full_name?: string } };
    clientName = c?.profiles?.full_name ?? "Unknown Client";
  }

  return NextResponse.json({
    clocked_in: true,
    clock_in_time: lastEvent.timestamp,
    clock_event_id: lastEvent.id,
    shift_id: lastEvent.shift_id,
    client_id: lastEvent.client_id,
    client_name: clientName,
    employee_id: employee.id,
  });
}
