-- ============================================================
-- Bethel Divine Healthcare Services — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ──────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('pending', 'admin', 'owner', 'employee', 'client');
CREATE TYPE shift_status AS ENUM ('scheduled', 'active', 'completed', 'missed');
CREATE TYPE time_off_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE clock_event_type AS ENUM ('clock_in', 'clock_out');
CREATE TYPE medication_status AS ENUM ('given', 'refused', 'missed');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE form_target_role AS ENUM ('employee', 'client', 'all');

-- ──────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ──────────────────────────────────────────────

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  role        user_role NOT NULL DEFAULT 'pending',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    'pending'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────
-- CLIENTS
-- ──────────────────────────────────────────────

CREATE TABLE clients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth       date,
  address             text,
  emergency_contact   jsonb DEFAULT '{}'::jsonb,
  assigned_employees  uuid[] DEFAULT '{}',
  insurance_info      jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- EMPLOYEES
-- ──────────────────────────────────────────────

CREATE TABLE employees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hire_date         date,
  position          text,
  certifications    jsonb DEFAULT '[]'::jsonb,
  assigned_clients  uuid[] DEFAULT '{}',
  hourly_rate       decimal(10, 2),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- SHIFTS
-- ──────────────────────────────────────────────

CREATE TABLE shifts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scheduled_start   timestamptz NOT NULL,
  scheduled_end     timestamptz NOT NULL,
  actual_start      timestamptz,
  actual_end        timestamptz,
  status            shift_status NOT NULL DEFAULT 'scheduled',
  evv_verified      boolean NOT NULL DEFAULT false,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- TIME OFF REQUESTS
-- ──────────────────────────────────────────────

CREATE TABLE time_off_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  reason        text,
  status        time_off_status NOT NULL DEFAULT 'pending',
  reviewed_by   uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- CLOCK EVENTS
-- ──────────────────────────────────────────────

CREATE TABLE clock_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type    clock_event_type NOT NULL,
  timestamp     timestamptz NOT NULL DEFAULT now(),
  location_lat  decimal(10, 8),
  location_lng  decimal(11, 8),
  ip_address    text,
  shift_id      uuid REFERENCES shifts(id)
);

-- ──────────────────────────────────────────────
-- MEDICATION LOGS
-- ──────────────────────────────────────────────

CREATE TABLE medication_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  employee_id      uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  medication_name  text NOT NULL,
  dosage           text,
  administered_at  timestamptz NOT NULL DEFAULT now(),
  notes            text,
  status           medication_status NOT NULL DEFAULT 'given'
);

-- ──────────────────────────────────────────────
-- PAYMENTS
-- ──────────────────────────────────────────────

CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stripe_payment_id   text,
  amount              decimal(10, 2) NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  quickbooks_synced   boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- FORMS
-- ──────────────────────────────────────────────

CREATE TABLE forms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  schema        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  target_role   form_target_role NOT NULL DEFAULT 'all',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- FORM SUBMISSIONS
-- ──────────────────────────────────────────────

CREATE TABLE form_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id       uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  submitted_by  uuid NOT NULL REFERENCES profiles(id),
  client_id     uuid REFERENCES clients(id),
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- AUDIT LOGS
-- ──────────────────────────────────────────────

CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid NOT NULL REFERENCES profiles(id),
  action        text NOT NULL,
  target_table  text NOT NULL,
  target_id     uuid NOT NULL,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── PROFILES ──────────────────────────────────

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin and owner can read all profiles
CREATE POLICY "profiles_select_admin_owner" ON profiles
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Users can update their own profile (limited fields only via app)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin can update any profile (role assignment)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_my_role() = 'admin');

-- ── CLIENTS ───────────────────────────────────

-- Admin and owner see all clients
CREATE POLICY "clients_select_admin_owner" ON clients
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees see only their assigned clients
CREATE POLICY "clients_select_employee" ON clients
  FOR SELECT USING (
    get_my_role() = 'employee' AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE profile_id = auth.uid()
        AND id = ANY(clients.assigned_employees)
    )
  );

-- Clients see only their own record
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (profile_id = auth.uid());

-- Admin and owner can insert/update/delete
CREATE POLICY "clients_write_admin_owner" ON clients
  FOR ALL USING (get_my_role() IN ('admin', 'owner'));

-- ── EMPLOYEES ─────────────────────────────────

-- Admin and owner see all employees
CREATE POLICY "employees_select_admin_owner" ON employees
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees see their own record
CREATE POLICY "employees_select_own" ON employees
  FOR SELECT USING (profile_id = auth.uid());

-- Admin and owner can write
CREATE POLICY "employees_write_admin_owner" ON employees
  FOR ALL USING (get_my_role() IN ('admin', 'owner'));

