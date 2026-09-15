/* ============================================================================
   claim/thank-you.test.mjs — the success page's branching, without a browser.
   ----------------------------------------------------------------------------
   The page is a status reader with exactly one piece of real logic in it: what
   to do when the answer is not the happy one. That logic now decides whether a
   buyer who has just paid sees their order or sees "we could not find that
   order", so it is worth more than a manual click-through.

   HOW THIS RUNS WITHOUT A DOM. The page's inline scripts are read out of the
   real HTML file and evaluated with `window`, `document`, `localStorage`,
   `location`, `fetch` and `setTimeout` passed in as arguments. The stub
   document is BUILT FROM THE FILE — every id and every [data-state] block is
   discovered by scanning the markup — so a renamed id or a deleted panel
   breaks these tests rather than sliding past them.

   It is not a browser. It proves control flow: which requests the page makes,
   which it does not, and which panel ends up visible. It says nothing about
   layout, CSS or focus.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const HTML = fs.readFileSync(path.join(import.meta.dirname, 'thank-you.html'), 'utf8');
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
/* 0 is the Vercel Analytics tag, which appends a <script> and is not part of
   what this file is about. 1 declares SBV_CONFIG, 2 is the page. */
const PAGE_SRC = SCRIPTS[1] + '\n' + SCRIPTS[2];

const SID = 'cs_test_a1b2c3d4e5f6g7h8';
const HINT = 'j•••@example.com';
const STORE = 'sb-newjbexmvltvtmxollca-auth-token';

/* ------------------------------------------------------------- the stub DOM */

function makeEl() {
  const classes = new Set();
  const el = {
    textContent: '',
    attrs: {},
    classes,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, on) => {
        const want = on === undefined ? !classes.has(c) : !!on;
        if (want) classes.add(c); else classes.delete(c);
        return want;
      },
    },
    setAttribute: (k, v) => { el.attrs[k] = v; },
    getAttribute: (k) => (k in el.attrs ? el.attrs[k] : null),
  };
  return el;
}

function makeDocument() {
  const byId = new Map();
  for (const m of HTML.matchAll(/id="([a-zA-Z0-9-]+)"/g)) byId.set(m[1], makeEl());
  const states = new Map();
  for (const m of HTML.matchAll(/data-state="([a-z]+)"/g)) states.set(m[1], makeEl());
  /* The markup ships with the loading block already on. */
  if (states.has('loading')) states.get('loading').classList.add('on');

  return {
    byId,
    states,
    querySelector(sel) {
      let m = /^#([a-zA-Z0-9-]+)$/.exec(sel);
      if (m) {
        if (!byId.has(m[1])) throw new Error('page asked for a missing id: ' + sel);
        return byId.get(m[1]);
      }
      m = /^\[data-state="([a-z]+)"\]$/.exec(sel);
      if (m) return states.get(m[1]) || null;
      throw new Error('stub document: unsupported selector ' + sel);
    },
    querySelectorAll(sel) {
      if (sel === '[data-state]') return [...states.values()];
      throw new Error('stub document: unsupported selector ' + sel);
    },
  };
}

/* ------------------------------------------------------------- the stub page */

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body),
    { status, headers: { 'Content-Type': 'application/json' } });
}

/** Boot the page against a queue of canned responses. */
function boot({ responses = [], token = null, sid = SID } = {}) {
  const doc = makeDocument();
  const store = new Map();
  if (token) {
    store.set(STORE, JSON.stringify({
      access_token: token, expires_at: Math.floor(Date.now() / 1000) + 3600,
    }));
  }

  const calls = [];
  const queue = responses.slice();
  const fetchStub = async (url, init) => {
    calls.push({
      url,
      auth: (init && init.headers && init.headers.Authorization) || null,
    });
    if (!queue.length) throw new Error('page made an unexpected request #' + calls.length);
    return queue.shift();
  };

  /* Captured, never run. Polling is a decision the page makes and these tests
     assert on whether it made it; firing the timer would just be the next
     request. */
  const timers = [];
  const setTimeoutStub = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };

  const win = {};
  const loc = {
    search: '?session_id=' + sid,
    href: 'https://systemsbyvega.com/claim/thank-you.html?session_id=' + sid,
  };
  const ls = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };

  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'localStorage', 'location', 'fetch', 'setTimeout',
    PAGE_SRC)(win, doc, ls, loc, fetchStub, setTimeoutStub);

  return { doc, calls, timers, store, queue };
}

/** Let the page's promise chains run to a standstill. */
async function settle() {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
}

const visible = (doc) =>
  [...doc.states.entries()].filter(([, el]) => el.classes.has('on')).map(([n]) => n);

