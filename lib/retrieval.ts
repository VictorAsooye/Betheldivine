import { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "@/lib/voyage";
import { EmbeddingSourceType } from "@/lib/embeddings";

export interface RetrievedChunk {
  id: string;
  source_type: EmbeddingSourceType;
  source_id: string;
  content: string;
  similarity: number;
}

// Embeds the question and runs vector similarity search via the
// match_document_embeddings RPC (RLS-scoped to the caller's session —
// admin/owner only, per the document_embeddings policy).
export async function retrieveContext(
  supabase: SupabaseClient,
  question: string
): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(question);
  if (!queryVector) return [];

  const { data, error } = await supabase.rpc("match_document_embeddings", {
    query_embedding: `[${queryVector.join(",")}]`,
    match_count: 8,
  });

  if (error) {
    console.error("[retrieval] match_document_embeddings failed:", error.message);
    return [];
  }

  return (data ?? []) as RetrievedChunk[];
}
