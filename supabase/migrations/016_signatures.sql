-- Digital signatures — one active signature per profile, reusable across
-- onboarding, forms, and documents. Generic by design (no Bethel-specific
-- fields) so it can be reused for other companies on this platform.

CREATE TABLE IF NOT EXISTS signatures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('typed', 'drawn')),
  value       text NOT NULL, -- typed: the name text; drawn: base64 PNG data URI
  font_id     text,          -- preset font identifier, typed signatures only
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX signatures_profile_active_idx ON signatures (profile_id, is_active);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- A profile can only ever see/manage its own signatures.
CREATE POLICY "signatures_select_own" ON signatures
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "signatures_insert_own" ON signatures
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "signatures_update_own" ON signatures
  FOR UPDATE USING (profile_id = auth.uid());

-- Lets a user dismiss the "add your signature" dashboard prompt without
-- creating one.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature_prompt_dismissed_at timestamptz;
