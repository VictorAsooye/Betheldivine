"use client";

import { useEffect } from "react";

// Auto-creates a Stripe customer on mount if one doesn't exist yet.
// Renders nothing — runs silently in the background.
export default function SetupAutoCreateCustomer() {
  useEffect(() => {
    fetch("/api/stripe/create-customer", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
