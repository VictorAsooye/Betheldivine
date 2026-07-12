-- RAG embeddings store for Sola Support "ask me anything" chat.
-- Single-tenant scope (no company_id — matches the rest of the schema today).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('document', 'form', 'license')),
  source_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(1024),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX document_embeddings_vector_idx ON document_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX document_embeddings_source_idx ON document_embeddings (source_type, source_id);

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Chat is admin/owner only for v1 (they're the only roles with full
-- visibility across documents, forms, and licenses today).
CREATE POLICY "document_embeddings_admin_owner_full_access" ON document_embeddings
  FOR ALL USING (get_my_role() IN ('admin', 'owner'));

-- Vector similarity search. Called via supabase.rpc() using the caller's
-- session, so the RLS policy above still applies to the underlying query.
CREATE FUNCTION match_document_embeddings(
  query_embedding vector(1024),
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT id, source_type, source_id, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
