/* ============================================================================
   api/stripe-webhook.test.mjs — Stripe redelivers. Prove it costs nothing.
   ----------------------------------------------------------------------------
   Stripe retries a delivery for about three days, and replays from the
   dashboard arrive whenever a human presses the button. The webhook therefore
   has to be safe to run twice with the same payload: one tenant, one claim,
   one account, one mapping — and, above all, ONE invitation email, because the
   second one lands in the inbox of a buyer who is already holding the first.

   HOW THIS RUNS WITHOUT A NETWORK. Every side effect in this path leaves the
   process through `fetch` — PostgREST, GoTrue, Stripe, Brevo and Vercel all do
   — so globalThis.fetch is replaced with a small in-memory stand-in and
   nothing else is stubbed. The module under test is imported unmodified, and
   the request goes in through its real HTTP handler with a real HMAC
   signature, so signature verification, status codes and ordering are all
   exercised rather than bypassed.

   WHAT THE STAND-IN IS AND IS NOT. It is a toy PostgREST: equality filters,
   insert with 409 on a duplicate key, merge-duplicates upsert, patch, delete,
   and the two RPCs this file calls. It is NOT the database — it cannot prove
   anything about RLS, constraints or the partial unique index that actually
   sells a territory. It proves control flow: which requests the webhook makes
   on a second delivery, and which it does not.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

/* Read at import time by _shared.mjs, so they must be set before the dynamic
   import below. A fake origin keeps a stray real request impossible to miss. */
process.env.SUPABASE_URL              = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_PUBLISHABLE_KEY  = 'anon-key';
process.env.STRIPE_SECRET_KEY         = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET     = 'whsec_test_fake';
process.env.STRIPE_PRICE_ID_LAUNCH    = 'price_launch';
process.env.STRIPE_PRICE_ID_CUSTOM    = 'price_custom';
process.env.BREVO_API_KEY             = 'brevo-key';
process.env.VERCEL_TOKEN              = 'vercel-token';
process.env.VERCEL_PROJECT_ID         = 'prj_fake';

const webhook = await import('./stripe-webhook.mjs');

/* ------------------------------------------------------------ the fake world */

let db, counts;

function reset() {
  db = {
    sbv_intake: [],
    sbv_billing: [],
    sbv_tenants: [],
    sbv_client_users: [],
    sbv_city_claims: [],
    sbv_blocked_purchases: [],
    sbv_niches: [{ slug: 'dj', name: 'DJ' }, { slug: 'bbq', name: 'BBQ Catering' }],
    auth_users: [],
    mail: [],
  };
  counts = {
    invites: 0, inviteResends: 0, links: 0, loginLinkMails: 0,
    brevo: 0, authLookups: 0, tenantInserts: 0, mappingInserts: 0, claims: 0,
  };
}

/* Primary keys, so the stand-in can answer 409 where the real schema would. */
const KEYS = {
  sbv_tenants: ['client_id'],
  sbv_client_users: ['user_id', 'client_id'],
  sbv_billing: ['stripe_session_id'],
  sbv_intake: ['id'],
  sbv_blocked_purchases: ['stripe_session_id'],
};

const sameKey = (table, a, b) =>
  (KEYS[table] || []).length > 0 &&
  KEYS[table].every((k) => String(a[k]) === String(b[k]));

function matches(row, params) {
  for (const [k, v] of params) {
    if (['select', 'limit', 'order', 'on_conflict', 'offset'].includes(k)) continue;
    if (!v.startsWith('eq.')) throw new Error('fake pg: unsupported filter ' + k + '=' + v);
    if (String(row[k]) !== v.slice(3)) return false;
  }
  return true;
}

function jsonRes(body, status = 200) {
  return new Response(body === null ? '' : JSON.stringify(body),
    { status, headers: { 'Content-Type': 'application/json' } });
}

