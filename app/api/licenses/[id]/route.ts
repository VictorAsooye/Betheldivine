import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { embedAndStore, deleteEmbeddings } from "@/lib/embeddings";

function licenseEmbedContent(license: {
  license_name: string;
  issuing_authority: string;
  license_number: string;
  expiry_date: string;
  notes: string | null;
}): string {
  return `${license.license_name} issued by ${license.issuing_authority}, number ${license.license_number}, expires ${license.expiry_date}. ${license.notes ?? ""}`;
}

function calcStatus(expiryDate: string): "active" | "expiring_soon" | "expired" {
  const expiry = new Date(expiryDate);
  const daysOut = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysOut < 0) return "expired";
  if (daysOut <= 60) return "expiring_soon";
  return "active";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { ...body };

  // Recalculate status if expiry_date is changing
  if (body.expiry_date) {
    updates.status = calcStatus(body.expiry_date);
  }

  const { data, error } = await supabase
    .from("licenses")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await embedAndStore("license", data.id, licenseEmbedContent(data), data.holder_id);
  } catch (embedErr) {
    console.error("[licenses/[id]] embedding failed for", data.id, embedErr);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("licenses")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await deleteEmbeddings("license", params.id).catch((err) =>
    console.error("[licenses DELETE] embedding cleanup failed for", params.id, err)
  );

  return NextResponse.json({ ok: true });
}
