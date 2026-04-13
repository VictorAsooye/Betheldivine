-- ============================================================
-- Bethel Divine Healthcare Services — Phase 4 Payments
-- Migration: 004_payments.sql
-- ============================================================

-- ──────────────────────────────────────────────
-- Add billing columns to existing payments table
-- ──────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_month text; -- "YYYY-MM"
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last_four text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_brand text;

-- ──────────────────────────────────────────────
-- STRIPE CUSTOMERS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_customers (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                 uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stripe_customer_id        text NOT NULL,
  stripe_payment_method_id  text,
  card_last_four            text,
  card_brand                text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_customers_profile_id_key ON stripe_customers(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS stripe_customers_stripe_id_key ON stripe_customers(stripe_customer_id);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Admin/owner can see all
CREATE POLICY "stripe_customers_select_admin_owner" ON stripe_customers
  FOR SELECT USING (get_my_role() IN ('admin', 'owner'));

-- Clients see their own
CREATE POLICY "stripe_customers_select_own" ON stripe_customers
  FOR SELECT USING (profile_id = auth.uid());

-- Service role handles inserts/updates via API routes (bypasses RLS)

-- ──────────────────────────────────────────────
-- QUICKBOOKS TOKENS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id       text NOT NULL UNIQUE,
  access_token   text NOT NULL,
  refresh_token  text NOT NULL,
  token_expiry   timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quickbooks_tokens ENABLE ROW LEVEL SECURITY;

-- Only admin can read/write QB tokens
CREATE POLICY "quickbooks_tokens_admin_only" ON quickbooks_tokens
  FOR ALL USING (get_my_role() = 'admin');

-- Auto-update updated_at
CREATE TRIGGER quickbooks_tokens_updated_at
  BEFORE UPDATE ON quickbooks_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
