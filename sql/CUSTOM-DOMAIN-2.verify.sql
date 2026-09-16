/* CUSTOM-DOMAIN-2.verify.sql — read-only. Every row must return ok = true. */
select 'has_content column in the function''s return shape' as check,
       count(*) = 1 as ok
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'sbv_public_tenant_by_domain'
  and pg_get_function_result(p.oid) like '%has_content boolean%'
union all
select 'anon can still execute the lookup',
       has_function_privilege('anon', 'public.sbv_public_tenant_by_domain(text)', 'execute')
union all
select 'sbv_public_has_content is callable from inside this function (same owner/search_path)',
       has_function_privilege('anon', 'public.sbv_public_has_content(text)', 'execute');
