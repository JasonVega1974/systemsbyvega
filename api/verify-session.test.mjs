/* ============================================================================
   api/verify-session.test.mjs — what a stolen link is worth.
   ----------------------------------------------------------------------------
   Buyers now pay before they have an account, so the thank-you page calls this
   endpoint with no session of any kind. That makes the Stripe Checkout Session
   id the only proof the caller can hold, and the whole safety of the change
   rests on ONE claim: the answer given to an unauthenticated caller contains
   nothing worth stealing a URL for.

   These tests are therefore written as an ALLOW-LIST, twice over. They pin the
   exact key set of the limited answer, and then they search the serialised
   body for the specific secrets — client id, web address, user id, the whole
   email address, the amount — and require that none of them appear anywhere in
   it, under any key. A test that only checked the fields it expected would
   still pass on the day somebody adds a column to the select.

   HOW THIS RUNS WITHOUT A NETWORK. Same approach as stripe-webhook.test.mjs:
   PostgREST and GoTrue are both reached through plain `fetch` in _shared.mjs,
   so globalThis.fetch is replaced with a small in-memory stand-in and nothing
   else is stubbed. The module goes in through its real HTTP handler, so status
   codes and the authorisation branch are exercised rather than bypassed.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/* Read at import time by _shared.mjs, so they must be set before the dynamic
   import below. A fake origin makes a stray real request impossible to miss. */
process.env.SUPABASE_URL              = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_PUBLISHABLE_KEY  = 'anon-key';

const mod = await import('./verify-session.mjs');
const { maskEmail } = mod;

/* ------------------------------------------------------------ the fake world */

const SESSION = 'cs_test_a1b2c3d4e5f6g7h8';
const BUYER   = 'usr_buyer';
const OTHER   = 'usr_stranger';
const EMAIL   = 'jason@example.com';
const CLIENT  = 'vega-dj-boise';

let db;
/* Bearer token -> user id. A token that is not in here is rejected the way
   GoTrue rejects an expired one. */
let tokens;
let authReachable;

function reset() {
  db = {
    sbv_intake: [],
    sbv_billing: [],
    sbv_blocked_purchases: [],
    sbv_tenants: [],
    sbv_niches: [{ slug: 'dj', name: 'DJ' }],
  };
  tokens = { 'tok-buyer': BUYER, 'tok-stranger': OTHER };
  authReachable = true;
}

/* A paid session whose webhook has not run: the intake row exists, nobody owns
   it, and there is no tenant. This is what the buyer's browser hits first. */
function unclaimedPurchase() {
  db.sbv_intake.push({
    stripe_session_id: SESSION,
    id: 'int_1', user_id: null, status: 'paid', niche_slug: 'dj',
    client_id: CLIENT, business_name: 'Vega Sound', city_label: 'Boise',
    state_code: 'ID', tier: 'launch', operator_email: EMAIL,
  });
  db.sbv_billing.push({
    stripe_session_id: SESSION, user_id: null, client_id: null,
    status: 'paid', amount_cents: 250000,
  });
}

/* The same purchase after the webhook: an account exists, the tenant is live,
   and both rows carry the owner. */
function provisioned(ownerId = BUYER) {
  unclaimedPurchase();
  db.sbv_intake[0].user_id = ownerId;
  db.sbv_billing[0].user_id = ownerId;
  db.sbv_billing[0].client_id = CLIENT;
  db.sbv_tenants.push({
    client_id: CLIENT, business_name: 'Vega Sound', niche_slug: 'dj', is_active: true,
  });
}

