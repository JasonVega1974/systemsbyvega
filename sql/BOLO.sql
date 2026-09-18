/* ============================================================================
   BOLO.sql — Be-On-the-Lookout alerts, integrated into Incident Reports
   for the Celebration Church Safety & Security Team app (project
   newjbexmvltvtmxollca.supabase.co).

   cc_bolos follows the same RLS shape as cc_incidents: authenticated SELECT
   (everyone sees every BOLO — there is no restricted/sensitive tier here),
   Team Lead or Admin INSERT/UPDATE, no DELETE at all — a BOLO is resolved,
   never removed. linked_incident_id is optional and set automatically when
   a BOLO is created from an existing incident report's "Create BOLO from
   this Report" button; ON DELETE SET NULL because losing that cross-
   reference is not a reason to lose the BOLO itself (incidents are never
   deleted in this app anyway, but the column shouldn't assume that forever).

   Photos reuse the existing cc-incident-photos bucket (no new bucket) under
   a bolo/{id}/{filename} prefix, so the storage policies below are ADDITIVE
   to the existing cc_incident_photos_storage_* policies (which key off
   foldername[1] = the incident id) — a completely disjoint prefix, no
   conflict. issued_by_name is a snapshot at issue time, same reasoning as
   cc_notes.posted_by_name: cc_profiles has no general cross-profile read.
   ========================================================================= */

create table if not exists public.cc_bolos (
  id uuid primary key default gen_random_uuid(),
  subject_description text not null,
  status text not null default 'Active' check (status in ('Active', 'Resolved')),
  notes text,
  linked_incident_id uuid references public.cc_incidents (id) on delete set null,
  issued_by uuid not null references public.cc_profiles (id) on delete restrict,
  issued_by_name text not null,
  issued_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.cc_bolos is
  'Be-On-the-Lookout alerts. Authenticated SELECT, Team Lead/Admin INSERT+UPDATE, no DELETE — resolve via status instead.';

create index if not exists cc_bolos_status_ix on public.cc_bolos (status);
create index if not exists cc_bolos_linked_incident_ix on public.cc_bolos (linked_incident_id);

drop trigger if exists cc_bolos_set_updated_at on public.cc_bolos;
create trigger cc_bolos_set_updated_at before update on public.cc_bolos
  for each row execute function public.cc_set_updated_at();

alter table public.cc_bolos enable row level security;

drop policy if exists cc_bolos_select on public.cc_bolos;
create policy cc_bolos_select on public.cc_bolos
  for select to authenticated using (true);
drop policy if exists cc_bolos_insert on public.cc_bolos;
create policy cc_bolos_insert on public.cc_bolos
  for insert to authenticated
  with check ((select public.cc_is_team_lead_or_admin()) and issued_by = (select auth.uid()));
drop policy if exists cc_bolos_update on public.cc_bolos;
create policy cc_bolos_update on public.cc_bolos
  for update to authenticated
  using ((select public.cc_is_team_lead_or_admin()));

grant select, insert, update on public.cc_bolos to authenticated;

-- ============================================================================
-- STORAGE — bolo/{id}/{filename} inside the existing cc-incident-photos
-- bucket. Additive to the incident-photo policies already on this bucket.
-- ============================================================================

drop policy if exists cc_bolo_photos_storage_select on storage.objects;
create policy cc_bolo_photos_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cc-incident-photos'
    and (storage.foldername(name))[1] = 'bolo'
    and exists (select 1 from public.cc_bolos b where b.id::text = (storage.foldername(name))[2])
  );

drop policy if exists cc_bolo_photos_storage_insert on storage.objects;
create policy cc_bolo_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cc-incident-photos'
    and (storage.foldername(name))[1] = 'bolo'
    and (select public.cc_is_team_lead_or_admin())
    and exists (select 1 from public.cc_bolos b where b.id::text = (storage.foldername(name))[2])
  );

insert into public.cc_schema_migrations (filename) values ('BOLO.sql')
  on conflict (filename) do nothing;
