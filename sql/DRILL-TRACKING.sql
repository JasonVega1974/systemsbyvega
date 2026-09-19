/* ============================================================================
   DRILL-TRACKING.sql — drill log & compliance tracking (new subsection
   inside Team Meetings).
   ----------------------------------------------------------------------------
   One row per drill actually conducted. Compliance status (last conducted /
   next due / on-track-due-soon-overdue) is computed client-side from these
   rows plus a fixed frequency table, the same way currentVerseWeek() and
   nextSunday() compute their own dates rather than storing a redundant
   "next due" column here that would need to be kept in sync by hand.

   participant_ids is a plain uuid[] of cc_team.id, not a join table — cc_team
   is fully readable by every authenticated user already (unlike cc_profiles),
   so resolving names for display is a client-side lookup against S.team with
   no RLS gap to work around, and a fixed small array is simpler than a join
   table for what is, at most, a few dozen participants per drill. Deleting a
   team member does NOT retroactively rewrite past drill rows (no ON DELETE
   behavior needed on the array itself); a stale id just fails to resolve to
   a name client-side and is skipped, same as any other "member left the
   roster" edge case elsewhere in this app.

   conducted_by_name is a denormalized snapshot for the same reason as
   cc_coverage_requests.profile_name: cc_profiles has no general cross-
   profile SELECT, so a plain member viewing the drill log could never
   resolve conducted_by to a name otherwise.

   RLS: authenticated SELECT (compliance status is team-wide information,
   not restricted). INSERT is Team Lead or Admin, matching the spec ("Admin
   and Team Lead can log drills"). DELETE is Admin-only, for correcting a
   mis-entered drill. No UPDATE policy — the spec describes logging and
   removing, not editing after the fact.
   ========================================================================= */

create table if not exists public.cc_drills (
  id                uuid primary key default gen_random_uuid(),
  drill_type        text not null check (drill_type in ('fire', 'code_adam', 'active_shooter', 'severe_weather', 'medical')),
  conducted_date    date not null,
  duration_minutes  integer check (duration_minutes is null or duration_minutes > 0),
  location_notes    text,
  participant_ids   uuid[] not null default '{}',
  conducted_by      uuid references public.cc_profiles (id) on delete set null,
  conducted_by_name text not null,
  created_at        timestamptz not null default now()
);
comment on table public.cc_drills is
  'Drill log. drill_type: fire (quarterly), code_adam (every 6 months), active_shooter (annually), severe_weather (annually), medical (annually). Next-due date and On Track/Due Soon/Overdue status are computed client-side from the most recent conducted_date per drill_type, not stored here.';

create index if not exists cc_drills_type_date_ix on public.cc_drills (drill_type, conducted_date desc);

alter table public.cc_drills enable row level security;

drop policy if exists cc_drills_select on public.cc_drills;
create policy cc_drills_select on public.cc_drills
  for select to authenticated
  using (true);

drop policy if exists cc_drills_insert on public.cc_drills;
create policy cc_drills_insert on public.cc_drills
  for insert to authenticated
  with check ((select public.cc_is_team_lead_or_admin()));

drop policy if exists cc_drills_delete on public.cc_drills;
create policy cc_drills_delete on public.cc_drills
  for delete to authenticated
  using ((select public.cc_is_admin()));

grant select, insert, delete on public.cc_drills to authenticated;
