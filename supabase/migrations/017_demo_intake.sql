-- Demo-intake questionnaire — collects what's needed to build a custom
-- demo site for a prospective new company. Public-facing (no login), so
-- rows are only ever written by the service role from the API route; RLS
-- has no policies at all, meaning the anon/authenticated keys can neither
-- read nor write this table.

CREATE TABLE IF NOT EXISTS demo_intake_submissions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name            text NOT NULL,
  industry                text,
  city_state              text,
  team_size               text,
  contact_name            text NOT NULL,
  contact_email           text NOT NULL,
  contact_phone           text,
  contact_role            text,
  pain_points             text[] DEFAULT '{}',
  pain_point_details      text,
  sample_form_description text,
  brand_color             text,
  tagline                 text,
  timeline                text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE demo_intake_submissions ENABLE ROW LEVEL SECURITY;
-- No policies — only the service role (used by the API route) can access this table.
