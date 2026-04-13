import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { invoiceTemplate } from "@/lib/email/templates";

// POST /api/payments/send-invoice — admin/owner only
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId, billingMonth } = await req.json() as { clientId: string; billingMonth: string };
  if (!clientId || !billingMonth) {
    return NextResponse.json({ error: "Missing clientId or billingMonth" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Client details
  const { data: client } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", clientId)
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Completed shifts for the billing month
  const [year, month] = billingMonth.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: shifts } = await service
    .from("shifts")
    .select("clock_in, clock_out, employee:profiles!shifts_employee_id_fkey(full_name, hourly_rate)")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .gte("clock_in", monthStart)
    .lte("clock_in", monthEnd);

  const visits = (shifts ?? []).map((s) => {
    const hours = s.clock_in && s.clock_out
      ? (new Date(s.clock_out).getTime() - new Date(s.clock_in).getTime()) / 3600000
      : 0;
    const rate = (s.employee as { hourly_rate?: number })?.hourly_rate ?? 0;
    return {
      date: new Date(s.clock_in).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      caregiver: (s.employee as { full_name?: string })?.full_name ?? "Staff",
      hours: parseFloat(hours.toFixed(2)),
      rate,
      subtotal: parseFloat((hours * rate).toFixed(2)),
    };
  });

  const total = visits.reduce((s, v) => s + v.subtotal, 0);

  // Due date = last day of next month
  const dueDate = new Date(year, month, 0);
  dueDate.setMonth(dueDate.getMonth() + 1);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://betheldivine.com";
  const { subject, html } = invoiceTemplate({
    name: client.full_name,
    billingMonth,
    visits,
    total,
    dueDate: dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    paymentUrl: `${baseUrl}/client/payments`,
  });

  const result = await sendEmail({
    to: client.email,
    subject,
    html,
    actorId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
