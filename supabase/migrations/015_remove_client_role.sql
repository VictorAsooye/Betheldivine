-- Remove the "client" role. Bethel Divine's portal is staff-only — no
-- client ever logs in themselves, so client-facing role/access is dropped
-- at every layer above the database (routes, registration, role dropdowns,
-- form target-role options).
--
-- Note on scope: this does NOT drop 'client' from the user_role /
-- form_target_role enum types themselves. get_my_role() RETURNS user_role,
-- and dropping/recreating that type would require dropping the function,
-- which in turn requires CASCADE-dropping every RLS policy across the
-- schema that calls it (dozens of policies) just to remove one now-unused
-- value. That's a large, hard-to-fully-verify blast radius for no real
-- gain, since the application layer already refuses to assign or accept
-- 'client' anywhere. Instead this migration removes every *policy* that
-- specifically branches on role = 'client', and reassigns any existing
-- client-role profile — the enum value itself is left present but
-- permanently unreachable through the app.

-- 1. Reassign any existing client-role profiles to 'pending' (only one
--    test profile had this role; safe, non-destructive — an admin can
--    assign it a real role from Users & Roles same as any new signup).
UPDATE profiles SET role = 'pending' WHERE role = 'client';

-- 2. Drop policies that branch on the client role — recreated below
--    without the client-only branch, or simply removed where the whole
--    policy only existed to serve client self-access.
DROP POLICY IF EXISTS "medication_logs_select_client" ON medication_logs;
DROP POLICY IF EXISTS "payments_select_client" ON payments;
DROP POLICY IF EXISTS "clients_select_own" ON clients;
DROP POLICY IF EXISTS "forms_select_by_role" ON forms;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON audit_logs;

CREATE POLICY "forms_select_by_role" ON forms
  FOR SELECT USING (
    is_active = true AND (
      target_role = 'all' OR
      (target_role = 'employee' AND get_my_role() = 'employee')
    )
  );

CREATE POLICY "audit_logs_insert_admin" ON audit_logs
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'owner', 'employee'));
