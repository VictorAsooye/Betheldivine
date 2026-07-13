import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { FormField } from "@/components/FormRenderer";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You help fill out forms for a home healthcare agency called Bethel Divine Healthcare Services.
You're given a form's fields and a short description from the person filling it out. Infer values only for
fields you can confidently determine from the description — leave everything else out entirely.

Return ONLY valid JSON — no markdown, no backticks, no explanation. The JSON must be a flat object mapping
field id to value:
- text/email/phone/number/date/datetime/textarea fields: a string
- select fields: a string that exactly matches one of that field's options
- multiselect fields: an array of strings, each exactly matching one of that field's options
- boolean fields: true or false
- never include "section" fields
- never guess at sensitive identifiers (SSNs, dates of birth) unless explicitly stated in the description
- if the description doesn't give you enough to infer a field, omit that field id entirely`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const body = await request.json();
  const { formId, description } = body;
  if (!formId || !description) {
    return NextResponse.json({ error: "formId and description are required" }, { status: 400 });
  }

  // Same visibility rule as GET /api/forms — employees only ever see forms
  // targeting them; admin/owner see everything.
  let query = supabase.from("forms").select("id, schema, target_role, is_active").eq("id", formId);
  if (profile?.role === "employee") {
    query = query.in("target_role", ["employee", "all"]).eq("is_active", true);
  }
  const { data: form } = await query.maybeSingle();
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-your_anthropic_api_key") {
    return NextResponse.json(
      { error: "AI features are not configured. Please add the ANTHROPIC_API_KEY in Vercel environment settings." },
      { status: 503 }
    );
  }

  const fields = ((form.schema as { fields?: FormField[] })?.fields ?? []).filter((f) => f.type !== "section");
  const fieldSummary = fields.map((f) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    options: f.options,
  }));

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Form fields: ${JSON.stringify(fieldSummary)}\n\nDescription: ${description}\n\nReturn the values JSON.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");
    let raw = content.text.trim();
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let values: Record<string, unknown>;
    try {
      values = JSON.parse(raw);
    } catch {
      console.error("[AI] prefill-form JSON parse failed, raw length:", raw.length);
      return NextResponse.json({ error: "Couldn't make sense of that — try rephrasing." }, { status: 500 });
    }

    return NextResponse.json({ values });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI] prefill-form failed:", message);
    return NextResponse.json({ error: "Sola couldn't fill that in right now. Try again." }, { status: 500 });
  }
}
