create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  dni text not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_dni_format check (dni ~ '^[0-9]{8}$'),
  constraint users_dni_unique unique (dni)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  work_date date not null,
  clock_in time not null,
  clock_out time not null,
  note text not null default '',
  source text not null default 'today',
  submitted_at timestamptz not null default now(),
  constraint submissions_source_valid check (source in ('today', 'single', 'bulk')),
  constraint submissions_one_per_day unique (user_id, work_date)
);

create index if not exists submissions_user_date_idx on public.submissions (user_id, work_date desc);

create table if not exists public.drafts (
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint drafts_kind_valid check (kind in ('today', 'single', 'bulk')),
  constraint drafts_pk primary key (user_id, kind)
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_idx on public.activity_log (user_id, id desc);

alter table public.users enable row level security;
alter table public.submissions enable row level security;
alter table public.drafts enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists users_no_public_access on public.users;
drop policy if exists submissions_no_public_access on public.submissions;
drop policy if exists drafts_no_public_access on public.drafts;
drop policy if exists activity_log_no_public_access on public.activity_log;

create policy users_no_public_access on public.users for all to anon, authenticated using (false);
create policy submissions_no_public_access on public.submissions for all to anon, authenticated using (false);
create policy drafts_no_public_access on public.drafts for all to anon, authenticated using (false);
create policy activity_log_no_public_access on public.activity_log for all to anon, authenticated using (false);