function rest(url, init) {
  const table = url.pathname.replace('/rest/v1/', '');
  const params = [...url.searchParams.entries()];
  const method = (init && init.method) || 'GET';
  const body = init && init.body ? JSON.parse(init.body) : null;
  const prefer = (init && init.headers && init.headers.Prefer) || '';

  if (table.startsWith('rpc/')) return rpc(table.slice(4), body);
  if (!db[table]) throw new Error('fake pg: unknown table ' + table);

  if (method === 'GET') {
    let rows = db[table].filter((r) => matches(r, params));
    const limit = url.searchParams.get('limit');
    if (limit) rows = rows.slice(0, Number(limit));
    return jsonRes(rows);
  }

  if (method === 'POST') {
    if (table === 'sbv_tenants') counts.tenantInserts++;
    if (table === 'sbv_client_users') counts.mappingInserts++;
    const row = { id: 'row_' + Math.random().toString(36).slice(2), ...body };
    const dup = db[table].find((r) => sameKey(table, r, row));
    if (dup) {
      if (!prefer.includes('merge-duplicates')) {
        return jsonRes({ code: '23505', message: 'duplicate key' }, 409);
      }
      Object.assign(dup, body);
      return prefer.includes('return=minimal') ? jsonRes(null, 201) : jsonRes([dup], 201);
    }
    db[table].push(row);
    return prefer.includes('return=minimal') ? jsonRes(null, 201) : jsonRes([row], 201);
  }

  if (method === 'PATCH') {
    const hit = db[table].filter((r) => matches(r, params));
    hit.forEach((r) => Object.assign(r, body));
    return jsonRes(hit);
  }

  if (method === 'DELETE') {
    db[table] = db[table].filter((r) => !matches(r, params));
    return jsonRes(null, 204);
  }

  throw new Error('fake pg: unsupported method ' + method);
}

/* The two database functions this path calls. sbv_claim_city is the whole
   exclusivity guarantee in production; here it only has to tell "mine" from
   "somebody else's", which is what the webhook branches on. */
function rpc(fn, args) {
  if (fn === 'sbv_claim_city') {
    counts.claims++;
    const held = db.sbv_city_claims.find((c) =>
      c.niche_slug === args.p_niche_slug &&
      c.city_label === args.p_city_label &&
      c.state_code === args.p_state_code);
    if (held) {
      return jsonRes({
        ok: false, reason: 'already_claimed',
        mine: held.client_id === args.p_client_id,
        holder: held.client_id,
      });
    }
    db.sbv_city_claims.push({
      niche_slug: args.p_niche_slug, city_label: args.p_city_label,
      state_code: args.p_state_code, client_id: args.p_client_id,
      stripe_session_id: args.p_stripe_session_id, status: 'active',
    });
    return jsonRes({ ok: true });
  }
  if (fn === 'sbv_release_territory') {
    db.sbv_city_claims = db.sbv_city_claims.filter(
      (c) => c.stripe_session_id !== args.p_stripe_session_id);
    return jsonRes({ ok: true });
  }
  throw new Error('fake pg: unknown rpc ' + fn);
}

/* GoTrue: the filter search, the invite, and admin link generation.

   THE INVITE BRANCH MODELS THE REAL ONE, INCLUDING THE PART THAT BITES.
   supabase/auth internal/api/invite.go computes
   `isConfirmed := user != nil && user.IsConfirmed()` and raises
   email_exists only inside `if !isCreate { if isConfirmed { ... } }`. So an
   address belonging to somebody who was invited and never opened the link does
   NOT get a 422 — GoTrue re-sends the invitation and answers 200 with the
   user. An earlier version of this fake returned 422 for any existing user,
   which made the webhook look safe on exactly the population it was not safe
   on. A fake kinder than production is worse than no fake at all. */
