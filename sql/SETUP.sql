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

-- ======================================================= WEEKLY DIGEST ====
-- Monday 08:00 America/Denver, to info@kingdom-creatives.com.
--
-- WHY THE BREVO KEY IS NOT IN THIS DATABASE.
-- It already exists in Vercel for /api/demand. A second copy here would be a
-- second credential to rotate, and a leak of it would let someone send mail AS
-- info@kingdom-creatives.com. Instead pg_net posts the finished text to
-- /api/digest carrying SBV_DIGEST_SECRET, whose entire power is "make the
-- server email Jason a digest". The mail credential stays in one place.
--
-- WHY THE CRON FIRES TWICE AND THE FUNCTION DECIDES.
-- pg_cron schedules in UTC. 08:00 Mountain is 14:00 UTC in summer and 15:00
-- UTC in winter, so any single UTC time is wrong for half the year. The job
-- runs at BOTH hours and the function returns early unless the local Denver
-- hour is 8. Postgres owns the DST rules, so this stays correct without anyone
-- editing a schedule twice a year.
--
-- FAILURE POSTURE. Every step is wrapped. A missing extension, a missing
-- secret, an HTTP failure, a bad row — all RAISE NOTICE and return. The
-- schedule must never break because a digest could not be produced.
-- ==========================================================================

create extension if not exists pg_net with schema extensions;

-- A tiny private settings table so the endpoint and secret are configurable
-- without a redeploy. Never readable by anon — see the grants at the end.
create table if not exists public.sbv_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- One row per week actually sent. This is what makes a double-fire harmless:
-- the 14:00 and 15:00 runs both execute, only one of them is in-hour, and if
-- the clock ever hands us two in-hour runs the second finds this row.
create table if not exists public.sbv_digest_log (
  week_start   date primary key,
  sent_at      timestamptz not null default now(),
  new_rows     integer not null default 0,
  total_rows   integer not null default 0,
  note         text
);

-- ---------------------------------------------------------------- the text
-- Plain text, fixed width, no template. Returns the whole digest as one
-- string so it can be read by eye from psql before it is ever emailed:
--   select public.sbv_demand_digest_text();
create or replace function public.sbv_demand_digest_text(p_days integer default 7)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since   timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_out     text;
  v_block   text;
  v_total   bigint;
  v_new     bigint;
  RULE      constant text := repeat('-', 58);
