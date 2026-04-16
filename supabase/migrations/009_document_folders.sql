-- Migration: 009_document_folders.sql
-- Document folders/libraries

CREATE TABLE document_folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Add folder reference to documents
ALTER TABLE documents ADD COLUMN folder_id uuid REFERENCES document_folders(id) ON DELETE SET NULL;

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Admins and owners see all folders
CREATE POLICY "folders_select_admin_owner" ON document_folders
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Others see folders that contain at least one of their documents
CREATE POLICY "folders_select_own" ON document_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.folder_id = document_folders.id
        AND documents.uploader_id = auth.uid()
    )
  );

-- Admins and owners can create/update/delete folders
CREATE POLICY "folders_write_admin_owner" ON document_folders
  FOR ALL USING (get_my_role() IN ('admin', 'owner'));

CREATE INDEX IF NOT EXISTS documents_folder_id_idx ON documents(folder_id);
CREATE INDEX IF NOT EXISTS document_folders_created_by_idx ON document_folders(created_by);
