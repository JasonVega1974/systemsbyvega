/* ============================================================================
   CUSTOM-DOMAIN.sql — let an operator point their own domain at their site
   ----------------------------------------------------------------------------
   Adds custom_domain to sbv_tenants so middleware.js can resolve a request by
   hostname as well as by subdomain label.

   RUN THIS BEFORE the app code that reads the column ships. Until it exists the
   middleware's domain lookup returns "function/column not found", which its
   resolver treats as a miss — every visitor falls through to the funnel. That
   is a safe failure, not a broken one, but it is not the feature working.

   DDL ONLY. Verification lives in CUSTOM-DOMAIN.verify.sql, deliberately
   separate: a trailing `rollback;` in the same file unwinds the DDL above it,
   and only the last statement's rows come back from the CLI.
   ========================================================================= */

alter table public.sbv_tenants
  add column if not exists custom_domain text,
  add column if not exists custom_domain_verified_at timestamptz;

/* SHAPE. Lowercase, no scheme, no path, no port, no trailing dot — a bare
   registrable hostname. The check is deliberately strict: this value is
   compared against a request's Host header, and anything that can differ in
   case or carry a path is a value that can match one request and miss the
   next. Two labels minimum, so "localhost" and a bare TLD cannot be stored.
   253 is the DNS maximum. */
alter table public.sbv_tenants
  drop constraint if exists sbv_tenants_custom_domain_ck;
alter table public.sbv_tenants
  add constraint sbv_tenants_custom_domain_ck check (
    custom_domain is null or (
      custom_domain = lower(custom_domain)
      and length(custom_domain) between 4 and 253
      and custom_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
      and custom_domain !~ '\.(systemsbyvega|vercel)\.(com|app)$'
    )
  );

/* ONE DOMAIN, ONE TENANT. Without this two operators can save the same
   hostname and the middleware's answer depends on row order — a routing
   coin-flip that would send one operator's visitors to the other's storefront.
   Partial so that NULL (the overwhelming majority) costs nothing. */
create unique index if not exists sbv_tenants_custom_domain_uk
  on public.sbv_tenants (custom_domain)
  where custom_domain is not null;

/* Resolution index for the middleware's by-hostname lookup. */
create index if not exists sbv_tenants_custom_domain_active_ix
  on public.sbv_tenants (custom_domain)
  where custom_domain is not null and is_active;

/* ----------------------------------------------------------------------------
   THE LOOKUP. Same shape and the same reasoning as sbv_public_tenants: a
   SECURITY DEFINER function granted to anon that answers exactly one question
   and exposes nothing else. The middleware runs with the anon key, so it
   cannot be allowed to read the tenants table directly.

   VERIFIED ONLY. A row whose custom_domain_verified_at is null is a claim, not
   a fact — anyone can type any domain into the admin. Routing on an unverified
   claim would let an operator capture traffic for a hostname they do not own
   the moment its DNS happened to point here. This function refuses to answer
   for them, which makes verification the gate rather than a label.
   ------------------------------------------------------------------------- */
create or replace function public.sbv_public_tenant_by_domain(p_domain text)
returns table (client_id text, niche_slug text, theme text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select t.client_id, t.niche_slug, t.theme
  from public.sbv_tenants t
  where t.custom_domain = lower(btrim(p_domain))
    and t.custom_domain_verified_at is not null
    and t.is_active
  limit 1;
$$;

revoke all on function public.sbv_public_tenant_by_domain(text) from public;
grant execute on function public.sbv_public_tenant_by_domain(text) to anon, authenticated, service_role;

comment on column public.sbv_tenants.custom_domain is
  'Operator-supplied hostname. A CLAIM until custom_domain_verified_at is set; nothing routes on it before then.';
comment on column public.sbv_tenants.custom_domain_verified_at is
  'Set only after DNS ownership is confirmed. Null means unverified and unroutable.';
