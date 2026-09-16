/* CUSTOM-DOMAIN.verify.sql — read-only. Every row must return ok = true. */
select 'column custom_domain exists' as check,
       count(*) = 1 as ok
from information_schema.columns
where table_schema = 'public' and table_name = 'sbv_tenants' and column_name = 'custom_domain'
union all
select 'column custom_domain_verified_at exists',
       count(*) = 1
from information_schema.columns
where table_schema = 'public' and table_name = 'sbv_tenants' and column_name = 'custom_domain_verified_at'
union all
select 'shape check present',
       count(*) = 1
from pg_constraint
where conname = 'sbv_tenants_custom_domain_ck'
union all
select 'unique index present',
       count(*) = 1
from pg_indexes
where schemaname = 'public' and indexname = 'sbv_tenants_custom_domain_uk'
union all
select 'lookup function present',
       count(*) = 1
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'sbv_public_tenant_by_domain'
union all
select 'anon can execute the lookup',
       has_function_privilege('anon', 'public.sbv_public_tenant_by_domain(text)', 'execute')
union all
select 'anon still cannot read sbv_tenants directly',
       not has_table_privilege('anon', 'public.sbv_tenants', 'select');