function auth(url, init) {
  if (url.pathname === '/auth/v1/admin/users') {
    counts.authLookups++;
    const filter = (url.searchParams.get('filter') || '').toLowerCase();
    const users = filter
      ? db.auth_users.filter((u) => u.email.includes(filter))
      : db.auth_users.slice();
    return jsonRes({ users });
  }

  if (url.pathname === '/auth/v1/invite') {
    const email = String(JSON.parse(init.body).email).toLowerCase();
    const existing = db.auth_users.find((u) => u.email === email);
    if (existing && existing.confirmed) {
      return jsonRes({ error_code: 'email_exists', msg: 'A user with this email address has already been registered' }, 422);
    }
    /* Either a new account, or a re-send to an unconfirmed one. Both put an
       email in the buyer's inbox, so both count. */
    counts.invites++;
    if (existing) { counts.inviteResends++; return jsonRes(existing, 200); }
    const user = { id: 'usr_' + (db.auth_users.length + 1), email, confirmed: false };
    db.auth_users.push(user);
    return jsonRes(user, 200);
  }

  /* internal/api/mail.go: the response is the user with action_link and
     friends merged in at the TOP level, and it sends no mail of its own. */
  if (url.pathname === '/auth/v1/admin/generate_link') {
    const body = JSON.parse(init.body);
    const email = String(body.email).toLowerCase();
    const user = db.auth_users.find((u) => u.email === email);
    if (!user) return jsonRes({ error_code: 'user_not_found', msg: 'User not found' }, 404);
    counts.links++;
    return jsonRes({
      ...user,
      action_link: 'https://fake.supabase.co/auth/v1/verify?token=tok&type=' + body.type,
      email_otp: '123456', hashed_token: 'hsh', verification_type: body.type,
      redirect_to: body.redirect_to || null,
    });
  }

  throw new Error('fake auth: unexpected ' + url.pathname);
}

function stripe(url) {
  if (url.pathname.startsWith('/v1/checkout/sessions/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    return jsonRes(sessionFor(id));
  }
  if (url.pathname.startsWith('/v1/payment_intents/')) {
    return jsonRes({ id: 'pi_1', latest_charge: { id: 'ch_1', refunded: false, amount_refunded: 0 } });
  }
  throw new Error('fake stripe: unexpected ' + url.pathname);
}

const SESSIONS = new Map();
function sessionFor(id) {
  const s = SESSIONS.get(id);
  if (!s) throw new Error('fake stripe: no such session ' + id);
  return { ...s, line_items: { data: [{ price: { id: 'price_launch' } }] } };
}

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === 'fake.supabase.co') {
    return url.pathname.startsWith('/auth/') ? auth(url, init) : rest(url, init);
  }
  if (url.hostname === 'api.stripe.com') return stripe(url);
  if (url.hostname === 'api.brevo.com') {
    counts.brevo++;
    const m = JSON.parse(init.body);
    db.mail.push({ to: m.to[0].email, subject: m.subject, text: m.textContent });
    if (/sign-in link/i.test(m.subject)) counts.loginLinkMails++;
    return jsonRes({ messageId: 'm1' });
  }
  if (url.hostname === 'api.vercel.com') return jsonRes({ name: 'x' });
  throw new Error('fake fetch: unexpected host ' + url.hostname);
};

/* ------------------------------------------------------------- the fixtures */

function seedPurchase({ intakeId, sessionId, niche, city, email }) {
  db.sbv_intake.push({
    id: intakeId, user_id: null, niche_slug: niche, client_id: 'acme',
    business_name: 'Acme', operator_name: 'Ada', operator_email: email,
    operator_phone: null, city_label: city, state_code: 'TX',
    tier: 'launch', status: 'awaiting_payment',
  });
  SESSIONS.set(sessionId, {
    id: sessionId, mode: 'payment', payment_status: 'paid', currency: 'usd',
    amount_total: 29900, payment_intent: 'pi_1',
    customer_email: email, customer_details: { email },
    client_reference_id: String(intakeId),
    metadata: { intake_id: String(intakeId), operator_email: email },
  });
}

/* A signed delivery, through the real handler. The signature is computed over
   the exact bytes sent, exactly as Stripe does it. */
