/* ============================================================================
   POST /api/create-checkout
   ----------------------------------------------------------------------------
   Called by the claim page after the buyer has signed in, chosen a niche, named
   their city, picked a tier and ticked the acceptance box. Validates everything
   that can be validated, parks the submission in sbv_intake, and returns a
   Stripe Checkout URL for the browser to redirect to.

   WHY THIS ENDPOINT EXISTS AT ALL. A plain Stripe payment link would be simpler
   and is what EstateSaleBiz used — which also meant the buyer chose their city
   AFTER paying. That ordering is the direct cause of every paid-but-blocked
   operator there; a dedicated table and an alert email exist purely to survive
   it. Here every rejection that used to happen after payment happens before it:

     city already claimed          -> pick another, having spent nothing
     niche not for sale            -> told plainly, having spent nothing
     reserved or taken subdomain   -> pick another, having spent nothing
     stale acceptance text         -> reload, having spent nothing

   ── WHAT THIS DOES NOT DO ──────────────────────────────────────────────────
   IT RESERVES NOTHING. No claim and no tenant row is written here; both happen
   in the webhook, on payment. The availability check below is a READ, and two
   buyers can pass it for the same city seconds apart and both proceed to pay.

   That is a deliberate choice over a real reservation system, which would need
   a hold table, an expiry, a sweeper for holds whose expiry never ran, and an
   answer for what a third buyer sees for a city that is neither free nor sold.
   The residual race is settled by the partial unique index behind
   sbv_claim_city() in the webhook, and the loser is recorded in
   sbv_blocked_purchases and alerted, not silently dropped.

   The window is NOT "a few seconds" — it is however long the buyer spends on
   Stripe's page, bounded by CHECKOUT_TTL_SECONDS below. What this ordering
   changes is not that the race is gone but that the COMMON case is free: a
   city already sold when someone starts is caught here, before money moves.

   THE BROWSER NEVER WRITES TO sbv_intake. This endpoint does, with the service
   role, which is why sbv_intake carries no policy at all and the public write
   surface of the whole database stays at exactly one table: sbv_demand.
   ========================================================================= */

import {
  json, preflight, userFromRequest,
  pgSelectOne, pgInsert, pgUpdate, rpc,
  stripePost, StripeError,
  sha256Hex, slugify,
  ACCEPTANCE_TEXTS, CURRENT_ACCEPTANCE_VERSION, RESERVED_SLUGS,
  SITE_URL, SUPPORT_EMAIL, SUPABASE_URL, SERVICE_KEY,
  STRIPE_SECRET_KEY, TIER_PRICE_ID, TIERS,
} from './_shared.mjs';

export const config = { runtime: 'nodejs' };

/* How long a Checkout Session stays payable.
 *
 * Stripe permits 30 minutes to 24 hours and DEFAULTS TO 24 HOURS, which is the
 * wrong default for a territory product. Nothing is reserved while someone is
 * in checkout, so the gap between the availability read above and the atomic
 * claim in the webhook is exactly this long. At the default that gap is a day:
 * someone opens checkout, walks away, pays six hours later, and by then the
 * city is sold — landing them in precisely the paid-but-blocked path this
 * ordering exists to avoid.
 *
 * 32 minutes, not 30. The floor is "at least 30 minutes in the future" and
 * Stripe evaluates it when the request ARRIVES, so sending exactly now+1800
 * loses the boundary to any latency at all and is rejected. The extra two
 * minutes cost nothing and remove a race that would otherwise fail
 * intermittently and look like a Stripe outage. */
const CHECKOUT_TTL_SECONDS = 32 * 60;

/* Buyer-facing text for each way sbv_city_available() can say no. Kept here
 * rather than in the database because these are words for a person, and the
 * function's job is to be correct, not friendly. No reason string is passed
 * through raw — an unmapped reason gets the generic line. */
