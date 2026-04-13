import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendEmail } from "@/lib/email/send";
import { paymentReceiptTemplate } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const paymentRowId = pi.metadata?.payment_row_id;

      if (paymentRowId) {
        // Fetch payment row for client info
        const { data: paymentRow } = await service
          .from("payments")
          .select("client_id, amount, billing_month, card_brand, card_last_four")
          .eq("id", paymentRowId)
          .single();

        await service
          .from("payments")
          .update({ stripe_payment_id: pi.id, status: "completed" })
          .eq("id", paymentRowId);

        // Trigger QB sync
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        fetch(`${appUrl}/api/quickbooks/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          body: JSON.stringify({ payment_id: paymentRowId }),
        }).catch(() => {});

        // Send receipt email
        if (paymentRow) {
          const { data: clientProfile } = await service
            .from("profiles")
            .select("full_name, email")
            .eq("id", paymentRow.client_id)
            .single();

          if (clientProfile?.email) {
            const tpl = paymentReceiptTemplate({
              name: clientProfile.full_name ?? "Valued Client",
              amount: paymentRow.amount,
              date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
              cardBrand: paymentRow.card_brand ?? "Card",
              cardLastFour: paymentRow.card_last_four ?? "****",
              billingMonth: paymentRow.billing_month ?? "",
              paymentUrl: `${appUrl}/client/payments`,
            });
            sendEmail({ to: clientProfile.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
          }
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const paymentRowId = pi.metadata?.payment_row_id;

      if (paymentRowId) {
        // Get the payment row to find actor_id
        const { data: paymentRow } = await service
          .from("payments")
          .select("client_id")
          .eq("id", paymentRowId)
          .single();

        await service
          .from("payments")
          .update({ stripe_payment_id: pi.id, status: "failed" })
          .eq("id", paymentRowId);

        if (paymentRow) {
          // Get the profile for audit log
          const { data: clientRecord } = await service
            .from("clients")
            .select("profile_id")
            .eq("id", paymentRow.client_id)
            .single();

          if (clientRecord) {
            await service.from("audit_logs").insert({
              actor_id: clientRecord.profile_id,
              action: "PAYMENT_FAILED",
              target_table: "payments",
              target_id: paymentRowId,
              metadata: {
                stripe_payment_intent_id: pi.id,
                failure_message: pi.last_payment_error?.message ?? "Unknown",
              },
            });
          }
        }
      }
      break;
    }

    case "customer.updated": {
      const customer = event.data.object as Stripe.Customer;
      // Sync any default payment method changes
      const defaultPmId =
        typeof customer.invoice_settings?.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : null;

      if (defaultPmId) {
        const pm = await stripe.paymentMethods.retrieve(defaultPmId);
        const card = pm.card;
        if (card) {
          await service
            .from("stripe_customers")
            .update({
              stripe_payment_method_id: defaultPmId,
              card_last_four: card.last4,
              card_brand: card.brand.charAt(0).toUpperCase() + card.brand.slice(1),
            })
            .eq("stripe_customer_id", customer.id);
        }
      }
      break;
    }

    default:
      // Unhandled event — return 200 to acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
