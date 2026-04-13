import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";

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
  const clientId = url.searchParams.get("client_id");

  let query = supabase
    .from("medication_logs")
    .select(`
      id, medication_name, dosage, administered_at, status, notes, created_at,
      client_id, employee_id,
      clients(id, profiles(full_name)),
      employees(id, profiles(full_name))
    `)
    .order("administered_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  if (profile?.role === "employee") {
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    if (!emp) return NextResponse.json([]);
    query = query.eq("employee_id", emp.id);
  }

  const { data, error } = await query.limit(50);
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
  const { client_id, medication_name, dosage, administered_at, status, notes } = body;

  if (!client_id || !medication_name) {
    return NextResponse.json({ error: "client_id and medication_name are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("medication_logs")
    .insert({
      client_id,
      employee_id: employee.id,
      medication_name,
      dosage: dosage ?? null,
      administered_at: administered_at ?? new Date().toISOString(),
      status: status ?? "given",
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "MEDICATION_LOG_CREATED",
    targetTable: "medication_logs",
    targetId: data.id,
    metadata: { client_id, medication_name, status: status ?? "given" },
  });

  return NextResponse.json(data, { status: 201 });
}
