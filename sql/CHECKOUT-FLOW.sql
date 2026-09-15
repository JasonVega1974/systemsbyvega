-- Near-match city detection. Decision: hard block stays on an EXACT normalised
-- match (sbv_city_available -> claimed); this function only surfaces claims
-- that are CLOSE but not equal, so the buyer can be warned and still proceed.
-- Lives in SQL because sbv_norm_city() is the single authority on
-- normalisation and a JS twin that drifts lets a taken city read as free.
--
-- HAZARD — DDL and verify live in separate files on purpose. The Supabase
-- CLI (`db query --linked -f`) sends a whole file as ONE query string, so
-- Postgres wraps it in a single implicit transaction. A trailing `rollback;`
-- therefore unwinds any DDL earlier in the SAME file too, not just the rows
-- the verify block inserted — and the CLI only returns the last statement's
-- rows, so the failure is silent (exit 0, plausible-looking output, function
-- gone). This file is DDL ONLY — no begin/rollback — so applying it with one
-- `-f` call actually leaves the function deployed. The matching verify block
-- lives in sql/CHECKOUT-FLOW.verify.sql, which is safe to wrap because it
-- contains no DDL for the rollback to eat.

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
