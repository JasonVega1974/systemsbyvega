-- ============================================================================
-- SYSTEMS BY VEGA — verification suite
-- Run: supabase db query --linked -f sql/VERIFY.sql
-- ----------------------------------------------------------------------------
-- Every row that comes back with pass = false is a defect. There is no
-- "acceptable warning" tier on purpose — a check either encodes something that
-- must be true, or it does not belong here.
--
-- The three that actually matter, and why:
--   * GRANT/POLICY CROSS-CHECK. RLS and grants are two independent gates and
--     either one alone is a false sense of safety. A policy without a grant is
--     dead; a grant without a policy is only saved by RLS being on. Both are
--     asserted, separately.
--   * NO READ PATH TO AN EMAIL. Checked structurally here and behaviourally
--     over HTTP in verify-rest.sh, because a schema that looks right and an
--     endpoint that behaves right are not the same claim.
--   * THE COUNT FLOOR. Asserted against real inserted rows rather than by
--     reading the view definition, since the bug worth catching is an
--     off-by-one at the boundary, not a typo in the SQL.
-- ============================================================================

with checks as (

  -- ---------------------------------------------------------------- objects
  select 1 as n, 'sbv_niches table exists' as check_name,
         (to_regclass('public.sbv_niches') is not null) as pass
  union all select 2, 'sbv_demand table exists',
         (to_regclass('public.sbv_demand') is not null)
  union all select 3, 'sbv_demand_counts() function exists',
         exists (select 1 from pg_proc where proname='sbv_demand_counts' and pronamespace='public'::regnamespace)
  union all select 4, 'sbv_demand_city_counts() function exists',
         exists (select 1 from pg_proc where proname='sbv_demand_city_counts' and pronamespace='public'::regnamespace)

  -- -------------------------------------------------------------------- RLS
  union all select 10, 'RLS enabled on sbv_niches',
         (select relrowsecurity from pg_class where oid='public.sbv_niches'::regclass)
  union all select 11, 'RLS FORCED on sbv_niches',
         (select relforcerowsecurity from pg_class where oid='public.sbv_niches'::regclass)
  union all select 12, 'RLS enabled on sbv_demand',
         (select relrowsecurity from pg_class where oid='public.sbv_demand'::regclass)
  union all select 13, 'RLS FORCED on sbv_demand',
         (select relforcerowsecurity from pg_class where oid='public.sbv_demand'::regclass)

  -- --------------------------------------------------------------- policies
  union all select 20, 'sbv_demand has exactly one policy',
         ((select count(*) from pg_policies where schemaname='public' and tablename='sbv_demand') = 1)
  union all select 21, 'sbv_demand policy is INSERT only',
         ((select cmd from pg_policies where schemaname='public' and tablename='sbv_demand' limit 1) = 'INSERT')
  union all select 22, 'sbv_demand has NO select policy',
         (not exists (select 1 from pg_policies where schemaname='public' and tablename='sbv_demand' and cmd in ('SELECT','ALL')))
  union all select 23, 'sbv_demand has NO update/delete policy',
         (not exists (select 1 from pg_policies where schemaname='public' and tablename='sbv_demand' and cmd in ('UPDATE','DELETE','ALL')))
  union all select 24, 'sbv_niches policy is SELECT only',
         ((select bool_and(cmd='SELECT') from pg_policies where schemaname='public' and tablename='sbv_niches'))

  -- ----------------------------------------------------------------- grants
  union all select 30, 'anon may INSERT sbv_demand',
         has_table_privilege('anon','public.sbv_demand','INSERT')
  union all select 31, 'anon may NOT SELECT sbv_demand',
         (not has_table_privilege('anon','public.sbv_demand','SELECT'))
  union all select 32, 'anon may NOT UPDATE sbv_demand',
         (not has_table_privilege('anon','public.sbv_demand','UPDATE'))
  union all select 33, 'anon may NOT DELETE sbv_demand',
         (not has_table_privilege('anon','public.sbv_demand','DELETE'))
  union all select 34, 'anon may SELECT sbv_niches',
         has_table_privilege('anon','public.sbv_niches','SELECT')
  union all select 35, 'anon may NOT INSERT sbv_niches',
         (not has_table_privilege('anon','public.sbv_niches','INSERT'))
  union all select 36, 'anon may NOT UPDATE sbv_niches',
         (not has_table_privilege('anon','public.sbv_niches','UPDATE'))
  union all select 37, 'anon may EXECUTE sbv_demand_counts()',
         has_function_privilege('anon','public.sbv_demand_counts()','EXECUTE')
  union all select 38, 'anon may EXECUTE sbv_demand_city_counts(text)',
         has_function_privilege('anon','public.sbv_demand_city_counts(text)','EXECUTE')
  union all select 39, 'authenticated may NOT SELECT sbv_demand',
         (not has_table_privilege('authenticated','public.sbv_demand','SELECT'))

  -- ------------------------------------------- grant / policy cross-check --
  -- A grant with no policy behind it is only stopped by RLS being on; a policy
  -- with no grant is dead code. Assert the pair the design actually intends.
  union all select 40, 'X-CHECK: insert grant is backed by an insert policy',
         (has_table_privilege('anon','public.sbv_demand','INSERT')
          and exists (select 1 from pg_policies where schemaname='public' and tablename='sbv_demand' and cmd='INSERT'))
  union all select 41, 'X-CHECK: no select grant AND no select policy on sbv_demand',
         ((not has_table_privilege('anon','public.sbv_demand','SELECT'))
          and not exists (select 1 from pg_policies where schemaname='public' and tablename='sbv_demand' and cmd in ('SELECT','ALL')))

  -- ------------------------------------------------- no email leak by view --
  union all select 50, 'sbv_demand_counts() returns no email column',
         (select coalesce(not (array_to_string(proargnames,',') ilike '%email%'), true)
          from pg_proc where proname='sbv_demand_counts' and pronamespace='public'::regnamespace)
  union all select 51, 'sbv_demand_city_counts() returns no email column',
         (select coalesce(not (array_to_string(proargnames,',') ilike '%email%'), true)
          from pg_proc where proname='sbv_demand_city_counts' and pronamespace='public'::regnamespace)
  union all select 52, 'no view in public references email',
         (not exists (select 1 from pg_views where schemaname='public' and definition ilike '%email%'))
  union all select 53, 'no anon-executable function body selects email',
         (not exists (select 1 from pg_proc p
                      where p.pronamespace='public'::regnamespace
                        and p.proname like 'sbv_demand_%counts%'
                        and p.prosrc ilike '%email%'))
  union all select 54, 'both count functions are SECURITY DEFINER with search_path pinned',
         (select bool_and(p.prosecdef and coalesce(array_to_string(p.proconfig,',') like '%search_path%', false))
          from pg_proc p where p.pronamespace='public'::regnamespace
            and p.proname in ('sbv_demand_counts','sbv_demand_city_counts'))

  -- ------------------------------------------------------------- functions --
  -- search_path pinned: an unpinned SECURITY-sensitive function is hijackable
  -- by anything that can create objects earlier on the path.
  union all select 60, 'sbv_norm_city has search_path pinned',
         (select coalesce(array_to_string(proconfig,',') like '%search_path%', false)
          from pg_proc where proname='sbv_norm_city' and pronamespace='public'::regnamespace)
  union all select 61, 'sbv_demand_biu has search_path pinned',
         (select coalesce(array_to_string(proconfig,',') like '%search_path%', false)
          from pg_proc where proname='sbv_demand_biu' and pronamespace='public'::regnamespace)
  union all select 62, 'insert trigger is attached to sbv_demand',
         exists (select 1 from pg_trigger where tgrelid='public.sbv_demand'::regclass and tgname='sbv_demand_biu_t' and not tgisinternal)

  -- ------------------------------------------------------------ seed data --
  union all select 70, 'catalog has 29 listed niches',
         ((select count(*) from public.sbv_niches where is_listed) = 29)
  union all select 71, 'exactly 2 open',
         ((select count(*) from public.sbv_niches where status='open') = 2)
  union all select 72, 'every open niche has an open_url',
         (not exists (select 1 from public.sbv_niches where status='open' and open_url is null))
  union all select 73, 'no non-open niche has an open_url',
         (not exists (select 1 from public.sbv_niches where status<>'open' and open_url is not null))
  union all select 74, 'every website_offer has a demo_path',
         (not exists (select 1 from public.sbv_niches where website_offer and demo_path is null))
  union all select 75, 'catalog_no values are unique',
         ((select count(distinct catalog_no) from public.sbv_niches) = (select count(*) from public.sbv_niches))
  union all select 76, 'no job_line contains a dollar figure',
         (not exists (select 1 from public.sbv_niches where job_line ~ '\$[0-9]'))

  -- ------------------------------------------------------------- digest --
  union all select 80, 'sbv_settings table exists',
         (to_regclass('public.sbv_settings') is not null)
  union all select 81, 'sbv_digest_log table exists',
         (to_regclass('public.sbv_digest_log') is not null)
  union all select 82, 'RLS FORCED on sbv_settings',
         (select relforcerowsecurity from pg_class where oid='public.sbv_settings'::regclass)
  union all select 83, 'RLS FORCED on sbv_digest_log',
         (select relforcerowsecurity from pg_class where oid='public.sbv_digest_log'::regclass)
  union all select 84, 'sbv_settings has NO policy at all',
         (not exists (select 1 from pg_policies where schemaname='public' and tablename='sbv_settings'))
  union all select 85, 'anon may NOT read sbv_settings (holds the digest secret)',
         (not has_table_privilege('anon','public.sbv_settings','SELECT'))
  union all select 86, 'authenticated may NOT read sbv_settings',
         (not has_table_privilege('authenticated','public.sbv_settings','SELECT'))
  union all select 87, 'anon may NOT read sbv_digest_log',
         (not has_table_privilege('anon','public.sbv_digest_log','SELECT'))
  union all select 88, 'digest text fn has search_path pinned',
         (select coalesce(array_to_string(proconfig,',') like '%search_path%',false)
          from pg_proc where proname='sbv_demand_digest_text' and pronamespace='public'::regnamespace)
  union all select 89, 'send fn has search_path pinned',
         (select coalesce(array_to_string(proconfig,',') like '%search_path%',false)
          from pg_proc where proname='sbv_send_weekly_digest' and pronamespace='public'::regnamespace)
  union all select 90, 'anon may NOT execute the digest text fn',
         (not has_function_privilege('anon','public.sbv_demand_digest_text(integer)','EXECUTE'))
  union all select 91, 'anon may NOT execute the send fn',
         (not has_function_privilege('anon','public.sbv_send_weekly_digest(boolean)','EXECUTE'))
  union all select 92, 'pg_net is installed (the send needs it)',
         exists (select 1 from pg_extension where extname='pg_net')
  union all select 93, 'pg_cron is installed',
         exists (select 1 from pg_extension where extname='pg_cron')
  union all select 94, 'weekly digest job exists and is active',
         exists (select 1 from cron.job where jobname='sbv-weekly-digest' and active)
  union all select 95, 'job fires at BOTH DST candidate hours',
         ((select schedule from cron.job where jobname='sbv-weekly-digest') = '0 14,15 * * 1')
  union all select 96, '15:00Z is 08:00 Denver in winter',
         ((timestamptz '2026-01-19 15:00Z' at time zone 'America/Denver')::time = time '08:00')
  union all select 97, '14:00Z is 08:00 Denver in summer',
         ((timestamptz '2026-07-20 14:00Z' at time zone 'America/Denver')::time = time '08:00')
  union all select 98, 'digest_endpoint is configured',
         exists (select 1 from public.sbv_settings where key='digest_endpoint' and value <> '')
  union all select 99, 'digest_secret is configured and long enough',
         exists (select 1 from public.sbv_settings where key='digest_secret' and length(value) >= 24)
)
select n, check_name, pass
from checks
order by n;
