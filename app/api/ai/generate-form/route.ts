import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a form designer for a home healthcare agency called Bethel Divine Healthcare Services.
Your job is to generate form schemas based on user descriptions.

Return ONLY valid JSON — no markdown, no backticks, no explanation, no preamble. Just the raw JSON object.

The JSON must match this exact structure:
{
  "title": "string",
  "description": "string",
  "fields": [
    {
      "id": "snake_case_unique_id",
      "type": "text|textarea|select|multiselect|boolean|date|datetime|number|email|phone",
      "label": "string",
      "required": true|false,
      "options": ["array", "only", "for", "select", "and", "multiselect", "types"],
      "placeholder": "string"
    }
  ]
}

Rules:
- Use snake_case for field IDs (e.g. "patient_name", "incident_date")
- Only include "options" for select and multiselect field types
- "placeholder" is optional but helps user experience
- Make forms professional and healthcare-appropriate
- Include all relevant fields for the described form type
- Typical healthcare forms include: patient info, date/time, signatures, notes, status fields`;

async function generateWithRetry(anthropic: Anthropic, prompt: string, targetRole: string, category: string): Promise<string> {
  const userPrompt = `Create a form for a home healthcare agency with these requirements:
Description: ${prompt}
Target audience: ${targetRole}
Category: ${category}

Generate a complete, professional form with all relevant fields.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text.trim();
}

export async function POST(request: NextRequest) {
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-your_anthropic_api_key") {
    return NextResponse.json(
      { error: "AI features are not configured. Please add the ANTHROPIC_API_KEY in Vercel environment settings." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { prompt, target_role, category } = body;

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    let raw = await generateWithRetry(anthropic, prompt, target_role ?? "all", category ?? "Other");

    // Strip markdown code fences if present (safety net)
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let schema;
    try {
      schema = JSON.parse(raw);
    } catch {
      // Retry once
      const raw2 = await generateWithRetry(anthropic, prompt, target_role ?? "all", category ?? "Other");
      const cleaned = raw2.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      schema = JSON.parse(cleaned);
    }

    return NextResponse.json({ schema });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI] Form generation failed:", message);
    return NextResponse.json({ error: `Failed to generate form: ${message}` }, { status: 500 });
  }
}
