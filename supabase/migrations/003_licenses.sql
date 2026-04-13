-- ============================================================
-- Bethel Divine Healthcare Services — License Tracker
-- Migration: 003_licenses.sql
-- ============================================================

CREATE TYPE holder_type AS ENUM ('employee', 'organization');
CREATE TYPE license_status AS ENUM ('active', 'expiring_soon', 'expired');
CREATE TYPE notification_type AS ENUM ('90_days', '60_days', '30_days', '14_days', 'expired');

CREATE TABLE licenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  holder_type       holder_type NOT NULL DEFAULT 'employee',
  license_name      text NOT NULL,
  license_number    text NOT NULL DEFAULT '',
  issuing_authority text NOT NULL DEFAULT '',
  issued_date       date,
  expiry_date       date NOT NULL,
  status            license_status NOT NULL DEFAULT 'active',
  document_url      text,
  notes             text,
  created_by        uuid NOT NULL REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE license_notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id        uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  notify_user_id    uuid NOT NULL REFERENCES profiles(id),
  notified_at       timestamptz NOT NULL DEFAULT now(),
  notification_type notification_type NOT NULL
);

-- ── Function: recalculate license statuses ────────────────
CREATE OR REPLACE FUNCTION recalculate_license_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE licenses
  SET status = CASE
    WHEN expiry_date < CURRENT_DATE THEN 'expired'::license_status
    WHEN expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'expiring_soon'::license_status
    ELSE 'active'::license_status
  END;
END;
$$;

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_notifications ENABLE ROW LEVEL SECURITY;

-- Admin and owner can see all licenses
CREATE POLICY "licenses_select_admin_owner" ON licenses
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees can see their own licenses
CREATE POLICY "licenses_select_employee" ON licenses
  FOR SELECT USING (
    get_my_role() = 'employee' AND holder_id = auth.uid()
  );

-- Admin and owner can insert licenses
CREATE POLICY "licenses_insert" ON licenses
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'owner'));

-- Admin and owner can update licenses
CREATE POLICY "licenses_update" ON licenses
  FOR UPDATE USING (get_my_role() IN ('admin', 'owner'));

-- Admin and owner can delete licenses
CREATE POLICY "licenses_delete" ON licenses
  FOR DELETE USING (get_my_role() IN ('admin', 'owner'));

-- Only admin/owner can see notifications
CREATE POLICY "license_notifications_select" ON license_notifications
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

CREATE POLICY "license_notifications_insert" ON license_notifications
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'owner'));
