import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") {
    return NextResponse.json({ error: "Only clients can create a Stripe customer" }, { status: 403 });
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ stripe_customer_id: existing.stripe_customer_id, already_exists: true });
  }

  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!clientRecord) {
    return NextResponse.json({ error: "No client record found" }, { status: 404 });
  }

  let stripeCustomer: import("stripe").Stripe.Customer;
  try {
    stripeCustomer = await stripe.customers.create({
      name: profile.full_name,
      email: profile.email,
      metadata: { supabase_profile_id: user.id, client_id: clientRecord.id },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create Stripe customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Use service role to insert (bypasses RLS)
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await service.from("stripe_customers").insert({
    profile_id: user.id,
    client_id: clientRecord.id,
    stripe_customer_id: stripeCustomer.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stripe_customer_id: stripeCustomer.id, already_exists: false });
}
