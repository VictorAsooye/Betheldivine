import { createClient as createServiceClient } from "@supabase/supabase-js";
import { embedDocument } from "@/lib/voyage";
import type { FormField } from "@/components/FormRenderer";

export type EmbeddingSourceType = "document" | "form" | "license" | "submission";

const CHUNK_CHARS = 3000; // ~750 tokens

function chunkText(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  for (let i = 0; i < trimmed.length; i += CHUNK_CHARS) {
    chunks.push(trimmed.slice(i, i + CHUNK_CHARS));
  }
  return chunks;
}

// Re-embeds a source: deletes any existing chunks for it, chunks the new
// content, and stores fresh embeddings. No-ops if VOYAGE_API_KEY isn't set.
export async function embedAndStore(
  sourceType: EmbeddingSourceType,
  sourceId: string,
  content: string,
  ownerId?: string | null
): Promise<void> {
  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  const vectors = await embedDocument(chunks);
  if (!vectors) {
    console.warn("[embeddings] skipped — VOYAGE_API_KEY not set");
    return;
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await service
    .from("document_embeddings")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  const rows = chunks.map((chunk, i) => ({
    source_type: sourceType,
    source_id: sourceId,
    owner_id: ownerId ?? null,
    content: chunk,
    // pgvector's input function expects text like "[1,2,3]" — PostgREST
    // sends a JS array as JSON, which the vector type can't cast directly.
    embedding: `[${vectors[i].join(",")}]`,
  }));

  const { error } = await service.from("document_embeddings").insert(rows);
  if (error) {
    console.error("[embeddings] failed to store", sourceType, sourceId, error.message);
  }
}

// Formats a submission's answers as readable text for embedding, so Sola can
// answer questions using the actual values a client/employee submitted.
export function submissionEmbedContent(
  formName: string,
  fields: FormField[],
  data: Record<string, unknown>,
  submitterName?: string | null
): string {
  const lines: string[] = [`Form: ${formName}`];
  if (submitterName) lines.push(`Submitted by: ${submitterName}`);

  for (const field of fields) {
    if (field.type === "section") continue;
    const value = data[field.id];
    if (value === undefined || value === null || value === "") continue;

    let formatted: string;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      formatted = value.join(", ");
    } else if (typeof value === "boolean") {
      formatted = value ? "Yes" : "No";
    } else {
      formatted = String(value);
    }
    lines.push(`${field.label}: ${formatted}`);
  }

  return lines.join("\n");
}

// Formats a static (hardcoded, non-dynamic) form submission's raw data as
// readable text for embedding — used for forms like the Client Care Plan
// that predate the dynamic forms/schema system and have no FormField[] to
// look up labels from, only raw snake_case keys.
export function staticFormEmbedContent(
  formLabel: string,
  data: Record<string, unknown>,
  submitterName?: string | null
): string {
  const lines: string[] = [`Form: ${formLabel}`];
  if (submitterName) lines.push(`Submitted by: ${submitterName}`);

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") continue;

    let formatted: string;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      formatted = value.join(", ");
    } else if (typeof value === "boolean") {
      formatted = value ? "Yes" : "No";
    } else if (typeof value === "object") {
      formatted = JSON.stringify(value);
    } else {
      formatted = String(value);
    }
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`${label}: ${formatted}`);
  }

  return lines.join("\n");
}

export async function deleteEmbeddings(sourceType: EmbeddingSourceType, sourceId: string): Promise<void> {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await service
    .from("document_embeddings")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
}
