/* ============================================================================
   HELP-TOUR.sql — guided onboarding tour completion flag.
   ----------------------------------------------------------------------------
   cc_profiles.tour_completed: true once the tour finishes OR is explicitly
   skipped — both are terminal from this flag's point of view, since "ask me
   again" was never part of the spec (unlike push_enabled's null-vs-false
   distinction). Absent (null) is the only "show it automatically" state;
   there is no separate "declined" value to invent.

   Re-launching from the "?" header button never touches this column at all
   — a member who already finished the tour can replay it as many times as
   they like without re-flipping anything server-side.

   Same self-update shape as push_enabled: the existing self-update-own-row
   policy (added for theme, see CC-PROFILES-GRANT-FIX.sql) already covers
   the ROW; RLS never restricts which COLUMN an update touches, so the
   actual scope is the explicit column GRANT below, not the policy.
   ========================================================================= */

alter table public.cc_profiles
  add column if not exists tour_completed boolean;

grant update (tour_completed) on public.cc_profiles to authenticated;
