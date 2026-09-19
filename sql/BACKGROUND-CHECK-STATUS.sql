/* ============================================================================
   BACKGROUND-CHECK-STATUS.sql — manual background-check status tracking on
   the roster. No third-party integration (Ministry Safe / Checkr) yet — see
   OPEN-ITEMS.md for why that's deliberately deferred, not an oversight.
   ----------------------------------------------------------------------------
   Status is admin-set by hand, same write model as every other roster field
   (team_role, rotation_week, specialty) — cc_team's existing admin-only
   write policy already covers these new columns; no new RLS is needed since
   RLS is row-level, not column-level, and there is no self-service write
   path here to gate with a column GRANT the way cc_profiles.theme needed one.

   background_check_expiry has NO default expression tied to
   background_check_date — the spec calls for "calculated or manually set,
   default 2 years from check date," and the two-years-from-check-date value
   is computed and written by the client when a status is set to 'cleared'
   (see saveMember() in index.html), not by a generated column. That keeps
   an admin free to hand-edit the expiry later (a church-specific renewal
   policy, a provider that clears for a different term) without fighting a
   database-enforced formula.
   ========================================================================= */

alter table public.cc_team
  add column if not exists background_check_status text
    check (background_check_status in ('not_requested', 'requested', 'cleared', 'expired', 'flagged'))
    default 'not_requested';
alter table public.cc_team
  add column if not exists background_check_date date;
alter table public.cc_team
  add column if not exists background_check_expiry date;

comment on column public.cc_team.background_check_status is
  'Manually set by an admin. not_requested (default) / requested / cleared / expired / flagged. No Ministry Safe / Checkr integration yet — deferred until the church has a written policy for handling flagged results (see OPEN-ITEMS.md).';
comment on column public.cc_team.background_check_date is 'Date of the most recent background check, if any.';
comment on column public.cc_team.background_check_expiry is 'Defaults to 2 years from background_check_date when a check clears (set client-side), but admin-editable thereafter — not a generated column.';
