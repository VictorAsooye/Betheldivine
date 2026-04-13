"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clientId: string;
  amount: number;
  billingMonth: string;
  cardLabel: string;
}

export default function ClientPaymentsClient({ clientId, amount, billingMonth, cardLabel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handlePay() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, amount, billing_month: billingMonth }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Payment failed. Please try again.");
      setLoading(false);
      setShowConfirm(false);
      return;
    }

    setSuccess(true);
    setShowConfirm(false);
    setLoading(false);
    setTimeout(() => {
      router.refresh();
    }, 2000);
  }

  if (amount <= 0) {
    return (
      <span className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
        No balance due
      </span>
    );
  }

  if (success) {
    return (
      <span
        className="px-4 py-2 rounded-lg text-sm font-semibold font-sans"
        style={{ backgroundColor: "#2d8a5e", color: "#fff" }}
      >
        ✓ Payment successful
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold font-sans transition-all"
        style={{ backgroundColor: "#c8991a", color: "#fff" }}
      >
        Pay Now
      </button>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
            >
              Confirm Payment
            </h3>
            <p className="text-sm font-sans mb-1" style={{ color: "#8e9ab0" }}>
              You are about to pay:
            </p>
            <p
              className="text-4xl font-bold mb-1"
              style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}
            >
              ${amount.toFixed(2)}
            </p>
            <p className="text-sm font-sans mb-6" style={{ color: "#8e9ab0" }}>
              using {cardLabel}
            </p>

            {error && (
              <div
                className="mb-4 px-4 py-3 rounded-lg text-sm font-sans"
                style={{ backgroundColor: "#fef2f2", color: "#c0392b", border: "1px solid #fca5a5" }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setError(null); }}
                disabled={loading}
                className="flex-1 py-3 rounded-lg text-sm font-semibold font-sans border"
                style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={loading}
                className="flex-1 py-3 rounded-lg text-sm font-semibold font-sans text-white transition-all disabled:opacity-60"
                style={{ backgroundColor: "#1a2e4a" }}
              >
                {loading ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
