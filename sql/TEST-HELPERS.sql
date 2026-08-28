-- ============================================================================
-- SYSTEMS BY VEGA — STRIPE TEST HELPERS
-- Project: newjbexmvltvtmxollca          Table prefix: sbv_
-- ----------------------------------------------------------------------------
-- Inspection and cleanup for the Stripe CLI run. NOT part of the schema —
-- nothing here is required for the platform to work, and none of it should ever
-- run against a database that has taken a real payment without reading it first.
--
-- ⚠ WHY THIS FILE EXISTS AT ALL
--
-- Stripe test mode is fake. THE DATABASE IS NOT. A test purchase writes real
-- rows into sbv_intake, sbv_billing, sbv_tenants and sbv_city_claims, and a
-- test claim on a real city is INDISTINGUISHABLE FROM A SOLD ONE: it takes that
-- city off the market permanently, and the next real buyer is told it is gone.
--
-- So: test with a city and state that can never be sold. TEST_CITY / TEST_STATE
-- below use the fake state code 'ZZ', which passes the ^[A-Z]{2}$ CHECK but is
-- not a US state, so a collision with a real sale is impossible.
--
-- Then run section 4 when you are done.
-- ============================================================================

-- ============================================================================
-- 1. WHAT DID THE TEST DO?  Run after each step to watch the flow land.
-- ============================================================================

-- The whole picture for one Stripe session, in the order the webhook writes it.
--
-- EDIT THE TWO LITERALS BELOW. Plain SQL only — no psql meta-commands — so this
-- runs in the Supabase SQL Editor, same rule as COMMERCE.sql VERIFY 9.
--   replace  cs_test_REPLACE_ME  with the session id from the Stripe CLI

select 'intake'  as table_name, id::text as ref, status::text as state,
       client_id, city_label || ', ' || state_code as territory, created_at
from public.sbv_intake  where stripe_session_id = 'cs_test_REPLACE_ME'
union all
select 'billing', stripe_session_id, status::text,
       coalesce(client_id, '(not linked yet)'),
       '$' || (amount_cents / 100.0)::numeric(10,2)::text, created_at
from public.sbv_billing where stripe_session_id = 'cs_test_REPLACE_ME'
union all
select 'claim', coalesce(stripe_session_id, '(none)'), status::text,
       client_id, city_label || ', ' || state_code, claimed_at
from public.sbv_city_claims where stripe_session_id = 'cs_test_REPLACE_ME'
union all
select 'blocked', stripe_session_id, reason,
       coalesce(holder_client_id, '(none)'),
       coalesce(requested_city, '') || ', ' || coalesce(requested_state, ''), created_at
from public.sbv_blocked_purchases where stripe_session_id = 'cs_test_REPLACE_ME'
order by created_at;

-- Did the tenant go live? is_active is flipped LAST by the webhook, so true
-- here means every earlier step succeeded.
select client_id, business_name, niche_slug, tier, is_active, created_at
from public.sbv_tenants order by created_at desc limit 5;


-- ============================================================================
-- 2. SET UP THE "CITY TAKEN AFTER PAYMENT" TEST
-- ----------------------------------------------------------------------------
-- The race the webhook is built to lose safely. You cannot reach it through the
-- front door — /api/create-checkout would refuse the second buyer at the
-- availability check, which is the whole point of that check.
--
-- So simulate the loser's position directly:
--   a. POST /api/create-checkout and get a session URL. DO NOT PAY YET.
--   b. Run this block. It claims the same city for a rival.
--   c. Now pay. The webhook records the money, tries to claim, loses, rolls the
--      tenant back, writes sbv_blocked_purchases, alerts, and returns 200.
--
-- Uses the same fake ZZ state, so this cannot touch a sellable territory.
-- Replace REPLACE_NICHE with the same niche_slug you used at checkout — the
-- claim key is (niche, city, state), so a different niche will NOT collide.
-- ============================================================================

insert into public.sbv_tenants
  (client_id, niche_slug, business_name, operator_email, is_active)
select 'zzz-rival-co', 'REPLACE_NICHE', 'Rival Co (TEST)', 'info@kingdom-creatives.com', false
where not exists (select 1 from public.sbv_tenants where client_id = 'zzz-rival-co');

select public.sbv_claim_city('REPLACE_NICHE', 'Testville', 'ZZ', 'zzz-rival-co', 'cs_test_rival_setup');

-- Confirm the city now reads taken. Expect available:false, reason:claimed.
select public.sbv_city_available('REPLACE_NICHE', 'Testville', 'ZZ');


-- ============================================================================
-- 3. INSPECT — anything the test run left behind
-- ============================================================================

