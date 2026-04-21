import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
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

  const service = getService();

  // Employees only see their assigned clients
  if (callerProfile.role === "employee") {
    const { data: emp } = await service
      .from("employees")
      .select("assigned_clients")
      .eq("profile_id", user.id)
      .single();

    if (!emp?.assigned_clients?.length) return NextResponse.json([]);

    // Get client records and their profiles
    const { data: clientRows, error } = await service
      .from("clients")
      .select("id, profile_id, date_of_birth, address, emergency_contact, insurance_info, assigned_employees, created_at")
      .in("id", emp.assigned_clients);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!clientRows?.length) return NextResponse.json([]);

    const profileIds = clientRows.map((c) => c.profile_id).filter(Boolean);
    const { data: profileRows } = await service
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds);

    const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));
    return NextResponse.json(clientRows.map((c) => ({
      ...c,
      profiles: profileMap.get(c.profile_id) ?? null,
    })));
  }

  // Admin / owner: source of truth is profiles with role = 'client'
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "client")
    .order("full_name", { ascending: true });

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });
  if (!profiles || profiles.length === 0) return NextResponse.json([]);

  // Merge any extra detail rows from clients table
  const profileIds = profiles.map((p) => p.id);
  const { data: clientRows } = await service
    .from("clients")
    .select("id, profile_id, date_of_birth, address, emergency_contact, insurance_info, assigned_employees")
    .in("profile_id", profileIds);

  const clientMap = new Map((clientRows ?? []).map((c) => [c.profile_id, c]));

  const merged = profiles.map((p) => {
    const c = clientMap.get(p.id);
    return {
      id: c?.id ?? p.id,
      profile_id: p.id,
      date_of_birth: c?.date_of_birth ?? null,
      address: c?.address ?? null,
      emergency_contact: c?.emergency_contact ?? null,
      insurance_info: c?.insurance_info ?? null,
      assigned_employees: c?.assigned_employees ?? [],
      created_at: p.created_at,
      profiles: {
        full_name: p.full_name,
        email: p.email,
      },
    };
  });

  return NextResponse.json(merged);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["admin", "owner"].includes(callerProfile.role)) {
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

  const service = getService();

  // Check if a profile already exists for this email
  let profileId: string;
  const { data: existingProfile } = await service
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    profileId = existingProfile.id;
    await service
      .from("profiles")
      .update({ role: "client", full_name })
      .eq("id", profileId);
  } else {
    return NextResponse.json(
      { error: "No account found for this email. Ask the client to register first." },
      { status: 404 }
    );
  }

  // Upsert client record
  const { data: clientRecord, error: clientError } = await service
    .from("clients")
    .upsert({
      profile_id: profileId,
      date_of_birth: date_of_birth || null,
      address: address || null,
      emergency_contact: emergency_contact || {},
      insurance_info: insurance_info || {},
      assigned_employees: assigned_employees || [],
    }, { onConflict: "profile_id" })
    .select()
    .single();

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

  // Update assigned employees' assigned_clients array
  if (assigned_employees?.length) {
    for (const empId of assigned_employees) {
      const { data: emp } = await service
        .from("employees")
        .select("assigned_clients")
        .eq("id", empId)
        .single();
      if (emp) {
        const existing = emp.assigned_clients ?? [];
        const updated = existing.includes(clientRecord.id) ? existing : [...existing, clientRecord.id];
        await service.from("employees").update({ assigned_clients: updated }).eq("id", empId);
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
