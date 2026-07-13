-- Allow form submission data to be embedded for RAG, so Sola can answer
-- questions using actual submitted values, not just knowledge that a form exists.
ALTER TABLE document_embeddings DROP CONSTRAINT document_embeddings_source_type_check;
ALTER TABLE document_embeddings ADD CONSTRAINT document_embeddings_source_type_check
  CHECK (source_type IN ('document', 'form', 'license', 'submission'));
