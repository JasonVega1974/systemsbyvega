/* ============================================================================
   EVENTS.sql — Event & Webinar Calendar (News tab, "Events" view).
   ----------------------------------------------------------------------------
   Admin-curated, not auto-populated — same shape as cc_news: whoever has
   Admin reads a real webinar/training page and types in what it found.

   event_date is nullable on purpose: FEMA's Independent Study catalog has
   no fixed date at all ("Self-paced"), so a null date means "always
   relevant," not "unscheduled" — sortedEvents() in index.html treats a
   null date as perpetually upcoming, never as past.

   posted_by is nullable (on delete set null), matching cc_documents'
   uploaded_by for the same reason: the three seed rows below are inserted
   by this migration script directly, not by a live authenticated admin
   session, so there is no real auth.uid() to attribute them to. Unlike
   cc_documents there is no posted_by_name here — nothing in the Events UI
   displays "posted by X" (same as cc_news, which never shows a poster's
   name either), so there is no cross-profile name-resolution gap to close.

   RLS: authenticated SELECT; admin-only INSERT/UPDATE/DELETE. UPDATE is
   included (unlike cc_news, which only ever supported delete-and-repost)
   because fixing a typo on a multi-field event card is a much likelier
   edit than on a one-line news link.
   ========================================================================= */

create table if not exists public.cc_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  event_date  date,
  event_time  text,
  description text,
  url         text,
  location    text,
  category    text not null default 'other'
              check (category in ('webinar', 'training', 'law_enforcement', 'church', 'other')),
  posted_by   uuid references public.cc_profiles (id) on delete set null,
  posted_at   timestamptz not null default now()
);
comment on table public.cc_events is
  'Admin-curated event/webinar calendar (News tab, Events view). Authenticated SELECT, admin-only write.';

create index if not exists cc_events_event_date_ix on public.cc_events (event_date);

alter table public.cc_events enable row level security;

drop policy if exists cc_events_select on public.cc_events;
create policy cc_events_select on public.cc_events
  for select to authenticated using (true);

drop policy if exists cc_events_insert on public.cc_events;
create policy cc_events_insert on public.cc_events
  for insert to authenticated
  with check ((select public.cc_is_admin()));

drop policy if exists cc_events_update on public.cc_events;
create policy cc_events_update on public.cc_events
  for update to authenticated
  using ((select public.cc_is_admin()))
  with check ((select public.cc_is_admin()));

drop policy if exists cc_events_delete on public.cc_events;
create policy cc_events_delete on public.cc_events
  for delete to authenticated using ((select public.cc_is_admin()));

grant select, insert, update, delete on public.cc_events to authenticated;

-- Seed content — every URL verified to actually resolve before inclusion.
insert into public.cc_events (title, event_date, event_time, description, url, location, category) values
(
  'Strategies to Deter Targeted Violence',
  '2026-09-23',
  '1:30 PM - 2:30 PM ET',
  'CISA-hosted virtual seminar on preventing and mitigating targeted-violence threats, explicitly aimed at a broad audience including faith-based organizations.',
  'https://www.cisa.gov/news-events/events/strategies-deter-targeted-violence-10',
  'Online',
  'webinar'
),
(
  'FEMA Independent Study Courses (Self-Paced)',
  null,
  null,
  'Free, self-paced emergency-management courses from FEMA''s training catalog. Recommended for this team: IS-907.A (Active Shooter), IS-360 (Mass Casualty Incidents), IS-366.A (Children in Disasters), IS-906 (Workplace Security Awareness) - see Training Resources for direct links to each.',
  'https://training.fema.gov/is/crslist.aspx',
  'Online',
  'training'
),
(
  'Nampa PD Community Outreach',
  null,
  null,
  'Contact Nampa PD community liaison for schedule. The department''s Community Involvement page lists crime-prevention, child fingerprinting, and outreach programs available to schedule for church groups.',
  'https://www.cityofnampa.us/778/Community-Involvement',
  'Nampa, ID',
  'law_enforcement'
);