-- Everything test-shaped, across every table. Nothing here should survive
-- section 4.
select 'tenants' as t, client_id as id, business_name as detail
from public.sbv_tenants where client_id like 'zzz-%' or business_name ilike '%(TEST)%'
union all
select 'claims', client_id, city_label || ', ' || state_code || ' [' || status || ']'
from public.sbv_city_claims where state_code = 'ZZ' or client_id like 'zzz-%'
union all
select 'intake', id::text, city_label || ', ' || state_code || ' [' || status || ']'
from public.sbv_intake where state_code = 'ZZ' or client_id like 'zzz-%'
union all
select 'billing', stripe_session_id, coalesce(client_id, '(none)') || ' [' || status || ']'
from public.sbv_billing where stripe_session_id like 'cs_test_%'
union all
select 'blocked', stripe_session_id, coalesce(requested_city, '') || ' [' || reason || ']'
from public.sbv_blocked_purchases where stripe_session_id like 'cs_test_%'
order by t, id;


-- ============================================================================
-- 4. CLEANUP — run when the Stripe CLI run is finished
-- ----------------------------------------------------------------------------
-- ⚠ READ SECTION 3 FIRST AND LOOK AT WHAT IT RETURNS. This deletes rows.
--
-- Scoped three ways, all of which must be test-shaped: the fake 'ZZ' state, the
-- 'zzz-' client_id prefix, and Stripe's 'cs_test_' session prefix. A live
-- session id starts 'cs_live_', so nothing real is in range — but the
-- transaction is left OPEN deliberately. Check the counts, then COMMIT.
-- ============================================================================

begin;

-- The tenants to remove are CAPTURED FIRST. A test purchase names its tenant
-- from the buyer's own business name, so 'zzz-%' does not catch it — the only
-- thing that identifies it is its billing row, and that row is deleted below.
-- Working it out afterwards finds nothing.
create temporary table zzz_test_tenants on commit drop as
select distinct t.client_id
from public.sbv_tenants t
where t.client_id like 'zzz-%'
   or t.business_name ilike '%(TEST)%'
   or t.client_id in (select b.client_id from public.sbv_billing b
                      where b.stripe_session_id like 'cs_test_%'
                        and b.client_id is not null)
   or t.client_id in (select c.client_id from public.sbv_city_claims c
                      where c.state_code = 'ZZ');

-- What is about to go. Read this before committing.
select client_id as tenant_to_delete from zzz_test_tenants order by client_id;

delete from public.sbv_blocked_purchases where stripe_session_id like 'cs_test_%';
delete from public.sbv_city_claims
 where state_code = 'ZZ' or client_id like 'zzz-%' or stripe_session_id like 'cs_test_%'
    or client_id in (select client_id from zzz_test_tenants);
delete from public.sbv_billing
 where stripe_session_id like 'cs_test_%'
    or client_id in (select client_id from zzz_test_tenants);
delete from public.sbv_intake
 where state_code = 'ZZ' or client_id like 'zzz-%'
    or stripe_session_id like 'cs_test_%';
-- sbv_client_users.client_id is ON DELETE CASCADE, so the operator mapping goes
-- with the tenant. Deleted explicitly anyway, so the count below can prove it.
delete from public.sbv_client_users
 where client_id in (select client_id from zzz_test_tenants);
delete from public.sbv_tenants
 where client_id in (select client_id from zzz_test_tenants);

-- Expect zero from all six. If anything remains, DO NOT COMMIT — find out why.
select 'blocked'  as t, count(*) from public.sbv_blocked_purchases where stripe_session_id like 'cs_test_%'
union all select 'claims',   count(*) from public.sbv_city_claims where state_code = 'ZZ' or client_id like 'zzz-%'
union all select 'billing',  count(*) from public.sbv_billing where stripe_session_id like 'cs_test_%'
union all select 'intake',   count(*) from public.sbv_intake where state_code = 'ZZ' or client_id like 'zzz-%'
union all select 'mappings', count(*) from public.sbv_client_users where client_id in (select client_id from zzz_test_tenants)
union all select 'tenants',  count(*) from public.sbv_tenants where client_id in (select client_id from zzz_test_tenants);

-- Then, and only then:
-- commit;
-- ...or if anything looks wrong:
-- rollback;


-- ============================================================================
-- 5. SANITY — the schema is still whole after all that
-- ----------------------------------------------------------------------------
-- Re-run COMMERCE.sql VERIFY 9 (line 780 to end) and COMMERCE-2.sql's verify
-- block. Both roll back and both should report 0 failures. If the cleanup above
-- damaged anything, that is where it shows.
-- ============================================================================
