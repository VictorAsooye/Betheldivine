import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await service
    .from("static_form_submissions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch the submitter's profile separately (FK is to auth.users, not profiles)
  let profile: { full_name?: string; email?: string } | null = null;
  if (data.submitted_by) {
    const { data: p } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.submitted_by)
      .single();
    profile = p ?? null;
  }

  return NextResponse.json({ ...data, profiles: profile });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the existing submission to verify it exists and check ownership
  const { data: existing, error: fetchErr } = await service
    .from("static_form_submissions")
    .select("id, submitted_by")
    .eq("id", params.id)
    .single();

  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the original submitter, admin, or owner can edit
  const { data: callerProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdminOrOwner = callerProfile && ["admin", "owner"].includes(callerProfile.role);
  const isSubmitter = existing.submitted_by === user.id;

  if (!isAdminOrOwner && !isSubmitter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.data) {
    return NextResponse.json({ error: "data is required" }, { status: 400 });
  }

  const { error: updateErr } = await service
    .from("static_form_submissions")
    .update({ data: body.data })
    .eq("id", params.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