begin
  select count(*), count(*) filter (where created_at >= v_since)
    into v_total, v_new
  from public.sbv_demand;

  v_out :=
    'SYSTEMS BY VEGA — WEEKLY DEMAND DIGEST' || E'\n' ||
    'Generated ' || to_char(now() at time zone 'America/Denver', 'Dy DD Mon YYYY HH24:MI') ||
      ' America/Denver' || E'\n' ||
    'Window: last ' || greatest(p_days,1) || ' days · ' ||
      v_new || ' new · ' || v_total || ' all-time' || E'\n';

  -- ---- build threshold ---------------------------------------------------
  -- Ten total is the line at which a niche is worth building. Anything that
  -- crossed it inside the window is marked, because that is the only new
  -- information on this line of the report.
  select coalesce(string_agg(line, E'\n' order by total desc, name), null)
    into v_block
  from (
    select n.name,
           count(d.id) as total,
           '  ' ||
           case when count(d.id) - count(d.id) filter (where d.created_at >= v_since) < 10
                then '>> ' else '   ' end ||
           rpad(n.name, 30, '.') || ' ' || lpad(count(d.id)::text, 4) ||
           case when count(d.id) - count(d.id) filter (where d.created_at >= v_since) < 10
                then '   ** CROSSED THIS WEEK **' else '' end as line
    from public.sbv_niches n
    join public.sbv_demand d on d.niche_slug = n.slug
    group by n.slug, n.name
    having count(d.id) >= 10
  ) t;

  v_out := v_out || E'\n' || RULE || E'\n' || 'BUILD THRESHOLD — 10 OR MORE' || E'\n' ||
           coalesce(v_block, '  Nothing has reached 10 yet.') || E'\n';

  -- ---- top 5 this week ---------------------------------------------------
  select coalesce(string_agg(line, E'\n' order by rn), null) into v_block
  from (
    select row_number() over (order by cnt desc, name) as rn,
           '  ' || lpad(row_number() over (order by cnt desc, name)::text, 2) || '. ' ||
           rpad(name, 30, '.') || ' ' || lpad(cnt::text, 4) || ' new' ||
           '   (' || tot || ' total)' as line
    from (
      select n.name,
             count(*) filter (where d.created_at >= v_since) as cnt,
             count(*) as tot
      from public.sbv_niches n
      join public.sbv_demand d on d.niche_slug = n.slug
      group by n.slug, n.name
      having count(*) filter (where d.created_at >= v_since) > 0
    ) x
    order by cnt desc, name
    limit 5
  ) t;

  v_out := v_out || E'\n' || RULE || E'\n' || 'NEW THIS WEEK — TOP 5' || E'\n' ||
           coalesce(v_block, '  No new signups this week.') || E'\n';

  -- ---- top 3 cities per niche -------------------------------------------
  select coalesce(string_agg(blk, E'\n' order by tot desc, nm), null) into v_block
  from (
    select nm, tot,
           '  ' || nm || E'\n' || string_agg(cline, E'\n' order by ccnt desc, cty) as blk
    from (
      select n.name as nm,
             (select count(*) from public.sbv_demand z where z.niche_slug = n.slug) as tot,
             min(d.city_label) as cty,
             count(*) as ccnt,
             '      ' || rpad(min(d.city_label), 28, '.') || ' ' || lpad(count(*)::text, 4) as cline,
             row_number() over (partition by n.slug order by count(*) desc, min(d.city_label)) as rn
      from public.sbv_niches n
      join public.sbv_demand d on d.niche_slug = n.slug
      group by n.slug, n.name, d.city_norm
    ) c
    where rn <= 3
    group by nm, tot
  ) t;

  v_out := v_out || E'\n' || RULE || E'\n' || 'TOP CITIES, BY NICHE' || E'\n' ||
           coalesce(v_block, '  No city rows yet.') || E'\n';

  -- ---- all-time ranked ---------------------------------------------------
  select coalesce(string_agg(line, E'\n' order by rn), null) into v_block
  from (
    select row_number() over (order by count(*) desc, n.name) as rn,
           '  ' || lpad(row_number() over (order by count(*) desc, n.name)::text, 2) || '. ' ||
           rpad(n.name, 30, '.') || ' ' || lpad(count(*)::text, 4) as line
    from public.sbv_niches n
    join public.sbv_demand d on d.niche_slug = n.slug
    group by n.slug, n.name
  ) t;

  v_out := v_out || E'\n' || RULE || E'\n' || 'ALL-TIME, RANKED' || E'\n' ||
           coalesce(v_block, '  The registry is empty.') || E'\n';

  v_out := v_out || E'\n' || RULE || E'\n' ||
    'Counts are raw rows in sbv_demand. Nothing here is a projection.' || E'\n';

  return v_out;
exception when others then
  -- A digest that cannot be built must not take the schedule down with it.
  raise notice 'sbv_demand_digest_text failed: %', sqlerrm;
  return null;
end $$;

