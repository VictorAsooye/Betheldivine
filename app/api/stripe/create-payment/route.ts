import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { client_id, amount, billing_month } = await request.json();

  if (!client_id || !amount || amount <= 0) {
    return NextResponse.json({ error: "client_id and a positive amount are required" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get stripe customer record
  const { data: stripeCustomer } = await service
    .from("stripe_customers")
    .select("stripe_customer_id, stripe_payment_method_id, card_last_four, card_brand")
    .eq("client_id", client_id)
    .single();

  if (!stripeCustomer) {
    return NextResponse.json({ error: "No Stripe customer found for this client" }, { status: 404 });
  }

  if (!stripeCustomer.stripe_payment_method_id) {
    return NextResponse.json({ error: "No payment method on file" }, { status: 400 });
  }

  // Create a payments row (pending)
  const { data: paymentRow, error: insertError } = await service
    .from("payments")
    .insert({
      client_id,
      amount,
      status: "pending",
      quickbooks_synced: false,
      billing_month: billing_month ?? null,
      card_last_four: stripeCustomer.card_last_four,
      card_brand: stripeCustomer.card_brand,
    })
    .select()
    .single();

  if (insertError || !paymentRow) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to create payment record" }, { status: 500 });
  }

  try {
    // Create and immediately confirm a PaymentIntent (off-session charge)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: "usd",
      customer: stripeCustomer.stripe_customer_id,
      payment_method: stripeCustomer.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      metadata: {
        payment_row_id: paymentRow.id,
        client_id,
        billing_month: billing_month ?? "",
      },
    });

    // Update payments row with Stripe ID and status
    await service
      .from("payments")
      .update({
        stripe_payment_id: paymentIntent.id,
        status: paymentIntent.status === "succeeded" ? "completed" : "pending",
      })
      .eq("id", paymentRow.id);

    // Trigger QB sync + send receipt email (fire-and-forget)
    if (paymentIntent.status === "succeeded") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      fetch(`${appUrl}/api/quickbooks/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
        body: JSON.stringify({ payment_id: paymentRow.id }),
      }).catch(() => {});

    }

    return NextResponse.json({
      success: true,
      payment_id: paymentRow.id,
      stripe_payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (err: unknown) {
    // Mark payment as failed
    await service
      .from("payments")
      .update({ status: "failed" })
      .eq("id", paymentRow.id);

    const message = err instanceof Error ? err.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 402 });
  }
}
