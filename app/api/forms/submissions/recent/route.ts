import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Most recently submitted forms — admin/owner see all, everyone else sees
// only their own, per the form_submissions RLS policies.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "5");

  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, form_id, created_at, forms(name), profiles!form_submissions_submitted_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
