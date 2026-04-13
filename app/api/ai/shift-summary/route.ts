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

  // Last 7 days of shifts
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: shifts } = await service
    .from("shifts")
    .select(`
      id, status, clock_in, clock_out,
      employee:profiles!shifts_employee_id_fkey(full_name),
      client:profiles!shifts_client_id_fkey(full_name)
    `)
    .gte("created_at", since);

  const completed = shifts?.filter((s) => s.status === "completed") ?? [];
  const missed = shifts?.filter((s) => s.status === "missed") ?? [];
  const inProgress = shifts?.filter((s) => s.status === "in_progress") ?? [];

  const dataStr = JSON.stringify({ completed_count: completed.length, missed_count: missed.length, in_progress_count: inProgress.length, total: shifts?.length ?? 0, shifts: completed.slice(0, 20) }, null, 2);

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
      content: `You are a healthcare operations analyst for Bethel Divine Healthcare Services LLC.
Analyze the following shift data from the last 7 days and produce a concise operations summary report.
Include: overall completion rate, any patterns in missed shifts, staffing efficiency observations, and 2-3 actionable recommendations.
Format in clear sections with headers. Keep it professional and under 400 words.

Data:
${dataStr}`,
    }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  await service.from("reports").insert({
    type: "operations",
    content,
    generated_by: user.id,
  });

  return NextResponse.json({ content });
}
