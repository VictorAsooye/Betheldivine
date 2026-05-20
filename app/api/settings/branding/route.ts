import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface BrandingPatch {
  company_name?: string;
  tagline?: string;
  address?: string;
  email?: string;
  logo_storage_path?: string;
  brand_color?: string;
}

const ALLOWED_KEYS: (keyof BrandingPatch)[] = [
  "company_name",
  "tagline",
  "address",
  "email",
  "logo_storage_path",
  "brand_color",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("company_branding")
    .select("org_id, company_name, tagline, address, email, logo_storage_path, brand_color")
    .eq("org_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: BrandingPatch;
  try {
    body = (await request.json()) as BrandingPatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: BrandingPatch = {};
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  const { data, error } = await supabase
    .from("company_branding")
    .upsert({ org_id: user.id, ...updates }, { onConflict: "org_id" })
    .select("org_id, company_name, tagline, address, email, logo_storage_path, brand_color")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
