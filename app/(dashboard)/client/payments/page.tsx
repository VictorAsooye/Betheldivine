import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ClientPaymentsClient from "./ClientPaymentsClient";

function monthLabel(billingMonth: string | null | undefined): string {
  if (!billingMonth) return "—";
  const [year, month] = billingMonth.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statusBadge(status: string, overdue = false) {
  if (overdue) return { label: "Overdue", color: "#c0392b", bg: "#fef2f2" };
  switch (status) {
    case "completed": return { label: "Paid", color: "#2d8a5e", bg: "#f0faf5" };
    case "failed":    return { label: "Failed", color: "#c0392b", bg: "#fef2f2" };
    case "refunded":  return { label: "Refunded", color: "#8e9ab0", bg: "#f7f9fc" };
    default:          return { label: "Pending", color: "#c8991a", bg: "#fdf8ec" };
  }
}

export default async function ClientPaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!clientRecord) {
    return (
      <div>
        <PageHeader title="Payments" subtitle="Manage your monthly balance" />
        <div className="p-8 max-w-3xl">
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
              Your client record has not been set up yet. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id, stripe_payment_method_id, card_last_four, card_brand")
    .eq("client_id", clientRecord.id)
    .maybeSingle();

  // Current month balance
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startOfMonth = new Date(year, month, 1).toISOString();
  const endOfMonth = new Date(year, month + 1, 1).toISOString();
  const billingMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  const { data: currentShifts } = await supabase
    .from("shifts")
    .select("actual_start, actual_end, employees(hourly_rate)")
    .eq("client_id", clientRecord.id)
    .eq("status", "completed")
    .gte("actual_end", startOfMonth)
    .lt("actual_end", endOfMonth);

  const currentBalance = (currentShifts ?? []).reduce((sum, s) => {
    if (!s.actual_start || !s.actual_end) return sum;
    const hours = (new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime()) / 3_600_000;
    const rate = (s.employees as unknown as { hourly_rate: number } | null)?.hourly_rate ?? 0;
    return sum + hours * rate;
  }, 0);

  // Previous month overdue check
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevBillingMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
  const startOfPrev = new Date(prevYear, prevMonth, 1).toISOString();
  const endOfPrev = new Date(prevYear, prevMonth + 1, 1).toISOString();

  const { data: prevShifts } = await supabase
    .from("shifts")
    .select("actual_start, actual_end, employees(hourly_rate)")
    .eq("client_id", clientRecord.id)
    .eq("status", "completed")
    .gte("actual_end", startOfPrev)
    .lt("actual_end", endOfPrev);

  const prevBalance = (prevShifts ?? []).reduce((sum, s) => {
    if (!s.actual_start || !s.actual_end) return sum;
    const hours = (new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime()) / 3_600_000;
    const rate = (s.employees as unknown as { hourly_rate: number } | null)?.hourly_rate ?? 0;
    return sum + hours * rate;
  }, 0);

  const { data: prevPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("client_id", clientRecord.id)
    .eq("billing_month", prevBillingMonth)
    .eq("status", "completed")
    .maybeSingle();

  const isOverdue = prevBalance > 0 && !prevPayment;

  // Payment history
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, billing_month, card_last_four, card_brand, created_at")
    .eq("client_id", clientRecord.id)
    .order("created_at", { ascending: false })
    .limit(24);

  const dueDate = new Date(year, month + 1, 5).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const cardLabel = stripeCustomer?.card_last_four
    ? `${stripeCustomer.card_brand ?? "Card"} ···· ${stripeCustomer.card_last_four}`
    : null;

  return (
    <div>
      <PageHeader title="Payments" subtitle="Manage your monthly balance" />
      <div className="p-8 space-y-6 max-w-4xl">

        {/* Overdue banner */}
        {isOverdue && (
          <div
            className="rounded-xl px-5 py-4 flex items-start gap-3"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-semibold font-sans" style={{ color: "#c0392b" }}>
                Overdue Balance — {monthLabel(prevBillingMonth)}
              </p>
              <p className="text-sm font-sans mt-0.5" style={{ color: "#c0392b" }}>
                ${prevBalance.toFixed(2)} from last month has not been paid. Please pay your balance below.
              </p>
            </div>
          </div>
        )}

        {/* Hero card */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "#1a2e4a" }}>
          <p className="text-xs font-semibold uppercase tracking-wider font-sans mb-1" style={{ color: "#8e9ab0" }}>
            Current Balance · {monthLabel(billingMonth)}
          </p>
          <p
            className="text-5xl font-bold text-white mb-1"
            style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            ${currentBalance.toFixed(2)}
          </p>
          <p className="text-sm font-sans mb-6" style={{ color: "#8e9ab0" }}>
            Due by {dueDate}
          </p>

          {cardLabel ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold font-sans flex items-center gap-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#f7f9fc" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  {cardLabel}
                </div>
                <Link href="/client/payments/setup" className="text-xs font-sans underline" style={{ color: "#8e9ab0" }}>
                  Change
                </Link>
              </div>
              <ClientPaymentsClient
                clientId={clientRecord.id}
                amount={currentBalance}
                billingMonth={billingMonth}
                cardLabel={cardLabel}
              />
            </div>
          ) : (
            <Link
              href="/client/payments/setup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold font-sans"
              style={{ backgroundColor: "#c8991a", color: "#fff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Add Payment Method
            </Link>
          )}
        </div>

        {/* Payment history */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#dce2ec" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#dce2ec" }}>
            <h2 className="text-base font-semibold" style={{ color: "#1a2e4a", fontFamily: "var(--font-lora), Georgia, serif" }}>
              Payment History
            </h2>
          </div>
          {payments && payments.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "#dce2ec" }}>
              {payments.map((p) => {
                const overdue = p.billing_month === prevBillingMonth && p.status !== "completed" && isOverdue;
                const badge = statusBadge(p.status, overdue);
                return (
                  <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                        {monthLabel(p.billing_month)}
                      </p>
                      <p className="text-xs font-sans mt-0.5" style={{ color: "#8e9ab0" }}>
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {p.card_last_four ? ` · ${p.card_brand ?? "Card"} ···· ${p.card_last_four}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                        ${Number(p.amount).toFixed(2)}
                      </span>
                      <span
                        className="text-xs font-semibold font-sans px-2.5 py-1 rounded-full"
                        style={{ color: badge.color, backgroundColor: badge.bg }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No payment history yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
