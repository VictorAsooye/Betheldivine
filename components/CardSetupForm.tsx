"use client";

import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

export default function CardSetupForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Get SetupIntent client secret
      const siRes = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const siData = await siRes.json();

      if (!siRes.ok || !siData.client_secret) {
        setError(siData.error ?? "Failed to initialize card setup.");
        setLoading(false);
        return;
      }

      // 2. Confirm card setup with Stripe
      const card = elements.getElement(CardElement);
      if (!card) {
        setError("Card element not found.");
        setLoading(false);
        return;
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        siData.client_secret,
        { payment_method: { card } }
      );

      if (stripeError) {
        setError(stripeError.message ?? "Card setup failed.");
        setLoading(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        setError("Setup did not return a payment method.");
        setLoading(false);
        return;
      }

      // 3. Save payment method to our DB
      const pmId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      const saveRes = await fetch("/api/stripe/save-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method_id: pmId }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        setError(saveData.error ?? "Failed to save payment method.");
        setLoading(false);
        return;
      }

      const brand = saveData.card_brand
        ? saveData.card_brand.charAt(0).toUpperCase() + saveData.card_brand.slice(1)
        : "Card";
      setSuccess(`${brand} ending in ${saveData.card_last_four} saved successfully.`);

      setTimeout(() => {
        router.push("/client/payments");
        router.refresh();
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-2 font-sans" style={{ color: "#1a2e4a" }}>
          Card Details
        </label>
        <div
          className="px-4 py-3.5 rounded-lg border"
          style={{ borderColor: "#dce2ec", backgroundColor: "#fff" }}
        >
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "15px",
                  color: "#1a2e4a",
                  fontFamily: "system-ui, sans-serif",
                  "::placeholder": { color: "#8e9ab0" },
                },
                invalid: { color: "#c0392b" },
              },
              hidePostalCode: false,
            }}
          />
        </div>
        <p className="text-xs font-sans mt-2" style={{ color: "#8e9ab0" }}>
          Your card is saved securely via Stripe. We never store raw card numbers.
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm font-sans"
          style={{ backgroundColor: "#fef2f2", color: "#c0392b", border: "1px solid #fca5a5" }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="px-4 py-3 rounded-lg text-sm font-sans font-semibold"
          style={{ backgroundColor: "#f0faf5", color: "#2d8a5e", border: "1px solid #86efac" }}
        >
          ✓ {success}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading || !!success}
        className="w-full py-3 rounded-lg text-white text-sm font-semibold font-sans transition-all disabled:opacity-60"
        style={{ backgroundColor: "#1a2e4a" }}
      >
        {loading ? "Saving Card…" : "Save Card"}
      </button>

      <p className="text-xs font-sans text-center" style={{ color: "#8e9ab0" }}>
        This card will be used for future monthly payments.
        Test with: 4242 4242 4242 4242 — any future expiry — any CVC.
      </p>
    </form>
  );
}
