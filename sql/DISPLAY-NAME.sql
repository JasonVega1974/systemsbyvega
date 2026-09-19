/* ============================================================================
   DISPLAY-NAME.sql — cc_profiles.display_name (certificate name fix).
   ----------------------------------------------------------------------------
   The feature request that asked for this said the column "already exists
   on cc_profiles" and that no migration was needed. That turned out to be
   wrong: pointing the built app at the real database and watching
   resolveAuth()'s own profile SELECT run showed
     "column cc_profiles.display_name does not exist"
   on every single login — this migration is the correction, caught by the
   browser pass before it ever reached production. Without it, adding
   display_name to resolveAuth()'s select() list (required so
   certDisplayName() and the Account modal's "Your Name" field have
   anything to read) would have broken sign-in for the entire team the
   moment this shipped.

   Same self-update shape as theme/tour_completed/push_enabled: the
   existing self-update-own-row RLS policy (added for theme, see
   CC-PROFILES-GRANT-FIX.sql) already covers the ROW; RLS never restricts
   which COLUMN an update touches, so the actual scope is the explicit
   column GRANT below, not the policy. cc_profiles' blanket UPDATE grant to
   `authenticated` was revoked entirely by CC-PROFILES-GRANT-FIX.sql, so
   without this grant, saveDisplayName()'s UPDATE would fail closed with a
   permission error rather than silently doing nothing.
   ========================================================================= */

alter table public.cc_profiles
  add column if not exists display_name text;

grant update (display_name) on public.cc_profiles to authenticated;
