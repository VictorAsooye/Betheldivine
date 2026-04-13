"use client";

import { useEffect, useState, useCallback } from "react";
import StatCard from "@/components/StatCard";

type FilterStatus = "all" | "completed" | "pending" | "failed";

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  billing_month: string | null;
  card_last_four: string | null;
  card_brand: string | null;
  quickbooks_synced: boolean;
  created_at: string;
  clients: {
    id: string;
    profiles: { full_name: string } | null;
  } | null;
}

function monthLabel(billingMonth: string | null | undefined): string {
  if (!billingMonth) return "—";
  const [year, month] = billingMonth.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  switch (status) {
    case "completed": return { label: "Paid", color: "#2d8a5e", bg: "#f0faf5" };
    case "failed":    return { label: "Failed", color: "#c0392b", bg: "#fef2f2" };
    case "refunded":  return { label: "Refunded", color: "#8e9ab0", bg: "#f7f9fc" };
    default:          return { label: "Pending", color: "#c8991a", bg: "#fdf8ec" };
  }
}

export default function PaymentsDashboard() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [invoicing, setInvoicing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data.payments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Detect overdue: current month > 5th and previous month has no completed payment
  const now = new Date();
  const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevBillingMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;

  // Unique clients with overdue status
  const overdueClientIds = new Set<string>();
  payments.forEach((p) => {
    if (p.billing_month === prevBillingMonth && p.status !== "completed" && p.clients?.id) {
      overdueClientIds.add(p.clients.id);
    }
  });

  // Summary stats
  const totalCollectedThisMonth = payments
    .filter((p) => p.status === "completed" && p.billing_month === currentBillingMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const failedCount = payments.filter((p) => p.status === "failed").length;

  const outstandingBalance = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const filtered = payments.filter((p) => {
    if (filter === "all") return true;
    if (filter === "completed") return p.status === "completed";
    if (filter === "failed") return p.status === "failed";
    if (filter === "pending") {
      const isOverdue = p.clients?.id && overdueClientIds.has(p.clients.id);
      return p.status === "pending" || isOverdue;
    }
    return true;
  });

  async function handleRetrySync(payment: PaymentRow) {
    setSyncing(payment.id);
    setActionError(null);
    const res = await fetch("/api/payments/retry-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: payment.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? "Sync failed");
    }
    await fetchPayments();
    setSyncing(null);
  }

  async function handleSendInvoice(payment: PaymentRow) {
    if (!payment.clients?.id || !payment.billing_month) return;
    setInvoicing(payment.id);
    setActionError(null);
    const res = await fetch("/api/payments/send-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: payment.clients.id, billingMonth: payment.billing_month }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? "Failed to send invoice");
    }
    setInvoicing(null);
  }

  const filterBtns: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Paid" },
    { key: "pending", label: "Overdue / Pending" },
    { key: "failed", label: "Failed" },
  ];

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border h-28 animate-pulse" style={{ borderColor: "#dce2ec" }} />
          ))}
        </div>
        <div className="bg-white rounded-xl border h-64 animate-pulse" style={{ borderColor: "#dce2ec" }} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Collected This Month"
          value={`$${totalCollectedThisMonth.toFixed(2)}`}
          accent="#2d8a5e"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Outstanding Balance"
          value={`$${outstandingBalance.toFixed(2)}`}
          accent="#c8991a"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label="Failed Payments"
          value={failedCount}
          accent="#c0392b"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
        />
      </div>

      {/* Overdue clients callout */}
      {overdueClientIds.size > 0 && (
        <div
          className="rounded-xl px-5 py-3 flex items-center gap-3"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-sans font-semibold" style={{ color: "#c0392b" }}>
            {overdueClientIds.size} client{overdueClientIds.size > 1 ? "s have" : " has"} an overdue balance from {monthLabel(prevBillingMonth)}.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
        {/* Filters */}
        <div className="px-6 py-4 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "#dce2ec" }}>
          {filterBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all"
              style={{
                backgroundColor: filter === btn.key ? "#1a2e4a" : "#f7f9fc",
                color: filter === btn.key ? "#fff" : "#8e9ab0",
                border: `1px solid ${filter === btn.key ? "#1a2e4a" : "#dce2ec"}`,
              }}
            >
              {btn.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-sans" style={{ color: "#8e9ab0" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No payments match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "#dce2ec" }}>
                  {["Client", "Month", "Amount", "Method", "Date", "Status", "QB", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider font-sans"
                      style={{ color: "#8e9ab0" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dce2ec" }}>
                {filtered.map((p) => {
                  const isOverdue = p.clients?.id ? overdueClientIds.has(p.clients.id) && p.billing_month === prevBillingMonth && p.status !== "completed" : false;
                  const badge = statusBadge(isOverdue ? "overdue_display" : p.status);
                  const effectiveBadge = isOverdue ? { label: "Overdue", color: "#c0392b", bg: "#fef2f2" } : badge;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-sans font-medium" style={{ color: "#1a2e4a" }}>
                        {p.clients?.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-sans" style={{ color: "#8e9ab0" }}>
                        {monthLabel(p.billing_month)}
                      </td>
                      <td className="px-6 py-4 font-sans font-semibold" style={{ color: "#1a2e4a" }}>
                        ${Number(p.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-sans" style={{ color: "#8e9ab0" }}>
                        {p.card_last_four ? `${p.card_brand ?? "Card"} ···· ${p.card_last_four}` : "—"}
                      </td>
                      <td className="px-6 py-4 font-sans" style={{ color: "#8e9ab0" }}>
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                          style={{ color: effectiveBadge.color, backgroundColor: effectiveBadge.bg }}
                        >
                          {effectiveBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {p.status === "completed" ? (
                          <span
                            className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                            style={
                              p.quickbooks_synced
                                ? { color: "#2d8a5e", backgroundColor: "#f0faf5" }
                                : { color: "#c0392b", backgroundColor: "#fef2f2" }
                            }
                          >
                            {p.quickbooks_synced ? "Synced" : "Not Synced"}
                          </span>
                        ) : (
                          <span className="text-xs font-sans" style={{ color: "#dce2ec" }}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {p.status === "completed" && !p.quickbooks_synced && (
                            <button
                              onClick={() => handleRetrySync(p)}
                              disabled={syncing === p.id}
                              className="text-xs font-sans font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                              style={{ color: "#1a6b7c", backgroundColor: "#f0f9fa", border: "1px solid #1a6b7c" }}
                            >
                              {syncing === p.id ? "Syncing…" : "Retry Sync"}
                            </button>
                          )}
                          {p.billing_month && (
                            <button
                              onClick={() => handleSendInvoice(p)}
                              disabled={invoicing === p.id}
                              className="text-xs font-sans font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                              style={{ color: "#1a2e4a", backgroundColor: "#f7f9fc", border: "1px solid #dce2ec" }}
                            >
                              {invoicing === p.id ? "Sending…" : "Send Invoice"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