async function deliver(sessionId) {
  const body = JSON.stringify({
    id: 'evt_' + sessionId, type: 'checkout.session.completed',
    data: { object: SESSIONS.get(sessionId) },
  });
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(t + '.' + body, 'utf8').digest('hex');
  const res = await webhook.default.fetch(new Request('https://x/api/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=' + t + ',v1=' + v1, 'Content-Type': 'application/json' },
    body,
  }));
  return { status: res.status, body: await res.json() };
}

/* ----------------------------------------------------------------- the tests */

test('a first delivery provisions: account, mapping, active tenant', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const first = await deliver('cs_1');

  assert.equal(first.status, 200);
  assert.equal(first.body.ok, true);
  assert.equal(first.body.client_id, 'acme');
  assert.equal(counts.invites, 1, 'one invitation');
  assert.equal(counts.links, 0, 'a brand new address needs no link of ours');
  assert.equal(db.auth_users.length, 1);
  assert.equal(db.sbv_tenants.length, 1);
  assert.equal(db.sbv_tenants[0].is_active, true, 'live only after the login exists');
  assert.equal(db.sbv_client_users.length, 1);
  assert.equal(db.sbv_client_users[0].user_id, db.auth_users[0].id);
  assert.equal(db.sbv_client_users[0].role, 'operator');
  assert.equal(db.sbv_billing[0].user_id, db.auth_users[0].id, 'money points at the person');
  assert.equal(db.sbv_intake[0].user_id, db.auth_users[0].id);
  assert.equal(db.sbv_intake[0].status, 'paid');
});

test('a redelivered event changes nothing and invites nobody', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  await deliver('cs_1');
  const before = {
    tenantInserts: counts.tenantInserts,
    mappingInserts: counts.mappingInserts,
    claims: counts.claims,
    brevo: counts.brevo,
  };

  const second = await deliver('cs_1');

  assert.equal(second.status, 200);
  assert.equal(second.body.already, true, 'took the already-provisioned path');
  assert.equal(counts.invites, 1, 'NO second invitation');
  assert.equal(counts.links, 0, 'and no sign-in link generated either');
  assert.equal(db.auth_users.length, 1, 'no second account');
  assert.equal(db.sbv_tenants.length, 1, 'no second tenant');
  assert.equal(db.sbv_client_users.length, 1, 'no second mapping');
  assert.equal(db.sbv_billing.length, 1, 'no second billing row');
  assert.equal(db.sbv_city_claims.length, 1, 'no second claim');
  /* Not merely "the rows look the same afterwards" — the writes were never
     attempted, which is what stops a duplicate welcome email too. */
  assert.equal(counts.tenantInserts, before.tenantInserts, 'no tenant insert attempted');
  assert.equal(counts.mappingInserts, before.mappingInserts, 'no mapping insert attempted');
  assert.equal(counts.claims, before.claims, 'no claim attempted');
  assert.equal(counts.brevo, before.brevo, 'no mail of any kind');
});

test('a redelivery that lands before sbv_billing.user_id is patched still does not re-invite', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });
  await deliver('cs_1');

  /* The exact crash window: the account and the mapping exist, but the patch
     that records the user id on the billing row never landed. Keying step 1 on
     billing.user_id would read "no mapping" here and invite again. */
  db.sbv_billing[0].user_id = null;

  const second = await deliver('cs_1');

  assert.equal(second.body.already, true);
  assert.equal(counts.invites, 1, 'still one invitation');
  assert.equal(db.sbv_client_users.length, 1);
});

test('a second niche for the same buyer reuses the account and adds a mapping', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });
  await deliver('cs_1');

  seedPurchase({ intakeId: 'i2', sessionId: 'cs_2', niche: 'bbq', city: 'Austin', email: 'Buyer@Example.com' });
  const second = await deliver('cs_2');

  assert.equal(second.body.ok, true);
  assert.equal(counts.invites, 1, 'the repeat buyer is not invited again');
  assert.equal(counts.inviteResends, 0, 'and /invite was never even called');
  assert.equal(counts.links, 1, 'they get a link of ours instead');
  assert.equal(counts.loginLinkMails, 1, 'and it was actually mailed');
  assert.equal(db.auth_users.length, 1, 'one person, one account');
  assert.equal(db.sbv_tenants.length, 2, 'one tenant per niche');
  assert.equal(db.sbv_client_users.length, 2, 'two mappings on the composite key');
  assert.deepEqual(
    db.sbv_client_users.map((m) => m.user_id),
    [db.auth_users[0].id, db.auth_users[0].id]);
});

