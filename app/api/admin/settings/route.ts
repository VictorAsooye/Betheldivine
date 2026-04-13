import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? user : null;
}

export async function GET() {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Convert rows to flat object
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;

  const updates = Object.entries(body).map(([key, value]) => ({
    key,
    value,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("system_settings")
    .upsert(updates, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
