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

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: employees }, { data: shifts }] = await Promise.all([
    service
      .from("profiles")
      .select("id, full_name, hourly_rate, certifications")
      .eq("role", "employee"),
    service
      .from("shifts")
      .select("employee_id, status, clock_in, clock_out")
      .gte("created_at", since),
  ]);

  // Per-employee stats
  const stats = (employees ?? []).map((emp) => {
    const empShifts = (shifts ?? []).filter((s) => s.employee_id === emp.id);
    const completed = empShifts.filter((s) => s.status === "completed");
    const missed = empShifts.filter((s) => s.status === "missed");
    const totalHours = completed.reduce((sum, s) => {
      if (!s.clock_in || !s.clock_out) return sum;
      return sum + (new Date(s.clock_out).getTime() - new Date(s.clock_in).getTime()) / 3600000;
    }, 0);
    return {
      name: emp.full_name,
      total_shifts: empShifts.length,
      completed: completed.length,
      missed: missed.length,
      completion_rate: empShifts.length > 0 ? `${((completed.length / empShifts.length) * 100).toFixed(0)}%` : "N/A",
      total_hours: totalHours.toFixed(1),
      hourly_rate: emp.hourly_rate,
    };
  });

  const dataStr = JSON.stringify({ period: "last_30_days", employee_count: employees?.length ?? 0, stats }, null, 2);

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
      content: `You are an HR analyst for Bethel Divine Healthcare Services LLC.
Analyze the following employee performance data for the last 30 days.
Produce a summary covering: top performers, employees with low completion rates who may need support, overall staffing trends, and 2-3 HR recommendations.
Do NOT include sensitive wage data in the report. Format with clear sections. Keep it professional and under 400 words.

Data:
${dataStr}`,
    }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  await service.from("reports").insert({
    type: "employee",
    content,
    generated_by: user.id,
  });

  return NextResponse.json({ content });
}
