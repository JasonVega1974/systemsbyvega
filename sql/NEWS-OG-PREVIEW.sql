/* ============================================================================
   NEWS-OG-PREVIEW.sql — cached Open Graph preview data for News link cards.
   ----------------------------------------------------------------------------
   Four nullable columns, no RLS/grant changes: cc_news_select already covers
   reading them (authenticated, using true), and cc_news_insert already covers
   writing them (admin-only, no per-column restriction). Nothing reads or
   writes these columns except the News feature itself.

   og_fetched_at is the tri-state signal the client renders against, not just
   a timestamp: null means "never attempted, or the attempt failed outright"
   (index.html falls back to the plain link card exactly as before — no
   thumbnail, no placeholder). Non-null means "the server got a response and
   looked for Open Graph tags" — og_image_url/og_title/og_description may
   still individually be null if the page had none, which is what drives the
   "no og:image -> styled placeholder" case, distinct from "fetch failed
   entirely -> plain card" (see /api/og-preview.js).

   Fetched once, at post time (see saveNews() in index.html), never on page
   load — members never trigger an outbound request to a link an admin
   posted; they only ever read what's already cached here.
   ========================================================================= */

alter table public.cc_news
  add column if not exists og_image_url text,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_fetched_at timestamptz;
