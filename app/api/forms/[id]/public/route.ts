// Public form endpoint — no auth required, returns active form schema only
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await service
    .from("forms")
    .select("id, name, description, schema, target_role")
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Form not found or no longer active" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify the form exists and is active
  const { data: form } = await service
    .from("forms")
    .select("id")
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  if (!form) {
    return NextResponse.json({ error: "Form not found or no longer active" }, { status: 404 });
  }

  const body = await request.json();
  const { data: formData, submitter_name, submitter_email } = body;

  if (!formData) {
    return NextResponse.json({ error: "data is required" }, { status: 400 });
  }

  // Store submission with optional submitter info in the data payload
  const enriched = {
    ...formData,
    ...(submitter_name ? { _submitter_name: submitter_name } : {}),
    ...(submitter_email ? { _submitter_email: submitter_email } : {}),
    _submitted_via: "public_link",
    _submitted_at: new Date().toISOString(),
  };

  const { data, error } = await service
    .from("form_submissions")
    .insert({
      form_id: params.id,
      submitted_by: null,
      data: enriched,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
