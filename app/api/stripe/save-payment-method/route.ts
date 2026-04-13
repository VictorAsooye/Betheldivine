import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { payment_method_id } = await request.json();
  if (!payment_method_id) {
    return NextResponse.json({ error: "payment_method_id is required" }, { status: 400 });
  }

  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .single();

  if (!stripeCustomer) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  let card: import("stripe").Stripe.PaymentMethod["card"] | null = null;
  try {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: stripeCustomer.stripe_customer_id,
    });

    // Set as default
    await stripe.customers.update(stripeCustomer.stripe_customer_id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    // Get card details
    const pm = await stripe.paymentMethods.retrieve(payment_method_id);
    card = pm.card ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save payment method";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await service
    .from("stripe_customers")
    .update({
      stripe_payment_method_id: payment_method_id,
      card_last_four: card?.last4 ?? null,
      card_brand: card?.brand
        ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)
        : null,
    })
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    card_last_four: card?.last4,
    card_brand: card?.brand,
  });
}
