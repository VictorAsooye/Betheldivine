-- Scope Sola Support retrieval to individual employees so the chat-first
-- homepage can safely extend beyond admin/owner. NULL owner_id = org-wide
-- content (forms), non-null = the uploader/holder of a document or license.

ALTER TABLE document_embeddings ADD COLUMN owner_id uuid;

CREATE INDEX document_embeddings_owner_idx ON document_embeddings (owner_id);

DROP POLICY "document_embeddings_admin_owner_full_access" ON document_embeddings;

CREATE POLICY "document_embeddings_role_scoped_access" ON document_embeddings
  FOR ALL USING (
    get_my_role() IN ('admin', 'owner')
    OR owner_id = auth.uid()
    OR owner_id IS NULL
  );
