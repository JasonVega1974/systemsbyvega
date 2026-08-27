-- ============================================================================
-- SYSTEMS BY VEGA — COMMERCE & OPERATOR LAYER (Phase 2, Item 1)
-- Project: newjbexmvltvtmxollca          Table prefix: sbv_
-- ----------------------------------------------------------------------------
-- CANONICAL SCHEMA RECORD, second half. sql/SETUP.sql owns the catalog and the
-- demand registry; this file owns territory claims, tenants, operator logins
-- and billing. Together the two ARE the source of truth for the database. If
-- either disagrees with the database, the file is wrong and must be corrected.
--
-- FENCE: this SQL runs against newjbexmvltvtmxollca and nowhere else. The
-- EstateSaleBiz (cdckozujhrffobragmtm) and GarageSaleBiz (jjocmvhqeiudcwtazbwi)
-- projects are live businesses holding sold territories and are never read
-- from and never written to.
--
-- Idempotent: safe to run repeatedly.
--
-- ----------------------------------------------------------------------------
-- ⚠ RUN ORDER IS LOAD-BEARING — READ BEFORE RUNNING
--
--   1. sql/SETUP.sql      (first, always)
--   2. sql/SEED.sql
--   3. sql/COMMERCE.sql   (this file)
--
-- SETUP.sql ends with a SCHEMA-WIDE `revoke all on all tables in schema public
-- from anon, authenticated`, and it does not know these tables exist. Running
-- SETUP.sql again AFTER this file strips every grant below and the storefront
-- goes dark — availability checks start returning 42501.
--
-- So: re-running SETUP.sql means re-running COMMERCE.sql. The verify block at
-- the bottom detects the broken state. This is the one hazard of keeping the
-- schema in two files; the alternative is folding this into SETUP.sql, which
-- makes the canonical record a single 1,100-line file. Jason's call.
--
-- ----------------------------------------------------------------------------
-- ⚠ ONE DECISION NEEDS CONFIRMING BEFORE THIS IS RUN
--
-- The Phase 2 brief locks the territory key as "unique on (niche, city)".
-- This file implements (niche, city, STATE) instead — see the note above
-- sbv_city_claims_unique_active. Without the state, "Springfield" is one
-- territory nationwide and can only ever be sold once, while the buyer in
-- Springfield IL and the buyer in Springfield MO are sold the same thing.
--
-- If (niche, city) really is intended, drop `state_code` from that one index.
-- Everything else in this file is unaffected.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- extensions
create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------- enums
do $$ begin
  create type public.sbv_claim_status as enum ('reserved','claimed','released');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sbv_billing_status as enum ('paid','refunded');
exception when duplicate_object then null; end $$;


-- ============================================================================
-- 3. TABLES
--    Tables first, then the language-sql helpers in §4. Postgres validates
--    `language sql` bodies at CREATE time (check_function_bodies), so a helper
--    defined before its tables fails with 42P01. Do not reorder.
-- ============================================================================

