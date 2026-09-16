/* ============================================================================
   CELEBRATION-SAFETY-PHASE4.sql — auth, roles & relational schedule storage
   for the Celebration Church Safety & Security Team app
   ----------------------------------------------------------------------------
   Project: newjbexmvltvtmxollca.supabase.co (shared with systemsbyvega — every
   table below is prefixed cc_, nothing outside that prefix is touched).

   Replaces the app's single localStorage blob (pin/team/leaders/meetings/
   schedule/progress/activity) with real tables, real auth and real RLS. The
   four decisions this migration encodes:
     1. The admin PIN is gone. cc_profiles.role, set by magic-link auth, is
        the only gate from here on.
     2. Schedule editing is Admin only — Team Lead gets no extra write access.
     3. Role assignment happens in-app (a new Admin-only screen, built in a
        later step) by updating cc_profiles.role / team_member_id.
     4. The schedule is rows in cc_schedule_slots, one per position per
        service, not a JSON blob per Sunday.

   AUTH PREREQUISITE — do this in the dashboard, not here:
   Authentication → Settings → turn OFF "Allow new users to sign up". Every
   teammate is then created by an Admin invite (Authentication → Users →
   Invite), so the only auth.users rows that can ever exist are ones someone
   deliberately created. Magic-link sign-IN still works for anyone already
   invited; self-serve sign-UP does not. cc_handle_new_user() below assumes
   this is on — without it, anyone who finds the login page becomes a
   read-access Member automatically, which reopens exactly the exposure the
   app's PRIVACY FENCE comment and OPEN-ITEMS.md have cared about from day one.

   ORDER MATTERS. Postgres validates `language sql` function bodies at CREATE
   time, so the tables they query must exist first. Sections run: tables →
   indexes → trigger plumbing → sql helper functions → RLS policies → grants
   → seed data. Do not reorder.

   Idempotent throughout (if not exists / or replace / drop-then-create) so a
   partial or repeat run is safe. Paste this whole file into the Supabase SQL
   editor and run it once.
   ========================================================================= */

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table if not exists public.cc_team (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  specialty text not null default 'General / Trained Volunteer'
    check (specialty in (
      'Police / Law Enforcement', 'Fire', 'First Responder / EMS',
      'Medical (Nurse / Doctor)', 'Military / Veteran',
      'Security Professional', 'General / Trained Volunteer'
    )),
  /* Eligibility for the schedule LEAD slot. Deliberately separate from
     cc_profiles.role (app permissions) — a person can be a roster Team Lead
     without ever logging in, and an Admin login does not by itself make
     someone eligible to fill the LEAD slot on a service. */
  team_role text not null default 'Team Member'
    check (team_role in ('Team Member', 'Team Lead')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.cc_team is
  'Safety/security volunteer roster. team_role gates the schedule LEAD slot; it is not the auth role.';

create table if not exists public.cc_leaders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cc_meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  meeting_time time,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cc_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('admin', 'team_lead', 'member')),
  /* Optional, Admin-set link from a login to a roster row. Never inferred
     automatically (e.g. by matching email) — an email typo or a stale
     cc_team.email would silently attach the wrong person's login. */
  team_member_id uuid references public.cc_team (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.cc_profiles is
  'One row per auth.users account, created by cc_handle_new_user(). role is app permissions (admin/team_lead/member), assigned via the Admin-only role screen — not the same thing as cc_team.team_role.';

create table if not exists public.cc_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  service_key text not null check (service_key in ('s0', 's1', 's2')),
  slot_type text not null check (slot_type in ('lead', 'member')),
  slot_position integer not null default 0,
  team_member_id uuid references public.cc_team (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cc_schedule_slots_lead_position check (slot_type <> 'lead' or slot_position = 0),
  constraint cc_schedule_slots_unique_slot unique (service_date, service_key, slot_type, slot_position)
);
comment on table public.cc_schedule_slots is
  'One row per position per service — the relational replacement for the old per-Sunday JSON blob. team_member_id null is a position that exists but is unfilled (the old "+ another position" button). A SELECT must never create rows; only an explicit assignment or "add a position" action does.';

create table if not exists public.cc_training_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cc_profiles (id) on delete cascade,
  /* Free text, not an enum/FK — COURSES lives in the app's JS, not the
     database, and has grown before (ss205 was added after ss101-204). */
  course_id text not null,
  done_lessons integer[] not null default '{}',
  quiz_score integer,
  quiz_total integer,
  quiz_passed boolean not null default false,
  cert_name text,
  updated_at timestamptz not null default now(),
  unique (profile_id, course_id)
);
comment on table public.cc_training_records is
  'Per-person, per-course Academy progress, keyed to the authenticated profile. Real auth retires the old freely-selectable "who am I" picker and its guest-bucket reattachment logic — there is no more ambiguity about whose record this is.';

create table if not exists public.cc_onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cc_profiles (id) on delete cascade,
  step_id text not null,
  completed_at timestamptz not null default now(),
  unique (profile_id, step_id)
);

