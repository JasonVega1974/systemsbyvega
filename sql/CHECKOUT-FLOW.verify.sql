-- Verify block for public.sbv_city_near_matches (defined in sql/CHECKOUT-FLOW.sql).
--
-- HAZARD — this file is verify ONLY, no DDL. The Supabase CLI (`db query
-- --linked -f`) sends a whole file as ONE query string, so Postgres wraps it
-- in a single implicit transaction. A trailing `rollback;` therefore unwinds
-- any DDL earlier in the SAME file too, not just the rows this block
-- inserted — and the CLI only returns the last statement's rows, so the
-- failure is silent (exit 0, plausible-looking output, DDL gone). Keeping
-- the create-function/grant in sql/CHECKOUT-FLOW.sql (no begin/rollback
-- there) and this begin/rollback verify block here, in its own file, is what
-- makes `-f` on either file do exactly what it says.

begin;
insert into public.sbv_tenants (client_id, niche_slug, business_name, operator_email, is_active)
select 'op-nearmatch', slug, 'Near Co', 'info@kingdom-creatives.com', true
  from public.sbv_niches where website_offer and is_listed limit 1;

select public.sbv_claim_city(
  (select slug from public.sbv_niches where website_offer and is_listed limit 1),
  'Saint Charles','MO','op-nearmatch','cs_verify_nearmatch');

-- expect ONE row, distance 2 ("st charles" vs "saint charles" after norm)
select 'near_hit' as check, count(*) as n
  from public.sbv_city_near_matches(
    (select slug from public.sbv_niches where website_offer and is_listed limit 1),
    'St. Charles','MO');

-- expect ZERO rows: exact match is NOT a near match, it is a hard block
select 'exact_excluded' as check, count(*) as n
  from public.sbv_city_near_matches(
    (select slug from public.sbv_niches where website_offer and is_listed limit 1),
    'Saint Charles','MO');

-- expect ZERO rows: different state
select 'state_scoped' as check, count(*) as n
  from public.sbv_city_near_matches(
    (select slug from public.sbv_niches where website_offer and is_listed limit 1),
    'St. Charles','ID');
rollback;
