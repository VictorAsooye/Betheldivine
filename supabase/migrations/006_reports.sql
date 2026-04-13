-- ============================================================
-- Bethel Divine Healthcare Services — Phase 5 AI Reports
-- Migration: 006_reports.sql
-- ============================================================

CREATE TYPE report_type_enum AS ENUM ('operations', 'payment', 'compliance', 'employee');

CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          report_type_enum NOT NULL,
  content       text NOT NULL,
  generated_by  uuid NOT NULL REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reports_type_idx ON reports(type);
CREATE INDEX reports_generated_by_idx ON reports(generated_by);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Admin and owner can read reports
CREATE POLICY "reports_select_admin_owner" ON reports
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Admin and owner can generate (insert) reports
CREATE POLICY "reports_insert_admin_owner" ON reports
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'owner'));