create table if not exists public.cc_activity (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.cc_profiles (id) on delete set null,
  message text not null,
  occurred_at timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index if not exists cc_schedule_slots_date_ix on public.cc_schedule_slots (service_date);
create index if not exists cc_schedule_slots_member_ix on public.cc_schedule_slots (team_member_id);
create index if not exists cc_training_records_profile_ix on public.cc_training_records (profile_id);
create index if not exists cc_onboarding_steps_profile_ix on public.cc_onboarding_steps (profile_id);
create index if not exists cc_activity_occurred_ix on public.cc_activity (occurred_at desc);
create index if not exists cc_profiles_team_member_ix on public.cc_profiles (team_member_id);

-- ============================================================================
-- 3. TRIGGER PLUMBING
-- ============================================================================

create or replace function public.cc_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cc_team_set_updated_at on public.cc_team;
create trigger cc_team_set_updated_at before update on public.cc_team
  for each row execute function public.cc_set_updated_at();

drop trigger if exists cc_leaders_set_updated_at on public.cc_leaders;
create trigger cc_leaders_set_updated_at before update on public.cc_leaders
  for each row execute function public.cc_set_updated_at();

drop trigger if exists cc_meetings_set_updated_at on public.cc_meetings;
create trigger cc_meetings_set_updated_at before update on public.cc_meetings
  for each row execute function public.cc_set_updated_at();

drop trigger if exists cc_profiles_set_updated_at on public.cc_profiles;
create trigger cc_profiles_set_updated_at before update on public.cc_profiles
  for each row execute function public.cc_set_updated_at();

drop trigger if exists cc_schedule_slots_set_updated_at on public.cc_schedule_slots;
create trigger cc_schedule_slots_set_updated_at before update on public.cc_schedule_slots
  for each row execute function public.cc_set_updated_at();

drop trigger if exists cc_training_records_set_updated_at on public.cc_training_records;
create trigger cc_training_records_set_updated_at before update on public.cc_training_records
  for each row execute function public.cc_set_updated_at();

/* Provisions a cc_profiles row the moment an auth.users row exists — see the
   AUTH PREREQUISITE note at the top of this file for why that is safe to
   trust as "an Admin invited this person" rather than "anyone who signed up". */
create or replace function public.cc_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cc_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists cc_on_auth_user_created on auth.users;
create trigger cc_on_auth_user_created
  after insert on auth.users
  for each row execute function public.cc_handle_new_user();

-- ============================================================================
-- 4. PERMISSION HELPER FUNCTIONS
--    language sql + security definer + search_path = '' per Supabase's RLS
--    performance guidance — evaluated once per policy check (not once per
--    row) and immune to RLS recursion on cc_profiles itself.
-- ============================================================================

create or replace function public.cc_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cc_profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.cc_is_admin() from public, anon;
grant execute on function public.cc_is_admin() to authenticated;

create or replace function public.cc_is_team_lead_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cc_profiles
    where id = (select auth.uid()) and role in ('admin', 'team_lead')
  );
