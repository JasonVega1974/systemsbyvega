/* ============================================================================
   NEWS-RETRY-PREVIEW.sql — lets Admin re-fetch a news post's Open Graph
   preview without deleting and re-posting it.
   ----------------------------------------------------------------------------
   NEWS.sql deliberately shipped with no UPDATE policy at all ("an admin who
   needs to fix a typo removes the post and re-adds it"). That was fine when
   the only editable content was admin-typed text; it stops being fine once
   a post can legitimately need a second attempt at something OUTSIDE the
   admin's control — the target site blocking/challenging the preview
   fetcher, a transient timeout, or (as shipped) a genuine extraction bug.
   Deleting and re-posting to retry loses the original posted_date and
   activity-log trail for no reason.

   Scope stays narrow: Admin only, and only the four og_* preview columns
   plus og_fetched_at — not title/url/summary/posted_date, which still
   follow the original "remove and re-add" rule. RLS only gates ROWS, not
   columns (see CC-PROFILES-GRANT-FIX.sql), so the column-level GRANT below
   is what actually enforces that narrower scope; the policy alone would
   permit rewriting the whole row.
   ========================================================================= */

drop policy if exists cc_news_update on public.cc_news;
create policy cc_news_update on public.cc_news
  for update to authenticated using ((select public.cc_is_admin()));

grant update (og_image_url, og_title, og_description, og_fetched_at) on public.cc_news to authenticated;
