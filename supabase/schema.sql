-- Spidey Tracker schema (mutual tracking). Run once in the Supabase SQL Editor
-- on a NEW project. Existing projects: run supabase/migrations/ in order instead.
--
-- Security model:
--   * RLS is ON with NO policies, so the anon/publishable key can neither read
--     nor write these tables. Every access goes through Next.js API routes that
--     use the service-role key on the server.
--   * Tokens are never stored in plain text, only their SHA-256 hex digests.
--     Each participant (creator, joiner) has their own token; the invite token
--     is single-use.
--   * One latest-position row per participant (no history).
--   * Strict reciprocity is enforced by the API: you receive the other
--     person's location only while you are sharing yourself.
--   * Expired trackers are deleted by pg_cron; locations go with them (cascade).

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create table if not exists public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  creator_name       text not null check (char_length(creator_name) between 1 and 24),
  joiner_name        text check (char_length(joiner_name) between 1 and 24),
  creator_token_hash text not null unique,
  invite_token_hash  text not null unique,
  joiner_token_hash  text unique,
  -- Random secret Realtime topic, returned only to the two participants.
  channel_key        text not null unique,
  status             text not null default 'waiting' check (status in ('waiting', 'active')),
  creator_share      text not null default 'idle' check (creator_share in ('idle', 'sharing', 'stopped')),
  joiner_share       text not null default 'idle' check (joiner_share in ('idle', 'sharing', 'stopped')),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default now() + interval '1 hour'
);

create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

create table if not exists public.locations (
  session_id  uuid not null references public.sessions (id) on delete cascade,
  role        text not null check (role in ('creator', 'joiner')),
  latitude    double precision not null check (latitude between -90 and 90),
  longitude   double precision not null check (longitude between -180 and 180),
  accuracy    real not null check (accuracy >= 0),
  captured_at timestamptz not null, -- when the phone took the GPS fix (derived server-side)
  updated_at  timestamptz not null default now(),
  primary key (session_id, role)
);

alter table public.sessions  enable row level security;
alter table public.locations enable row level security;

-- Belt and braces: no direct table access for browser roles at all.
revoke all on public.sessions  from anon, authenticated;
revoke all on public.locations from anon, authenticated;

-- The server (secret / service-role key) needs explicit privileges: newer
-- Supabase projects no longer grant table access to API roles by default.
grant select, insert, update, delete on public.sessions  to service_role;
grant select, insert, update, delete on public.locations to service_role;

-- Cleanup: every 5 minutes, delete trackers that expired (locations cascade).
-- The API also refuses expired trackers, so this only has to catch up eventually.
select cron.unschedule('spidey-cleanup')
where exists (select 1 from cron.job where jobname = 'spidey-cleanup');

select cron.schedule(
  'spidey-cleanup',
  '*/5 * * * *',
  $$ delete from public.sessions where expires_at < now() $$
);