-- ============================================================= sbv_tenants ==
-- One row per purchased business. `client_id` is both the tenant key and the
-- SUBDOMAIN LABEL, which is why it is constrained to a DNS-safe slug and
-- checked against the labels the platform already uses for itself.
--
-- A tenant owns ONE niche and one or more cities; the cities live in
-- sbv_city_claims. That split is deliberate — the brief has the buyer picking
-- cities/metros (plural) at checkout, so a city column here would be wrong the
-- first time somebody buys two.
create table if not exists public.sbv_tenants (
  client_id      text primary key
                   check (client_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                          and length(client_id) between 3 and 40),
  niche_slug     text not null references public.sbv_niches(slug) on update cascade,
  business_name  text check (length(btrim(business_name)) between 2 and 120),
  operator_name  text check (length(operator_name) <= 120),
  operator_email text check (operator_email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
                             and length(operator_email) <= 254),
  operator_phone text check (length(operator_phone) <= 40),
  tier           text not null default 'launch' check (tier in ('launch','custom')),
  -- The webhook inserts this row with is_active = false so billing can be
  -- recorded (billing.client_id is a not-null FK to here), and flips it true
  -- only after the operator can actually reach their dashboard. The storefront
  -- must never go live before the login works.
  is_active      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Reserved labels. A tenant called "api" or "www" would shadow the platform's
-- own hostnames the moment DNS resolved it.
alter table public.sbv_tenants drop constraint if exists sbv_tenants_reserved_ck;
alter table public.sbv_tenants add constraint sbv_tenants_reserved_ck
  check (client_id not in (
    'www','api','admin','app','mail','ftp','dashboard','staging','dev','test',
    'demo','sites','portfolio','showcase','niches','assets','legal','tools',
    'owner','docs','cdn','static','blog','help','support','status','account'
  ));

-- An active tenant must have somewhere to send its mail and someone to name.
-- Mirrors sbv_niches_open_url_ck: the going-live flag is what carries the
-- obligation, so an in-progress row can stay incomplete without tripping it.
alter table public.sbv_tenants drop constraint if exists sbv_tenants_active_ck;
alter table public.sbv_tenants add constraint sbv_tenants_active_ck
  check (is_active = false
         or (business_name is not null and operator_email is not null));

-- FK target for sbv_city_claims. Redundant against the primary key, and that is
-- the point: it lets a claim reference (client_id, niche_slug) as a pair, so a
-- claim can never carry a niche its own tenant does not sell. Enforced by the
-- schema instead of by the webhook remembering to.
-- ADDED CONDITIONALLY, not dropped-and-recreated like the two CHECK constraints
-- above. sbv_city_claims_tenant_fk depends on the index behind this constraint,
-- so `drop constraint if exists` raises 2BP01 on every re-run once the claims
-- table exists — which would make this file non-idempotent the moment it had
-- been applied once. A CHECK constraint has no dependents and can keep the
-- drop/add form, which is what lets its definition be edited in place.
do $$ begin
  alter table public.sbv_tenants add constraint sbv_tenants_client_niche_uk
    unique (client_id, niche_slug);
exception
  when duplicate_table or duplicate_object then null;
end $$;


-- ========================================================= sbv_city_claims ==
-- Territory exclusivity. The partial unique index in §5 IS the guarantee;
-- everything else here, and every availability check in the UI, is convenience.
create table if not exists public.sbv_city_claims (
  id                uuid primary key default extensions.gen_random_uuid(),
  niche_slug        text not null,
  client_id         text not null,
  city_label        text not null check (length(btrim(city_label)) between 2 and 120),
  -- Written by trigger from sbv_norm_city(), never by the client. See §6.
  city_norm         text not null,
  state_code        text not null check (state_code ~ '^[A-Z]{2}$'),
  status            public.sbv_claim_status not null default 'claimed',
  -- Which payment bought this territory. Nullable: a 'reserved' row may exist
  -- before a session does, and an owner-granted claim has no session at all.
  stripe_session_id text,
  claimed_at        timestamptz not null default now(),
  released_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint sbv_city_claims_tenant_fk
    foreign key (client_id, niche_slug)
    references public.sbv_tenants (client_id, niche_slug)
    on update cascade,

  -- A released claim records when, and nothing else does. Without this the
  -- table can say "released" while still reading as live to the index.
  constraint sbv_city_claims_released_ck
    check ((status = 'released') = (released_at is not null))
);


-- ======================================================== sbv_client_users ==
-- auth.users.id -> client_id. THERE IS NO DEFAULT client_id, EVER. An
-- authenticated user with no row here is blocked, never silently pointed at
-- another operator's shop.
--
-- The key is (user_id, client_id), NOT user_id alone. Repeat buyers are
-- explicitly expected — the provisioning webhook treats "already registered"
-- from createUser as the normal repeat-buyer path — and a single-column key
-- would raise 23505 on the mapping insert AFTER the second payment cleared.
--
-- Consequence the dashboard must handle: a user CAN have more than one row
-- here. Resolve the active tenant explicitly (pick, or switch); never take the
-- first row and never assume there is exactly one.
create table if not exists public.sbv_client_users (
  user_id    uuid not null references auth.users(id) on delete cascade,
  client_id  text not null references public.sbv_tenants(client_id)
               on update cascade on delete cascade,
  role       text not null default 'operator' check (role in ('operator','staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);


-- ============================================================= sbv_billing ==
-- What Stripe told us, recorded once. `stripe_session_id` is unique and that
-- uniqueness is the webhook's idempotency anchor: a replayed event collides
-- here rather than charging or provisioning twice.
--
-- Nothing in this table is ever readable by anon or by an operator. It carries
-- Stripe identifiers and amounts, and there is no product reason to expose it.
create table if not exists public.sbv_billing (
  id                    uuid primary key default extensions.gen_random_uuid(),
  client_id             text not null references public.sbv_tenants(client_id)
                          on update cascade,
  stripe_session_id     text not null unique,
  stripe_payment_intent text,
  amount_cents          integer not null check (amount_cents >= 0),
  currency              text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  tier                  text check (tier in ('launch','custom')),
  buyer_email           text check (length(buyer_email) <= 254),
  status                public.sbv_billing_status not null default 'paid',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);


-- ============================================================================
-- 4. RLS HELPER FUNCTIONS  (language sql — must come after the tables)
-- ============================================================================

-- Does the calling user operate this tenant? SECURITY DEFINER because it reads
-- sbv_client_users, which is itself RLS-protected — a plain policy subquery
-- would evaluate as the calling role, find nothing, and fail closed for
-- everyone. `(select auth.uid())` is a scalar subquery so the planner runs it
-- once per query as an InitPlan rather than once per row.
create or replace function public.sbv_is_tenant(p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sbv_client_users cu
    where cu.client_id = p_client_id
      and cu.user_id = (select auth.uid())
  );
$$;

revoke all    on function public.sbv_is_tenant(text) from public, anon;
grant execute on function public.sbv_is_tenant(text) to authenticated;


-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- THE EXCLUSIVITY GUARANTEE. Everything else is UX.
--
-- On (niche_slug, city_norm, state_code) where the claim is live.
--
-- WHY city_norm AND NOT lower(city_label): the family's other platforms index
-- lower(city_label) only, which sells "St. Louis" and "Saint Louis" as two
-- territories. sbv_norm_city() already exists in SETUP.sql, already folds
-- saint/st and fort/ft and strips a trailing state suffix, and sbv_demand
-- already stores its output. Reusing it means a claim and a demand row agree
-- on what one town is.
--
-- WHY A STORED COLUMN AND NOT AN INDEX EXPRESSION: sbv_norm_city() is IMMUTABLE
-- so `create index on (sbv_norm_city(city_label))` would be accepted — and
-- would silently corrupt the moment that body is replaced with the real
-- gsb_norm_city port SETUP.sql says is still owed, because Postgres will not
-- rebuild an index behind a changed "immutable" function. With a trigger-filled
-- column the same edit is a recompute:
--     update public.sbv_city_claims set city_norm = public.sbv_norm_city(city_label);
-- which is exactly the migration SETUP.sql already promises for sbv_demand.
--
-- WHY state_code IS IN THE KEY: see the header. Confirm before running.
-- ---------------------------------------------------------------------------
create unique index if not exists sbv_city_claims_unique_active
  on public.sbv_city_claims (niche_slug, city_norm, state_code)
  where status in ('claimed','reserved');

-- Foreign keys are not indexed automatically. Both of these back a JOIN the
-- dashboard makes on every page load, and the cascade from sbv_tenants.
create index if not exists sbv_city_claims_client_idx
  on public.sbv_city_claims (client_id);
create index if not exists sbv_client_users_client_idx
  on public.sbv_client_users (client_id);
create index if not exists sbv_billing_client_idx
  on public.sbv_billing (client_id);

-- No separate index for the public availability lookup: it filters on exactly
-- (niche_slug, city_norm, state_code) with the same `status in (...)` predicate,
-- so sbv_city_claims_unique_active already serves it. A second identical index
-- would only add write cost.

-- Tenant resolution by hostname happens on client_id (the primary key), but the
-- catalog page lists open territories per niche.
create index if not exists sbv_tenants_niche_idx
  on public.sbv_tenants (niche_slug, is_active);


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Normalise on write so the client cannot disagree with the server. Same
-- discipline as sbv_demand_biu_t: a buyer must not be able to get a different
-- answer by spelling a town differently, and must not be able to claim a
-- territory by sending a city_norm of their own choosing.
create or replace function public.sbv_city_claims_biu()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Whitespace collapse matches sbv_demand_biu() exactly. If the two disagreed,
  -- 'New  York' would be one town in the registry and another in the claims.
  new.city_label := btrim(regexp_replace(new.city_label, '\s+', ' ', 'g'));
  new.city_norm  := public.sbv_norm_city(new.city_label);
  new.state_code := upper(btrim(new.state_code));
  if new.city_norm is null then
    raise exception 'city_required' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sbv_city_claims_biu_t on public.sbv_city_claims;
create trigger sbv_city_claims_biu_t
  before insert or update on public.sbv_city_claims
  for each row execute function public.sbv_city_claims_biu();

-- sbv_touch_updated_at() is defined in SETUP.sql.
drop trigger if exists sbv_tenants_touch on public.sbv_tenants;
create trigger sbv_tenants_touch before update on public.sbv_tenants
  for each row execute function public.sbv_touch_updated_at();

drop trigger if exists sbv_billing_touch on public.sbv_billing;
create trigger sbv_billing_touch before update on public.sbv_billing
  for each row execute function public.sbv_touch_updated_at();


-- ============================================================================
-- 7. RPCs
-- ============================================================================

-- ------------------------------------------------------- claim, atomically --
-- Called from the provisioning webhook AFTER Stripe confirms payment. Wraps the
-- unique index so the caller gets JSON instead of a raw 23505.
--
-- Returns the current holder on conflict. The webhook needs it: `already_claimed`
-- means the same thing whether the run lost a race or is resuming its own
-- half-finished work, and comparing holder to p_client_id is what separates
-- "carry on" from "this buyer needs a refund and Jason needs an email".
--
-- SERVICE ROLE ONLY. A browser must never be able to claim a territory.
create or replace function public.sbv_claim_city(
  p_niche_slug        text,
  p_city_label        text,
  p_state_code        text,
  p_client_id         text,
  p_stripe_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_holder text;
begin
  -- Guard before the insert so a missing argument comes back as JSON the
  -- webhook can branch on, not as an exception it has to parse.
  if p_niche_slug is null or p_client_id is null
     or public.sbv_norm_city(p_city_label) is null
     or upper(btrim(coalesce(p_state_code, ''))) !~ '^[A-Z]{2}$' then
    return jsonb_build_object('ok', false, 'reason', 'incomplete');
  end if;

  -- city_norm is omitted deliberately: sbv_city_claims_biu() fills it, and a
  -- BEFORE trigger runs ahead of the not-null check. Same shape as the anon
  -- insert into sbv_demand, which also never sends it. Passing a value here
  -- would let a caller disagree with the index.
  insert into public.sbv_city_claims
    (niche_slug, client_id, city_label, state_code, status, stripe_session_id)
  values
    (p_niche_slug, p_client_id, p_city_label, upper(btrim(p_state_code)),
     'claimed', p_stripe_session_id);
  return jsonb_build_object('ok', true);

exception
  when unique_violation then
    select cc.client_id into v_holder
    from public.sbv_city_claims cc
    where cc.niche_slug = p_niche_slug
      -- btrim here must match the insert above. Without it a padded ' mo '
      -- finds no holder, `mine` comes back false, and the webhook reads its own
      -- resumed claim as somebody else's and calls for a refund.
      and cc.city_norm  = public.sbv_norm_city(p_city_label)
      and cc.state_code = upper(btrim(p_state_code))
      and cc.status in ('claimed','reserved')
    limit 1;
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_claimed',
      'holder', v_holder,
      'mine', (v_holder is not distinct from p_client_id)
    );
  when foreign_key_violation then
    -- The tenant row must exist first, and its niche must match. Both are the
    -- webhook calling out of order, not a buyer problem.
    return jsonb_build_object('ok', false, 'reason', 'no_such_tenant_for_niche');
end $$;

revoke all on function public.sbv_claim_city(text,text,text,text,text)
  from public, anon, authenticated;


-- --------------------------------------------------- availability, public --
-- The pre-checkout check. Cheap failure instead of expensive: a rejection here
-- is a form error, the same rejection after payment is a refund plus a support
-- email plus a buyer who thinks they own a city.
--
-- THIS IS NOT THE GUARANTEE. Two buyers can both pass this seconds apart. The
-- unique index behind sbv_claim_city() is the guarantee; this only makes the
-- race rare.
--
-- FAILS CLOSED, DELIBERATELY. Every path that is not a definite "this city is
-- free and this niche is on sale" returns available:false. Compliance posture
-- for the whole family: an indeterminate availability check must never render
-- as available.
create or replace function public.sbv_city_available(
  p_niche_slug text,
  p_city_label text,
  p_state_code text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_niche_slug is null or p_city_label is null or p_state_code is null
      then jsonb_build_object('available', false, 'reason', 'incomplete')
    when public.sbv_norm_city(p_city_label) is null
      then jsonb_build_object('available', false, 'reason', 'unrecognised_city')
    when upper(btrim(p_state_code)) !~ '^[A-Z]{2}$'
      then jsonb_build_object('available', false, 'reason', 'bad_state')
    when not exists (
      select 1 from public.sbv_niches n
      where n.slug = p_niche_slug and n.status = 'open' and n.is_listed
    ) then jsonb_build_object('available', false, 'reason', 'niche_not_open')
    when exists (
      select 1 from public.sbv_city_claims cc
      where cc.niche_slug = p_niche_slug
        and cc.city_norm  = public.sbv_norm_city(p_city_label)
        and cc.state_code = upper(btrim(p_state_code))
        and cc.status in ('claimed','reserved')
    ) then jsonb_build_object('available', false, 'reason', 'claimed')
    else jsonb_build_object('available', true)
  end;
$$;


-- ------------------------------------------------------------- claim counts --
-- Counts, never below the floor. THE FLOOR IS 3 AND THE TEST IS STRICTLY
-- GREATER THAN, identical to sbv_demand_counts() and to GarageSaleBiz's client
-- (`if (n <= REG_COUNT_FLOOR) return;`). The first number anyone can ever see
-- is 4. NULL means "do not render a number", not "zero".
--
-- Use THIS for any rendered "N territories claimed". Do NOT count the rows of
-- sbv_public_claimed_cities to produce a number — that view exists so a taken
-- city cannot be sold twice, and length() on it would leak a 1 or a 2 straight
-- past the floor.
create or replace function public.sbv_claim_counts()
returns table (niche_slug text, claimed bigint, show_count boolean)
language sql stable security definer set search_path = ''
as $$
  select n.slug,
         case when count(cc.id) > 3 then count(cc.id) end,
         (count(cc.id) > 3)
  from public.sbv_niches n
  left join public.sbv_city_claims cc
    on cc.niche_slug = n.slug and cc.status in ('claimed','reserved')
  where n.is_listed
  group by n.slug;
$$;

-- These are SECURITY DEFINER because they must read rows the public is not
-- allowed to read — that is their whole purpose. Supabase's linter WARNs that
-- anon can execute them; that is intentional and is the designed public
-- surface. search_path is pinned so nothing earlier on the path can be
-- substituted underneath.


-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

alter table public.sbv_tenants      enable row level security;
alter table public.sbv_city_claims  enable row level security;
alter table public.sbv_client_users enable row level security;
alter table public.sbv_billing      enable row level security;
alter table public.sbv_tenants      force  row level security;
alter table public.sbv_city_claims  force  row level security;
alter table public.sbv_client_users force  row level security;
alter table public.sbv_billing      force  row level security;

-- anon gets NO policy on any base table here. Every public read goes through a
-- view in §9 or a function in §7. The absence is the control.

-- An operator reads and edits their own tenant row, and nothing else.
drop policy if exists sbv_tenants_own_read on public.sbv_tenants;
create policy sbv_tenants_own_read on public.sbv_tenants
  for select to authenticated
  using ((select public.sbv_is_tenant(client_id)));

-- The columns an operator may change are pinned by a COLUMN-LEVEL grant in the
-- grants section, not by this policy. That is deliberate:
--
-- The obvious way to write it — `and niche_slug = (select t.niche_slug from
-- sbv_tenants t where t.client_id = sbv_tenants.client_id)` — reads the policy's
-- OWN table from inside the policy, which re-enters the policy and raises
-- 42P17 "infinite recursion detected in policy for relation sbv_tenants". A
-- column-level grant does the same job outside the policy system entirely: an
-- UPDATE naming client_id, niche_slug, tier or is_active is refused before any
-- policy is consulted.
drop policy if exists sbv_tenants_own_update on public.sbv_tenants;
create policy sbv_tenants_own_update on public.sbv_tenants
  for update to authenticated
  using      ((select public.sbv_is_tenant(client_id)))
  with check ((select public.sbv_is_tenant(client_id)));

-- There is deliberately no INSERT or DELETE policy on sbv_tenants. Tenants are
-- created by the provisioning webhook under the service role.

-- An operator sees which cities they hold. They cannot claim, move or release
-- one — that is sbv_claim_city() under the service role.
drop policy if exists sbv_city_claims_own_read on public.sbv_city_claims;
create policy sbv_city_claims_own_read on public.sbv_city_claims
  for select to authenticated
  using ((select public.sbv_is_tenant(client_id)));

-- A user sees their own mapping so the dashboard can resolve which tenant(s)
-- they operate. user_id is compared directly — going through sbv_is_tenant()
-- here would be circular.
drop policy if exists sbv_client_users_own_read on public.sbv_client_users;
create policy sbv_client_users_own_read on public.sbv_client_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- sbv_billing gets NO policy of any kind, exactly like sbv_settings and
-- sbv_digest_log in SETUP.sql. Nothing outside the service role reads it.


-- ============================================================================
-- 9. PUBLIC VIEWS
--    security_invoker = false: the view runs with definer rights and bypasses
--    base-table RLS. THE COLUMN LIST IS THE SECURITY BOUNDARY. Anything omitted
--    is invisible to the internet. Omissions below are deliberate.
-- ============================================================================

-- Which territories are gone. Needed at checkout so a claimed city cannot be
-- offered for sale a second time.
--
-- OMITTED ON PURPOSE: client_id and stripe_session_id (who bought it and what
-- they paid is nobody's business), claimed_at (a visible purchase timeline
-- invites inference about how fast the catalog is really moving), city_norm
-- (an internal key; publishing it invites a client-side normaliser that
-- disagrees with the trigger).
create or replace view public.sbv_public_claimed_cities
  with (security_invoker = false) as
  select niche_slug, city_label, state_code
  from public.sbv_city_claims
  where status in ('claimed','reserved');

-- Live storefronts, for tenant resolution by hostname and for any "see a real
-- one" link in the catalog.
--
-- OMITTED ON PURPOSE: operator_email, operator_phone, operator_name (contact
-- details belong on the storefront the operator controls, not in a public
-- table anyone can enumerate), tier and billing (what someone paid), and
-- timestamps.
create or replace view public.sbv_public_tenants
  with (security_invoker = false) as
  select client_id, niche_slug, business_name
  from public.sbv_tenants
  where is_active;


-- ============================================================================
-- GRANTS — revoke-then-grant, LAST.
--
-- SCOPED TO THIS FILE'S OBJECTS ONLY. SETUP.sql's blanket
-- `revoke all on all tables in schema public` is correct there and would be
-- wrong here: it would strip the demand-registry grants this file knows
-- nothing about. See the run-order warning in the header.
-- ============================================================================

grant usage on schema public to anon, authenticated;

revoke all on public.sbv_tenants      from anon, authenticated;
revoke all on public.sbv_city_claims  from anon, authenticated;
revoke all on public.sbv_client_users from anon, authenticated;
revoke all on public.sbv_billing      from anon, authenticated;

-- Operators reach their own rows through the policies in §8. A policy without
-- the underlying table privilege raises the same 42501 as a missing policy, so
-- these are explicit rather than inherited from any Supabase default.
grant select on public.sbv_tenants      to authenticated;
grant select on public.sbv_city_claims  to authenticated;
grant select on public.sbv_client_users to authenticated;

-- COLUMN-LEVEL, and this is the control that stops an operator promoting
-- themselves — see the note on sbv_tenants_own_update. An UPDATE touching
-- client_id, niche_slug, tier or is_active is refused here, before RLS is even
-- consulted, so those move by webhook or by owner and never from a dashboard.
grant update (business_name, operator_name, operator_email, operator_phone)
  on public.sbv_tenants to authenticated;

-- The public surface: two views and two functions. Nothing else.
grant select on public.sbv_public_claimed_cities to anon, authenticated;
grant select on public.sbv_public_tenants        to anon, authenticated;

revoke all    on function public.sbv_city_available(text,text,text)
  from public, anon, authenticated;
grant execute on function public.sbv_city_available(text,text,text)
  to anon, authenticated;

revoke all    on function public.sbv_claim_counts() from public, anon, authenticated;
grant execute on function public.sbv_claim_counts() to anon, authenticated;

-- Explicit and redundant, because these are the ones that matter:
revoke insert, update, delete on public.sbv_city_claims  from anon, authenticated;
revoke insert, delete         on public.sbv_tenants      from anon, authenticated;
revoke insert, update, delete on public.sbv_client_users from anon, authenticated;
revoke all                    on public.sbv_billing      from anon, authenticated;
revoke all on function public.sbv_claim_city(text,text,text,text,text)
  from public, anon, authenticated;

commit;


-- ============================================================================
-- VERIFY — run after applying. Every query below states its own pass condition.
-- Nothing here writes.
-- ============================================================================

-- 1. RLS is on and forced for all four tables. Expect 4 rows, both flags true.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
  and relname in ('sbv_tenants','sbv_city_claims','sbv_client_users','sbv_billing')
order by relname;

-- 2. No policy on a COMMERCE table grants anon anything. Expect ZERO rows.
--    Scoped to these four tables on purpose: SETUP.sql legitimately gives anon
--    a read on sbv_niches and an insert on sbv_demand, so a `like 'sbv_%'`
--    filter here returns those two and reads like a failure when it is not.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('sbv_tenants','sbv_city_claims','sbv_client_users','sbv_billing')
  and 'anon' = any (roles);

-- 3. anon's entire footprint on the commerce layer. Expect exactly TWO rows,
--    both SELECT, both on the sbv_public_* views — nothing on a base table.
--    (sbv_niches SELECT and sbv_demand INSERT are SETUP.sql's and are excluded.)
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name like 'sbv_%'
  and table_name not in ('sbv_niches','sbv_demand')
order by table_name, privilege_type;

-- 4. THE RUN-ORDER CHECK. If SETUP.sql was re-run after this file, its
--    schema-wide revoke stripped the grants above and query 3 returns nothing
--    for the views. Expect 2; anything less means re-run COMMERCE.sql.
select count(*) as public_view_grants_expect_2
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
  and table_name in ('sbv_public_claimed_cities','sbv_public_tenants');

-- 5. Every foreign key is indexed. Expect ZERO rows.
select conrelid::regclass as tbl, a.attname as fk_column
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.contype = 'f'
  and conrelid::regclass::text like 'sbv_%'
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid and a.attnum = any (i.indkey)
  );

-- 6. The exclusivity index exists and is UNIQUE and PARTIAL. Expect 1 row whose
--    definition contains both "UNIQUE" and "WHERE".
select indexdef
from pg_indexes
where schemaname = 'public' and indexname = 'sbv_city_claims_unique_active';

-- 7. The guarantee actually holds. Runs the real conflict and rolls back, so it
--    proves the index rather than trusting it. Expect: first claim ok:true,
--    second ok:false / already_claimed, and 'Saint Charles' colliding with
--    'St. Charles' — that last one is what city_norm buys over lower().
begin;
  insert into public.sbv_tenants (client_id, niche_slug, business_name, operator_email, is_active)
  select 'zzz-verify-a', slug, 'Verify A', 'info@kingdom-creatives.com', false
  from public.sbv_niches limit 1;
  insert into public.sbv_tenants (client_id, niche_slug, business_name, operator_email, is_active)
  select 'zzz-verify-b', slug, 'Verify B', 'info@kingdom-creatives.com', false
  from public.sbv_niches limit 1;

  -- Separate statements on purpose. These calls have side effects and each one
  -- depends on the previous having already committed its row to the index;
  -- UNION ALL does not promise to evaluate its branches top to bottom, so
  -- folding them into one query can pass on a schema that is actually broken.

  -- expect ok:true
  select 'first claim' as step,
         public.sbv_claim_city((select slug from public.sbv_niches limit 1),
                               'St. Charles', 'mo', 'zzz-verify-a') as result;

  -- expect ok:false, already_claimed, mine:false  — the plain collision
  select 'same city again' as step,
         public.sbv_claim_city((select slug from public.sbv_niches limit 1),
                               'St. Charles', 'MO', 'zzz-verify-b') as result;

  -- expect ok:false, already_claimed  — this is what city_norm buys over
  -- lower(city_label); on the family's other platforms this one SUCCEEDS and
  -- sells the same town twice.
  select 'spelled Saint' as step,
         public.sbv_claim_city((select slug from public.sbv_niches limit 1),
                               'Saint Charles', 'MO', 'zzz-verify-b') as result;

  -- expect ok:true  — a different state is a different territory
  select 'other state is free' as step,
         public.sbv_claim_city((select slug from public.sbv_niches limit 1),
                               'St. Charles', 'IL', 'zzz-verify-b') as result;

  -- expect ok:false, incomplete  — the null-argument guard
  select 'no state given' as step,
         public.sbv_claim_city((select slug from public.sbv_niches limit 1),
                               'St. Charles', null, 'zzz-verify-b') as result;
rollback;

-- 8. Availability fails closed. Expect available:false on all four.
select public.sbv_city_available(null, 'Boise', 'ID')            as null_niche,
       public.sbv_city_available('no-such-niche', 'Boise', 'ID') as unknown_niche,
       public.sbv_city_available('dj', '', 'ID')                 as blank_city,
       public.sbv_city_available('dj', 'Boise', 'Idaho')         as bad_state;

-- ============================================================================
-- 9. SECURITY REGRESSION TEST
--
-- Proves isolation and refusal instead of asserting them. Runs inside a
-- transaction and ROLLS BACK, so it leaves nothing behind and is safe to run
-- against a populated database.
--
-- Plain SQL only — no psql meta-commands — so it runs in the Supabase SQL
-- editor as well as in psql.
--
-- PASS CONDITION: the `pass` column is true on EVERY row. The final row reports
-- the failure count directly; it must read 0.
--
-- Why this lives in the canonical file and not in a scratch script: every line
-- of §8 and of the grants block is a security claim, and the only way one of
-- them quietly stops being true is if nothing re-checks it. Re-run this after
-- any change to a policy, a grant, or sbv_is_tenant().
-- ============================================================================
begin;

-- Runs one scalar query as a role and returns its result, or the refusal.
create function pg_temp.sbv_probe(p_role text, p_sub text, p_sql text)
returns text language plpgsql as $probe$
declare v text;
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  begin
    execute p_sql into v;
    execute 'reset role';
    return coalesce(v, '(none)');
  exception when others then
    execute 'reset role';
    return 'DENIED (' || sqlstate || ')';
  end;
end $probe$;

-- Runs one statement as a role and reports only whether it was permitted.
create function pg_temp.sbv_attempt(p_role text, p_sub text, p_sql text)
returns text language plpgsql as $att$
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  begin
    execute p_sql;
    execute 'reset role';
    return 'ALLOWED';
  exception when others then
    execute 'reset role';
    return 'DENIED (' || sqlstate || ')';
  end;
end $att$;

-- Fixtures: two operators on the SAME niche, one territory each. Same niche is
-- the point — isolation that only holds across niches is not isolation.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','verify-a@example.com'),
  ('22222222-2222-2222-2222-222222222222','verify-b@example.com');

insert into public.sbv_tenants (client_id, niche_slug, business_name, operator_email, is_active)
select 'op-alpha', slug, 'Alpha', 'info@kingdom-creatives.com', true
from public.sbv_niches where status = 'open' limit 1;
insert into public.sbv_tenants (client_id, niche_slug, business_name, operator_email, is_active)
select 'op-beta',  slug, 'Beta',  'info@kingdom-creatives.com', true
from public.sbv_niches where status = 'open' limit 1;

insert into public.sbv_client_users (user_id, client_id) values
  ('11111111-1111-1111-1111-111111111111','op-alpha'),
  ('22222222-2222-2222-2222-222222222222','op-beta');

select public.sbv_claim_city(
  (select slug from public.sbv_niches where status='open' limit 1),
  'Boise','ID','op-alpha');
select public.sbv_claim_city(
  (select slug from public.sbv_niches where status='open' limit 1),
  'Nampa','ID','op-beta');

insert into public.sbv_billing (client_id, stripe_session_id, amount_cents, tier)
values ('op-alpha','cs_verify_alpha',29900,'launch');

with r(section, check_name, got, expected) as (
  values
  -- ---- an operator sees their own row and nobody else's --------------------
  ('ISOLATION','alpha sees only own tenant',
    pg_temp.sbv_probe('authenticated','11111111-1111-1111-1111-111111111111',
      $q$select string_agg(client_id, ',' order by client_id) from public.sbv_tenants$q$),
    'op-alpha'),
  ('ISOLATION','alpha sees only own claim',
    pg_temp.sbv_probe('authenticated','11111111-1111-1111-1111-111111111111',
      $q$select string_agg(city_label, ',' order by city_label) from public.sbv_city_claims$q$),
    'Boise'),
  ('ISOLATION','alpha sees only own mapping',
    pg_temp.sbv_probe('authenticated','11111111-1111-1111-1111-111111111111',
      $q$select string_agg(client_id, ',') from public.sbv_client_users$q$),
    'op-alpha'),

  -- ---- an operator cannot promote itself -----------------------------------
  ('ESCALATION','operator sets own is_active',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$update public.sbv_tenants set is_active=false where client_id='op-alpha'$q$),
    'DENIED (42501)'),
  ('ESCALATION','operator changes own niche',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$update public.sbv_tenants set niche_slug='hvac' where client_id='op-alpha'$q$),
    'DENIED (42501)'),
  ('ESCALATION','operator upgrades own tier',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$update public.sbv_tenants set tier='custom' where client_id='op-alpha'$q$),
    'DENIED (42501)'),
  ('ESCALATION','operator reads billing',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$select 1 from public.sbv_billing$q$),
    'DENIED (42501)'),
  ('ESCALATION','operator claims a territory',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$select public.sbv_claim_city('x','Meridian','ID','op-alpha')$q$),
    'DENIED (42501)'),
  ('ESCALATION','operator inserts a claim directly',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$insert into public.sbv_city_claims(niche_slug,client_id,city_label,state_code) values('x','op-alpha','Meridian','ID')$q$),
    'DENIED (42501)'),

  -- ---- anon touches no base table, ever ------------------------------------
  ('ESCALATION','anon reads tenants',
    pg_temp.sbv_attempt('anon',null,$q$select 1 from public.sbv_tenants$q$),      'DENIED (42501)'),
  ('ESCALATION','anon reads claims',
    pg_temp.sbv_attempt('anon',null,$q$select 1 from public.sbv_city_claims$q$),  'DENIED (42501)'),
  ('ESCALATION','anon reads billing',
    pg_temp.sbv_attempt('anon',null,$q$select 1 from public.sbv_billing$q$),      'DENIED (42501)'),
  ('ESCALATION','anon reads mappings',
    pg_temp.sbv_attempt('anon',null,$q$select 1 from public.sbv_client_users$q$), 'DENIED (42501)'),
  ('ESCALATION','anon claims a territory',
    pg_temp.sbv_attempt('anon',null,
      $q$select public.sbv_claim_city('x','Meridian','ID','op-alpha')$q$),        'DENIED (42501)'),

  -- ---- a cross-tenant write is a SILENT no-op, not an error ----------------
  -- RLS filters the row out rather than raising, so the UPDATE reports success
  -- having changed nothing. A dashboard must not read that as "saved".
  ('HIJACK','beta update by alpha is permitted...',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$update public.sbv_tenants set business_name='Hijacked' where client_id='op-beta'$q$),
    'ALLOWED'),
  ('HIJACK','...but changed nothing',
    (select business_name from public.sbv_tenants where client_id='op-beta'),
    'Beta'),

  -- ---- what an operator IS allowed to do -----------------------------------
  ('ALLOWED','alpha renames itself',
    pg_temp.sbv_attempt('authenticated','11111111-1111-1111-1111-111111111111',
      $q$update public.sbv_tenants set business_name='Alpha Renamed' where client_id='op-alpha'$q$),
    'ALLOWED'),

  -- ---- the public surface works, and leaks nothing -------------------------
  ('PUBLIC','anon reads the claimed-cities view',
    pg_temp.sbv_probe('anon',null,
      $q$select string_agg(city_label||' '||state_code, ', ' order by city_label) from public.sbv_public_claimed_cities$q$),
    'Boise ID, Nampa ID'),
  ('PUBLIC','operator_email is not a column of the tenant view',
    pg_temp.sbv_attempt('anon',null,
      $q$select operator_email from public.sbv_public_tenants$q$),
    'DENIED (42703)'),
  ('PUBLIC','claimed city reads unavailable',
    pg_temp.sbv_probe('anon',null,
      $q$select (public.sbv_city_available((select slug from public.sbv_niches where status='open' limit 1),'Boise','ID')->>'available')$q$),
    'false'),
  ('PUBLIC','free city reads available',
    pg_temp.sbv_probe('anon',null,
      $q$select (public.sbv_city_available((select slug from public.sbv_niches where status='open' limit 1),'Twin Falls','ID')->>'available')$q$),
    'true'),

  -- ---- the compliance floor ------------------------------------------------
  -- Two claims is below the floor of 3, so the count must render as nothing.
  ('COMPLIANCE','count below floor is NULL, not 2',
    pg_temp.sbv_probe('anon',null,
      $q$select coalesce(claimed::text,'(none)') from public.sbv_claim_counts() where niche_slug = (select slug from public.sbv_niches where status='open' limit 1)$q$),
    '(none)')
)
select section, check_name, got, expected, (got = expected) as pass from r
union all
select 'TOTAL', 'failures (must be 0)',
       count(*) filter (where got is distinct from expected)::text, '0',
       count(*) filter (where got is distinct from expected) = 0
from r;

rollback;
