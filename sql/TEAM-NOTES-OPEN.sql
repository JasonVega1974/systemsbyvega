/* ============================================================================
   TEAM-NOTES-OPEN.sql — open cc_notes posting to every authenticated member
   for the Celebration Church Safety & Security Team app (project
   newjbexmvltvtmxollca.supabase.co).

   Previous rule (VERSES-AND-NOTES.sql): only Admin/Team Lead could post at
   all. New rule: any signed-in member can post a note under their own name;
   Admin and Team Lead can edit or remove ANY note; a member can remove
   (never edit) their own. cc_notes_select is untouched — it was already
   authenticated-read-all.
   ========================================================================= */

drop policy if exists cc_notes_insert on public.cc_notes;
create policy cc_notes_insert on public.cc_notes
  for insert to authenticated
  with check (posted_by = (select auth.uid()));

drop policy if exists cc_notes_update on public.cc_notes;
create policy cc_notes_update on public.cc_notes
  for update to authenticated
  using ((select public.cc_is_team_lead_or_admin()));

drop policy if exists cc_notes_delete on public.cc_notes;
create policy cc_notes_delete on public.cc_notes
  for delete to authenticated
  using (posted_by = (select auth.uid()) or (select public.cc_is_team_lead_or_admin()));

insert into public.cc_schema_migrations (filename) values ('TEAM-NOTES-OPEN.sql')
  on conflict (filename) do nothing;
