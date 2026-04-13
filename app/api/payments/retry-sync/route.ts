import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/payments/retry-sync — admin/owner, uses Supabase auth (no internal key needed)
export async function POST(req: NextRequest) {
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

  const { paymentId } = await req.json() as { paymentId: string };
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch payment + client name
  const { data: payment, error: fetchErr } = await service
    .from("payments")
    .select("id, amount, billing_month, stripe_payment_intent_id, client:profiles!payments_client_id_fkey(full_name, email)")
    .eq("id", paymentId)
    .single();

  if (fetchErr || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Call QB sync internally
  const internalKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  const syncRes = await fetch(`${baseUrl}/api/quickbooks/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": internalKey,
    },
    body: JSON.stringify({ paymentId }),
  });

  if (!syncRes.ok) {
    const body = await syncRes.json().catch(() => ({}));
    return NextResponse.json({ error: body.error ?? "Sync failed" }, { status: syncRes.status });
  }

  return NextResponse.json({ ok: true });
}
