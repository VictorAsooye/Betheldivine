-- ============================================================
-- Bethel Divine Healthcare Services — Performance Indexes
-- Migration: 007_indexes.sql
-- ============================================================

-- profiles.role — heavily used in RLS policies and middleware
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- profiles.email — used for user lookups during client/employee creation
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- shifts — most queried table; all three columns used in filters and RLS
CREATE INDEX IF NOT EXISTS shifts_employee_id_idx ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS shifts_client_id_idx ON shifts(client_id);
CREATE INDEX IF NOT EXISTS shifts_status_idx ON shifts(status);
CREATE INDEX IF NOT EXISTS shifts_scheduled_start_idx ON shifts(scheduled_start);

-- clock_events — used for last-event lookup on clock in/out
CREATE INDEX IF NOT EXISTS clock_events_employee_id_idx ON clock_events(employee_id);
CREATE INDEX IF NOT EXISTS clock_events_shift_id_idx ON clock_events(shift_id);

-- payments — client balance queries and admin list
CREATE INDEX IF NOT EXISTS payments_client_id_idx ON payments(client_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_billing_month_idx ON payments(billing_month);

-- licenses — expiry scans run on every license list fetch
CREATE INDEX IF NOT EXISTS licenses_expiry_date_idx ON licenses(expiry_date);
CREATE INDEX IF NOT EXISTS licenses_holder_id_idx ON licenses(holder_id);
CREATE INDEX IF NOT EXISTS licenses_status_idx ON licenses(status);

-- notifications — already has user_id and (user_id, read) indexes from 005_notifications.sql
-- Add partial index on unread notifications for fast bell badge count
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id) WHERE read = false;

-- push_subscriptions — looked up on every push send
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- time_off_requests
CREATE INDEX IF NOT EXISTS time_off_requests_employee_id_idx ON time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS time_off_requests_status_idx ON time_off_requests(status);

-- medication_logs
CREATE INDEX IF NOT EXISTS medication_logs_client_id_idx ON medication_logs(client_id);
CREATE INDEX IF NOT EXISTS medication_logs_employee_id_idx ON medication_logs(employee_id);

-- audit_logs — admin queries by actor or action
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

-- employees — profile_id lookup used in nearly every employee route
CREATE INDEX IF NOT EXISTS employees_profile_id_idx ON employees(profile_id);

-- clients — profile_id lookup
CREATE INDEX IF NOT EXISTS clients_profile_id_idx ON clients(profile_id);

-- stripe_customers
CREATE INDEX IF NOT EXISTS stripe_customers_client_id_idx ON stripe_customers(client_id);

-- form_submissions
CREATE INDEX IF NOT EXISTS form_submissions_form_id_idx ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS form_submissions_submitted_by_idx ON form_submissions(submitted_by);