function matches(row, params) {
  for (const [k, v] of params) {
    if (['select', 'limit', 'order', 'offset'].includes(k)) continue;
    if (!v.startsWith('eq.')) throw new Error('fake pg: unsupported filter ' + k + '=' + v);
    if (String(row[k]) !== v.slice(3)) return false;
  }
  return true;
}

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body),
    { status, headers: { 'Content-Type': 'application/json' } });
}

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname !== 'fake.supabase.co') {
    throw new Error('fake fetch: unexpected host ' + url.hostname);
  }

  if (url.pathname === '/auth/v1/user') {
    if (!authReachable) throw new Error('connect ECONNREFUSED');
    const auth = (init && init.headers && init.headers.Authorization) || '';
    const id = tokens[auth.replace(/^Bearer /, '')];
    if (!id) return jsonRes({ msg: 'invalid JWT' }, 401);
    return jsonRes({ id, email: EMAIL });
  }

  const table = url.pathname.replace('/rest/v1/', '');
  if (!db[table]) throw new Error('fake pg: unknown table ' + table);
  const method = (init && init.method) || 'GET';
  if (method !== 'GET') {
    throw new Error('fake pg: this endpoint must never write (' + method + ' ' + table + ')');
  }
  return jsonRes(db[table].filter((r) => matches(r, [...url.searchParams.entries()])));
};

/* ------------------------------------------------------------------ helpers */

/* EVERY CALL GETS ITS OWN CLIENT IP UNLESS THE TEST ASKS FOR ONE. The rate
   limiter's Map is module state and outlives a test, so a shared default
   bucket would make the suite order-dependent and would eventually trip on
   nothing but its own test count. A test that cares about the limiter pins the
   ip and owns that bucket alone. */
let ipSeq = 0;
async function call({ sid = SESSION, token = null, ip = null } = {}) {
  const headers = { 'x-forwarded-for': ip || ('10.1.' + (++ipSeq % 256) + '.' + ipSeq) };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await mod.default.fetch(new Request(
    'https://systemsbyvega.com/api/verify-session?session_id=' + encodeURIComponent(sid),
    { method: 'GET', headers }));
  return { status: res.status, body: await res.json(), headers: res.headers };
}

/* The absence half of the allow-list. Searches the SERIALISED body, so a
   secret smuggled in under a new key name is still caught. */
function assertNoSecrets(body) {
  const blob = JSON.stringify(body);
  for (const secret of [CLIENT, BUYER, OTHER, EMAIL, 'systemsbyvega.com',
                        '250000', 'Vega Sound', 'int_1']) {
    assert.ok(!blob.includes(secret),
      'limited answer leaked ' + JSON.stringify(secret) + ' in ' + blob);
  }
  for (const key of ['client_id', 'web_address', 'user_id', 'business_name',
                     'tier', 'amount_cents', 'niche_slug', 'payment_intent',
                     'reason', 'resolved', 'operator_email', 'id']) {
    assert.ok(!(key in body), 'limited answer carried the key ' + key);
  }
}

const LIMITED_KEYS =
  ['city', 'email_hint', 'message', 'niche_name', 'ok', 'state', 'status', 'support'];

/* ------------------------------------------------------- the unauthenticated */

test('no token + a session nobody owns yet: 200 and the allow-list', async () => {
  reset(); unclaimedPurchase();
  const { status, body } = await call();

  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.status, 'processing');
  assert.deepEqual(Object.keys(body).sort(), LIMITED_KEYS);

  assert.equal(body.niche_name, 'DJ');
  assert.equal(body.city, 'Boise');
  assert.equal(body.state, 'ID');
  assert.equal(body.email_hint, 'j•••@example.com');
  assertNoSecrets(body);
});

test('no token + a session already provisioned: still only the allow-list', async () => {
  /* The polling case. The webhook lands while the page is open, so the rows
     acquire an owner the browser has no token for. The old code turned that
     into a 404 the moment provisioning SUCCEEDED, which is the worst possible
     moment to tell a buyer their order does not exist. */
  reset(); provisioned();
  const { status, body } = await call();

  assert.equal(status, 200);
  assert.equal(body.status, 'ready');
  assert.deepEqual(Object.keys(body).sort(), LIMITED_KEYS);
  assert.match(body.message, /sign-in link/);
  assertNoSecrets(body);
});

test('no token + a blocked purchase: "attention" and nothing about why', async () => {
  reset(); unclaimedPurchase();
  db.sbv_blocked_purchases.push({
    stripe_session_id: SESSION, user_id: null, reason: 'already_claimed',
    requested_city: 'Boise', requested_state: 'ID', resolved: false,
  });
  const { status, body } = await call();

  assert.equal(status, 200);
  assert.equal(body.status, 'attention');
  assert.deepEqual(Object.keys(body).sort(), LIMITED_KEYS);
  assert.ok(!JSON.stringify(body).includes('already_claimed'));
  assertNoSecrets(body);
});