-- ── SHIFTS ────────────────────────────────────

-- Admin and owner see all shifts
CREATE POLICY "shifts_select_admin_owner" ON shifts
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees see their own shifts
CREATE POLICY "shifts_select_employee" ON shifts
  FOR SELECT USING (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = shifts.employee_id)
  );

-- Admin and owner write shifts
CREATE POLICY "shifts_write_admin_owner" ON shifts
  FOR ALL USING (get_my_role() IN ('admin', 'owner'));

-- Employees can update their own shifts (clock in/out)
CREATE POLICY "shifts_update_employee" ON shifts
  FOR UPDATE USING (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = shifts.employee_id)
  );

-- ── TIME OFF REQUESTS ─────────────────────────

-- Admin and owner see all
CREATE POLICY "time_off_select_admin_owner" ON time_off_requests
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees see their own
CREATE POLICY "time_off_select_employee" ON time_off_requests
  FOR SELECT USING (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = time_off_requests.employee_id)
  );

-- Employees can create requests
CREATE POLICY "time_off_insert_employee" ON time_off_requests
  FOR INSERT WITH CHECK (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = employee_id)
  );

-- Owner can update (approve/deny)
CREATE POLICY "time_off_update_owner" ON time_off_requests
  FOR UPDATE USING (get_my_role() IN ('admin', 'owner'));

-- ── CLOCK EVENTS ──────────────────────────────

-- Admin and owner see all
CREATE POLICY "clock_events_select_admin_owner" ON clock_events
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees see their own
CREATE POLICY "clock_events_select_employee" ON clock_events
  FOR SELECT USING (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = clock_events.employee_id)
  );

-- Employees can insert their own clock events
CREATE POLICY "clock_events_insert_employee" ON clock_events
  FOR INSERT WITH CHECK (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = employee_id)
  );

-- ── MEDICATION LOGS ───────────────────────────

-- Admin and owner see all
CREATE POLICY "medication_logs_select_admin_owner" ON medication_logs
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Employees see logs they created
CREATE POLICY "medication_logs_select_employee" ON medication_logs
  FOR SELECT USING (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = medication_logs.employee_id)
  );

-- Clients see their own logs
CREATE POLICY "medication_logs_select_client" ON medication_logs
  FOR SELECT USING (
    get_my_role() = 'client' AND
    EXISTS (SELECT 1 FROM clients WHERE profile_id = auth.uid() AND id = medication_logs.client_id)
  );

-- Employees can insert medication logs
CREATE POLICY "medication_logs_insert_employee" ON medication_logs
  FOR INSERT WITH CHECK (
    get_my_role() = 'employee' AND
    EXISTS (SELECT 1 FROM employees WHERE profile_id = auth.uid() AND id = employee_id)
  );

-- ── PAYMENTS ──────────────────────────────────

-- Admin and owner see all
CREATE POLICY "payments_select_admin_owner" ON payments
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Clients see their own payments
CREATE POLICY "payments_select_client" ON payments
  FOR SELECT USING (
    get_my_role() = 'client' AND
    EXISTS (SELECT 1 FROM clients WHERE profile_id = auth.uid() AND id = payments.client_id)
  );

-- Admin and owner write payments
CREATE POLICY "payments_write_admin_owner" ON payments
  FOR ALL USING (get_my_role() IN ('admin', 'owner'));

-- ── FORMS ─────────────────────────────────────

-- Admin sees all forms
CREATE POLICY "forms_select_admin" ON forms
  FOR SELECT USING (get_my_role() = 'admin');

-- Others see active forms targeted at their role
CREATE POLICY "forms_select_by_role" ON forms
  FOR SELECT USING (
    is_active = true AND (
      target_role = 'all' OR
      (target_role = 'employee' AND get_my_role() = 'employee') OR
      (target_role = 'client' AND get_my_role() = 'client')
    )
  );

-- Admin can write forms
CREATE POLICY "forms_write_admin" ON forms
  FOR ALL USING (get_my_role() = 'admin');

-- ── FORM SUBMISSIONS ──────────────────────────

-- Admin and owner see all
CREATE POLICY "form_submissions_select_admin_owner" ON form_submissions
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Users see their own submissions
CREATE POLICY "form_submissions_select_own" ON form_submissions
  FOR SELECT USING (submitted_by = auth.uid());

-- Authenticated users can submit forms
CREATE POLICY "form_submissions_insert" ON form_submissions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- ── AUDIT LOGS ────────────────────────────────

-- Only admin can read audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (get_my_role() = 'admin');

-- System can insert audit logs (via service role or trigger)
CREATE POLICY "audit_logs_insert_admin" ON audit_logs
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'owner', 'employee', 'client'));