test('an account the cheap search missed is found before a duplicate is made', async () => {
  reset();
  /* The account exists but the filtered search comes back empty — what an
     older GoTrue that does not understand `filter` looks like once the project
     has more users than one page. The invite refuses, the exhaustive search
     finds them, and nobody gets a second account or a second email. */
  db.auth_users.push({ id: 'usr_old', email: 'buyer@example.com', confirmed: true });
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/admin/users' && url.searchParams.get('filter')) {
      return jsonRes({ users: [] });
    }
    return real(input, init);
  };
  const res = await deliver('cs_1');
  globalThis.fetch = real;

  assert.equal(res.body.ok, true);
  assert.equal(counts.invites, 0, 'no invitation was sent');
  assert.equal(counts.links, 1, 'they were mailed a link instead');
  assert.equal(db.auth_users.length, 1, 'no duplicate account');
  assert.equal(db.sbv_client_users[0].user_id, 'usr_old');
  assert.equal(db.sbv_tenants[0].is_active, true);
});

test('no invite means no activation — the storefront is held, not lit', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const realAuth = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/invite') return jsonRes({ msg: 'mailer down' }, 500);
    return realAuth(input, init);
  };
  const res = await deliver('cs_1');
  globalThis.fetch = realAuth;

  assert.equal(res.status, 200, '200 so Stripe stops retrying a permanent hold');
  assert.equal(res.body.blocked, 'no_operator_login');
  assert.equal(db.sbv_tenants.length, 1);
  assert.equal(db.sbv_tenants[0].is_active, false, 'NOT live without a way in');
  assert.equal(db.sbv_client_users.length, 0);
  assert.equal(db.sbv_billing.length, 1, 'the payment is still recorded');
  assert.equal(db.sbv_city_claims.length, 1, 'and the territory is still held');
});

/* ------------------------------------------- the unconfirmed invitee, Fix A */

test('an unconfirmed invitee gets a login link, never a second invite', async () => {
  reset();
  /* The population a resumed delivery is most likely to meet: invited at some
     point, never opened the link. Real GoTrue does NOT answer 422 for this
     account — /invite would re-send the invitation and answer 200, which is a
     second email nobody asked for. */
  db.auth_users.push({ id: 'usr_pending', email: 'buyer@example.com', confirmed: false });
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const res = await deliver('cs_1');

  assert.equal(res.body.ok, true);
  assert.equal(counts.invites, 0, '/invite was never called');
  assert.equal(counts.inviteResends, 0, 'so nothing was re-sent');
  assert.equal(counts.links, 1, 'one link generated');
  assert.equal(counts.loginLinkMails, 1, 'and one link email sent');
  assert.equal(db.auth_users.length, 1, 'no second account');
  assert.equal(db.sbv_client_users[0].user_id, 'usr_pending');
  assert.equal(db.sbv_tenants[0].is_active, true, 'live, because they now have a way in');
  const link = db.mail.find((m) => /sign-in link/i.test(m.subject));
  assert.equal(link.to, 'buyer@example.com');
  assert.match(link.text, /auth\/v1\/verify\?token=tok&type=magiclink/);
});

