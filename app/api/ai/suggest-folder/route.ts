import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const SYSTEM_PROMPT =
  "You are Sola AI, an assistant built into the Sola portal for home health agencies. Be concise and precise. You classify documents into folders for a home health agency.";

interface FolderOption {
  id: string;
  name: string;
}

interface SuggestBody {
  fileName?: string;
  fileContentPreview?: string;
  availableFolders?: FolderOption[];
}

interface SuggestResult {
  folder_id: string | null;
  folder_name: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-your_anthropic_api_key") {
    return NextResponse.json(
      { error: "AI features are not configured." },
      { status: 503 }
    );
  }

  let body: SuggestBody;
  try {
    body = (await request.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fileName = body.fileName ?? "";
  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  const folders = Array.isArray(body.availableFolders) ? body.availableFolders : [];
  const folderNames = folders.map((f) => f.name).join(", ") || "none";
  const preview = body.fileContentPreview;

  const userPrompt = `Folders available: ${folderNames}. File name: ${fileName}. File content preview: ${
    preview || "not available"
  }. Which folder best fits this file? Return ONLY valid JSON: {"folder_id": "uuid-or-null", "folder_name": "string", "reason": "one sentence"}`;

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    let raw = content.text.trim();
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    const parsed = JSON.parse(raw) as SuggestResult;

    // Reconcile folder_name with available folders so the UI gets a real id.
    const match = folders.find(
      (f) =>
        f.id === parsed.folder_id ||
        f.name.toLowerCase() === (parsed.folder_name ?? "").toLowerCase()
    );

    const result: SuggestResult = {
      folder_id: match?.id ?? null,
      folder_name: match?.name ?? parsed.folder_name ?? "Unorganized",
      reason: parsed.reason ?? "Best match based on the file name.",
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai/suggest-folder] failed:", message);
    return NextResponse.json(
      { error: `Failed to suggest folder: ${message}` },
      { status: 500 }
    );
  }
}
