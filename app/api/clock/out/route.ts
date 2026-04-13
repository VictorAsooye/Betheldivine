import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { submitEVV } from "@/lib/evv";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lat, lng, shift_id, client_id } = body;

  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "No employee record found" }, { status: 404 });
  }

  // Verify currently clocked in
  const { data: lastEvent } = await supabase
    .from("clock_events")
    .select("id, event_type")
    .eq("employee_id", employee.id)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastEvent || lastEvent.event_type === "clock_out") {
    return NextResponse.json({ error: "Not currently clocked in" }, { status: 409 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = new Date().toISOString();

  const { data: clockEvent, error: clockError } = await supabase
    .from("clock_events")
    .insert({
      employee_id: employee.id,
      client_id,
      event_type: "clock_out",
      timestamp: now,
      location_lat: lat ?? null,
      location_lng: lng ?? null,
      ip_address: ip,
      shift_id: shift_id ?? null,
    })
    .select()
    .single();

  if (clockError) {
    return NextResponse.json({ error: clockError.message }, { status: 500 });
  }

  // Update shift status to completed
  if (shift_id) {
    await supabase
      .from("shifts")
      .update({ status: "completed", actual_end: now })
      .eq("id", shift_id);

    // Fire-and-forget EVV submission (sets evv_verified based on API result)
    submitEVV(shift_id).catch((err) =>
      console.error("[EVV] submitEVV error:", err)
    );
  }

  await writeAuditLog({
    actorId: user.id,
    action: "CLOCK_OUT",
    targetTable: "clock_events",
    targetId: clockEvent.id,
    metadata: { client_id, shift_id: shift_id ?? null, ip, lat: lat ?? null, lng: lng ?? null },
  });

  return NextResponse.json({ success: true, event: clockEvent });
}
