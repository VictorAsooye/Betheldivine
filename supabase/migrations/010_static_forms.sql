create table if not exists static_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  data jsonb not null default '{}',
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on static_form_submissions (form_type, created_at desc);
create index on static_form_submissions (submitted_by);

alter table static_form_submissions enable row level security;

create policy "admins_owners_full" on static_form_submissions
  for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

create policy "employees_insert" on static_form_submissions
  for insert with check (submitted_by = auth.uid());

create policy "employees_select_own" on static_form_submissions
  for select using (submitted_by = auth.uid());
