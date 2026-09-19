/* ============================================================================
   BACKFILL-DISPLAY-NAME.sql — one-time backfill of cc_profiles.display_name
   for roster-linked members, from sql/DISPLAY-NAME.sql.
   ----------------------------------------------------------------------------
   A profile linked to a cc_team row (team_member_id set) already has a real
   name on file — the roster's first_name/last_name — so there is no reason
   to make that person type it again in Account settings before their
   certificates look right. This is a plain UPDATE...FROM, not a function or
   trigger: it runs once, now, against whatever rows currently qualify.

   Only touches a profile whose display_name is currently null or blank, so
   it can never clobber a name someone has already set for themselves
   (deliberately re-runnable — a second run is a no-op against every row the
   first run already filled in). concat_ws() joins first_name/last_name and
   skips whichever side is null, so a roster row missing one of the two
   still backfills the other instead of producing a stray leading/trailing
   space or the literal text "null".

   A profile with no team_member_id (not linked to a roster row) is
   untouched by this migration — per the spec, that person still has to set
   their own display_name via the Account modal; there is no roster name to
   borrow from.
   ========================================================================= */

update public.cc_profiles p
set display_name = btrim(concat_ws(' ', t.first_name, t.last_name))
from public.cc_team t
where p.team_member_id = t.id
  and (p.display_name is null or btrim(p.display_name) = '')
  and concat_ws(' ', t.first_name, t.last_name) <> '';
