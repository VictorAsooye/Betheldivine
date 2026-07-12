import Anthropic from "@anthropic-ai/sdk";

const EXTRACTION_PROMPT = "Extract all text from this document verbatim. Return only the extracted text — no commentary, no markdown formatting.";

// Extracts text from a PDF or image so it can be chunked and embedded for
// RAG retrieval. Returns null for unsupported types or if AI isn't
// configured — the caller falls back to filename/description metadata.
export async function extractText(
  fileBytes: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-your_anthropic_api_key") return null;

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) return null;

  const base64 = Buffer.from(fileBytes).toString("base64");
  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document" as const,
                  source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
                }
              : {
                  type: "image" as const,
                  source: { type: "base64" as const, media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 },
                },
            { type: "text" as const, text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;
    return content.text.trim() || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract-text] failed:", message);
    return null;
  }
}
