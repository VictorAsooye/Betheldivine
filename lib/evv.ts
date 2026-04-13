import { createClient as createServiceClient } from "@supabase/supabase-js";

export interface EVVPayload {
  employee_id: string;
  client_id: string;
  shift_id: string;
  actual_start: string;
  actual_end: string;
  location_in_lat: number | null;
  location_in_lng: number | null;
  location_out_lat: number | null;
  location_out_lng: number | null;
}

export async function submitEVV(shiftId: string): Promise<void> {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: shift } = await service
    .from("shifts")
    .select("id, employee_id, client_id, actual_start, actual_end")
    .eq("id", shiftId)
    .single();

  if (!shift || !shift.actual_start || !shift.actual_end) {
    console.warn("[EVV] Shift not found or missing timestamps:", shiftId);
    return;
  }

  const { data: clockEvents } = await service
    .from("clock_events")
    .select("event_type, location_lat, location_lng")
    .eq("shift_id", shiftId)
    .order("timestamp", { ascending: true });

  const clockIn = clockEvents?.find((e) => e.event_type === "clock_in");
  const clockOut = clockEvents?.find((e) => e.event_type === "clock_out");

  const payload: EVVPayload = {
    employee_id: shift.employee_id,
    client_id: shift.client_id,
    shift_id: shift.id,
    actual_start: shift.actual_start,
    actual_end: shift.actual_end,
    location_in_lat: clockIn?.location_lat ?? null,
    location_in_lng: clockIn?.location_lng ?? null,
    location_out_lat: clockOut?.location_lat ?? null,
    location_out_lng: clockOut?.location_lng ?? null,
  };

  const apiKey = process.env.MARYLAND_EVV_API_KEY;

  if (!apiKey || apiKey === "your_evv_api_key") {
    console.log("[EVV] API key not configured. Logging payload:", JSON.stringify(payload, null, 2));
    await service.from("shifts").update({ evv_verified: false }).eq("id", shiftId);
    return;
  }

  try {
    const res = await fetch("https://evv.sandata.com/api/v1/visits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-State": "MD",
      },
      body: JSON.stringify({
        employeeId: payload.employee_id,
        clientId: payload.client_id,
        visitId: payload.shift_id,
        startDateTime: payload.actual_start,
        endDateTime: payload.actual_end,
        gpsIn: payload.location_in_lat
          ? { lat: payload.location_in_lat, lng: payload.location_in_lng }
          : null,
        gpsOut: payload.location_out_lat
          ? { lat: payload.location_out_lat, lng: payload.location_out_lng }
          : null,
      }),
    });

    if (res.ok) {
      await service.from("shifts").update({ evv_verified: true }).eq("id", shiftId);
      console.log("[EVV] Successfully submitted shift:", shiftId);
    } else {
      const text = await res.text();
      console.error("[EVV] Submission failed:", res.status, text);
      await service.from("shifts").update({ evv_verified: false }).eq("id", shiftId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[EVV] Network error:", message);
    await service.from("shifts").update({ evv_verified: false }).eq("id", shiftId);
  }
}
