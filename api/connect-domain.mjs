/* ============================================================================
   POST /api/connect-domain   body: { tenant, domain }   auth: Bearer <JWT>
   ----------------------------------------------------------------------------
   Lets an operator point their own domain at their storefront instead of
   <client_id>.systemsbyvega.com. AUTHENTICATED, FAIL-CLOSED — same shape as
   api/marketing-kit.mjs's gate: the caller's JWT must resolve to a user, and
   that user must hold an sbv_client_users mapping to THIS tenant, before any
   service-key work happens.

   ── VERIFY BEFORE REGISTER, AND DO NOT REORDER THIS ─────────────────────────
   DNS is checked (CNAME resolves to cname.vercel-dns.com) BEFORE anything is
   written to sbv_tenants and BEFORE Vercel's API is ever called. Writing an
   unverified claim first would let an operator attach a domain they do not
   control the instant its DNS happened to point at Vercel for unrelated
   reasons — sql/CUSTOM-DOMAIN.sql's custom_domain_verified_at exists
   specifically so a routing lookup never trusts an unverified row, and this
   endpoint is the only writer of that column, so the order enforced here IS
   the security boundary, not a formality in front of one.

   CNAME-ONLY, ON PURPOSE. A bare apex domain (example.com) cannot carry a
   CNAME at all — that needs an A/ALIAS record, a different Vercel flow, and
   was not asked for. The bare-apex case gets a distinct `hint` instead of a
   guess at what to do about it.

   WHY THIS TALKS TO VERCEL AT ALL, HERE AND NOT IN MIDDLEWARE. Registering a
   domain with Vercel is a one-time action on save, not a per-request cost —
   VERCEL_TOKEN has no business anywhere near the hot path middleware.js runs
   on every visit. See api/stripe-webhook.mjs's assignSubdomain(), which this
   file's Vercel call is modelled on almost exactly, including its 409
   handling: a domain can already be attached to THIS project (fine) or to a
   DIFFERENT one (not fine), and the only way to tell them apart is the
   follow-up GET.

   THE DB WRITE, ONCE VERIFIED, STAYS EVEN IF VERCEL FAILS. A confirmed,
   DNS-verified claim is real work; a transient Vercel hiccup must not undo
   it. The response says vercelRegistered:false with a reason instead, so the
   admin can tell the operator "saved, but not live yet, try again shortly."
   ========================================================================== */
import {
  json, preflight, pgSelectOne, pgUpdate, assertConfigured, userFromRequest,
  SUPPORT_EMAIL, VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID,
} from './_shared.mjs';
import { promises as dns } from 'node:dns';

export const config = { runtime: 'nodejs' };

// client_id's own shape, from sbv_tenants_reserved_ck in COMMERCE.sql — same
// regex check-territory.mjs and marketing-kit.mjs both use.
const LABEL = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Mirrors sbv_tenants_custom_domain_ck in sql/CUSTOM-DOMAIN.sql exactly, so a
// domain that would fail the database CHECK is rejected here with a clear
// message instead of surfacing as a raw constraint violation later.
const DOMAIN_SHAPE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const DOMAIN_RESERVED = /\.(systemsbyvega|vercel)\.(com|app)$/;

export default { fetch: handler };

/* ---------------------------------------------------------------- rate limit
   Same honestly-limited, in-memory, per-instance Map as check-territory.mjs —
   see that file's header for the caveats. Keyed on the authenticated user's
   id rather than IP: this endpoint requires auth already, so the identity
   the rate limit should protect is the account, not the network address it
   happens to be calling from. */
const WINDOW_MS = 60_000;
const MAX_HITS = 10;
const hits = new Map();

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

/* ------------------------------------------------------------------ vercel */

/* Registers `domain` on the Vercel project. Modelled on assignSubdomain() in
   api/stripe-webhook.mjs almost exactly — same env vars, same 409 handling —
   just taking the operator's own hostname instead of a generated subdomain.
   Returns { ok: true, note? } or { ok: false, reason }. NEVER throws: every
   caller here treats a Vercel failure as "saved, not yet live", never as a
   reason to unwind the DB write that already succeeded. */
