-- Verify block for the nullable public.sbv_intake.user_id (dropped in
-- sql/CHECKOUT-FLOW-2.sql).
--
-- HAZARD — this file is verify ONLY, no DDL. The Supabase CLI (`db query
-- --linked -f`) sends a whole file as ONE query string, so Postgres wraps it
-- in a single implicit transaction. A trailing `rollback;` therefore unwinds
-- any DDL earlier in the SAME file too, not just the rows this block
-- inserted — and the CLI only returns the last statement's rows, so the
-- failure is silent (exit 0, plausible-looking output, DDL gone). Keeping the
-- alter table in sql/CHECKOUT-FLOW-2.sql (no begin/rollback there) and this
-- begin/rollback block here, in its own file, is what makes `-f` on either
-- file do exactly what it says.

begin;

-- expect is_nullable = YES
select 'nullable' as check, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'sbv_intake'
   and column_name = 'user_id';

-- expect operator_email UNCHANGED at NO. It is the only identity the row
-- carries until the webhook fills user_id in, so relaxing one must not have
-- relaxed the other.
select 'email_still_required' as check, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'sbv_intake'
   and column_name = 'operator_email';

-- The point of the change: an intake row with no account behind it. This is
-- exactly what /api/create-checkout now writes, so if this insert fails the
-- endpoint 503s with intake_failed on every purchase.
insert into public.sbv_intake (
  user_id, niche_slug, client_id, business_name, operator_email,
  city_label, state_code, tier, acceptance_version, acceptance_hash, status)
select null, slug, 'zzz-nulluser', 'Null User Co', 'info@kingdom-creatives.com',
       'Verifyville', 'ZZ', 'launch', 'verify',
       repeat('0', 64), 'awaiting_payment'
  from public.sbv_niches where website_offer and is_listed limit 1;

-- expect n = 1
select 'null_user_insert' as check, count(*) as n
  from public.sbv_intake
 where client_id = 'zzz-nulluser' and user_id is null;

-- expect n = 1 and unharmed: relaxing a constraint must not touch data, so
-- rows written before this migration keep the user_id they were written with.
select 'existing_rows_intact' as check, count(*) as n
  from public.sbv_intake
 where user_id is not null;

rollback;
