/* ============================================================================
   PUSH-NOTIFICATIONS.sql — Web Push subscriptions for coverage requests,
   BOLOs, and incident reports.
   ----------------------------------------------------------------------------
   cc_profiles.push_enabled: the user's choice on the one-time permission
   prompt (see enablePushNotifications() in index.html) — true only after
   they click "Enable Notifications" AND the browser subscription actually
   succeeds. "Maybe Later" leaves this null (not false) so the prompt can
   reappear next sign-in; only an explicit success sets it true. There is no
   explicit decline value stored on purpose — "Maybe Later" is not "never,"
   it is "ask me again."

   A member sets THEIR OWN push_enabled directly (no admin round trip), the
   same shape of write CC-PROFILES-GRANT-FIX.sql already solved for theme:
   the existing cc_profiles_update_own_theme policy's USING clause is just
   `id = auth.uid()` with no column restriction — RLS gates ROWS, never
   columns — so the actual restriction on what a self-update may touch is
   the column-level GRANT, not the policy. That fix's own lesson applies
   here verbatim: grant update on push_enabled explicitly, additively,
   rather than assuming the existing policy alone is narrow enough.

   cc_push_subscriptions: one row per device per person (a phone and a
   laptop are two different push endpoints for the same profile_id). `keys`
   is the PushSubscription's own p256dh/auth pair, stored exactly as the
   browser's Push API returns it — this app never generates or inspects
   those values, only relays them to web-push's send function.

   Nobody except the row's own owner ever needs to READ a subscription
   client-side (SELECT exists for symmetry with the rest of this schema and
   so a user could see their own registered devices, not because any
   feature reads someone else's). The actual "who gets notified for event
   X" fan-out happens server-side in api/send-push.js using the SERVICE
   ROLE, which bypasses RLS entirely — that endpoint is the only thing that
   ever reads across profiles, and it decides who to notify from business
   rules (whole team / requester only / Admin+Team Lead only), never from
   anything the client sends about WHO to notify, only WHAT happened.
   ========================================================================= */

alter table public.cc_profiles
  add column if not exists push_enabled boolean;

grant update (push_enabled) on public.cc_profiles to authenticated;

create table if not exists public.cc_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cc_profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
comment on table public.cc_push_subscriptions is
  'One row per browser/device push subscription. Read server-side only, with the service role, by api/send-push.js — RLS here governs the OWNER managing their own devices, not the fan-out logic that decides who gets notified.';

create index if not exists cc_push_subscriptions_profile_ix on public.cc_push_subscriptions (profile_id);

alter table public.cc_push_subscriptions enable row level security;

drop policy if exists cc_push_subscriptions_select on public.cc_push_subscriptions;
create policy cc_push_subscriptions_select on public.cc_push_subscriptions
  for select to authenticated using (profile_id = (select auth.uid()));

drop policy if exists cc_push_subscriptions_insert on public.cc_push_subscriptions;
create policy cc_push_subscriptions_insert on public.cc_push_subscriptions
  for insert to authenticated with check (profile_id = (select auth.uid()));

drop policy if exists cc_push_subscriptions_delete on public.cc_push_subscriptions;
create policy cc_push_subscriptions_delete on public.cc_push_subscriptions
  for delete to authenticated using (profile_id = (select auth.uid()));

grant select, insert, delete on public.cc_push_subscriptions to authenticated;