$$;
revoke all on function public.cc_is_team_lead_or_admin() from public, anon;
grant execute on function public.cc_is_team_lead_or_admin() to authenticated;

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

alter table public.cc_team enable row level security;
alter table public.cc_leaders enable row level security;
alter table public.cc_meetings enable row level security;
alter table public.cc_profiles enable row level security;
alter table public.cc_schedule_slots enable row level security;
alter table public.cc_training_records enable row level security;
alter table public.cc_onboarding_steps enable row level security;
alter table public.cc_activity enable row level security;

/* cc_team / cc_leaders / cc_meetings — every logged-in team member sees this
   (the same openness the app already had pre-Phase-4: no PIN was ever needed
   just to VIEW the roster). Login itself is now the gate that used to be a
   noindex/robots/vercelignore fence. Only Admin writes. */

drop policy if exists cc_team_select on public.cc_team;
create policy cc_team_select on public.cc_team
  for select to authenticated using (true);
drop policy if exists cc_team_insert on public.cc_team;
create policy cc_team_insert on public.cc_team
  for insert to authenticated with check ((select public.cc_is_admin()));
drop policy if exists cc_team_update on public.cc_team;
create policy cc_team_update on public.cc_team
  for update to authenticated using ((select public.cc_is_admin()));
drop policy if exists cc_team_delete on public.cc_team;
create policy cc_team_delete on public.cc_team
  for delete to authenticated using ((select public.cc_is_admin()));

drop policy if exists cc_leaders_select on public.cc_leaders;
create policy cc_leaders_select on public.cc_leaders
  for select to authenticated using (true);
drop policy if exists cc_leaders_insert on public.cc_leaders;
create policy cc_leaders_insert on public.cc_leaders
  for insert to authenticated with check ((select public.cc_is_admin()));
drop policy if exists cc_leaders_update on public.cc_leaders;
create policy cc_leaders_update on public.cc_leaders
  for update to authenticated using ((select public.cc_is_admin()));
drop policy if exists cc_leaders_delete on public.cc_leaders;
create policy cc_leaders_delete on public.cc_leaders
  for delete to authenticated using ((select public.cc_is_admin()));

drop policy if exists cc_meetings_select on public.cc_meetings;
create policy cc_meetings_select on public.cc_meetings
  for select to authenticated using (true);
drop policy if exists cc_meetings_insert on public.cc_meetings;
create policy cc_meetings_insert on public.cc_meetings
  for insert to authenticated with check ((select public.cc_is_admin()));
drop policy if exists cc_meetings_update on public.cc_meetings;
create policy cc_meetings_update on public.cc_meetings
  for update to authenticated using ((select public.cc_is_admin()));
drop policy if exists cc_meetings_delete on public.cc_meetings;
create policy cc_meetings_delete on public.cc_meetings
  for delete to authenticated using ((select public.cc_is_admin()));

/* cc_profiles — everyone reads their own row (so the app can show "who am I,
   what's my role"); only Admin reads the full list or changes anyone's
   role/team_member_id — that IS the Admin-only role-assignment screen.
   No insert policy: rows come only from cc_handle_new_user() (security
   definer, bypasses RLS). No delete policy: cleanup happens via the
   auth.users cascade, never directly. */

drop policy if exists cc_profiles_select_own on public.cc_profiles;
create policy cc_profiles_select_own on public.cc_profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists cc_profiles_select_admin on public.cc_profiles;
create policy cc_profiles_select_admin on public.cc_profiles
  for select to authenticated using ((select public.cc_is_admin()));
drop policy if exists cc_profiles_update_admin on public.cc_profiles;
create policy cc_profiles_update_admin on public.cc_profiles
  for update to authenticated using ((select public.cc_is_admin()));

