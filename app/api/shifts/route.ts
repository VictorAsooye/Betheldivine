import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const url = new URL(request.url);
  const week = url.searchParams.get("week"); // ISO date string for week start

  let weekStart: Date;
  let weekEnd: Date;

  if (week) {
    weekStart = new Date(week);
  } else {
    weekStart = new Date();
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
  }
  weekStart.setHours(0, 0, 0, 0);
  weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from("shifts")
    .select(`
      id, status, scheduled_start, scheduled_end, actual_start, actual_end, evv_verified, notes,
      employee_id, client_id,
      employees(id, profile_id, profiles(full_name)),
      clients(id, profile_id, profiles(full_name))
    `)
    .gte("scheduled_start", weekStart.toISOString())
    .lte("scheduled_start", weekEnd.toISOString())
    .order("scheduled_start", { ascending: true });

  // Employees only see their own shifts
  if (profile?.role === "employee") {
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    if (emp) {
      query = query.eq("employee_id", emp.id);
    } else {
      return NextResponse.json([]);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
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
  const { employee_id, client_id, scheduled_start, scheduled_end, notes } = body;

  if (!employee_id || !client_id || !scheduled_start || !scheduled_end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const startDt = new Date(scheduled_start);
  const endDt = new Date(scheduled_end);
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (endDt <= startDt) {
    return NextResponse.json({ error: "Scheduled end must be after scheduled start" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      employee_id,
      client_id,
      scheduled_start,
      scheduled_end,
      notes: notes ?? null,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
