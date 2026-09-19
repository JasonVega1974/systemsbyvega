/* ============================================================================
   PRAYER-REQUESTS.sql — Prayer Request Board (new Dashboard card).
   ----------------------------------------------------------------------------
   posted_by_name is a denormalized snapshot, same reasoning as
   cc_notes.posted_by_name and cc_coverage_requests.profile_name: cc_profiles
   has no general cross-profile SELECT (own row or Admin only), so a plain
   member viewing someone else's prayer request could never resolve
   profile_id to a name otherwise. It is not in the field list the feature
   was specified with, but is required for the feature to actually render a
   name for anyone other than the poster or an Admin — the same gap every
   other bulletin-board-shaped feature in this app already had to close.

   RLS: authenticated SELECT (every signed-in member sees the whole board)
   and INSERT (self only — profile_id must be the caller). UPDATE is
   intentionally narrower than the row-level policy alone expresses: the
   policy allows the poster or an Admin to UPDATE the row at all, but the
   column-level GRANT below restricts what an UPDATE can actually touch to
   (answered, answered_at) — the same "row policy is necessary but not
   sufficient" pattern as CC-PROFILES-GRANT-FIX.sql. There is no editing the
   request text itself; the spec is explicit that a wanted change means
   remove-and-repost, not an edit path, and this makes that a database
   guarantee rather than just a client-side omission. DELETE is self or
   Admin, matching the spec.
   ========================================================================= */

create table if not exists public.cc_prayers (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.cc_profiles (id) on delete cascade,
  posted_by_name text not null,
  request_text   text not null,
  posted_at      timestamptz not null default now(),
  answered       boolean not null default false,
  answered_at    timestamptz
);
comment on table public.cc_prayers is
  'Prayer Request Board. Any authenticated member posts; the poster or Admin can mark answered or delete. No editing the request text — remove and re-post instead (enforced by the UPDATE column grant below, not just the UI).';

create index if not exists cc_prayers_answered_posted_ix on public.cc_prayers (answered, posted_at desc);

alter table public.cc_prayers enable row level security;

drop policy if exists cc_prayers_select on public.cc_prayers;
create policy cc_prayers_select on public.cc_prayers
  for select to authenticated
  using (true);

drop policy if exists cc_prayers_insert on public.cc_prayers;
create policy cc_prayers_insert on public.cc_prayers
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists cc_prayers_update on public.cc_prayers;
create policy cc_prayers_update on public.cc_prayers
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.cc_is_admin()))
  with check (profile_id = (select auth.uid()) or (select public.cc_is_admin()));

drop policy if exists cc_prayers_delete on public.cc_prayers;
create policy cc_prayers_delete on public.cc_prayers
  for delete to authenticated
  using (profile_id = (select auth.uid()) or (select public.cc_is_admin()));

grant select, insert, delete on public.cc_prayers to authenticated;
-- Narrower than the UPDATE policy above on purpose — see the header comment.
grant update (answered, answered_at) on public.cc_prayers to authenticated;
