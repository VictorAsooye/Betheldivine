-- ============================================================
-- Migration: 011_care_plan_documents.sql
-- Care Plans document library — storage bucket + metadata table
-- + RLS policies mirroring the get_my_role() pattern used
-- throughout this codebase (see 001_initial_schema.sql)
-- ============================================================


-- ──────────────────────────────────────────────
-- STORAGE BUCKET
-- Create the private "care-plans" bucket.
-- All access is via server-generated signed URLs only.
-- The bucket is private (public = false).
-- ──────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'care-plans',
  'care-plans',
  false,                          -- private: no public URLs
  10485760,                       -- 10 MB per file limit
  ARRAY['application/pdf']        -- only PDFs allowed
)
ON CONFLICT (id) DO NOTHING;     -- idempotent: safe to re-run


-- ──────────────────────────────────────────────
-- STORAGE RLS POLICIES (on storage.objects)
-- Mirrors the get_my_role() pattern from 001_initial_schema.sql.
-- INSERT/UPDATE/DELETE are service-role-only (no policy = only
-- the service role key can write, which is what the submission
-- handler uses).
-- ──────────────────────────────────────────────

-- Owner, Admin, Employee can read any object in this bucket.
-- Client and Pending are explicitly excluded (no matching policy = denied).
CREATE POLICY "care_plans_storage_select_staff"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'care-plans'
    AND get_my_role() IN ('owner', 'admin', 'employee')
  );


-- ──────────────────────────────────────────────
-- CARE PLAN DOCUMENTS TABLE
-- Metadata record for every PDF archived to storage.
-- One row per care plan submission that successfully uploaded.
--
-- client_id is nullable: the care plan form captures client
-- full_name as free text, not a UUID reference. It can be
-- populated manually or via a future backfill if clients are
-- matched by name.
-- ──────────────────────────────────────────────

CREATE TABLE care_plan_documents (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link back to the originating form submission
  care_plan_submission_id   uuid
    REFERENCES static_form_submissions(id) ON DELETE SET NULL,

  -- Optional link to a client record (NULL if unmatched)
  client_id                 uuid
    REFERENCES clients(id) ON DELETE SET NULL,

  -- Storage path inside the care-plans bucket
  -- Format: {submitted_by_user_id}/{filename}
  storage_path              text NOT NULL,

  -- Standardized filename shown to users in the library
  -- Format: bethel-care-plan_{last}_{first}_{YYYY-MM-DD}_{id-short}.pdf
  filename                  text NOT NULL,

  -- PDF size in bytes (captured from Buffer.length after generation)
  file_size_bytes           integer,

  -- Who submitted the care plan (matches static_form_submissions.submitted_by)
  submitted_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- When the care plan was submitted (captured at submission time)
  submitted_at              timestamptz NOT NULL DEFAULT now(),

  created_at                timestamptz NOT NULL DEFAULT now()
);


-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────

-- Primary query patterns: list all plans, filter by client
CREATE INDEX care_plan_docs_submitted_at_idx
  ON care_plan_documents (submitted_at DESC);

CREATE INDEX care_plan_docs_client_id_idx
  ON care_plan_documents (client_id);

CREATE INDEX care_plan_docs_submitted_by_idx
  ON care_plan_documents (submitted_by);

CREATE INDEX care_plan_docs_submission_id_idx
  ON care_plan_documents (care_plan_submission_id);


-- ──────────────────────────────────────────────
-- TABLE RLS
-- Mirrors the get_my_role() pattern used in 001_initial_schema.sql.
-- Writes are service-role-only (the submission handler uses the
-- service role key, so no INSERT policy is needed for authenticated
-- users — the service role bypasses RLS entirely).
-- ──────────────────────────────────────────────

ALTER TABLE care_plan_documents ENABLE ROW LEVEL SECURITY;

-- Owner, Admin, Employee: read all care plan documents
CREATE POLICY "care_plan_docs_select_staff"
  ON care_plan_documents
  FOR SELECT
  USING (get_my_role() IN ('owner', 'admin', 'employee'));

-- No INSERT policy for authenticated users: service role only writes.
-- No UPDATE policy: records are immutable once created.
-- No DELETE policy: service role only can delete (orphan cleanup).
