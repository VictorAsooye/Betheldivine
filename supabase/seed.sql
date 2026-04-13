-- ============================================================
-- Bethel Divine Healthcare Services — Seed Data
-- Run after all migrations are applied
-- ============================================================

-- NOTE: Auth users must be created via Supabase Auth API or Dashboard.
-- These UUIDs are placeholders — replace with real auth.users UUIDs
-- after creating the users in Supabase Auth.
--
-- Suggested test accounts to create in Supabase Auth Dashboard:
--   victor@betheldivine.com   (admin)
--   dr.asooye@betheldivine.com (owner)
--   emily.johnson@example.com  (employee)
--   marcus.lee@example.com     (employee)
--   alice.smith@example.com    (client)
--   robert.jones@example.com   (client)

-- ─────────────────────────────────────────────
-- Seed variables (adjust UUIDs after auth setup)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  v_admin_id     uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_owner_id     uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_emp1_id      uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  v_emp2_id      uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
  v_client1_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000005';
  v_client2_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000006';
  v_shift1_id    uuid;
  v_shift2_id    uuid;
  v_shift3_id    uuid;
  v_shift4_id    uuid;
  v_emp1_rec_id  uuid;
  v_emp2_rec_id  uuid;
  v_client1_rec_id uuid;
  v_client2_rec_id uuid;
BEGIN

