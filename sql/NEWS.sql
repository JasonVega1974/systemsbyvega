/* ============================================================================
   NEWS.sql — News tab for the Celebration Church Safety & Security Team app
   (project newjbexmvltvtmxollca.supabase.co).

   Admin posts a link (any URL — Facebook, a news article, a church
   announcement) with a title, optional summary, and a posted date the
   admin sets (not necessarily today — this is a curated feed, not an
   activity log). Displayed as a plain link card: title, source domain,
   summary, "Read More →" out to the URL. No scraping, no iframe embeds, no
   fetched previews — this table stores exactly what the admin typed and
   nothing else. Admin-only INSERT/DELETE; no UPDATE policy at all — an
   admin who needs to fix a typo removes the post and re-adds it, matching
   "Admin can remove any post" being the only edit verb the spec calls for.
   ========================================================================= */

create table if not exists public.cc_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  summary text,
  posted_date date not null default current_date,
  posted_by uuid not null references public.cc_profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);
comment on table public.cc_news is
  'Admin-curated link cards (News tab). Authenticated SELECT, admin-only INSERT/DELETE.';

create index if not exists cc_news_posted_date_ix on public.cc_news (posted_date desc);

alter table public.cc_news enable row level security;

drop policy if exists cc_news_select on public.cc_news;
create policy cc_news_select on public.cc_news
  for select to authenticated using (true);
drop policy if exists cc_news_insert on public.cc_news;
create policy cc_news_insert on public.cc_news
  for insert to authenticated
  with check ((select public.cc_is_admin()) and posted_by = (select auth.uid()));
drop policy if exists cc_news_delete on public.cc_news;
create policy cc_news_delete on public.cc_news
  for delete to authenticated using ((select public.cc_is_admin()));

grant select, insert, delete on public.cc_news to authenticated;

insert into public.cc_schema_migrations (filename) values ('NEWS.sql')
  on conflict (filename) do nothing;
