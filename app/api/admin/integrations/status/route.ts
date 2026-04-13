import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const resendKey = process.env.RESEND_API_KEY;
  const resend = !!(resendKey && resendKey !== "your_resend_api_key");

  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const vapid = !!(vapidPub && vapidPub !== "your_vapid_public_key" && vapidPriv && vapidPriv !== "your_vapid_private_key");

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const ai = !!(anthropicKey && anthropicKey !== "your_anthropic_api_key");

  return NextResponse.json({ resend, vapid, ai });
}