const UNAVAILABLE_MESSAGE = {
  claimed:            'That city is already taken for this business. Pick another city.',
  niche_not_for_sale: 'That business is not available to claim right now.',
  unrecognised_city:  'We could not read that city name. Try it without punctuation.',
  bad_state:          'Use a two-letter state code, like ID or MO.',
  incomplete:         'Please give both a city and a state.',
};

export default { fetch: handler };

async function handler(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  /* ---- configuration, before anything else -------------------------------
     A missing key here is an operator problem, not a buyer problem. Say so
     plainly and give them a way to buy anyway, rather than failing in a way
     that looks like their card was refused. */
  const missing = [];
  if (!SUPABASE_URL)      missing.push('SUPABASE_URL');
  if (!SERVICE_KEY)       missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (missing.length) {
    console.error('create-checkout not configured, missing:', missing.join(', '));
    return json({
      ok: false, error: 'not_configured',
      message: `Checkout is not available right now. Email ${SUPPORT_EMAIL} and we will set you up by hand.`,
    }, 503);
  }

  /* ---- who is asking ----------------------------------------------------- */
  const who = await userFromRequest(request);
  if (who.error) {
    /* Distinguish "we could not reach Supabase" from "your token is bad": the
       first is ours to fix and deserves a retry, the second is a sign-in. */
    if (who.error.startsWith('auth_unreachable')) {
      console.error('create-checkout:', who.error);
      return json({ ok: false, error: 'auth_unreachable',
        message: 'We could not verify your sign-in. Try again in a moment.' }, 503);
    }
    return json({ ok: false, error: 'not_signed_in',
      message: 'Sign in first, then claim your city.' }, 401);
  }
  const user = who.user;
  if (!user.email) {
    return json({ ok: false, error: 'no_email',
      message: `Your account has no email address. Email ${SUPPORT_EMAIL} and we will sort it out.` }, 400);
  }

  /* ---- body -------------------------------------------------------------- */
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!body || typeof body !== 'object') {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const bad = (error, message, field) => json({ ok: false, error, message, field }, 400);

  const nicheSlug    = str(body.niche_slug).toLowerCase();
  const tier         = str(body.tier).toLowerCase();
  const businessName = str(body.business_name);
  const operatorName = str(body.operator_name);
  const operatorPhone = str(body.operator_phone);
  const cityLabel    = str(body.city_label);
  const stateCode    = str(body.state_code).toUpperCase();
  const acceptance   = str(body.acceptance_version);

  /* client_id is the SUBDOMAIN. Run the buyer's suggestion through the same
     slugifier the tenant CHECK constraint expects, rather than rejecting them
     for typing a capital letter or a space. */
  const clientId = slugify(body.client_id ?? businessName);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nicheSlug)) {
    return bad('bad_niche', 'Pick a business from the catalog.', 'niche_slug');
  }
  if (!TIERS.includes(tier)) {
    return bad('bad_tier', 'Choose the launch-ready or the custom build.', 'tier');
  }
  if (!TIER_PRICE_ID[tier]) {
    console.error('create-checkout: no Stripe Price configured for tier', tier);
    return json({ ok: false, error: 'not_configured',
      message: `That option is not on sale yet. Email ${SUPPORT_EMAIL}.` }, 503);
  }
  if (businessName.length < 2 || businessName.length > 120) {
    return bad('bad_business_name', 'Give your business a name, 2 to 120 characters.', 'business_name');
  }
  if (operatorName.length > 120)  return bad('bad_operator_name', 'That name is too long.', 'operator_name');
  if (operatorPhone.length > 40)  return bad('bad_phone', 'That phone number is too long.', 'operator_phone');
  if (cityLabel.length < 2 || cityLabel.length > 120) {
    return bad('bad_city', 'Name the city you want.', 'city_label');
  }
  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return bad('bad_state', UNAVAILABLE_MESSAGE.bad_state, 'state_code');
  }
  if (clientId.length < 3 || clientId.length > 40) {
    return bad('bad_client_id',
      'Your web address needs 3 to 40 letters or numbers.', 'client_id');
  }
  if (RESERVED_SLUGS.has(clientId)) {
    /* Mirrors sbv_tenants_reserved_ck. The constraint is the authority; this
       exists so the buyer gets a sentence instead of a 500. */
    return bad('reserved_client_id',
      `"${clientId}" is reserved. Pick a different web address.`, 'client_id');
  }

  /* ---- the acceptance text ----------------------------------------------
     A stale page is a buyer who ticked a box agreeing to text we have since
     changed. Reject and let them reload — before payment, that costs nothing. */
  if (acceptance !== CURRENT_ACCEPTANCE_VERSION) {
    return bad('stale_acceptance',
      'The terms have been updated. Reload the page and read them again.',
      'acceptance_version');
  }
  const acceptanceText = ACCEPTANCE_TEXTS[acceptance];
  if (!acceptanceText) {
    console.error('create-checkout: CURRENT_ACCEPTANCE_VERSION has no text:', acceptance);
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  /* ---- is this niche ours to sell? ---------------------------------------
     website_offer is the for-sale flag. `status = 'open'` means the OPPOSITE —
     that we hand the buyer off to a sibling platform — and selling one of those
     here would write a claim for a city EstateSaleBiz's or GarageSaleBiz's own
     registry may already hold. sbv_niches_handoff_ck forbids the combination
     outright; this read is the friendly half. */
  let niche;
  try {
    niche = await pgSelectOne('sbv_niches',
      'slug=eq.' + encodeURIComponent(nicheSlug) +
      '&select=slug,name,website_offer,is_listed');
  } catch (e) {
    console.error('create-checkout: niche lookup failed:', e.message);
    return json({ ok: false, error: 'lookup_failed',
      message: 'Something went wrong on our side. Try again in a moment.' }, 503);
  }
  if (!niche || !niche.website_offer || !niche.is_listed) {
    return bad('niche_not_for_sale', UNAVAILABLE_MESSAGE.niche_not_for_sale, 'niche_slug');
  }

  /* ---- is the subdomain free? -------------------------------------------- */
  let clash;
  try {
    clash = await pgSelectOne('sbv_tenants',
      'client_id=eq.' + encodeURIComponent(clientId) + '&select=client_id');
  } catch (e) {
    console.error('create-checkout: tenant lookup failed:', e.message);
    return json({ ok: false, error: 'lookup_failed',
      message: 'Something went wrong on our side. Try again in a moment.' }, 503);
  }
  if (clash) {
    return bad('client_id_taken',
      `"${clientId}" is already in use. Pick a different web address.`, 'client_id');
  }

  /* ---- is the city free? -------------------------------------------------
     Through the database, deliberately. sbv_city_available() runs
     sbv_norm_city(), which is the same normalisation the unique index behind
     the claim uses. A JavaScript city normaliser here could disagree with it,
     and the shape of that disagreement is: the city reads free, the buyer pays,
     and the claim then fails. */
  let avail;
  try {
    avail = await rpc('sbv_city_available', {
      p_niche_slug: nicheSlug,
      p_city_label: cityLabel,
      p_state_code: stateCode,
    });
  } catch (e) {
    console.error('create-checkout: availability check failed:', e.message);
    return json({ ok: false, error: 'lookup_failed',
      message: 'We could not check that city just now. Try again in a moment.' }, 503);
  }
  if (!avail || avail.available !== true) {
    const reason = (avail && avail.reason) || 'incomplete';
    return json({
      ok: false, error: 'city_unavailable', reason,
      message: UNAVAILABLE_MESSAGE[reason] || UNAVAILABLE_MESSAGE.claimed,
      field: 'city_label',
    }, 409);
  }

  /* ---- park the submission ----------------------------------------------
     Written before Stripe is called, so a buyer who pays always has a row
     behind their payment. The webhook trusts THIS, not Stripe metadata:
     metadata caps at 50 keys and 500 characters per value and cannot carry
     contact details plus a territory plus an acceptance record. */
  let intake;
  try {
    const rows = await pgInsert('sbv_intake', {
      user_id: user.id,
      niche_slug: nicheSlug,
      client_id: clientId,
      business_name: businessName,
      operator_name: operatorName || null,
      /* The signed-in address, not one typed into the form. It is the one we
         know a person can actually receive mail at. */
      operator_email: user.email,
      operator_phone: operatorPhone || null,
      city_label: cityLabel,
      state_code: stateCode,
      tier,
      acceptance_version: acceptance,
      /* The version alone would not survive an edit to the document. The hash
         pins the bytes that were actually agreed to. */
      acceptance_hash: sha256Hex(acceptanceText),
      status: 'awaiting_payment',
    });
    intake = Array.isArray(rows) ? rows[0] : rows;
  } catch (e) {
    console.error('create-checkout: intake insert failed:', e.message, e.body || '');
    return json({ ok: false, error: 'intake_failed',
      message: 'We could not start your order. Try again in a moment.' }, 503);
  }
  if (!intake || !intake.id) {
    console.error('create-checkout: intake insert returned no row');
    return json({ ok: false, error: 'intake_failed' }, 503);
  }

  /* ---- Stripe ------------------------------------------------------------ */
  let session;
  try {
    session = await stripePost('checkout/sessions', {
      mode: 'payment',
      line_items: [{ price: TIER_PRICE_ID[tier], quantity: 1 }],
      /* {CHECKOUT_SESSION_ID} is substituted by Stripe on redirect.
         thank-you.html needs it to confirm the purchase server-side, because it
         cannot read sbv_billing (no policy) and has no Stripe key. */
      success_url: SITE_URL + '/claim/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  SITE_URL + '/claim/?cancelled=1',
      customer_email: user.email,
      client_reference_id: String(intake.id),
      /* The webhook reads intake_id from here and then trusts the row. The
         rest is for legibility in the Stripe dashboard when reconciling by
         hand — it is not an input to provisioning. */
      metadata: {
        intake_id: String(intake.id),
        user_id: user.id,
        niche_slug: nicheSlug,
        client_id: clientId,
        tier,
        city: (cityLabel + ', ' + stateCode).slice(0, 480),
      },
      payment_intent_data: {
        description: ('Systems by Vega — ' + niche.name + ' — ' + cityLabel + ', ' + stateCode).slice(0, 350),
      },
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
      /* allow_promotion_codes is deliberately UNSET. A discounted session can
         land below the amount the webhook expects for this tier and be rejected
         AFTER the card is charged — the buyer pays, gets nothing, and a human
         has to unpick it. GarageSaleBiz enables promo codes against a floor at
         its own list price and looks exposed to exactly this. */
    });
  } catch (e) {
    const detail = e instanceof StripeError ? (e.stripeCode || e.status) : '';
    console.error('create-checkout: Stripe session failed:', e.message, detail);
    /* The intake row is marked, not deleted. It is the only record that someone
       got this far; an abandoned row costs nothing and a deleted one loses a
       lead who hit a Stripe outage. */
    try {
      await pgUpdate('sbv_intake', 'id=eq.' + encodeURIComponent(intake.id),
        { status: 'abandoned' });
    } catch (e2) {
      console.error('create-checkout: could not mark intake abandoned:', e2.message);
    }
    return json({ ok: false, error: 'checkout_failed',
      message: `We could not open checkout. Try again, or email ${SUPPORT_EMAIL} and we will take it from here.` }, 502);
  }

  /* Recorded so the webhook can find this intake by session as well as by
     client_reference_id, and so an abandoned session can be reconciled by hand.
     A failure here is logged and swallowed: the session exists and the buyer is
     already on their way to Stripe, and client_reference_id still carries the
     intake id, so provisioning does not depend on this write. */
  try {
    await pgUpdate('sbv_intake', 'id=eq.' + encodeURIComponent(intake.id),
      { stripe_session_id: session.id });
  } catch (e) {
    console.error('create-checkout: could not store session id on intake:', e.message);
  }

  return json({ ok: true, url: session.url, intake_id: intake.id });
}
