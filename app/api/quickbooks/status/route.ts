import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tokenRow } = await supabase
    .from("quickbooks_tokens")
    .select("realm_id, token_expiry")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    realm_id: tokenRow.realm_id,
    token_expiry: tokenRow.token_expiry,
  });
}
