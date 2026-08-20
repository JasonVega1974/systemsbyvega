-- ============================================================================
-- SYSTEMS BY VEGA — DEMAND REGISTRY
-- Project: newjbexmvltvtmxollca          Table prefix: sbv_
-- ----------------------------------------------------------------------------
-- CANONICAL SCHEMA RECORD. This file is the source of truth for the database,
-- kept in the repo even though the objects are applied through the Supabase
-- MCP. If the two ever disagree, this file is wrong and must be corrected.
--
-- FENCE: this SQL runs against newjbexmvltvtmxollca and nowhere else. The
-- EstateSaleBiz (cdckozujhrffobragmtm) and GarageSaleBiz (jjocmvhqeiudcwtazbwi)
-- projects are live businesses holding sold territories and are never read
-- from and never written to.
--
-- SECURITY POSTURE, inherited from the GarageSaleBiz build:
--   * anon may INSERT into sbv_demand and do nothing else to it
--   * anon may SELECT sbv_niches and EXECUTE the two aggregate functions
--   * an email address is not reachable by the public through ANY path
--   * revoke-then-grant, run LAST, so nothing survives from defaults
-- Idempotent: safe to run repeatedly.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- extensions
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------- enum
do $$ begin
  create type public.sbv_niche_status as enum ('open','in_line','website_only');
exception when duplicate_object then null; end $$;

-- ============================================================== sbv_niches ==
-- The catalog's source of truth. The homepage is pre-rendered from
-- assets/data/niches.seed.json and then overlaid with these rows at runtime,
-- so flipping a niche to open is a row update, not a deploy.
create table if not exists public.sbv_niches (
  slug          text primary key
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  catalog_no    text not null unique,
  name          text not null,
  family        text not null,
  job_line      text not null,
  caveat        text,
  status        public.sbv_niche_status not null default 'in_line',
  open_url      text,
  price_label   text,
  demo_path     text,
  website_offer boolean not null default false,
  sort          integer not null default 100,
  is_listed     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- An open business must have somewhere to send people, and only an open one may.
alter table public.sbv_niches drop constraint if exists sbv_niches_open_url_ck;
alter table public.sbv_niches add constraint sbv_niches_open_url_ck
  check ( (status = 'open') = (open_url is not null) );

-- Never advertise a preview we cannot show.
alter table public.sbv_niches drop constraint if exists sbv_niches_offer_ck;
alter table public.sbv_niches add constraint sbv_niches_offer_ck
  check ( website_offer = false or demo_path is not null );

create index if not exists sbv_niches_listed_sort_idx
  on public.sbv_niches (is_listed, family, sort);

create or replace function public.sbv_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists sbv_niches_touch on public.sbv_niches;
create trigger sbv_niches_touch before update on public.sbv_niches
  for each row execute function public.sbv_touch_updated_at();

-- =================================================== city normalisation ====
-- ⚠ NOT YET A FAITHFUL PORT OF gsb_norm_city.
-- The brief calls for porting GarageSaleBiz's gsb_norm_city so that city
-- de-duplication is consistent across the family. The fence forbids reading
-- anything out of the GSB project, so the definitive text has to be supplied
-- by hand. Until it is, this is an independent implementation and the two
-- MAY DISAGREE on edge cases — 'St. Charles' vs 'Saint Charles',
-- 'Ft. Wayne' vs 'Fort Wayne', and any trailing state suffix.
--
-- Consequence if left as-is: a person could be recorded twice for what GSB
-- would consider one city. That is a de-duplication weakness, not a
-- correctness or security problem, and it is fixed by replacing this one
-- function body — no data migration beyond a recompute of sbv_demand.city_norm.
create or replace function public.sbv_norm_city(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(coalesce(p, '')), '\s*,\s*[a-z]{2}\s*$', '', 'g'),
            '\m(saint|st)\.?\M', 'saint', 'g'
          ),
          '\m(fort|ft)\.?\M', 'fort', 'g'
        ),
        '[^a-z0-9]+', ' ', 'g'
      )
    ), ''
  );
$$;

-- ============================================================== sbv_demand ==
-- The registry. Write-only to the public. One row is one person asking for one
-- business in one town. This table is the roadmap.
create table if not exists public.sbv_demand (
  id           uuid primary key default extensions.gen_random_uuid(),
  niche_slug   text not null references public.sbv_niches(slug) on update cascade,
  email        text not null
                 check (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and length(email) <= 254),
  city_label   text not null check (length(btrim(city_label)) between 2 and 120),
  city_norm    text not null,
  state_code   text check (state_code ~ '^[A-Z]{2}$'),
  full_name    text check (length(full_name) <= 120),
  source       text not null default 'catalog' check (length(source) <= 40),
  created_at   timestamptz not null default now()
);

