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

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id, hire_date, position, certifications, assigned_clients, hourly_rate, created_at, profile_id, profiles(full_name, email, is_active)")
    .order("created_at", { ascending: false });

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
  const { profile_id, hire_date, position, hourly_rate } = body;

  if (!profile_id) {
    return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
  }

  // Check if employee record already exists
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Employee record already exists" }, { status: 409 });
  }

  // Set role to employee
  await supabase.from("profiles").update({ role: "employee" }).eq("id", profile_id);

  const { data, error } = await supabase
    .from("employees")
    .insert({
      profile_id,
      hire_date: hire_date || null,
      position: position || null,
      hourly_rate: hourly_rate || null,
      assigned_clients: [],
      certifications: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