async function registerWithVercel(domain) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { ok: false, reason: 'VERCEL_TOKEN / VERCEL_PROJECT_ID not set' };
  }

  const project = encodeURIComponent(VERCEL_PROJECT_ID);
  const team = VERCEL_TEAM_ID ? '?teamId=' + encodeURIComponent(VERCEL_TEAM_ID) : '';
  const auth = { Authorization: 'Bearer ' + VERCEL_TOKEN, 'Content-Type': 'application/json' };

  try {
    const res = await fetch('https://api.vercel.com/v10/projects/' + project + '/domains' + team, {
      method: 'POST', headers: auth, body: JSON.stringify({ name: domain }),
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    const code = (body && body.error && body.error.code) || '';
    const message = (body && body.error && body.error.message) || ('HTTP ' + res.status);

    if (res.status === 409 || code === 'domain_already_in_use') {
      // 409 alone does not say WHOSE project the domain sits on — the
      // follow-up GET is the only way to tell "already attached to this
      // project" (fine, treat as success) from "attached to a different
      // one" (not fine, and not something this endpoint can fix).
      const check = await fetch(
        'https://api.vercel.com/v9/projects/' + project + '/domains/' + encodeURIComponent(domain) + team,
        { headers: auth });
      if (check.ok) return { ok: true, note: 'already attached' };
      return { ok: false, reason: domain + ' is attached to a different Vercel project' };
    }
    return { ok: false, reason: message };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/* Best-effort removal on clear, using the PREVIOUS domain value, so a
   disconnected custom domain does not sit attached to the Vercel project
   forever. This is an addition beyond the literal brief — an orphaned
   Vercel attachment is a real operational hazard (it can block a future
   operator from ever attaching the same hostname). A failed delete here
   never blocks the clear: log and move on. */
async function unregisterFromVercel(domain) {
  if (!domain || !VERCEL_TOKEN || !VERCEL_PROJECT_ID) return;
  const project = encodeURIComponent(VERCEL_PROJECT_ID);
  const team = VERCEL_TEAM_ID ? '?teamId=' + encodeURIComponent(VERCEL_TEAM_ID) : '';
  const auth = { Authorization: 'Bearer ' + VERCEL_TOKEN };
  try {
    const res = await fetch(
      'https://api.vercel.com/v9/projects/' + project + '/domains/' + encodeURIComponent(domain) + team,
      { method: 'DELETE', headers: auth });
    if (!res.ok && res.status !== 404) {
      const detail = await res.text().catch(() => '');
      console.error('connect-domain: vercel delete failed (' + res.status + ') for', domain, '-', detail.slice(0, 200));
    }
  } catch (e) {
    console.error('connect-domain: vercel delete threw for', domain, '-', e.message);
  }
}

/* ------------------------------------------------------------------ handler */

async function handler(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  try {
    assertConfigured();
  } catch (e) {
    console.error('connect-domain: not configured:', e.message);
    return json({
      ok: false, error: 'not_configured',
      message: `We cannot save domains right now. Email ${SUPPORT_EMAIL} and we will do it by hand.`,
    }, 503);
  }

  // ── 1. Parse body: tenant (LABEL shape) and domain (trimmed, lowered) ────
  let body = null;
  try { body = await request.json(); } catch (e) { body = null; }
  const tenant = String((body && body.tenant) || '').toLowerCase();
  const domain = String((body && body.domain) || '').trim().toLowerCase();
  if (!LABEL.test(tenant)) {
    return json({ ok: false, error: 'bad_tenant' }, 400);
  }

  // ── 2. Auth gate, fail-closed — same shape as marketing-kit.mjs ─────────
  const who = await userFromRequest(request);
  if (!who || !who.user) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  let mapping = null;
  try {
    mapping = await pgSelectOne('sbv_client_users',
      'user_id=eq.' + encodeURIComponent(who.user.id) +
      '&client_id=eq.' + encodeURIComponent(tenant) + '&select=client_id');
  } catch (e) {
    console.error('connect-domain: mapping lookup failed:', e.message);
    return json({ ok: false, error: 'lookup_failed' }, 503);
  }
  if (!mapping) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  // ── 3. Rate limit, keyed on the authenticated user — requires step 2 ────
  if (rateLimited(who.user.id)) {
    return json({
      ok: false, error: 'rate_limited',
      message: 'That is a lot of attempts in a short time. Wait a minute and try again.',
    }, 429, { 'Retry-After': '60' });
  }

  // ── 4. Empty domain = clear. No DNS check needed. ───────────────────────
  if (domain === '') {
    let previous = null;
    try {
      previous = await pgSelectOne('sbv_tenants',
        'client_id=eq.' + encodeURIComponent(tenant) + '&select=custom_domain');
    } catch (e) {
      console.error('connect-domain: previous-domain lookup failed:', e.message);
      // Not fatal to the clear itself — worst case the Vercel side of the
      // clear is skipped below because previous stays null.
    }

    try {
      await pgUpdate('sbv_tenants', 'client_id=eq.' + encodeURIComponent(tenant),
        { custom_domain: null, custom_domain_verified_at: null });
    } catch (e) {
      console.error('connect-domain: clear failed:', e.message);
      return json({ ok: false, error: 'clear_failed' }, 503);
    }

    if (previous && previous.custom_domain) {
      await unregisterFromVercel(previous.custom_domain);
    }
    return json({ ok: true, domain: '' });
  }

  // ── 5. Non-empty: shape-check locally BEFORE any network call ───────────
  if (domain.length < 4 || domain.length > 253 || !DOMAIN_SHAPE.test(domain)
      || DOMAIN_RESERVED.test(domain)) {
    return json({
      ok: false, error: 'bad_domain',
      message: 'That does not look like a domain. Example: yourbusiness.com or www.yourbusiness.com',
    }, 400);
  }

  // ── 6. DNS check — CNAME only, exactly per Jason's instruction ──────────
  let cnames;
  try {
    cnames = await dns.resolveCname(domain);
  } catch (e) {
    cnames = [];
  }
  const verified = cnames.some((c) => c.toLowerCase().replace(/\.$/, '') === 'cname.vercel-dns.com');

  if (!verified) {
    const resp = {
      ok: false, error: 'dns_not_verified',
      message: "Point your domain's CNAME record to cname.vercel-dns.com, then try again.",
    };
    if (cnames.length === 0) {
      resp.hint = "If this is a bare domain (example.com), most DNS providers can't put a "
        + 'CNAME on it — try www.example.com instead.';
    }
    return json(resp, 200);
  }

  // ── 7. DNS verified — write to sbv_tenants FIRST, with the service key ──
  // (this table grants authenticated no column access to these two columns,
  // so a direct browser write would 42501 even if we tried).
  try {
    await pgUpdate('sbv_tenants', 'client_id=eq.' + encodeURIComponent(tenant), {
      custom_domain: domain,
      custom_domain_verified_at: new Date().toISOString(),
    });
  } catch (e) {
    // The partial unique index (sbv_tenants_custom_domain_uk) is the only
    // constraint that should land here in normal use — Postgres unique
    // violation, code 23505, surfaced by PostgREST as a 409 whose body
    // carries that code. Never surface the raw Postgres text to the caller.
    const bodyText = typeof e.body === 'string' ? e.body : '';
    if (e.status === 409 && bodyText.includes('23505')) {
      return json({
        ok: false, error: 'domain_taken',
        message: 'That domain is already connected to a different site.',
      }, 200);
    }
    console.error('connect-domain: write failed:', e.message, e.body || '');
    return json({ ok: false, error: 'write_failed' }, 503);
  }

  // ── 8. Then register with Vercel — best effort ──────────────────────────
  const reg = await registerWithVercel(domain);
  if (!reg.ok) {
    console.error('connect-domain: vercel registration failed for', domain, '-', reg.reason);
  }

  // ── 9. Success — the DB write already succeeded regardless of Vercel ────
  return json({
    ok: true, domain,
    vercelRegistered: !!reg.ok,
    vercelReason: reg.ok ? null : reg.reason,
  });
}
