/* ============================================================================
   GET /api/check-territory?niche=dj&city=Boise&state=ID
   ----------------------------------------------------------------------------
   The pre-purchase availability check, called from the claim modal on
   sites/index.html. Public: no bearer token, no account needed. Somebody
   deciding whether to buy should not have to sign up to find out whether their
   city is even open.

   ── THIS IS NOT THE GUARANTEE ──────────────────────────────────────────────
   It is a READ. Two buyers can both pass it for the same city seconds apart
   and both proceed to pay. What settles it is the partial unique index behind
   sbv_claim_city(), in the webhook, after payment — and the loser is recorded
   in sbv_blocked_purchases and alerted, not silently dropped.

   What this endpoint changes is not that the race exists but that the COMMON
   case is free: a city already sold when someone starts is caught here, before
   any money moves.

   ── WHY AN ENDPOINT AND NOT A DIRECT RPC ───────────────────────────────────
   sbv_city_available() is already anon-executable, and assets/sbv.js calls
   sibling RPCs straight from the browser. The data does not need a proxy.
   THE RATE LIMIT DOES — there is nowhere to put one on a call that goes
   browser-to-Supabase. That is the whole reason this file exists, and anyone
   tempted to "simplify" it into a direct RPC call should read the block above
   rateLimited() first.

   ── THE GATE ITSELF LIVES IN SQL ───────────────────────────────────────────
   Whether a niche is purchasable (website_offer AND is_listed), whether a city
   normalises, whether it is claimed — all decided by sbv_city_available(). No
   copy of that logic exists here. A second implementation is how a city comes
   to read as free and then fail after payment.
   ========================================================================= */

import {
  json, preflight, rpc,
  SUPABASE_URL, SERVICE_KEY, SUPPORT_EMAIL,
} from './_shared.mjs';

export const config = { runtime: 'nodejs' };

/* ---------------------------------------------------------------- rate limit */

/* IN-MEMORY, AND HONESTLY LIMITED.
 *
 * On Vercel every function instance holds its own Map. It empties on cold
 * start and is not shared between concurrent instances, so the real ceiling is
 * (instances x MAX_HITS) per window, not MAX_HITS. This stops a naive loop
 * from one client against one warm instance. It will not stop anyone
 * determined, and it is not a security control.
 *
 * THIS IS THE SEAM. Swap the two functions below for Upstash Redis or Vercel
 * KV when it matters — the call sites do not change. Until then the honest
 * description is "a speed bump", and the endpoint is a public read of data
 * that is public by design, so the exposure is database load rather than
 * anything leaking.
 */
const WINDOW_MS = 60_000;
const MAX_HITS = 10;
const hits = new Map();

/* Unbounded growth is not a real risk on short-lived instances, but a Map that
   only ever grows is a bad habit to leave in a file someone will copy. */
function prune(now) {
  if (hits.size < 5000) return;
  for (const [key, stamps] of hits) {
    if (!stamps.some((t) => now - t < WINDOW_MS)) hits.delete(key);
  }
}

function rateLimited(key) {
  const now = Date.now();
  prune(now);
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_HITS;
}

/* x-forwarded-for is what Vercel sets, and its FIRST entry is the client —
   later entries are proxies and are trivially spoofable by an attacker who
   sets the header themselves. Falling back to a single 'unknown' bucket means
   header-less callers share one allowance, which fails toward limiting rather
   than toward waving everyone through. */
function clientKey(request) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0].trim();
  return first || 'unknown';
}

/* ------------------------------------------------------------------ handler */

export default { fetch: handler };

async function handler(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('check-territory not configured: SUPABASE_URL / SERVICE_ROLE_KEY');
    return json({
      ok: false, error: 'not_configured',
      message: `We cannot check cities right now. Email ${SUPPORT_EMAIL} and we will check by hand.`,
    }, 503);
  }

  if (rateLimited(clientKey(request))) {
    return json({
      ok: false, error: 'rate_limited',
      message: 'That is a lot of checks in a short time. Wait a minute and try again.',
    }, 429, { 'Retry-After': '60' });
  }

  const params = new URL(request.url).searchParams;
  const niche = (params.get('niche') || '').trim().toLowerCase();
  const city = (params.get('city') || '').trim().replace(/\s+/g, ' ');
  const state = (params.get('state') || '').trim().toUpperCase();

  const bad = (error, message, field) => json({ ok: false, error, message, field }, 400);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(niche)) {
    return bad('bad_niche', 'Pick a business from the catalog.', 'niche');
  }
  if (city.length < 2 || city.length > 120) {
    return bad('bad_city', 'Type the city you want.', 'city');
  }
  if (!/^[A-Z]{2}$/.test(state)) {
    return bad('bad_state', 'Choose a state.', 'state');
  }

  /* Both calls in parallel: one round trip instead of two. sbv_norm_city is
     not granted to anon, but this endpoint holds the service role, which is
     not subject to those grants. */
  let avail, cityNorm;
  try {
    [avail, cityNorm] = await Promise.all([
      rpc('sbv_city_available', {
        p_niche_slug: niche, p_city_label: city, p_state_code: state,
      }),
      /* Display only — see the note on the response below. */
      rpc('sbv_norm_city', { p: city }),
    ]);
  } catch (e) {
    console.error('check-territory: lookup failed:', e.message, e.body || '');
    return json({
      ok: false, error: 'lookup_failed',
      message: 'We could not check that just now. Try again in a moment.',
    }, 503);
  }

  if (!avail || typeof avail.available !== 'boolean') {
    console.error('check-territory: unexpected rpc shape:', JSON.stringify(avail));
    return json({ ok: false, error: 'lookup_failed' }, 503);
  }

  /* city_norm IS FOR DISPLAY ONLY — it lets the modal show that "St. Charles"
     was understood as "saint charles", which is reassuring when the answer is
     "taken" and the buyer typed it differently.
     IT MUST NEVER BECOME THE INPUT TO A BROWSER-SIDE NORMALISER.
     sbv_norm_city() in the database is the single authority, and the partial
     unique index is built on its output. A second implementation in JavaScript
     that drifts from it — by one abbreviation, one punctuation rule — lets a
     taken city read as free and fail only after the card is charged. That is
     the bug GarageSaleBiz carries, and it is carried precisely because the
     normaliser exists in two places. */
  return json({
    ok: true,
    available: avail.available === true,
    /* Distinguishes claimed / niche_not_for_sale / unrecognised_city /
       bad_state, which need different sentences in the modal. */
    reason: avail.reason || null,
    city_label: city,
    city_norm: typeof cityNorm === 'string' ? cityNorm : null,
    state_code: state,
  });
}
