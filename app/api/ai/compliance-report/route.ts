export const maxDuration = 60;

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

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [{ data: licenses }, { data: evvShifts }] = await Promise.all([
    service
      .from("licenses")
      .select("name, expiry_date, status, employee:profiles!licenses_employee_id_fkey(full_name)")
      .lte("expiry_date", in90Days)
      .order("expiry_date", { ascending: true }),
    service
      .from("shifts")
      .select("id, evv_verified, status")
      .eq("status", "completed")
      .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const evvTotal = evvShifts?.length ?? 0;
  const evvVerified = evvShifts?.filter((s) => s.evv_verified).length ?? 0;
  const evvRate = evvTotal > 0 ? ((evvVerified / evvTotal) * 100).toFixed(1) : "N/A";

  const expired = licenses?.filter((l) => new Date(l.expiry_date) < now) ?? [];
  const expiringSoon = licenses?.filter((l) => new Date(l.expiry_date) >= now) ?? [];

  const dataStr = JSON.stringify({
    evv_verification_rate_30d: `${evvRate}%`,
    evv_verified: evvVerified,
    evv_total_completed_shifts: evvTotal,
    expired_licenses: expired.length,
    licenses_expiring_within_90_days: expiringSoon.length,
    license_details: licenses?.slice(0, 15),
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
      content: `You are a compliance officer for Bethel Divine Healthcare Services LLC (Maryland home health agency, license R4205).
Analyze the following compliance data and produce a report covering: EVV verification rate vs. Maryland EVV mandate requirements, license expiry risks, and 3 prioritized remediation actions.
Format with clear sections. Keep it professional and under 400 words.

Data:
${dataStr}`,
    }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  await service.from("reports").insert({
    type: "compliance",
    content,
    generated_by: user.id,
  });

  return NextResponse.json({ content });
}
