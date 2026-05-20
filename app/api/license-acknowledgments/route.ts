import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AckBody {
  licenseId?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: AckBody;
  try {
    body = (await request.json()) as AckBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const licenseId = body.licenseId;
  if (!licenseId) {
    return NextResponse.json({ error: "licenseId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("license_acknowledgments")
    .insert({ license_id: licenseId, acknowledged_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const licenseId = searchParams.get("license_id");

  let query = supabase
    .from("license_acknowledgments")
    .select("id, license_id, acknowledged_by, created_at")
    .eq("acknowledged_by", user.id);

  if (licenseId) {
    query = query.eq("license_id", licenseId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