test('no token + a refunded purchase: folded into "attention", not named', async () => {
  reset(); provisioned();
  db.sbv_billing[0].status = 'refunded';
  db.sbv_billing[0].user_id = null;
  db.sbv_intake[0].user_id = null;
  const { status, body } = await call();

  assert.equal(status, 200);
  assert.equal(body.status, 'attention');
  assert.ok(!JSON.stringify(body).includes('refunded'));
  /* Pinned like every other unauthenticated body. This is the path Fix 3
     rewrote, and an unpinned body on the path being edited is exactly where a
     leak would hide. */
  assert.deepEqual(Object.keys(body).sort(), LIMITED_KEYS);
  assertNoSecrets(body);
});

test('the "attention" wording is true for a refund closed weeks ago', async () => {
  /* It must promise no timescale and no action of ours: the same sentence is
     read by a buyer blocked ten minutes ago and by one following a link to an
     order that was settled and refunded last month. */
  reset(); provisioned();
  db.sbv_billing[0].status = 'refunded';
  db.sbv_billing[0].user_id = null;
  db.sbv_intake[0].user_id = null;
  const { body } = await call();

  assert.ok(!/today|shortly|within the hour|in a few minutes/i.test(body.message),
    'the attention message promised a timescale: ' + body.message);
  assert.ok(!/we will email you today|sort out a refund/i.test(body.message));
  assert.match(body.message, /already heard from us/);
  assert.match(body.message, /nothing for you to do/);
});

test('a rejected token is not a 401 — it falls back to the limited answer', async () => {
  /* A buyer whose token expired has still paid. Demanding a sign-in they
     cannot complete is the bug this task exists to remove. */
  reset(); unclaimedPurchase();
  const { status, body } = await call({ token: 'tok-expired' });

  assert.equal(status, 200);
  assert.equal(body.status, 'processing');
  assert.deepEqual(Object.keys(body).sort(), LIMITED_KEYS);
});

test('no niche row: the slug is opened out rather than shown as nothing', async () => {
  reset(); unclaimedPurchase();
  db.sbv_niches.length = 0;
  db.sbv_intake[0].niche_slug = 'bbq-food-truck';
  const { body } = await call();
  assert.equal(body.niche_name, 'bbq food truck');
  assert.deepEqual(Object.keys(body).sort(), LIMITED_KEYS);
  assertNoSecrets(body);
});

/* --------------------------------------------------------- the authenticated */

test('the owner signed in gets the full answer, unchanged', async () => {
  reset(); provisioned();
  const { status, body } = await call({ token: 'tok-buyer' });

  assert.equal(status, 200);
  assert.deepEqual(body, {
    ok: true,
    status: 'ready',
    client_id: CLIENT,
    business_name: 'Vega Sound',
    niche_slug: 'dj',
    niche_name: 'DJ',
    city: 'Boise',
    state: 'ID',
    tier: 'launch',
    web_address: CLIENT + '.systemsbyvega.com',
    support: 'info@kingdom-creatives.com',
  });
});

test('the owner signed in before the webhook lands gets the full processing answer', async () => {
  reset(); unclaimedPurchase();
  db.sbv_intake[0].user_id = BUYER;
  db.sbv_billing[0].user_id = BUYER;
  const { status, body } = await call({ token: 'tok-buyer' });

  assert.equal(status, 200);
  assert.equal(body.status, 'processing');
  assert.equal(body.city, 'Boise');
  assert.ok(!('email_hint' in body), 'the full answer has no need of a masked hint');
});

test('a blocked purchase, signed in: the full answer still names the city', async () => {
  reset(); unclaimedPurchase();
  db.sbv_intake[0].user_id = BUYER;
  db.sbv_billing[0].user_id = BUYER;
  db.sbv_blocked_purchases.push({
    stripe_session_id: SESSION, user_id: BUYER, reason: 'already_claimed',
    requested_city: 'Boise', requested_state: 'ID', resolved: false,
  });
  const { status, body } = await call({ token: 'tok-buyer' });

  assert.equal(status, 200);
  assert.equal(body.status, 'blocked');
  assert.equal(body.city, 'Boise');
});

