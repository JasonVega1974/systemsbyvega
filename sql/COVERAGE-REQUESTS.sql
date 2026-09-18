/* ============================================================================
   COVERAGE-REQUESTS.sql — shift coverage request/pickup system.
   ----------------------------------------------------------------------------
   cc_coverage_requests: a team member flags a service they can't cover;
   any other member can pick it up, or a Team Lead/Admin assigns someone
   directly. Either path must write cc_schedule_slots (swap the requester's
   slot to the covering volunteer's team_member_id) — but that table's
   UPDATE policy is Admin-only (see CELEBRATION-SAFETY-PHASE4.sql: "Team
   Lead gets no extra write access here"). A plain member covering someone
   ELSE's request, or a Team Lead assigning someone, both need a write that
   ordinary RLS on cc_schedule_slots cannot grant them without loosening it
   for everyone. cc_resolve_coverage_request() is the same pattern this app
   already uses for exactly this shape of problem (cc_handle_new_user(),
   cc_is_admin()) — a narrowly-scoped SECURITY DEFINER function that performs
   ONE sanctioned state transition, not a broadened table grant.

   Two authorization paths inside the function, not two functions: self-
   cover (p_assign_team_member_id omitted, target = caller, always allowed
   on an open request — the "any team member can click I'll Cover This"
   path) and Team-Lead-or-Admin assigning ANY roster member by
   cc_team.id. A plain member cannot use this function to assign someone
   ELSE to cover (only themselves) — the spec never asks for that.

   The admin/lead path takes a cc_team id, not a cc_profiles id, on
   purpose: cc_team is readable by every signed-in user (no RLS gap to
   populate an "assign to" dropdown with), whereas cc_profiles is
   own-row-or-Admin-only — extending that read to Team Lead just to let
   them pick a name would be a real RLS change for a UI convenience this
   function can sidestep instead by resolving cc_team.id -> cc_profiles.id
   itself (it runs as SECURITY DEFINER, so it isn't bound by the caller's
   own read access either way).

   The schedule-slot swap is best-effort: if the requester has no cc_profiles
   .team_member_id, or no matching cc_schedule_slots row exists for their
   service_date/service_key, the coverage request still resolves (the human
   problem — "who's covering this" — is answered either way) but the boolean
   returned tells the client whether the schedule itself actually changed,
   so the UI can say so rather than silently claiming a swap that didn't
   happen.

   Cancellation needs no RPC: it's a plain status flip by the request's own
   owner or an Admin/Team Lead, which ordinary RLS expresses directly.

   profile_name / covered_by_name are denormalized snapshots, same reasoning
   as cc_notes.posted_by_name and cc_bolos.issued_by_name: cc_profiles has no
   general cross-profile SELECT (own row or Admin only), so a plain member
   viewing someone else's request could never resolve profile_id/covered_by
   _profile_id to a name otherwise. profile_name is set by the client at
   INSERT time (activeName(), same as every other snapshot in this app);
   covered_by_name is resolved INSIDE cc_resolve_coverage_request() at
   resolution time, using the identical team_member_id -> "First Last" ->
   else-email fallback activeName() uses client-side, since the RPC (running
   as the covering user) has the same cc_profiles-select-own-row restriction
   a plain client call would. */
create table if not exists public.cc_coverage_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cc_profiles (id) on delete cascade,
  profile_name text not null,
  service_date date not null,
  service_key text not null check (service_key in ('s0', 's1', 's2')),
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved', 'cancelled')),
  covered_by_profile_id uuid references public.cc_profiles (id) on delete set null,
  covered_by_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.cc_coverage_requests is
  'Shift coverage requests. Authenticated SELECT, INSERT self-only, UPDATE (status flip) by the requester or Team Lead/Admin. The resolve-by-covering transition (status + covered_by_profile_id + the matching cc_schedule_slots swap) goes through cc_resolve_coverage_request(), not a direct UPDATE, because covering someone ELSE''s request needs a write cc_schedule_slots RLS does not grant to a plain member or a Team Lead.';

