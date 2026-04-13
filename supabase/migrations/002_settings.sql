-- ============================================================
-- Bethel Divine Healthcare Services — Settings & Config
-- Migration: 002_settings.sql
-- ============================================================

CREATE TABLE system_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO system_settings (key, value) VALUES
  ('org_name',                '"Bethel Divine Healthcare Services LLC"'),
  ('org_address',             '""'),
  ('org_phone',               '""'),
  ('org_email',               '""'),
  ('evv_enabled',             'true'),
  ('require_geolocation',     'true'),
  ('shift_reminder_hours',    '"2"'),
  ('time_off_notice_days',    '"3"'),
  ('medication_alerts',       'true'),
  ('missed_shift_alerts',     'true');

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can read settings
CREATE POLICY "settings_select_admin" ON system_settings
  FOR SELECT USING (get_my_role() = 'admin');

-- Only admin can update settings
CREATE POLICY "settings_update_admin" ON system_settings
  FOR UPDATE USING (get_my_role() = 'admin');