/* cc_schedule_slots — everyone sees the schedule; ONLY Admin writes it.
   This is decision #2, verbatim — Team Lead gets no extra write access here,
   even though cc_is_team_lead_or_admin() exists for future use elsewhere. */

drop policy if exists cc_schedule_slots_select on public.cc_schedule_slots;
create policy cc_schedule_slots_select on public.cc_schedule_slots
  for select to authenticated using (true);
drop policy if exists cc_schedule_slots_insert on public.cc_schedule_slots;
create policy cc_schedule_slots_insert on public.cc_schedule_slots
  for insert to authenticated with check ((select public.cc_is_admin()));
drop policy if exists cc_schedule_slots_update on public.cc_schedule_slots;
create policy cc_schedule_slots_update on public.cc_schedule_slots
  for update to authenticated using ((select public.cc_is_admin()));
drop policy if exists cc_schedule_slots_delete on public.cc_schedule_slots;
create policy cc_schedule_slots_delete on public.cc_schedule_slots
  for delete to authenticated using ((select public.cc_is_admin()));

/* cc_training_records / cc_onboarding_steps — completion status was visible
   to the whole team pre-Phase-4 (the old "who am I" picker showed everyone's
   cert count with no PIN at all), so SELECT stays open. WRITE is the row's
   own owner, OR Admin — Admin write is required for the existing per-person
   and all-team annual recertification resets, which clear OTHER people's
   records, not just the acting admin's own. */

drop policy if exists cc_training_records_select on public.cc_training_records;
create policy cc_training_records_select on public.cc_training_records
  for select to authenticated using (true);
drop policy if exists cc_training_records_insert on public.cc_training_records;
create policy cc_training_records_insert on public.cc_training_records
  for insert to authenticated
  with check ((select auth.uid()) = profile_id or (select public.cc_is_admin()));
drop policy if exists cc_training_records_update on public.cc_training_records;
create policy cc_training_records_update on public.cc_training_records
  for update to authenticated
  using ((select auth.uid()) = profile_id or (select public.cc_is_admin()));
drop policy if exists cc_training_records_delete on public.cc_training_records;
create policy cc_training_records_delete on public.cc_training_records
  for delete to authenticated
  using ((select auth.uid()) = profile_id or (select public.cc_is_admin()));

drop policy if exists cc_onboarding_steps_select on public.cc_onboarding_steps;
create policy cc_onboarding_steps_select on public.cc_onboarding_steps
  for select to authenticated using (true);
drop policy if exists cc_onboarding_steps_insert on public.cc_onboarding_steps;
create policy cc_onboarding_steps_insert on public.cc_onboarding_steps
  for insert to authenticated
  with check ((select auth.uid()) = profile_id or (select public.cc_is_admin()));
drop policy if exists cc_onboarding_steps_delete on public.cc_onboarding_steps;
create policy cc_onboarding_steps_delete on public.cc_onboarding_steps
  for delete to authenticated
  using ((select auth.uid()) = profile_id or (select public.cc_is_admin()));

/* cc_activity — shared read-only dashboard feed; any authenticated action may
   log a line, mirroring pre-Phase-4 behaviour where member actions (starting
   a retake, linking a training record) logged activity same as admin ones. */

drop policy if exists cc_activity_select on public.cc_activity;
create policy cc_activity_select on public.cc_activity
  for select to authenticated using (true);
drop policy if exists cc_activity_insert on public.cc_activity;
create policy cc_activity_insert on public.cc_activity
  for insert to authenticated with check (true);

-- ============================================================================
-- 6. TABLE GRANTS
--    RLS policies decide row visibility; Supabase's `authenticated` role still
--    needs the underlying table grant or every query 42501s regardless of
--    policy. anon gets nothing anywhere — this app has no public surface.
-- ============================================================================