const el = (doc, id) => doc.byId.get(id);

const LIMITED_PROCESSING = {
  ok: true, status: 'processing', niche_name: 'DJ', city: 'Boise', state: 'ID',
  email_hint: HINT, support: 'info@kingdom-creatives.com',
  message: 'Payment received. We are setting up your territory now.',
};

/* ------------------------------------------- FIX 1: a 404 caused by our token */

test('a 404 while sending a token is retried once anonymously', async () => {
  /* create-checkout parks the intake with user_id null and the webhook
     backfills the owner from the STRIPE email. A buyer signed in as account A
     who typed address B at checkout therefore does not own their own purchase
     the moment provisioning lands, and the page is still holding A's token. */
  const page = boot({
    token: 'tok-wrong-account',
    responses: [
      jsonRes({ ok: false, error: 'unknown_session' }, 404),
      jsonRes(LIMITED_PROCESSING),
    ],
  });
  await settle();

  assert.equal(page.calls.length, 2, 'expected exactly one retry');
  assert.equal(page.calls[0].auth, 'Bearer tok-wrong-account');
  assert.equal(page.calls[1].auth, null, 'the retry must be anonymous');
  assert.deepEqual(visible(page.doc), ['processing']);
  assert.equal(el(page.doc, 'p-hint').textContent, HINT);
  assert.ok(el(page.doc, 'p-hint-wrap').classes.has('on'));
});

test('a 404 on that path does NOT sign the operator out', async () => {
  /* The token may be perfectly good and belong to an admin session somebody
     else in this browser is relying on. A 401 is different and is cleared. */
  const page = boot({
    token: 'tok-wrong-account',
    responses: [
      jsonRes({ ok: false, error: 'unknown_session' }, 404),
      jsonRes(LIMITED_PROCESSING),
    ],
  });
  await settle();
  assert.ok(page.store.has(STORE), 'a 404 must not clear the stored session');
});

test('a 404 from an already anonymous request shows the error and stops', async () => {
  const page = boot({
    responses: [jsonRes({ ok: false, error: 'unknown_session' }, 404)],
  });
  await settle();

  assert.equal(page.calls.length, 1, 'an anonymous 404 must not retry');
  assert.equal(page.calls[0].auth, null);
  assert.deepEqual(visible(page.doc), ['error']);
  assert.equal(el(page.doc, 'e-head').textContent, 'We could not find that order.');
});

test('the retry itself 404ing ends in the error, not a loop', async () => {
  const page = boot({
    token: 'tok-wrong-account',
    responses: [
      jsonRes({ ok: false, error: 'unknown_session' }, 404),
      jsonRes({ ok: false, error: 'unknown_session' }, 404),
    ],
  });
  await settle();

  assert.equal(page.calls.length, 2, 'retried more than once');
  assert.deepEqual(visible(page.doc), ['error']);
});

test('a 401 is retried anonymously too, and clears the dead token', async () => {
  const page = boot({
    token: 'tok-expired',
    responses: [
      jsonRes({ ok: false, error: 'not_signed_in' }, 401),
      jsonRes(LIMITED_PROCESSING),
    ],
  });
  await settle();

  assert.equal(page.calls.length, 2);
  assert.equal(page.calls[1].auth, null);
  assert.ok(!page.store.has(STORE), 'a 401 token is worthless and should be dropped');
  assert.deepEqual(visible(page.doc), ['processing']);
});

test('a 400 is never retried — the link itself is wrong', async () => {
  const page = boot({
    token: 'tok-buyer',
    responses: [jsonRes({ ok: false, error: 'bad_session_id' }, 400)],
  });
  await settle();

  assert.equal(page.calls.length, 1);
  assert.deepEqual(visible(page.doc), ['error']);
  assert.equal(el(page.doc, 'e-head').textContent, 'That link looks incomplete.');
});

/* ------------------------------------------------- FIX 2: the 429 on our side */

test('a 429 stops polling and offers the manual check', async () => {
  const page = boot({
    responses: [jsonRes({ ok: false, error: 'rate_limited' }, 429)],
  });
  await settle();

  assert.deepEqual(visible(page.doc), ['processing']);
  assert.ok(el(page.doc, 'p-give-up').classes.has('on'));
  assert.equal(el(page.doc, 'p-note').textContent, '');
  assert.equal(page.timers.length, 0, 'a throttled page must not schedule another poll');
});

/* ------------------------------------------ FIX 3: attention uses the panel  */

