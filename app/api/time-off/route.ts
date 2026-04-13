import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("time_off_requests")
    .select(`
      id, start_date, end_date, reason, status, created_at,
      employee_id,
      employees(id, profile_id, profiles(full_name, email)),
      reviewed_by
    `)
    .order("created_at", { ascending: false });

  if (profile?.role === "employee") {
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    if (!emp) return NextResponse.json([]);
    query = query.eq("employee_id", emp.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "No employee record found" }, { status: 404 });
  }

  const body = await request.json();
  const { start_date, end_date, reason } = body;

  if (!start_date || !end_date) {
    return NextResponse.json({ error: "Start and end date are required" }, { status: 400 });
  }

  if (new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: "End date cannot be before start date" }, { status: 400 });
  }

  if (new Date(start_date) < new Date(new Date().toDateString())) {
    return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("time_off_requests")
    .insert({
      employee_id: employee.id,
      start_date,
      end_date,
      reason: reason ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
