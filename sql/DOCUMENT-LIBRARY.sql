/* ============================================================================
   DOCUMENT-LIBRARY.sql — secure document library (new "Documents" tab).
   ----------------------------------------------------------------------------
   Every row is either a private upload (storage_path set, external_url null)
   or a public reference link (external_url set, storage_path null) — never
   both, never neither. This lets the same table and the same rendering code
   carry the three pre-populated public-source cards (CISA's bomb threat
   checklist, the two Idaho statute pages) alongside admin-uploaded private
   files (policy manual, background-check consent forms, etc.) without a
   second table or a client-side branch on "is this a link or a file."

   RLS: authenticated SELECT (every signed-in team member can see and
   download everything in the library — there is no per-document
   restriction concept here, unlike incident reports). INSERT/DELETE are
   admin-only, matching the spec ("Admin uploads and removes; any
   authenticated member downloads"). No UPDATE policy — editing a posted
   document's metadata isn't part of the spec; removing and re-adding covers
   correcting a mistake.

   uploaded_by_name is a denormalized snapshot, same reasoning as
   cc_notes.posted_by_name and cc_coverage_requests.profile_name:
   cc_profiles has no general cross-profile SELECT (own row or Admin only),
   so a plain member browsing the library could never resolve uploaded_by
   to a name otherwise. The three seed rows below have no real uploader —
   uploaded_by stays null and uploaded_by_name says so plainly rather than
   inventing a person.
   ========================================================================= */

create table if not exists public.cc_documents (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category       text not null check (category in ('policy', 'forms', 'legal', 'insurance', 'training')),
  description    text,
  storage_path   text,
  external_url   text,
  uploaded_by    uuid references public.cc_profiles (id) on delete set null,
  uploaded_by_name text not null,
  uploaded_at    timestamptz not null default now(),
  constraint cc_documents_exactly_one_source check (
    (storage_path is not null and external_url is null) or
    (storage_path is null and external_url is not null)
  )
);
comment on table public.cc_documents is
  'Document Library. category: policy=Policy & Procedures, forms=Forms & Templates, legal=Legal & Compliance, insurance=Insurance, training=Training Materials. Exactly one of storage_path (private cc-documents bucket upload) or external_url (public reference link) is set per row.';

create index if not exists cc_documents_category_ix on public.cc_documents (category);

alter table public.cc_documents enable row level security;

drop policy if exists cc_documents_select on public.cc_documents;
create policy cc_documents_select on public.cc_documents
  for select to authenticated
  using (true);

drop policy if exists cc_documents_insert on public.cc_documents;
create policy cc_documents_insert on public.cc_documents
  for insert to authenticated
  with check ((select public.cc_is_admin()));

drop policy if exists cc_documents_delete on public.cc_documents;
create policy cc_documents_delete on public.cc_documents
  for delete to authenticated
  using ((select public.cc_is_admin()));

grant select, insert, delete on public.cc_documents to authenticated;

-- ── SEED: verified public reference documents (no upload needed) ──────────
insert into public.cc_documents (title, category, description, external_url, uploaded_by, uploaded_by_name)
select 'CISA Bomb Threat Checklist', 'forms',
  'Official one-page checklist for whoever answers a bomb-threat call — the questions to ask, what to listen for, and what to record.',
  'https://www.cisa.gov/sites/default/files/2025-08/Bomb_Threat_Checklist_082025_508.pdf',
  null, 'Verified public source (CISA.gov)'
where not exists (select 1 from public.cc_documents where external_url = 'https://www.cisa.gov/sites/default/files/2025-08/Bomb_Threat_Checklist_082025_508.pdf');

insert into public.cc_documents (title, category, description, external_url, uploaded_by, uploaded_by_name)
select 'Idaho Code § 16-1605 — Mandatory Reporting', 'legal',
  'The state statute governing mandatory reporting of child abuse, abandonment, or neglect — the 24-hour reporting deadline and who must report.',
  'https://legislature.idaho.gov/statutesrules/idstat/title16/t16ch16/sect16-1605/',
  null, 'Verified public source (Idaho Legislature)'
where not exists (select 1 from public.cc_documents where external_url = 'https://legislature.idaho.gov/statutesrules/idstat/title16/t16ch16/sect16-1605/');

insert into public.cc_documents (title, category, description, external_url, uploaded_by, uploaded_by_name)
select 'Idaho Code § 5-348 — Volunteer Security Personnel Immunity', 'legal',
  'The state statute covering civil immunity for volunteer security personnel at religious organizations.',
  'https://legislature.idaho.gov/statutesrules/idstat/Title05/T05CH3/SECT05-348/',
  null, 'Verified public source (Idaho Legislature)'
where not exists (select 1 from public.cc_documents where external_url = 'https://legislature.idaho.gov/statutesrules/idstat/Title05/T05CH3/SECT05-348/');

-- ── STORAGE ──────────────────────────────────────────────────────────────
-- Private bucket, same pattern as cc-facility-maps and cc-incident-photos —
-- every download goes through a signed URL, 1-hour expiry, never a public
-- bucket URL.
insert into storage.buckets (id, name, public)
select 'cc-documents', 'cc-documents', false
where not exists (select 1 from storage.buckets where id = 'cc-documents');

-- storage.foldername(name)[1] is the category — the client always uploads
-- to {category}/{filename}, matching cc_documents.category exactly.
drop policy if exists cc_documents_storage_select on storage.objects;
create policy cc_documents_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'cc-documents');

drop policy if exists cc_documents_storage_insert on storage.objects;
create policy cc_documents_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cc-documents' and (select public.cc_is_admin()));

drop policy if exists cc_documents_storage_delete on storage.objects;
create policy cc_documents_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'cc-documents' and (select public.cc_is_admin()));