test('a reused account whose link cannot be mailed holds the storefront dark', async () => {
  reset();
  db.auth_users.push({ id: 'usr_pending', email: 'buyer@example.com', confirmed: false });
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    /* Brevo refuses the link email; the alert to us still goes out. */
    if (url.hostname === 'api.brevo.com' && /sign-in link/i.test(JSON.parse(init.body).subject)) {
      return jsonRes({ message: 'sender blocked' }, 400);
    }
    return real(input, init);
  };
  const res = await deliver('cs_1');
  globalThis.fetch = real;

  assert.equal(res.body.blocked, 'no_operator_login');
  assert.equal(db.sbv_tenants[0].is_active, false, 'a link that never arrived is not a way in');
  assert.equal(db.sbv_client_users.length, 0);
  assert.equal(db.sbv_billing.length, 1, 'the payment is still recorded');
});

/* ------------------------------------------------ the auth API refuses, Fix B */

test('a 403 from the admin API holds and alerts — it does not burn the retry window', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/admin/users') return jsonRes({ msg: 'invalid api key' }, 403);
    return real(input, init);
  };
  const res = await deliver('cs_1');
  globalThis.fetch = real;

  assert.equal(res.status, 200, 'NOT 500 — a revoked key does not fix itself');
  assert.equal(res.body.blocked, 'auth_lookup_refused');
  assert.equal(counts.brevo, 1, 'and a human was told, like every other hold here');
  assert.match(db.mail[0].subject, /Supabase Auth refused/);
  assert.equal(db.sbv_tenants[0].is_active, false);
  assert.equal(counts.invites, 0, 'no account was guessed into existence');
});

test('a 503 from the admin API still returns 500 so Stripe retries', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/admin/users') return jsonRes({ msg: 'upstream unavailable' }, 503);
    return real(input, init);
  };
  const res = await deliver('cs_1');
  globalThis.fetch = real;

  assert.equal(res.status, 500, 'transient — the next delivery may work');
  assert.equal(res.body.error, 'auth_lookup_failed');
  assert.equal(counts.brevo, 0, 'and no alert, because this is not a hold');
  assert.equal(db.sbv_tenants[0].is_active, false);
});

/* ------------------------------------------------- the welcome email, Fix C */

test('the welcome email points at the sign-in link, not at an account they never made', async () => {
  reset();
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  await deliver('cs_1');

  const welcome = db.mail.find((m) => /territory is claimed/i.test(m.subject));
  assert.ok(welcome, 'the buyer got a confirmation');
  /* Deliberately broader than the one sentence that was wrong, and phrased so
     the offending line cannot creep back in under a synonym — nobody creates
     an account at checkout any more, in any wording. */
  assert.doesNotMatch(welcome.text, /created at checkout/i,
    'nobody creates an account at checkout any more');
  assert.match(welcome.text, /sign-in link is in a separate email/);
});

test('a missed unconfirmed account costs one invite re-send, never two emails', async () => {
  reset();
  /* The residual case, pinned so it stays small. If the cheap search cannot
     see an UNCONFIRMED account, /invite is reached and GoTrue answers 200
     after re-sending the invitation — there is no 422 to tell us otherwise,
     and the user object it returns looks exactly like a fresh signup. The
     buyer still ends up with exactly one usable link and one email; what we
     lose is only the chance to send our own. A resumed delivery never lands
     here, because step 1 stops on the mapping long before. */
  db.auth_users.push({ id: 'usr_pending', email: 'buyer@example.com', confirmed: false });
  seedPurchase({ intakeId: 'i1', sessionId: 'cs_1', niche: 'dj', city: 'Austin', email: 'buyer@example.com' });

  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/admin/users' && url.searchParams.get('filter')) {
      return jsonRes({ users: [] });
    }
    return real(input, init);
  };
  const res = await deliver('cs_1');
  globalThis.fetch = real;

  assert.equal(res.body.ok, true);
  assert.equal(counts.invites, 1, 'one email, not two');
  assert.equal(counts.inviteResends, 1, 'and it was a re-send of the existing invitation');
  assert.equal(counts.loginLinkMails, 0, 'we did not also send a link of our own');
  assert.equal(db.auth_users.length, 1, 'no duplicate account');
  assert.equal(db.sbv_client_users[0].user_id, 'usr_pending');
  assert.equal(db.sbv_tenants[0].is_active, true, 'they do have a way in');
});
