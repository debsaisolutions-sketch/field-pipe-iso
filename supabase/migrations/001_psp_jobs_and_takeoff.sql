-- Mirror of pipesketchpro-site/supabase/migrations/001_psp_jobs_and_takeoff.sql
-- Apply once on the shared Supabase project (SQL Editor or CLI).

-- ── Jobs ─────────────────────────────────────────────────────────────────────
create table if not exists public.psp_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references auth.users (id) on delete set null,
  job_name text not null default '',
  customer_name text not null default '',
  job_location text not null default '',
  job_date date,
  notes text not null default '',
  pipe_size text not null default '2"',
  segments jsonb not null default '[]'::jsonb,
  fittings jsonb not null default '{}'::jsonb,
  calculator_state jsonb not null default '{}'::jsonb,
  drawing_settings jsonb not null default '{}'::jsonb,
  takeoff_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists psp_jobs_user_id_updated_at_idx
  on public.psp_jobs (user_id, updated_at desc);

create index if not exists psp_jobs_account_id_updated_at_idx
  on public.psp_jobs (account_id, updated_at desc);

create table if not exists public.psp_takeoff_standards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references auth.users (id) on delete set null,
  name text not null default 'My Standards',
  standards jsonb not null default '{}'::jsonb,
  is_account_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists psp_takeoff_standards_user_personal_uidx
  on public.psp_takeoff_standards (user_id)
  where account_id is null;

create index if not exists psp_takeoff_standards_account_id_idx
  on public.psp_takeoff_standards (account_id)
  where account_id is not null;

create or replace function public.psp_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists psp_jobs_set_updated_at on public.psp_jobs;
create trigger psp_jobs_set_updated_at
  before update on public.psp_jobs
  for each row execute function public.psp_set_updated_at();

drop trigger if exists psp_takeoff_standards_set_updated_at on public.psp_takeoff_standards;
create trigger psp_takeoff_standards_set_updated_at
  before update on public.psp_takeoff_standards
  for each row execute function public.psp_set_updated_at();

alter table public.profiles
  add column if not exists psp_plan text not null default 'pro';

comment on column public.profiles.psp_plan is
  'PipeSketch Pro plan key: solo | pro | team. Default pro preserves current subscriber access. Billing unchanged.';

alter table public.psp_jobs enable row level security;
alter table public.psp_takeoff_standards enable row level security;

drop policy if exists "psp_jobs_select_own" on public.psp_jobs;
create policy "psp_jobs_select_own"
  on public.psp_jobs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "psp_jobs_insert_own" on public.psp_jobs;
create policy "psp_jobs_insert_own"
  on public.psp_jobs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "psp_jobs_update_own" on public.psp_jobs;
create policy "psp_jobs_update_own"
  on public.psp_jobs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "psp_jobs_delete_own" on public.psp_jobs;
create policy "psp_jobs_delete_own"
  on public.psp_jobs for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "psp_takeoff_select_own" on public.psp_takeoff_standards;
create policy "psp_takeoff_select_own"
  on public.psp_takeoff_standards for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "psp_takeoff_insert_own" on public.psp_takeoff_standards;
create policy "psp_takeoff_insert_own"
  on public.psp_takeoff_standards for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "psp_takeoff_update_own" on public.psp_takeoff_standards;
create policy "psp_takeoff_update_own"
  on public.psp_takeoff_standards for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "psp_takeoff_delete_own" on public.psp_takeoff_standards;
create policy "psp_takeoff_delete_own"
  on public.psp_takeoff_standards for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.psp_jobs to authenticated;
grant select, insert, update, delete on public.psp_takeoff_standards to authenticated;
