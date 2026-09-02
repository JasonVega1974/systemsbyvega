/* ============================================================================
   GET /api/verify-session?session_id=cs_...
   ----------------------------------------------------------------------------
   What the thank-you page polls after Stripe redirects the buyer back.

   WHY THE PAGE CANNOT ANSWER THIS ITSELF. thank-you.html is static. It cannot
   read sbv_billing or sbv_tenants — neither has a policy, by design — and it
   has no Stripe key. So it asks here, and this reads the database with the
   service role and hands back the few fields a buyer is entitled to see about
   their own purchase.

   ── THIS ENDPOINT NEVER PROVISIONS ANYTHING ────────────────────────────────
   It is READ-ONLY. Not "mostly read-only": there is no write path in this file
   at all. EstateSaleBiz provisioned from the buyer's browser after the Stripe
   redirect, and that is the specific mistake this whole design exists to avoid
   — a buyer who closes the tab has paid and has nothing. Provisioning belongs
   to the webhook, which runs whether or not anybody's browser survives the
   round trip. If this endpoint ever grows a write, that reasoning has been
   lost and the bug is back.

   ── WHY IT REQUIRES A SIGN-IN ──────────────────────────────────────────────
   A Checkout Session id is high-entropy and unguessable, but it travels in a
   URL: it lands in browser history, in a screenshot, in a pasted link. Since
   buying already requires an account (auth before payment), asking for that
   same account here costs a signed-in buyer nothing and stops a leaked URL
   from telling a stranger what somebody bought and where they operate.

   The caller must own the session, not merely be signed in. See authorise().
   ========================================================================= */

import {
  json, preflight, userFromRequest, pgSelectOne,
  SUPPORT_EMAIL, SUPABASE_URL, SERVICE_KEY, APEX,
} from './_shared.mjs';

export const config = { runtime: 'nodejs' };

export default { fetch: handler };