-- ---------------------------------------------------------------- the send
create or replace function public.sbv_send_weekly_digest(p_force boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local     timestamptz := now();
  v_hour      integer;
  v_week      date;
  v_body      text;
  v_endpoint  text;
  v_secret    text;
  v_new       bigint;
  v_total     bigint;
  v_req       bigint;
begin
  v_hour := extract(hour from (v_local at time zone 'America/Denver'))::int;
  v_week := date_trunc('week', (v_local at time zone 'America/Denver'))::date;

  -- The job fires at both DST candidate hours; only one is 08:00 locally.
  if not p_force and v_hour <> 8 then
    raise notice 'sbv_send_weekly_digest: local hour is %, not 8 — skipping', v_hour;
    return 'skipped:hour';
  end if;

  if not p_force and exists (select 1 from public.sbv_digest_log where week_start = v_week) then
    raise notice 'sbv_send_weekly_digest: already sent for week %', v_week;
    return 'skipped:already-sent';
  end if;

  begin
    select value into v_endpoint from public.sbv_settings where key = 'digest_endpoint';
    select value into v_secret   from public.sbv_settings where key = 'digest_secret';
  exception when others then
    raise notice 'sbv_send_weekly_digest: settings unreadable: %', sqlerrm;
    return 'error:settings';
  end;

  if v_endpoint is null or v_secret is null then
    raise notice 'sbv_send_weekly_digest: digest_endpoint or digest_secret not set in sbv_settings';
    return 'error:unconfigured';
  end if;

  v_body := public.sbv_demand_digest_text(7);
  if v_body is null then
    raise notice 'sbv_send_weekly_digest: digest text came back null — nothing sent';
    return 'error:no-body';
  end if;

  select count(*), count(*) filter (where created_at >= now() - interval '7 days')
    into v_total, v_new from public.sbv_demand;

  begin
    select net.http_post(
      url     := v_endpoint,
      headers := jsonb_build_object('Content-Type','application/json','x-digest-secret', v_secret),
      body    := jsonb_build_object('subject',
                   'SBV demand digest — ' || v_new || ' new, ' || v_total || ' total',
                   'text', v_body),
      timeout_milliseconds := 8000
    ) into v_req;
  exception when others then
    raise notice 'sbv_send_weekly_digest: http_post failed: %', sqlerrm;
    return 'error:http';
  end;

  -- pg_net is fire-and-forget, so this records that the request was queued,
  -- not that Brevo accepted it. The endpoint logs the delivery side.
  insert into public.sbv_digest_log (week_start, new_rows, total_rows, note)
  values (v_week, v_new, v_total, 'net request ' || coalesce(v_req::text,'?'))
  on conflict (week_start) do nothing;

  return 'queued:' || coalesce(v_req::text,'?');
exception when others then
  raise notice 'sbv_send_weekly_digest: unexpected failure: %', sqlerrm;
  return 'error:unexpected';
end $$;



-- ================================================================ hardening ==
alter table public.sbv_niches     enable row level security;
alter table public.sbv_demand     enable row level security;
alter table public.sbv_settings   enable row level security;
alter table public.sbv_digest_log enable row level security;
alter table public.sbv_niches     force  row level security;
alter table public.sbv_demand     force  row level security;
alter table public.sbv_settings   force  row level security;
alter table public.sbv_digest_log force  row level security;

-- sbv_settings holds the digest secret and sbv_digest_log is operational
-- history. Neither gets a policy of any kind, so nothing outside the postgres
-- role can read or write them even before the grants below.

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

-- The digest is machinery, not public API. Nothing here is callable or
-- readable by a visitor; pg_cron runs as the table owner.
revoke all on public.sbv_settings   from anon, authenticated;
revoke all on public.sbv_digest_log from anon, authenticated;
revoke all on function public.sbv_demand_digest_text(integer) from public, anon, authenticated;
revoke all on function public.sbv_send_weekly_digest(boolean)  from public, anon, authenticated;

commit;

-- Seed rows live in sql/SEED.sql, generated from assets/data/niches.seed.json
-- by tools/gen-seed-sql.js so the page and the database cannot drift apart.


-- ======================================================= DIGEST SCHEDULE ==
-- Kept outside the transaction above: creating pg_cron and registering a job
-- are cluster-level operations, and a rollback here should not be able to
-- leave a half-registered schedule behind.
--
-- Idempotent. Re-running adopts the existing secret rather than rotating it,
-- because rotating would silently break the Vercel side until someone noticed
-- the mail had stopped.

create extension if not exists pg_cron;

-- The secret is generated INSIDE the database so it never passes through a
-- file, a commit, or a chat window. Read it out once with
--   select value from public.sbv_settings where key = 'digest_secret';
-- and paste it into Vercel as SBV_DIGEST_SECRET. See DIGEST-SETUP.md.
insert into public.sbv_settings (key, value) values
  ('digest_endpoint', 'https://systemsbyvega-catalog.vercel.app/api/digest'),
  ('digest_secret',   encode(extensions.gen_random_bytes(24), 'base64'))
on conflict (key) do nothing;

-- Both DST candidate hours; sbv_send_weekly_digest() returns early unless the
-- local Denver hour is 8, so exactly one of the two ever does the work.
select cron.unschedule('sbv-weekly-digest')
where exists (select 1 from cron.job where jobname = 'sbv-weekly-digest');

select cron.schedule(
  'sbv-weekly-digest',
  '0 14,15 * * 1',
  $job$select public.sbv_send_weekly_digest();$job$
);
