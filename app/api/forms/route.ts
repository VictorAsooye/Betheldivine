import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    .from("forms")
    .select(`
      id, name, description, schema, target_role, is_active, created_at,
      profiles(full_name)
    `)
    .order("created_at", { ascending: false });

  // Employees and clients only see forms targeting them
  if (profile?.role === "employee") {
    query = query.in("target_role", ["employee", "all"]).eq("is_active", true);
  } else if (profile?.role === "client") {
    query = query.in("target_role", ["client", "all"]).eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach submission count for admin/owner
  if (["admin", "owner"].includes(profile?.role ?? "")) {
    const ids = (data ?? []).map((f) => f.id);
    if (ids.length > 0) {
      const { data: counts } = await supabase
        .from("form_submissions")
        .select("form_id")
        .in("form_id", ids);

      const countMap: Record<string, number> = {};
      for (const row of counts ?? []) {
        countMap[row.form_id] = (countMap[row.form_id] ?? 0) + 1;
      }

      return NextResponse.json(
        (data ?? []).map((f) => ({ ...f, submission_count: countMap[f.id] ?? 0 }))
      );
    }
  }

  return NextResponse.json(data ?? []);
}
