import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

  if (!callerProfile || !["admin", "owner"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = getService();

  // Source of truth: profiles with role = 'employee'
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, full_name, email, is_active, created_at")
    .eq("role", "employee")
    .order("full_name", { ascending: true });

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });
  if (!profiles || profiles.length === 0) return NextResponse.json([]);

  // Pull any extra detail rows from the employees table
  const profileIds = profiles.map((p) => p.id);
  const { data: empRows } = await service
    .from("employees")
    .select("id, profile_id, hire_date, position, hourly_rate, assigned_clients, certifications")
    .in("profile_id", profileIds);

  const empMap = new Map((empRows ?? []).map((e) => [e.profile_id, e]));

  const merged = profiles.map((p) => {
    const emp = empMap.get(p.id);
    return {
      id: emp?.id ?? p.id,           // employee row id if exists, else profile id
      profile_id: p.id,
      hire_date: emp?.hire_date ?? null,
      position: emp?.position ?? null,
      hourly_rate: emp?.hourly_rate ?? null,
      assigned_clients: emp?.assigned_clients ?? [],
      certifications: emp?.certifications ?? [],
      created_at: p.created_at,
      profiles: {
        full_name: p.full_name,
        email: p.email,
        is_active: p.is_active,
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
  const { profile_id, hire_date, position, hourly_rate } = body;

  if (!profile_id) {
    return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
  }

  const service = getService();

  // Set role to employee
  await service.from("profiles").update({ role: "employee" }).eq("id", profile_id);

  // Upsert employee record (in case it already exists)
  const { data, error } = await service
    .from("employees")
    .upsert({
      profile_id,
      hire_date: hire_date || null,
      position: position || null,
      hourly_rate: hourly_rate || null,
      assigned_clients: [],
      certifications: [],
    }, { onConflict: "profile_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
