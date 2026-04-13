import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Clients have no business calling this endpoint
  if (!profile || !["admin", "owner", "employee"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (profile.role === "employee") {
    const { data: emp } = await supabase
      .from("employees")
      .select("id, assigned_clients")
      .eq("profile_id", user.id)
      .single();

    if (!emp || !emp.assigned_clients?.length) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("clients")
      .select("id, date_of_birth, address, emergency_contact, insurance_info, assigned_employees, created_at, profiles(full_name, email)")
      .in("id", emp.assigned_clients);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, date_of_birth, address, emergency_contact, insurance_info, assigned_employees, created_at, profile_id, profiles(full_name, email)")
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
  const {
    full_name, email, date_of_birth, address,
    emergency_contact, insurance_info, assigned_employees,
  } = body;

  if (!full_name || !email) {
    return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
  }

  // Check if a profile already exists for this email
  let profileId: string;
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    profileId = existingProfile.id;
    // Update role to client if pending
    if (existingProfile.role === "pending" || existingProfile.role !== "client") {
      await supabase
        .from("profiles")
        .update({ role: "client", full_name })
        .eq("id", profileId);
    }
  } else {
    // Create auth user + profile via admin API is complex without service role
    // For now: require profile to exist (user must have registered)
    return NextResponse.json(
      { error: "No account found for this email. Ask the client to register first." },
      { status: 404 }
    );
  }

  // Create client record
  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .insert({
      profile_id: profileId,
      date_of_birth: date_of_birth || null,
      address: address || null,
      emergency_contact: emergency_contact || {},
      insurance_info: insurance_info || {},
      assigned_employees: assigned_employees || [],
    })
    .select()
    .single();

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

  // Update assigned employees' assigned_clients array
  if (assigned_employees?.length) {
    for (const empId of assigned_employees) {
      const { data: emp } = await supabase
        .from("employees")
        .select("assigned_clients")
        .eq("id", empId)
        .single();
      if (emp) {
        const existing = emp.assigned_clients ?? [];
        const updated = existing.includes(clientRecord.id) ? existing : [...existing, clientRecord.id];
        await supabase.from("employees").update({ assigned_clients: updated }).eq("id", empId);
      }
    }
  }

  await writeAuditLog({
    actorId: user.id,
    action: "CLIENT_CREATED",
    targetTable: "clients",
    targetId: clientRecord.id,
    metadata: { full_name, email, profile_id: profileId },
  });

  return NextResponse.json(clientRecord, { status: 201 });
}
