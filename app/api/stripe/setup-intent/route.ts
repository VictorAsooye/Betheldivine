import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!stripeCustomer) {
    return NextResponse.json({ error: "No Stripe customer found. Create customer first." }, { status: 404 });
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomer.stripe_customer_id,
      payment_method_types: ["card"],
      usage: "off_session",
    });
    return NextResponse.json({ client_secret: setupIntent.client_secret });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create setup intent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
