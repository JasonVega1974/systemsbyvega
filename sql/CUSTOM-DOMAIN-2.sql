/* ============================================================================
   CUSTOM-DOMAIN-2.sql — the domain lookup also answers hasContent
   ----------------------------------------------------------------------------
   middleware.js resolves a subdomain in two calls today — sbv_public_tenants
   (niche/theme) and sbv_public_has_content (the indexing signal) — because
   the subdomain IS the client_id, so both can run in parallel with no
   dependency between them.

   A custom domain has no such shortcut: client_id is only known AFTER the
   domain lookup resolves it, so has_content cannot be fetched in parallel —
   it would need a second, sequential round trip on every custom-domain
   request. Folding it into this function's single row removes that trip
   rather than paying it on every page view.

   DROP FIRST, not a bare CREATE OR REPLACE: Postgres refuses to change a
   function's OUT-parameter row shape in place (42P13) and asks for the drop
   explicitly. Safe here specifically because sbv_public_tenant_by_domain has
   no caller yet (this session is the first to wire one in) and nothing else
   in the database depends on it — a drop of a function something ELSE
   referenced would need a different migration shape entirely.

   DDL ONLY. Verification lives in CUSTOM-DOMAIN-2.verify.sql.
   ========================================================================= */

drop function if exists public.sbv_public_tenant_by_domain(text);

create function public.sbv_public_tenant_by_domain(p_domain text)
returns table (client_id text, niche_slug text, theme text, has_content boolean)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select t.client_id, t.niche_slug, t.theme,
         public.sbv_public_has_content(t.client_id) as has_content
  from public.sbv_tenants t
  where t.custom_domain = lower(btrim(p_domain))
    and t.custom_domain_verified_at is not null
    and t.is_active
  limit 1;
$$;

revoke all on function public.sbv_public_tenant_by_domain(text) from public;
grant execute on function public.sbv_public_tenant_by_domain(text) to anon, authenticated, service_role;