async function handler(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('verify-session not configured');
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  /* Shape-checked before it reaches a query. Stripe session ids are
     cs_<live|test>_<base62>; anything else is not worth a database round trip
     and should not be echoed back into an error message either. */
  if (!/^cs_[A-Za-z0-9_]{8,120}$/.test(sessionId)) {
    return json({ ok: false, error: 'bad_session_id' }, 400);
  }

  const who = await userFromRequest(request);
  if (who.error) {
    if (who.error.startsWith('auth_unreachable')) {
      console.error('verify-session:', who.error);
      return json({ ok: false, error: 'auth_unreachable' }, 503);
    }
    /* The buyer has paid at this point, so the page must not imply otherwise.
       "Sign in to see it", never "we cannot find your order". */
    return json({
      ok: false, error: 'not_signed_in',
      message: 'Sign in with the account you bought with to see your order.',
    }, 401);
  }
  const userId = who.user.id;

  const q = (v) => encodeURIComponent(String(v));

  /* Read everything this session could be recorded in. Any one of them may be
     absent depending on how far the webhook got — that is the whole point of
     the status this endpoint returns. */
  let intake, billing, blocked;
  try {
    [intake, billing, blocked] = await Promise.all([
      pgSelectOne('sbv_intake',
        'stripe_session_id=eq.' + q(sessionId) +
        '&select=id,user_id,status,niche_slug,client_id,business_name,city_label,state_code,tier'),
      pgSelectOne('sbv_billing',
        'stripe_session_id=eq.' + q(sessionId) +
        '&select=user_id,client_id,status,amount_cents'),
      pgSelectOne('sbv_blocked_purchases',
        'stripe_session_id=eq.' + q(sessionId) +
        '&select=user_id,reason,requested_city,requested_state,resolved'),
    ]);
  } catch (e) {
    console.error('verify-session: lookup failed:', e.message);
    return json({ ok: false, error: 'lookup_failed' }, 503);
  }

  /* Unknown to us. Could be a session from another environment, or one the
     webhook has not touched and whose intake write never landed. Deliberately
     the same answer as "not yours" — see authorise(). */
  if (!intake && !billing && !blocked) {
    return json({ ok: false, error: 'unknown_session' }, 404);
  }

  if (!authorise(userId, intake, billing, blocked)) {
    /* 404, not 403. Telling a stranger "that session exists but is not yours"
       confirms the session is real, which is most of what they wanted to know. */
    console.warn('verify-session: user', userId, 'asked about a session they do not own');
    return json({ ok: false, error: 'unknown_session' }, 404);
  }

  /* ---- the answer -------------------------------------------------------
     Four states, named from the buyer's point of view rather than the
     database's. In particular there is no "awaiting payment": by the time
     anyone loads the thank-you page they have paid, and the webhook simply may
     not have landed yet. Calling that "pending payment" would tell a paying
     customer their payment had not gone through. */

  if (blocked && !blocked.resolved) {
    return json({
      ok: true,
      status: 'blocked',
      city: blocked.requested_city || null,
      state: blocked.requested_state || null,
      message:
        'Your payment went through, but that city was claimed moments before ' +
        'yours. Nothing is lost — we have been alerted and will email you ' +
        'today to sort out a refund or another city.',
      support: SUPPORT_EMAIL,
    });
  }

  if (billing && billing.status === 'refunded') {
    return json({
      ok: true,
      status: 'refunded',
      message: 'This purchase has been refunded and the city released.',
      support: SUPPORT_EMAIL,
    });
  }

  /* Provisioned means the tenant exists AND is live. is_active is flipped last
     by the webhook, precisely so that it means "the operator can reach this". */
  if (billing && billing.client_id) {
    let tenant = null;
    try {
      tenant = await pgSelectOne('sbv_tenants',
        'client_id=eq.' + q(billing.client_id) +
        '&select=client_id,business_name,niche_slug,is_active');
    } catch (e) {
      console.error('verify-session: tenant lookup failed:', e.message);
      return json({ ok: false, error: 'lookup_failed' }, 503);
    }

    if (tenant && tenant.is_active) {
      /* The catalog name alongside the slug. A page that only has the slug can
         do nothing better than print "dj" or "bbq food truck", and this is the
         first screen a buyer sees after paying. Sent as a separate field rather
         than replacing niche_slug, which is still the stable key. Best-effort:
         a lookup failure costs a nicer label, not the confirmation. */
      let nicheName = null;
      try {
        const n = await pgSelectOne('sbv_niches',
          'slug=eq.' + q(tenant.niche_slug) + '&select=name');
        nicheName = n && n.name;
      } catch (e) {
        console.warn('verify-session: niche name lookup failed:', e.message);
      }

      return json({
        ok: true,
        status: 'ready',
        client_id: tenant.client_id,
        business_name: tenant.business_name,
        niche_slug: tenant.niche_slug,
        niche_name: nicheName,
        city: intake ? intake.city_label : null,
        state: intake ? intake.state_code : null,
        tier: intake ? intake.tier : null,
        /* The address their site will answer on. Stated as a fact about the
           territory, not as a live link — the site itself is built after this. */
        web_address: tenant.client_id + '.' + APEX,
        support: SUPPORT_EMAIL,
      });
    }
  }

  /* Everything else: we have the order, provisioning has not finished. Usually
     a second or two; occasionally longer if Stripe is retrying. */
  return json({
    ok: true,
    status: 'processing',
    city: intake ? intake.city_label : null,
    state: intake ? intake.state_code : null,
    message:
      'Payment received. We are setting up your territory now — this page ' +
      'updates on its own, and your confirmation email is on its way either way.',
    support: SUPPORT_EMAIL,
  });
}

/* Does this caller own this session?
 *
 * Checked against every row that could carry an owner, because which rows
 * exist depends on how far the webhook got. A session whose intake says one
 * user and whose billing says another is not a case that should exist; if it
 * ever does, neither of them gets an answer here. */
function authorise(userId, intake, billing, blocked) {
  const owners = [intake && intake.user_id, billing && billing.user_id, blocked && blocked.user_id]
    .filter(Boolean);
  /* No recorded owner at all — a payment made outside our flow. The webhook
     has already alerted a human about it; this endpoint says nothing. */
  if (!owners.length) return false;
  return owners.every((o) => o === userId);
}
