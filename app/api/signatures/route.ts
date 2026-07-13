import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — the caller's active signature, or null if they don't have one
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("signatures")
    .select("id, kind, value, font_id, created_at")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

// PUT — replace the caller's signature (deactivates the prior one, inserts a new row)
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { kind, value, font_id } = body ?? {};

  if (kind !== "typed" && kind !== "drawn") {
    return NextResponse.json({ error: "kind must be 'typed' or 'drawn'" }, { status: 400 });
  }
  if (typeof value !== "string" || !value.trim()) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  await supabase
    .from("signatures")
    .update({ is_active: false })
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("signatures")
    .insert({
      profile_id: user.id,
      kind,
      value,
      font_id: kind === "typed" ? (font_id ?? null) : null,
      is_active: true,
    })
    .select("id, kind, value, font_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — dismiss the "add your signature" dashboard prompt without creating one
export async function PATCH() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ signature_prompt_dismissed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
