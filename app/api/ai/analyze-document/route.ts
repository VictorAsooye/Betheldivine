import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const SYSTEM_PROMPT =
  "You are Sola AI, an assistant built into the Sola portal for home health agencies. You look at a photo of a document a staff member just uploaded and (1) suggest which existing folder it belongs in, and (2) decide whether it's a blank, fillable paper form (has labeled blank fields meant to be filled out — not a completed record, ID, receipt, or general photo) that's worth turning into a real fillable digital form. Be precise and grounded only in what you actually see in the image — never guess from the filename alone.";

type AllowedMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_MIMES: AllowedMime[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface FolderOption {
  id: string;
  name: string;
}

interface AnalyzeBody {
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
  availableFolders?: FolderOption[];
}

interface AnalyzeResult {
  folder_id: string | null;
  folder_name: string;
  reason: string;
  is_form: boolean;
  form_schema: {
    title: string;
    description?: string;
    fields: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
  } | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-your_anthropic_api_key") {
    return NextResponse.json({ error: "AI features are not configured." }, { status: 503 });
  }

  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, mimeType, fileName } = body;
  if (!imageBase64 || !mimeType || !fileName) {
    return NextResponse.json({ error: "imageBase64, mimeType, and fileName are required" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.includes(mimeType as AllowedMime)) {
    return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP." }, { status: 400 });
  }

  const folders = Array.isArray(body.availableFolders) ? body.availableFolders : [];
  const folderList = folders.map((f) => `${f.id}: ${f.name}`).join(", ") || "none";

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType as AllowedMime, data: imageBase64 },
            },
            {
              type: "text",
              text: `File name: ${fileName}. Folders available (id: name): ${folderList}.

Return ONLY valid JSON in this exact shape:
{
  "folder_id": "uuid-or-null",
  "folder_name": "string",
  "reason": "one sentence explaining the folder choice, based on what the image actually shows",
  "is_form": boolean,
  "form_schema": null or {
    "title": "string",
    "description": "one sentence",
    "fields": [{ "id": "snake_case_id", "type": "text|textarea|select|multiselect|boolean|date|number|email|phone|section", "label": "string", "required": boolean, "options": ["only for select/multiselect"], "placeholder": "string" }]
  }
}

Only set is_form=true and include form_schema if this is genuinely a blank form with fillable fields. If it's a completed/filled-out document, an ID, a receipt, a photo of a person or place, or anything else, set is_form=false and form_schema=null.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    let raw = content.text.trim();
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(raw) as Partial<AnalyzeResult>;

    const match = folders.find(
      (f) => f.id === parsed.folder_id || f.name.toLowerCase() === (parsed.folder_name ?? "").toLowerCase()
    );

    const result: AnalyzeResult = {
      folder_id: match?.id ?? null,
      folder_name: match?.name ?? parsed.folder_name ?? "Unorganized",
      reason: parsed.reason ?? "Filed based on its contents.",
      is_form: parsed.is_form ?? false,
      form_schema: parsed.is_form ? parsed.form_schema ?? null : null,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai/analyze-document] failed:", message);
    return NextResponse.json({ error: `Failed to analyze document: ${message}` }, { status: 500 });
  }
}