test('somebody else signed in is still refused, with 404 not 403', async () => {
  reset(); provisioned(BUYER);
  const { status, body } = await call({ token: 'tok-stranger' });

  assert.equal(status, 404);
  assert.deepEqual(body, { ok: false, error: 'unknown_session' });
});

test('a session split between two owners answers nobody', async () => {
  reset(); provisioned(BUYER);
  db.sbv_billing[0].user_id = OTHER;
  assert.equal((await call({ token: 'tok-buyer' })).status, 404);
  assert.equal((await call({ token: 'tok-stranger' })).status, 404);
});

/* ------------------------------------------------------------ the refusals  */

test('a malformed session id is a 400 before any lookup', async () => {
  reset(); unclaimedPurchase();
  for (const sid of ['', 'cs_', 'pi_12345678', 'cs_short', "cs_'; drop table--",
                     'cs_' + 'a'.repeat(200)]) {
    const { status, body } = await call({ sid });
    assert.equal(status, 400, 'expected 400 for ' + JSON.stringify(sid));
    assert.deepEqual(body, { ok: false, error: 'bad_session_id' });
  }
});

test('a session we have never seen is a 404, signed in or not', async () => {
  reset();
  assert.equal((await call()).status, 404);
  assert.equal((await call({ token: 'tok-buyer' })).status, 404);
});

test('an unreachable auth server is a 503, not a silent downgrade', async () => {
  /* Otherwise an outage quietly serves every operator the stripped-down view
     and looks like a UI regression instead of an incident. */
  reset(); provisioned();
  authReachable = false;
  const { status, body } = await call({ token: 'tok-buyer' });
  assert.equal(status, 503);
  assert.equal(body.error, 'auth_unreachable');
});

test('POST is refused: this endpoint never writes', async () => {
  reset();
  const res = await mod.default.fetch(new Request(
    'https://systemsbyvega.com/api/verify-session?session_id=' + SESSION,
    { method: 'POST' }));
  assert.equal(res.status, 405);
});

/* -------------------------------------------------------------- rate limit  */

test('the page own twelve polls do not trip the limiter', async () => {
  /* thank-you.html: one request on load plus eleven at POLL_MS = 3000, so
     MAX_POLLS = 12 requests inside thirty-three seconds — comfortably inside
     one sixty-second window. If this ever fails, the limit has been tuned
     below the traffic the product itself generates. */
  reset(); unclaimedPurchase();
  const ip = '203.0.113.11';
  for (let i = 1; i <= 12; i++) {
    const { status } = await call({ ip });
    assert.equal(status, 200, 'poll ' + i + ' of 12 was refused');
  }
});

test('three page-lives fit, and the forty-first request is refused', async () => {
  reset(); unclaimedPurchase();
  const ip = '203.0.113.12';
  for (let i = 1; i <= 40; i++) {
    assert.equal((await call({ ip })).status, 200, 'request ' + i + ' was refused');
  }
  const over = await call({ ip });
  assert.equal(over.status, 429);
  assert.equal(over.body.error, 'rate_limited');
  assert.equal(over.headers.get('Retry-After'), '60');
  /* A 429 says nothing about the order, so there is nothing to leak here. */
  assert.ok(!('city' in over.body) && !('email_hint' in over.body));
});

test('one client being throttled does not throttle another', async () => {
  reset(); unclaimedPurchase();
  for (let i = 1; i <= 41; i++) await call({ ip: '203.0.113.13' });
  assert.equal((await call({ ip: '203.0.113.13' })).status, 429);
  assert.equal((await call({ ip: '203.0.113.14' })).status, 200);
});

test('a malformed session id is not charged to the allowance', async () => {
  /* It costs one regex and no I/O. A buyer who lands on a mangled URL and
     reloads it a few times must not find their real link throttled. */
  reset(); unclaimedPurchase();
  const ip = '203.0.113.15';
  for (let i = 0; i < 60; i++) {
    assert.equal((await call({ sid: 'not-a-session', ip })).status, 400);
  }
  assert.equal((await call({ ip })).status, 200);
});

