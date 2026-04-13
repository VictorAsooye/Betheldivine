import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(_req: NextRequest) {
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

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Current + previous month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: payments } = await service
    .from("payments")
    .select("amount, status, billing_month, card_brand, quickbooks_synced, client:profiles!payments_client_id_fkey(full_name)")
    .in("billing_month", [currentMonth, prevMonth]);

  const collected = payments?.filter((p) => p.status === "completed").reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
  const outstanding = payments?.filter((p) => p.status === "pending").reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
  const failed = payments?.filter((p) => p.status === "failed").reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;

  const dataStr = JSON.stringify({
    current_month: currentMonth,
    previous_month: prevMonth,
    collected_usd: collected,
    outstanding_usd: outstanding,
    failed_usd: failed,
    total_records: payments?.length ?? 0,
    quickbooks_unsynced: payments?.filter((p) => !p.quickbooks_synced).length ?? 0,
  }, null, 2);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key") {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are a financial analyst for Bethel Divine Healthcare Services LLC.
Analyze the following payment data for the current and previous billing month.
Produce a concise payment summary report including: collection rate, outstanding and failed amounts, QuickBooks sync status, and 2-3 recommendations to improve cash flow.
Format with clear sections. Keep it professional and under 400 words.

Data:
${dataStr}`,
    }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  await service.from("reports").insert({
    type: "payment",
    content,
    generated_by: user.id,
  });

  return NextResponse.json({ content });
}
