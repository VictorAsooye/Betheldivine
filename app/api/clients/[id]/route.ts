import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["admin", "owner", "employee"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("clients")
    .select(`
      id, date_of_birth, address, emergency_contact, insurance_info, assigned_employees, created_at, profile_id,
      profiles(full_name, email)
    `)
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Get assigned employees details
  const employeeIds = data.assigned_employees ?? [];
  let employees: { id: string; position?: string; profiles?: { full_name?: string } }[] = [];
  if (employeeIds.length) {
    const { data: empData } = await supabase
      .from("employees")
      .select("id, position, profiles(full_name)")
      .in("id", employeeIds);
    employees = (empData ?? []) as { id: string; position?: string; profiles?: { full_name?: string } }[];
  }

  // Get upcoming shifts
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, scheduled_start, scheduled_end, status, employees(profiles(full_name))")
    .eq("client_id", params.id)
    .order("scheduled_start", { ascending: false })
    .limit(10);

  // Get recent medication logs
  const { data: medLogs } = await supabase
    .from("medication_logs")
    .select("id, medication_name, dosage, administered_at, status, notes, employees(profiles(full_name))")
    .eq("client_id", params.id)
    .order("administered_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    ...data,
    employee_details: employees,
    shifts: shifts ?? [],
    medication_logs: medLogs ?? [],
  });
}

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
  const { date_of_birth, address, emergency_contact, insurance_info, assigned_employees } = body;

  const { data, error } = await supabase
    .from("clients")
    .update({
      date_of_birth: date_of_birth ?? null,
      address: address ?? null,
      emergency_contact: emergency_contact ?? {},
      insurance_info: insurance_info ?? {},
      assigned_employees: assigned_employees ?? [],
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