test('status "attention" renders through the blocked panel', async () => {
  const msg = 'This order needs a look from us, and there is nothing for you to do.';
  const page = boot({
    responses: [jsonRes({
      ok: true, status: 'attention', niche_name: 'DJ', city: 'Boise', state: 'ID',
      email_hint: HINT, support: 'info@kingdom-creatives.com', message: msg,
    })],
  });
  await settle();

  assert.deepEqual(visible(page.doc), ['blocked']);
  assert.equal(el(page.doc, 'b-msg').textContent, msg);
});

test('the blocked panel says nothing a refunded buyer would find false', () => {
  /* The static copy is read by a buyer blocked ten minutes ago AND by one
     following an old link to an order settled weeks ago. Every specific
     belongs in #b-msg, which the server writes. */
  const panel = /<div data-state="blocked">([\s\S]*?)<\/div>\s*<!-- refunded -->/
    .exec(HTML);
  assert.ok(panel, 'could not find the blocked panel');
  const copy = panel[1].replace(/<[^>]+>/g, ' ');
  assert.ok(!/today/i.test(copy), 'the static panel promised a timescale');
  assert.ok(!/sort out a refund or another city/i.test(copy));
  assert.match(copy, /nothing for you to do/i);
  assert.match(copy, /already heard from us/i);
});

/* ------------------------------------------------------- the happy endings  */

test('ready without a web address hides the site block and shows the hint', async () => {
  const page = boot({
    responses: [jsonRes({
      ok: true, status: 'ready', niche_name: 'DJ', city: 'Boise', state: 'ID',
      email_hint: HINT, support: 'info@kingdom-creatives.com', message: 'x',
    })],
  });
  await settle();

  assert.deepEqual(visible(page.doc), ['ready']);
  assert.equal(el(page.doc, 'r-terr').textContent, 'DJ — Boise, ID');
  assert.ok(!el(page.doc, 'r-web-wrap').classes.has('on'),
    'the limited answer has no web address, so the block must stay hidden');
  assert.equal(el(page.doc, 'r-hint').textContent, HINT);
  assert.ok(el(page.doc, 'r-hint').classes.has('on'));
});

test('ready with the full answer shows the web address', async () => {
  const page = boot({
    token: 'tok-buyer',
    responses: [jsonRes({
      ok: true, status: 'ready', client_id: 'vega-dj-boise',
      business_name: 'Vega Sound', niche_slug: 'dj', niche_name: 'DJ',
      city: 'Boise', state: 'ID', tier: 'launch',
      web_address: 'vega-dj-boise.systemsbyvega.com',
      support: 'info@kingdom-creatives.com',
    })],
  });
  await settle();

  assert.deepEqual(visible(page.doc), ['ready']);
  assert.ok(el(page.doc, 'r-web-wrap').classes.has('on'));
  assert.equal(el(page.doc, 'r-web').getAttribute('href'),
    'https://vega-dj-boise.systemsbyvega.com/');
  assert.equal(el(page.doc, 'r-biz').textContent, 'Vega Sound');
  /* No email_hint in the full answer, so that line stays hidden. */
  assert.ok(!el(page.doc, 'r-hint').classes.has('on'));
});

test('an answer with almost nothing in it still reads as a sentence', async () => {
  const page = boot({
    responses: [jsonRes({ ok: true, status: 'ready', support: 'x' })],
  });
  await settle();

  assert.deepEqual(visible(page.doc), ['ready']);
  assert.equal(el(page.doc, 'r-terr').textContent, 'Your territory');
  assert.ok(!el(page.doc, 'r-biz').classes.has('on'));
  assert.ok(!el(page.doc, 'r-hint').classes.has('on'));
  assert.ok(!el(page.doc, 'r-web-wrap').classes.has('on'));
});

test('processing schedules exactly one further poll', async () => {
  const page = boot({ responses: [jsonRes(LIMITED_PROCESSING)] });
  await settle();

  assert.deepEqual(visible(page.doc), ['processing']);
  assert.equal(page.timers.length, 1);
  assert.equal(page.timers[0].ms, 3000);
});

test('a mangled link never reaches the network', async () => {
  const page = boot({ sid: 'nonsense', responses: [] });
  await settle();

  assert.equal(page.calls.length, 0);
  assert.deepEqual(visible(page.doc), ['error']);
});

/* ------------------------------------------------------------ the admin door */

test('the page links to no admin and asks for no password', () => {
  /* Under Stripe-first the buyer has neither an account nor a password when
     they land here. Task 7b owns the admin's link-based entry; until then a
     link to /admin/ is a door with no handle. */
  assert.ok(!/href="\/admin\//.test(HTML), 'the success page linked to /admin/');
  assert.ok(!/type="password"/.test(HTML), 'the success page asked for a password');
  assert.ok(!/grant_type=password/.test(HTML), 'the success page still signs people in');
});
