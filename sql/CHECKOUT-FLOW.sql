-- Near-match city detection. Decision: hard block stays on an EXACT normalised
-- match (sbv_city_available -> claimed); this function only surfaces claims
-- that are CLOSE but not equal, so the buyer can be warned and still proceed.
-- Lives in SQL because sbv_norm_city() is the single authority on
-- normalisation and a JS twin that drifts lets a taken city read as free.

create extension if not exists fuzzystrmatch;

create or replace function public.sbv_city_near_matches(
  p_niche text, p_city text, p_state text
) returns table (city_label text, city_norm text, distance int)
language sql stable security definer set search_path = public as $fn$
  select c.city_label, c.city_norm,
         levenshtein(c.city_norm, public.sbv_norm_city(p_city)) as distance
    from public.sbv_city_claims c
   where c.niche_slug = p_niche
     and c.state_code = upper(btrim(p_state))
     and c.released_at is null
     and c.city_norm is distinct from public.sbv_norm_city(p_city)
     and levenshtein(c.city_norm, public.sbv_norm_city(p_city)) between 1 and 2
   order by distance asc
   limit 3;
$fn$;

grant execute on function public.sbv_city_near_matches(text,text,text)
  to anon, authenticated, service_role;

-- ── verify ────────────────────────────────────────────────────────────────
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
