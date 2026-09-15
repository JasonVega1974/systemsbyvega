-- ============================================================================
-- SYSTEMS BY VEGA — CHECKOUT FLOW, PART 2
-- Project: newjbexmvltvtmxollca          Table prefix: sbv_
-- ----------------------------------------------------------------------------
-- One change: public.sbv_intake.user_id stops being NOT NULL.
--
-- WHY. Buying used to require a Supabase account BEFORE the card was taken,
-- so every intake row was written by somebody already signed in and user_id
-- was always known. That sign-in was the heaviest thing in the funnel and it
-- is gone: /api/create-checkout now takes an email address, parks the intake,
-- and the account is created from that address in the webhook AFTER the
-- payment clears. Between those two moments the row exists and the account
-- does not, which is exactly what a nullable user_id means.
--
-- This is the same shape as sbv_billing.client_id, which is nullable for the
-- same reason and says so in the header of api/stripe-webhook.mjs: the money
-- is recorded first, and the thing it belongs to is attached afterwards. If
-- provisioning breaks part-way, the record of what was paid for survives in
-- our database rather than living only inside Stripe.
--
-- NOT a licence to leave it null. The webhook fills it in on success; a row
-- still null after provisioning is a failed provision, which is what
-- sbv_blocked_purchases and the alert email are for.
--
-- operator_email stays NOT NULL and keeps its CHECK. With user_id nullable it
-- is the only identity an intake row carries until the webhook runs, so it is
-- the one field that must always be there and must always be an address.
--
-- COMMERCE-2.sql still declares the column NOT NULL in its `create table if
-- not exists`. That is deliberate and matches how COMMERCE-2 itself corrected
-- COMMERCE: the original file is the historical record and the numbered file
-- after it is the correction. Run order is therefore unchanged and this file
-- goes last.
--
-- FENCE: this SQL runs against newjbexmvltvtmxollca and nowhere else. The
-- EstateSaleBiz (cdckozujhrffobragmtm) and GarageSaleBiz (jjocmvhqeiudcwtazbwi)
-- projects are live businesses holding sold territories and are never read
-- from and never written to.
--
-- Idempotent: `drop not null` on a column that is already nullable is a no-op,
-- so this is safe to run repeatedly. It touches no rows — relaxing a
-- constraint cannot alter data — so the intake rows already recorded keep the
-- user_id they were written with.
--
-- ----------------------------------------------------------------------------
-- ⚠ RUN ORDER
--
--   1. sql/SETUP.sql      (first, always)
--   2. sql/SEED.sql
--   3. sql/COMMERCE.sql
--   4. sql/COMMERCE-2.sql        (creates sbv_intake)
--   5. sql/CHECKOUT-FLOW.sql
--   6. sql/CHECKOUT-FLOW-2.sql   (this file)
--
-- HAZARD — DDL and verify live in separate files on purpose. The Supabase
-- CLI (`db query --linked -f`) sends a whole file as ONE query string, so
-- Postgres wraps it in a single implicit transaction. A trailing `rollback;`
-- therefore unwinds any DDL earlier in the SAME file too, not just the rows
-- the verify block inserted — and the CLI only returns the last statement's
-- rows, so the failure is silent (exit 0, plausible-looking output, column
-- still NOT NULL). This file is DDL ONLY — no begin/rollback — so applying it
-- with one `-f` call actually leaves the constraint dropped. The matching
-- verify block lives in sql/CHECKOUT-FLOW-2.verify.sql, which is safe to wrap
-- because it contains no DDL for the rollback to eat.
-- ============================================================================

alter table public.sbv_intake alter column user_id drop not null;

comment on column public.sbv_intake.user_id is
  'The operator account this intake belongs to. NULL between checkout and the '
  'webhook: the buyer pays first and the account is created afterwards from '
  'operator_email, so no account exists at the moment this row is written. '
  'Same reasoning as the nullable sbv_billing.client_id. A row still NULL '
  'after provisioning means provisioning failed.';