-- One person, one business, one town. A second attempt is a 409, not a row.
create unique index if not exists sbv_demand_dedupe_idx
  on public.sbv_demand (niche_slug, lower(email), city_norm);

create index if not exists sbv_demand_niche_idx on public.sbv_demand (niche_slug, created_at desc);
create index if not exists sbv_demand_city_idx  on public.sbv_demand (niche_slug, city_norm);

-- Normalise on write, so the client cannot disagree with the server. Same
-- discipline as gsb_check_cities: a visitor must not be able to get a
-- different answer by spelling a town differently.
create or replace function public.sbv_demand_biu()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email      := lower(btrim(new.email));
  new.city_label := btrim(regexp_replace(new.city_label, '\s+', ' ', 'g'));
  new.city_norm  := public.sbv_norm_city(new.city_label);
  if new.city_norm is null then
    raise exception 'city_required' using errcode = '23514';
  end if;
  new.source     := coalesce(nullif(btrim(new.source), ''), 'catalog');
  return new;
end $$;

drop trigger if exists sbv_demand_biu_t on public.sbv_demand;
create trigger sbv_demand_biu_t before insert or update on public.sbv_demand
  for each row execute function public.sbv_demand_biu();

-- ==================================================== aggregate exposure ====
-- Counts WITHOUT emails, and never below the floor.
--
-- THE FLOOR IS 3 AND THE TEST IS STRICTLY GREATER THAN.
-- This matches GarageSaleBiz's client exactly (`if (n <= REG_COUNT_FLOOR)
-- return;` with REG_COUNT_FLOOR = 3), so the first number anyone can ever see
-- is 4. A count of one or two argues against the scarcity it is meant to
-- evidence, and an invented number would be worse than either. NULL here means
-- "do not render a number", not "zero".
create or replace function public.sbv_demand_counts()
returns table (niche_slug text, waiting bigint, show_count boolean, cities bigint)
language sql stable security definer set search_path = ''
as $$
  select n.slug,
         case when count(d.id) > 3 then count(d.id) end,
         (count(d.id) > 3),
         case when count(d.id) > 3 then count(distinct d.city_norm) end
  from public.sbv_niches n
  left join public.sbv_demand d on d.niche_slug = n.slug
  where n.is_listed
  group by n.slug;
$$;

create or replace function public.sbv_demand_city_counts(p_niche text default null)
returns table (niche_slug text, city_norm text, city_label text, waiting bigint)
language sql stable security definer set search_path = ''
as $$
  select d.niche_slug, d.city_norm, min(d.city_label), count(*)
  from public.sbv_demand d
  where p_niche is null or d.niche_slug = p_niche
  group by d.niche_slug, d.city_norm
  having count(*) > 3;
$$;

-- These are SECURITY DEFINER because they must aggregate rows the public is
-- not allowed to read — that is their whole purpose. Supabase's linter raises
-- a WARN saying anon can execute them; that is intentional and is the designed
-- public surface. It was an ERROR when the same job was done with views: the
-- RLS bypass was implicit in view ownership rather than stated. As functions
-- the privilege boundary is one line, and search_path is pinned so nothing
-- earlier on the path can be substituted underneath.

-- ================================================================ hardening ==
alter table public.sbv_niches enable row level security;
alter table public.sbv_demand enable row level security;
alter table public.sbv_niches force  row level security;
alter table public.sbv_demand force  row level security;

drop policy if exists sbv_niches_public_read on public.sbv_niches;
create policy sbv_niches_public_read on public.sbv_niches
  for select to anon, authenticated using (is_listed);

drop policy if exists sbv_demand_anon_insert on public.sbv_demand;
create policy sbv_demand_anon_insert on public.sbv_demand
  for insert to anon, authenticated with check (true);

-- There is deliberately NO select / update / delete policy on sbv_demand.
-- The absence is the control; the grants below are the belt.

-- ---- revoke-then-grant, LAST, across the whole schema ----------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage  on schema public to anon, authenticated;
grant select on public.sbv_niches             to anon, authenticated;
revoke all     on function public.sbv_demand_counts()          from public, anon, authenticated;
revoke all     on function public.sbv_demand_city_counts(text) from public, anon, authenticated;
grant execute  on function public.sbv_demand_counts()          to anon, authenticated;
grant execute  on function public.sbv_demand_city_counts(text) to anon, authenticated;
grant insert on public.sbv_demand             to anon, authenticated;

-- Explicit and redundant, because this is the one that matters:
revoke select, update, delete on public.sbv_demand from anon, authenticated;

commit;

-- Seed rows live in sql/SEED.sql, generated from assets/data/niches.seed.json
-- by tools/gen-seed-sql.js so the page and the database cannot drift apart.