/* ---------------------------------------------------- a missing config key  */

test('a missing SUPABASE_PUBLISHABLE_KEY is a loud 503, not a quiet downgrade', async () => {
  /* ANON_KEY is captured by _shared.mjs at import time, so this cannot be
     tested by mutating process.env in this process — the module is already
     built. A child process with the variable absent is the honest way to ask.
     Left unfixed, every signed-in operator would have been served the limited
     answer with no error, no log and nothing on the page to explain it. */
  const { execFileSync } = await import('node:child_process');
  const script = `
    globalThis.fetch = async () => { throw new Error('no request should be made'); };
    const m = await import('./verify-session.mjs');
    const res = await m.default.fetch(new Request(
      'https://systemsbyvega.com/api/verify-session?session_id=${SESSION}',
      { headers: { Authorization: 'Bearer anything', 'x-forwarded-for': '198.51.100.1' } }));
    console.log(JSON.stringify({ status: res.status, body: await res.json() }));
  `;
  const env = { ...process.env };
  delete env.SUPABASE_PUBLISHABLE_KEY;
  env.SUPABASE_URL = 'https://fake.supabase.co';
  env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script],
    { cwd: import.meta.dirname, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const got = JSON.parse(out.trim().split('\n').pop());

  assert.equal(got.status, 503);
  assert.equal(got.body.error, 'not_configured');
});

test('with the key missing an anonymous caller is still served', async () => {
  /* userFromRequest checks for a token before it checks its own config, so
     'no_token' still wins and the buyer with no account is unaffected. Only
     the caller who presented a token — the one this would silently
     short-change — gets the 503. */
  const { execFileSync } = await import('node:child_process');
  const script = `
    const rows = { sbv_intake: [{ stripe_session_id: '${SESSION}', user_id: null,
      niche_slug: 'dj', city_label: 'Boise', state_code: 'ID',
      operator_email: '${EMAIL}' }], sbv_billing: [], sbv_blocked_purchases: [],
      sbv_niches: [{ slug: 'dj', name: 'DJ' }] };
    globalThis.fetch = async (i) => {
      const u = new URL(typeof i === 'string' ? i : i.url);
      const t = u.pathname.replace('/rest/v1/', '');
      const want = u.searchParams.get('stripe_session_id') || u.searchParams.get('slug');
      const out = (rows[t] || []).filter((r) =>
        !want || r.stripe_session_id === want.slice(3) || r.slug === want.slice(3));
      return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
    };
    const m = await import('./verify-session.mjs');
    const res = await m.default.fetch(new Request(
      'https://systemsbyvega.com/api/verify-session?session_id=${SESSION}',
      { headers: { 'x-forwarded-for': '198.51.100.2' } }));
    console.log(JSON.stringify({ status: res.status, body: await res.json() }));
  `;
  const env = { ...process.env };
  delete env.SUPABASE_PUBLISHABLE_KEY;
  env.SUPABASE_URL = 'https://fake.supabase.co';
  env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script],
    { cwd: import.meta.dirname, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const got = JSON.parse(out.trim().split('\n').pop());

  assert.equal(got.status, 200);
  assert.equal(got.body.status, 'processing');
  assert.equal(got.body.email_hint, 'j•••@example.com');
});

/* ------------------------------------------------------------------ masking */

test('maskEmail keeps the first character and the whole domain', () => {
  assert.equal(maskEmail('jason@example.com'), 'j•••@example.com');
  assert.equal(maskEmail('  Jason.Vega@Mail.co.uk '), 'J•••@Mail.co.uk');
});

test('maskEmail hides the local part length', () => {
  assert.equal(maskEmail('ab@x.com'), maskEmail('abcdefghijkl@x.com'));
});

test('maskEmail refuses anything that is not an address', () => {
  for (const bad of [null, undefined, '', 'nope', '@x.com', 'a@', 'a@b',
                     'a b@c.com', 'a@b .com']) {
    assert.equal(maskEmail(bad), null, 'expected null for ' + JSON.stringify(bad));
  }
});
