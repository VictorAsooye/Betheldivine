import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const SYSTEM_PROMPT =
  "You are Sola AI, an assistant built into the Sola portal for home health agencies. Be concise and precise. You are a license document reader for a home health agency.";

type AllowedMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_MIMES: AllowedMime[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ScanBody {
  imageBase64?: string;
  mimeType?: string;
}

interface LicenseFields {
  license_name: string;
  license_number: string;
  issuing_authority: string;
  expiry_date: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    return NextResponse.json({ error: "AI features are not configured." }, { status: 503 });
  }

  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const imageBase64 = body.imageBase64;
  const mimeType = body.mimeType;

  if (!imageBase64 || !mimeType) {
    return NextResponse.json(
      { error: "imageBase64 and mimeType are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIMES.includes(mimeType as AllowedMime)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP." },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as AllowedMime,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: 'Extract license details from this document. Return ONLY valid JSON: {"license_name": "string", "license_number": "string", "issuing_authority": "string", "expiry_date": "YYYY-MM-DD or null"}',
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    let raw = content.text.trim();
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    const parsed = JSON.parse(raw) as Partial<LicenseFields>;

    const result: LicenseFields = {
      license_name: parsed.license_name ?? "",
      license_number: parsed.license_number ?? "",
      issuing_authority: parsed.issuing_authority ?? "",
      expiry_date: parsed.expiry_date ?? null,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai/scan-license] failed:", message);
    return NextResponse.json(
      { error: `Failed to scan license: ${message}` },
      { status: 500 }
    );
  }
}
