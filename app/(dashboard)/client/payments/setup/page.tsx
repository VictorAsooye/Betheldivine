import PageHeader from "@/components/PageHeader";
import StripeProvider from "@/components/StripeProvider";
import CardSetupForm from "@/components/CardSetupForm";
import SetupAutoCreateCustomer from "./SetupAutoCreateCustomer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CardSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if Stripe customer exists; if not, SetupAutoCreateCustomer will create it
  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <div>
      <PageHeader title="Add Payment Method" subtitle="Save a card for monthly billing" />
      <div className="p-8 max-w-lg">
        {/* Auto-create Stripe customer if needed */}
        {!stripeCustomer && <SetupAutoCreateCustomer />}

        <div className="bg-white rounded-xl border p-8 space-y-6" style={{ borderColor: "#dce2ec" }}>
          <div>
            <h2
              className="text-lg font-semibold mb-1"
              style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
            >
              Save a Card on File
            </h2>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
              Your card will be charged each month for your care services balance.
              You can update or change it at any time.
            </p>
          </div>

          <StripeProvider>
            <CardSetupForm />
          </StripeProvider>
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>
            Card data is handled exclusively by Stripe. Bethel Divine never stores raw card numbers.
            All transactions are encrypted and PCI-DSS compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
