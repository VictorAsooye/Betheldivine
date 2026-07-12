import { createClient as createServiceClient } from "@supabase/supabase-js";
import { embedDocument } from "@/lib/voyage";

export type EmbeddingSourceType = "document" | "form" | "license";

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