grant select, insert, update, delete on public.cc_team to authenticated;
grant select, insert, update, delete on public.cc_leaders to authenticated;
grant select, insert, update, delete on public.cc_meetings to authenticated;
grant select, update on public.cc_profiles to authenticated;
grant select, insert, update, delete on public.cc_schedule_slots to authenticated;
grant select, insert, update, delete on public.cc_training_records to authenticated;
grant select, insert, delete on public.cc_onboarding_steps to authenticated;
grant select, insert on public.cc_activity to authenticated;

-- ============================================================================
-- 7. SEED DATA — the roster already entered into defaults() in index.html.
--    Guarded so re-running this file never double-inserts. Phone numbers are
--    the church's real volunteer data, supplied directly — nothing here is
--    invented (OPEN-ITEMS.md's standing rule). No emails were supplied, so
--    every row's email is left null, matching the app's optional field.
-- ============================================================================

insert into public.cc_team (first_name, last_name, phone, specialty, team_role)
select * from (values
  ('Tyson',    'Garten',    '208-941-3306', 'Security Professional',       'Team Lead'),
  ('Ryan',     'Putnam',    null,           'General / Trained Volunteer', 'Team Member'),
  ('Kristin',  'Elam',      '208-880-2759', 'General / Trained Volunteer', 'Team Member'),
  ('Claude',   'Demesmin',  '208-409-4444', 'General / Trained Volunteer', 'Team Lead'),
  ('Allen',    'Taylor',    '208-571-8677', 'General / Trained Volunteer', 'Team Member'),
  ('Austin',   'Agosta',    '714-924-6993', 'General / Trained Volunteer', 'Team Lead'),
  ('Jason',    'Vega',      '925-698-4057', 'General / Trained Volunteer', 'Team Lead'),
  ('Benjamin', 'Stacy',     '208-739-0966', 'General / Trained Volunteer', 'Team Member'),
  ('Rick',     'Rowe',      '661-609-8578', 'General / Trained Volunteer', 'Team Lead'),
  ('Patrick',  'Brown',     '208-504-5106', 'General / Trained Volunteer', 'Team Member'),
  ('Taylor',   'Sherman',   '209-456-3499', 'Police / Law Enforcement',    'Team Lead'),
  ('Colton',   'Watson',    '971-344-3733', 'General / Trained Volunteer', 'Team Member'),
  ('Jimmy',    'Jobkar',    '816-377-9488', 'General / Trained Volunteer', 'Team Member'),
  ('Ryan',     'Hein',      null,           'General / Trained Volunteer', 'Team Member'),
  ('Andrew',   'Elam',      '360-269-6440', 'General / Trained Volunteer', 'Team Member'),
  ('Jimmy',    'Federico',  null,           'Police / Law Enforcement',    'Team Lead'),
  ('Jon',      'Deputy',    '208-541-9990', 'General / Trained Volunteer', 'Team Member'),
  ('Richard',  'Ingram',    '208-703-6051', 'General / Trained Volunteer', 'Team Member'),
  ('Jay',      'Coulter',   null,           'General / Trained Volunteer', 'Team Member'),
  ('Rudy',     'Rudan',     '208-863-2968', 'General / Trained Volunteer', 'Team Member'),
  ('Doug',     'Troudeau',  null,           'General / Trained Volunteer', 'Team Member'),
  ('Austin',   'Stevenson', null,           'General / Trained Volunteer', 'Team Member')
) as seed(first_name, last_name, phone, specialty, team_role)
where not exists (select 1 from public.cc_team);

insert into public.cc_leaders (name, title, notes)
select 'Roger Yadon', 'Senior Pastor', 'Verified from thecelebration.church/our-team'
where not exists (select 1 from public.cc_leaders);

-- ============================================================================
-- 8. FIRST ADMIN — run this by hand, AFTER someone has logged in once (their
--    cc_profiles row is created by cc_handle_new_user() on that first login,
--    so there is nothing to promote before then). Nothing above this line
--    can guess who that should be, on purpose.
-- ============================================================================

-- update public.cc_profiles set role = 'admin' where email = 'REPLACE-ME@example.com';
