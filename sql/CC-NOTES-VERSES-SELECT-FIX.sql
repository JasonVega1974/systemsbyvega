/* ============================================================================
   CC-NOTES-VERSES-SELECT-FIX.sql — close an anon-read hole on cc_notes and
   cc_verses left by VERSES-AND-NOTES.sql.
   ----------------------------------------------------------------------------
   VERSES-AND-NOTES.sql wrote both SELECT policies with no `to` clause:

     create policy cc_verses_select on public.cc_verses for select using (true);
     create policy cc_notes_select  on public.cc_notes  for select using (true);

   A CREATE POLICY with no `to <role>` applies to PUBLIC — every role,
   including anon — not just `authenticated`. Combined with the blanket
   `grant ... to anon` every table gets at creation (the same discovery
   CC-PROFILES-GRANT-FIX.sql made for cc_profiles), this means Team Notes
   and the Weekly Verse have been readable by anyone holding the public
   anon key, no login required, since the feature shipped. Confirmed live
   via `supabase db dump --linked` and the resulting pg_policies output
   before writing this fix — this is not a theoretical read of the file.

   Raising the stakes today: TEAM-NOTES-OPEN.sql opens cc_notes posting to
   every authenticated member, so more content (schedule changes, names,
   day-to-day team chatter) will accumulate behind what was actually an
   open door the whole time. Fixing this now rather than deferring it.

   Fix: drop and recreate both SELECT policies scoped `to authenticated`.
   No grant changes needed — grants were never the problem here; the
   missing role scope on the policy itself was.
   ========================================================================= */

drop policy if exists cc_verses_select on public.cc_verses;
create policy cc_verses_select on public.cc_verses
  for select to authenticated using (true);

drop policy if exists cc_notes_select on public.cc_notes;
create policy cc_notes_select on public.cc_notes
  for select to authenticated using (true);
