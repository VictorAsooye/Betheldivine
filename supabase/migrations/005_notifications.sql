-- ============================================================
-- Bethel Divine Healthcare Services — Phase 5 Notifications
-- Migration: 005_notifications.sql
-- ============================================================

CREATE TYPE notification_type_enum AS ENUM ('info', 'success', 'warning', 'error');

-- ──────────────────────────────────────────────
-- IN-APP NOTIFICATIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  type        notification_type_enum NOT NULL DEFAULT 'info',
  read        boolean NOT NULL DEFAULT false,
  link        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, read) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Service role handles inserts (bypasses RLS)

-- ──────────────────────────────────────────────
-- PUSH SUBSCRIPTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY "push_select_own" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_delete_own" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Service role handles sends (bypasses RLS)
