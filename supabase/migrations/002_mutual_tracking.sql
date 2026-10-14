-- Spidey Tracker migration 002: mutual (two-way) tracking.
--
-- Run once in the Supabase SQL Editor on a project that already has the
-- original schema. Trackers live for at most an hour, so this migration
-- DROPS and recreates both tables: any tracker that is live right now ends.
--
-- Model:
--   * Two participants per tracker: the creator and the joiner.
--   * Each participant has their own capability token (stored as a hash only)
--     and their own single location row (latest position only, no history).
--   * Share state per participant: idle -> sharing -> stopped (-> sharing ...).
--   * Strict reciprocity is enforced by the API: you receive the other
--     person's location only while you are sharing yourself.
--   * RLS stays ON with NO policies; only the server (service role) has access.

begin;

drop table if exists public.locations;
drop table if exists public.sessions;

create table public.sessions (
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

create index sessions_expires_at_idx on public.sessions (expires_at);

create table public.locations (
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

revoke all on public.sessions  from anon, authenticated;
revoke all on public.locations from anon, authenticated;

grant select, insert, update, delete on public.sessions  to service_role;
grant select, insert, update, delete on public.locations to service_role;

commit;

-- Cleanup job (unchanged): every 5 minutes delete expired trackers; their
-- location rows go with them. Re-created here so this script is self-contained.
select cron.unschedule('spidey-cleanup')
where exists (select 1 from cron.job where jobname = 'spidey-cleanup');

select cron.schedule(
  'spidey-cleanup',
  '*/5 * * * *',
  $$ delete from public.sessions where expires_at < now() $$
);
