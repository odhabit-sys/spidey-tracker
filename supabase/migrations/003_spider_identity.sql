-- Spidey Tracker migration 003: per-participant Spider identity.
--
-- ADDITIVE ONLY. Nothing is dropped, renamed or rewritten, and existing rows
-- stay valid: live trackers get creator_spider = 'classic' and a null
-- joiner_spider. Code that doesn't know these columns keeps working, so this
-- is safe to apply BEFORE deploying the code that uses it. Safe to re-run.

alter table public.sessions
  add column if not exists creator_spider text not null default 'classic',
  add column if not exists joiner_spider  text;

-- Allowed identities (kept in sync with lib/shared/spiders.ts).
alter table public.sessions drop constraint if exists sessions_creator_spider_check;
alter table public.sessions add constraint sessions_creator_spider_check
  check (creator_spider in ('classic', 'miles', 'gwen', '2099', 'symbiote', 'scarlet', 'stealth', 'solar'));

alter table public.sessions drop constraint if exists sessions_joiner_spider_check;
alter table public.sessions add constraint sessions_joiner_spider_check
  check (joiner_spider is null or joiner_spider in ('classic', 'miles', 'gwen', '2099', 'symbiote', 'scarlet', 'stealth', 'solar'));

-- The two people in one tracker can never share an identity.
alter table public.sessions drop constraint if exists sessions_distinct_spiders;
alter table public.sessions add constraint sessions_distinct_spiders
  check (joiner_spider is null or joiner_spider <> creator_spider);