-- ─────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────
INSERT INTO profiles (id, full_name, email, role, is_active, certifications)
VALUES
  (v_admin_id,   'Victor Asooye',      'victor@betheldivine.com',        'admin',    true, ARRAY[]::text[]),
  (v_owner_id,   'Dr. Asooye',         'dr.asooye@betheldivine.com',     'owner',    true, ARRAY[]::text[]),
  (v_emp1_id,    'Emily Johnson',      'emily.johnson@example.com',      'employee', true, ARRAY['CNA', 'CPR/AED']),
  (v_emp2_id,    'Marcus Lee',         'marcus.lee@example.com',         'employee', true, ARRAY['HHA', 'CPR/AED']),
  (v_client1_id, 'Alice Smith',        'alice.smith@example.com',        'client',   true, ARRAY[]::text[]),
  (v_client2_id, 'Robert Jones',       'robert.jones@example.com',       'client',   true, ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  certifications = EXCLUDED.certifications;

-- ─────────────────────────────────────────────
-- Employees
-- ─────────────────────────────────────────────
INSERT INTO employees (profile_id, hire_date, hourly_rate, emergency_contact, address, status)
VALUES
  (v_emp1_id, '2023-03-15', 22.50, '{"name":"Jane Johnson","phone":"410-555-0111","relation":"Sister"}', '1400 Liberty Rd, Baltimore, MD 21215', 'active'),
  (v_emp2_id, '2023-08-01', 20.00, '{"name":"Sandra Lee","phone":"410-555-0222","relation":"Mother"}',  '800 Reisterstown Rd, Baltimore, MD 21208', 'active')
ON CONFLICT (profile_id) DO NOTHING
RETURNING id INTO v_emp1_rec_id;

-- get IDs for use below
SELECT id INTO v_emp1_rec_id FROM employees WHERE profile_id = v_emp1_id;
SELECT id INTO v_emp2_rec_id FROM employees WHERE profile_id = v_emp2_id;

-- ─────────────────────────────────────────────
-- Clients
-- ─────────────────────────────────────────────
INSERT INTO clients (profile_id, date_of_birth, address, emergency_contact, medicaid_number, plan_of_care, status)
VALUES
  (v_client1_id, '1945-06-12', '3200 N Charles St, Baltimore, MD 21218',
   '{"name":"Tom Smith","phone":"410-555-0333","relation":"Son"}',
   'MD123456789', '{"hours_per_week":20,"services":["Personal Care","Medication Management"]}', 'active'),
  (v_client2_id, '1938-11-30', '5500 Harford Rd, Baltimore, MD 21214',
   '{"name":"Lisa Jones","phone":"410-555-0444","relation":"Daughter"}',
   'MD987654321', '{"hours_per_week":15,"services":["Personal Care","Companionship"]}', 'active')
ON CONFLICT (profile_id) DO NOTHING;

SELECT id INTO v_client1_rec_id FROM clients WHERE profile_id = v_client1_id;
SELECT id INTO v_client2_rec_id FROM clients WHERE profile_id = v_client2_id;

-- ─────────────────────────────────────────────
-- Shifts (completed, last 7 days)
-- ─────────────────────────────────────────────
INSERT INTO shifts (employee_id, client_id, scheduled_start, scheduled_end, clock_in, clock_out, status, evv_verified, notes)
VALUES
  (v_emp1_id, v_client1_id,
   now() - interval '5 days' + interval '8 hours',
   now() - interval '5 days' + interval '12 hours',
   now() - interval '5 days' + interval '8 hours 2 minutes',
   now() - interval '5 days' + interval '12 hours 5 minutes',
   'completed', true, 'Morning personal care visit.')
RETURNING id INTO v_shift1_id;

INSERT INTO shifts (employee_id, client_id, scheduled_start, scheduled_end, clock_in, clock_out, status, evv_verified, notes)
VALUES
  (v_emp1_id, v_client1_id,
   now() - interval '3 days' + interval '8 hours',
   now() - interval '3 days' + interval '12 hours',
   now() - interval '3 days' + interval '8 hours 1 minute',
   now() - interval '3 days' + interval '12 hours 3 minutes',
   'completed', true, 'Morning personal care visit.')
RETURNING id INTO v_shift2_id;

INSERT INTO shifts (employee_id, client_id, scheduled_start, scheduled_end, clock_in, clock_out, status, evv_verified, notes)
VALUES
  (v_emp2_id, v_client2_id,
   now() - interval '4 days' + interval '14 hours',
   now() - interval '4 days' + interval '18 hours',
   now() - interval '4 days' + interval '14 hours 3 minutes',
   now() - interval '4 days' + interval '18 hours 1 minute',
   'completed', true, 'Afternoon companionship and meal prep.')
RETURNING id INTO v_shift3_id;

-- One missed shift for compliance data
INSERT INTO shifts (employee_id, client_id, scheduled_start, scheduled_end, status, evv_verified)
VALUES
  (v_emp2_id, v_client2_id,
   now() - interval '6 days' + interval '9 hours',
   now() - interval '6 days' + interval '13 hours',
   'missed', false)
RETURNING id INTO v_shift4_id;

-- ─────────────────────────────────────────────
-- Clock events for completed shifts
-- ─────────────────────────────────────────────
INSERT INTO clock_events (shift_id, employee_id, event_type, latitude, longitude, accuracy, created_at)
VALUES
  (v_shift1_id, v_emp1_id, 'clock_in',  39.3499, -76.6205, 5.2, now() - interval '5 days' + interval '8 hours 2 minutes'),
  (v_shift1_id, v_emp1_id, 'clock_out', 39.3499, -76.6205, 6.1, now() - interval '5 days' + interval '12 hours 5 minutes'),
  (v_shift2_id, v_emp1_id, 'clock_in',  39.3499, -76.6205, 4.8, now() - interval '3 days' + interval '8 hours 1 minute'),
  (v_shift2_id, v_emp1_id, 'clock_out', 39.3499, -76.6205, 5.5, now() - interval '3 days' + interval '12 hours 3 minutes'),
  (v_shift3_id, v_emp2_id, 'clock_in',  39.3651, -76.5983, 7.0, now() - interval '4 days' + interval '14 hours 3 minutes'),
  (v_shift3_id, v_emp2_id, 'clock_out', 39.3651, -76.5983, 6.3, now() - interval '4 days' + interval '18 hours 1 minute');

-- ─────────────────────────────────────────────
-- Medication logs
-- ─────────────────────────────────────────────
INSERT INTO medication_logs (shift_id, employee_id, client_id, medication_name, dosage, administered_at, status, notes)
VALUES
  (v_shift1_id, v_emp1_id, v_client1_id, 'Lisinopril 10mg',   '1 tablet', now() - interval '5 days' + interval '9 hours', 'administered', 'Given with breakfast.'),
  (v_shift1_id, v_emp1_id, v_client1_id, 'Metformin 500mg',   '1 tablet', now() - interval '5 days' + interval '9 hours 5 minutes', 'administered', 'Given with breakfast.'),
  (v_shift2_id, v_emp1_id, v_client1_id, 'Lisinopril 10mg',   '1 tablet', now() - interval '3 days' + interval '9 hours', 'administered', NULL),
  (v_shift3_id, v_emp2_id, v_client2_id, 'Amlodipine 5mg',    '1 tablet', now() - interval '4 days' + interval '15 hours', 'administered', NULL);

-- ─────────────────────────────────────────────
-- Licenses — including one expiring in ~45 days
-- ─────────────────────────────────────────────
INSERT INTO licenses (holder_id, holder_type, license_name, license_number, issuing_authority, issued_date, expiry_date, status, notes, created_by)
VALUES
  -- Active CNA license
  (v_emp1_id, 'employee', 'Certified Nursing Assistant (CNA)', 'MD-CNA-2021-004521',
   'Maryland Board of Nursing', '2021-06-01', (now() + interval '2 years')::date, 'active',
   NULL, v_admin_id),
  -- Active HHA license
  (v_emp2_id, 'employee', 'Home Health Aide (HHA)', 'MD-HHA-2022-007833',
   'Maryland Board of Nursing', '2022-01-15', (now() + interval '18 months')::date, 'active',
   NULL, v_admin_id),
  -- CPR/AED expiring in ~45 days
  (v_emp1_id, 'employee', 'CPR/AED Certification', 'AHA-2022-EMJ-9901',
   'American Heart Association', '2022-05-01', (now() + interval '45 days')::date, 'expiring_soon',
   'Renewal class scheduled for next month.', v_admin_id),
  -- Agency operating license
  (v_admin_id, 'agency', 'Home Health Agency License', 'R4205',
   'Maryland OHCQ', '2020-01-01', (now() + interval '8 months')::date, 'active',
   'Maryland OHCQ annual renewal.', v_admin_id);

-- ─────────────────────────────────────────────
-- Time off request
-- ─────────────────────────────────────────────
INSERT INTO time_off_requests (employee_id, start_date, end_date, reason, status)
VALUES
  (v_emp1_id, (now() + interval '3 weeks')::date, (now() + interval '3 weeks' + interval '4 days')::date,
   'Family vacation — already arranged coverage.', 'pending');

-- ─────────────────────────────────────────────
-- In-app notifications
-- ─────────────────────────────────────────────
INSERT INTO notifications (user_id, title, message, type, read, link)
VALUES
  (v_admin_id, 'Welcome to Bethel Divine Portal',
   'Your admin account is active. Explore the dashboard to manage staff, clients, and operations.',
   'success', false, '/admin'),
  (v_emp1_id, 'Your shift is scheduled',
   'You have a shift with Alice Smith tomorrow morning at 8:00 AM.',
   'info', false, '/employee/schedule'),
  (v_emp1_id, 'CPR certification expiring soon',
   'Your CPR/AED certification expires in 45 days. Please schedule a renewal.',
   'warning', false, '/employee/licenses');

-- ─────────────────────────────────────────────
-- Audit log entries
-- ─────────────────────────────────────────────
INSERT INTO audit_logs (actor_id, action, target_table, target_id, metadata)
VALUES
  (v_admin_id, 'USER_CREATED', 'profiles', v_emp1_id::text, '{"role":"employee","name":"Emily Johnson"}'),
  (v_admin_id, 'USER_CREATED', 'profiles', v_emp2_id::text, '{"role":"employee","name":"Marcus Lee"}'),
  (v_admin_id, 'USER_CREATED', 'profiles', v_client1_id::text, '{"role":"client","name":"Alice Smith"}'),
  (v_admin_id, 'USER_CREATED', 'profiles', v_client2_id::text, '{"role":"client","name":"Robert Jones"}');

END $$;
