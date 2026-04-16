-- Migration: 008_documents.sql
-- Document uploads table + Supabase Storage bucket policy

CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  file_path     text NOT NULL,   -- storage path: documents/{uploader_id}/{uuid}-{filename}
  file_size     bigint,          -- bytes
  mime_type     text,
  category      text,            -- e.g. "Employee Form", "Client Record", "Compliance", "Other"
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admins and owners see all documents
CREATE POLICY "documents_select_admin_owner" ON documents
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees and clients see their own uploads
CREATE POLICY "documents_select_own" ON documents
  FOR SELECT USING (uploader_id = auth.uid());

-- Any authenticated user can upload
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (uploader_id = auth.uid());

-- Uploader can delete their own; admin/owner can delete any
CREATE POLICY "documents_delete_own" ON documents
  FOR DELETE USING (uploader_id = auth.uid() OR get_my_role() IN ('admin', 'owner'));

-- Index
CREATE INDEX IF NOT EXISTS documents_uploader_id_idx ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);