create index if not exists cc_coverage_requests_status_ix on public.cc_coverage_requests (status);
create index if not exists cc_coverage_requests_service_ix on public.cc_coverage_requests (service_date, service_key);
create index if not exists cc_coverage_requests_profile_ix on public.cc_coverage_requests (profile_id);

alter table public.cc_coverage_requests enable row level security;

drop policy if exists cc_coverage_requests_select on public.cc_coverage_requests;
create policy cc_coverage_requests_select on public.cc_coverage_requests
  for select to authenticated using (true);

drop policy if exists cc_coverage_requests_insert on public.cc_coverage_requests;
create policy cc_coverage_requests_insert on public.cc_coverage_requests
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

/* Covers cancellation only (requester cancels their own open request, or
   Team Lead/Admin cancels anyone's) — a plain status flip to 'cancelled'.
   The resolve-by-covering transition never goes through this policy even
   for an Admin/Team Lead doing the assigning; it always goes through
   cc_resolve_coverage_request() below, since that RPC also does the
   cc_schedule_slots swap and the covered_by_name resolution a plain
   UPDATE here would silently skip. */
drop policy if exists cc_coverage_requests_update on public.cc_coverage_requests;
create policy cc_coverage_requests_update on public.cc_coverage_requests
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.cc_is_team_lead_or_admin()));

grant select, insert, update on public.cc_coverage_requests to authenticated;

-- ============================================================================
-- RESOLUTION RPC
-- ============================================================================

create or replace function public.cc_resolve_coverage_request(p_request_id uuid, p_assign_team_member_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.cc_coverage_requests;
  v_caller uuid := (select auth.uid());
  v_target uuid;
  v_requester_member uuid;
  v_target_member uuid := p_assign_team_member_id;
  v_target_name text;
  v_slot_id uuid;
  v_slot_updated boolean := false;
begin
  select * into v_request from public.cc_coverage_requests where id = p_request_id for update;
  if not found then
    raise exception 'Coverage request not found';
  end if;
  if v_request.status <> 'open' then
    raise exception 'This coverage request is no longer open';
  end if;

  if p_assign_team_member_id is null then
    -- Self-cover: always allowed on an open request.
    v_target := v_caller;
    select team_member_id into v_target_member from public.cc_profiles where id = v_target;
  else
    -- Assigning someone else: Team Lead/Admin only.
    if not (select public.cc_is_team_lead_or_admin()) then
      raise exception 'Only a Team Lead or Admin can assign someone other than yourself';
    end if;
    select id into v_target from public.cc_profiles where team_member_id = p_assign_team_member_id;
    if v_target is null then
      raise exception 'That team member does not have a login linked yet — an Admin sets that on the Team tab';
    end if;
  end if;

  select team_member_id into v_requester_member from public.cc_profiles where id = v_request.profile_id;

  if v_requester_member is not null and v_target_member is not null then
    select id into v_slot_id
      from public.cc_schedule_slots
      where service_date = v_request.service_date
        and service_key = v_request.service_key
        and team_member_id = v_requester_member
      limit 1;
    if v_slot_id is not null then
      update public.cc_schedule_slots set team_member_id = v_target_member where id = v_slot_id;
      v_slot_updated := true;
    end if;
  end if;

  -- Same team_member_id -> "First Last" -> else-email fallback as activeName() client-side.
  select (t.first_name || ' ' || t.last_name) into v_target_name
    from public.cc_team t where t.id = v_target_member;
  if v_target_name is null then
    select email into v_target_name from public.cc_profiles where id = v_target;
  end if;

  update public.cc_coverage_requests
    set status = 'resolved', covered_by_profile_id = v_target, covered_by_name = v_target_name, resolved_at = now()
    where id = p_request_id;

  return jsonb_build_object('slot_updated', v_slot_updated, 'covered_by', v_target, 'covered_by_name', v_target_name);
end;
$$;
revoke all on function public.cc_resolve_coverage_request(uuid, uuid) from public, anon;
grant execute on function public.cc_resolve_coverage_request(uuid, uuid) to authenticated;
