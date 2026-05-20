-- Add company branding table
create table if not exists company_branding (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references profiles(id) on delete cascade,
  company_name text,
  tagline text,
  address text,
  email text,
  logo_storage_path text,
  brand_color text default '#0D1B2A',
  updated_at timestamptz default now()
);
alter table company_branding enable row level security;
create policy "Owner can manage branding" on company_branding
  for all using (org_id = auth.uid());

-- Add renewal tracking to licenses
alter table licenses add column if not exists renewal_status text default 'none';
alter table licenses add column if not exists renewal_started_at timestamptz;

-- License acknowledgments
create table if not exists license_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references licenses(id) on delete cascade,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz default now()
);
alter table license_acknowledgments enable row level security;
create policy "Users manage own acknowledgments" on license_acknowledgments
  for all using (acknowledged_by = auth.uid());

-- Onboarding flag
alter table profiles add column if not exists onboarding_complete boolean default false;
