import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getValidToken, createSalesReceipt } from "@/lib/quickbooks";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  // Internal route — verify with service role key header
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payment_id } = await request.json();
  if (!payment_id) {
    return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get payment with client info
  const { data: payment } = await service
    .from("payments")
    .select(`
      id, amount, created_at, billing_month, card_last_four, card_brand,
      quickbooks_synced,
      clients (
        id, profile_id,
        profiles (full_name)
      )
    `)
    .eq("id", payment_id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.quickbooks_synced) {
    return NextResponse.json({ success: true, message: "Already synced" });
  }

  const qbToken = await getValidToken(service);

  if (!qbToken) {
    // No QB connection — log and skip
    console.log("[QB Sync] QuickBooks not connected. Skipping sync for payment:", payment_id);
    return NextResponse.json({ success: false, message: "QuickBooks not connected" });
  }

  const clientProfile = (payment.clients as unknown as { profiles: { full_name: string }; profile_id: string } | null);
  const clientName = clientProfile?.profiles?.full_name ?? "Unknown Client";
  const actorId = clientProfile?.profile_id ?? payment_id;

  try {
    await createSalesReceipt(qbToken.accessToken, qbToken.realmId, {
      clientName,
      amount: payment.amount,
      paymentDate: payment.created_at,
      cardBrand: payment.card_brand,
      cardLastFour: payment.card_last_four,
      billingMonth: payment.billing_month,
      paymentId: payment.id,
    });

    await service
      .from("payments")
      .update({ quickbooks_synced: true })
      .eq("id", payment_id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "QB sync failed";
    console.error("[QB Sync] Error:", message);

    await writeAuditLog({
      actorId,
      action: "QB_SYNC_FAILED",
      targetTable: "payments",
      targetId: payment_id,
      metadata: { error: message },
    });

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
