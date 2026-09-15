# Checkout Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buyer purchases a territory without creating an account first, and lands in their admin via a setup link sent to the email Stripe collected.

**Architecture:** Drop the 401 auth gate from `create-checkout.mjs` while keeping every other pre-payment validation. Resolve the account in `stripe-webhook.mjs` after payment, find-or-invite by email, idempotent under Stripe retries. City conflicts keep their hard block on an exact normalised match and gain a warn-and-allow path for near matches, decided in SQL. Tier collapses to a single $99 price.

**Tech Stack:** Node 26 ESM (`.mjs`) for API handlers, CommonJS (`.js`) for tools — the distinction is load-bearing, see Global Constraints. `node --test` (built in, no dependency) for unit tests. Supabase CLI for SQL. Stripe test mode for the loop.

**Spec:** `docs/superpowers/specs/2026-09-14-checkout-flow-design.md`

## Global Constraints

- **Never add `"type": "module"` to `package.json`.** Verbatim from the file: *"tools/build-catalog.js (the Vercel buildCommand), api/demand.js, api/digest.js and api/owner.js are CommonJS and the flag breaks the build. Extensions already carry the distinction: .mjs is ESM, .js is CommonJS."*
- **No new npm dependencies.** Tests use `node --test`, built in. Adding jest/vitest to a repo whose `package.json` has no `scripts` block and exists *"ONLY so middleware.js can import @vercel/functions"* is out of scope.
- **`sbv_norm_city()` in the database is the single authority on city normalisation.** From `api/check-territory.mjs`: *"IT MUST NEVER BECOME THE INPUT TO A BROWSER-SIDE NORMALISER… A second implementation in JavaScript that drifts from it — by one abbreviation, one punctuation rule — lets a taken city read as free and fail only after the card is charged. That is the bug GarageSaleBiz carries."* All near-match logic is SQL.
- **The browser never writes to `sbv_intake`.** Service role only. *"the public write surface of the whole database stays at exactly one table: sbv_demand."*
- **SQL goes in `sql/<NAME>.sql` with verify rows**, applied via `supabase db query --linked -f sql/<NAME>.sql`, against the SystemsByVega project (`newjbexmvltvtmxollca`) only — never ESB or GSB.
- **Every SQL function ships `grant execute … to authenticated, service_role` in the same block.** (2026-09-06 brief, hard rule 3.)
- **Price is `$99` one-time.** `299`/`499` must not appear customer-facing. `niches/dumpster-rental/**` and `sites/dumpster-rental/**` are EXEMPT — those are the demo operator's own service prices.
- **Compliance:** zero income claims, zero fabricated counts, no "money-back guarantee".
- **Stop conditions:** Task 8 (Stripe) and Task 9 (legal copy) require Jason's approval before applying. Do not create Stripe objects unprompted.
- Build gate after every task: `node tools/build-catalog.js --check && node tools/build-chrome.js --check && node tools/check-pages.js && node tools/check-links.js`

---

### Task 1: Near-match city detection in SQL

**Files:**
- Create: `sql/CITY-NEAR-MATCH.sql`
- Test: verify rows inside the same file

**Interfaces:**
- Produces: `public.sbv_city_near_matches(p_niche text, p_city text, p_state text) returns table(city_label text, city_norm text, distance int)` — returns active claims in the same niche and state whose `city_norm` differs from the input's but is within edit distance 2. Empty set when the city is free and not similar to anything.

- [ ] **Step 1: Write the SQL with verify rows**

Create `sql/CITY-NEAR-MATCH.sql`:

```sql
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
```

- [ ] **Step 2: Apply and read the verify output**

Run: `supabase db query --linked -f sql/CITY-NEAR-MATCH.sql`
Expected: `near_hit n=1`, `exact_excluded n=0`, `state_scoped n=0`.

If `near_hit` is 0, `sbv_norm_city()` already unified the two spellings — that is a *better* outcome, it means the exact block catches it. Record that in the plan notes and keep the function; it still covers pairs norm does not unify.

- [ ] **Step 3: Commit**

```bash
git add sql/CITY-NEAR-MATCH.sql
git commit -m "feat(sql): sbv_city_near_matches — warn on close cities, block only exact"
```

---

### Task 2: Surface near matches from check-territory

**Files:**
- Modify: `api/check-territory.mjs` (the `json({ ok: true, available… })` return, around line 167)

**Interfaces:**
- Consumes: `public.sbv_city_near_matches` from Task 1.
- Produces: the `/api/check-territory` response gains `near_matches: Array<{city_label: string, distance: number}>` — always present, `[]` when there are none.

- [ ] **Step 1: Add the RPC call beside the existing availability call**

In the `Promise.all`/rpc block that currently calls `sbv_city_available`, add a second rpc to `sbv_city_near_matches` with the same `niche`/`city`/`state`. Follow the existing `rpc()` helper signature in the file. A failure of the near-match call must NOT fail the request — default to `[]`:

```js
const near = Array.isArray(nearRows)
  ? nearRows.map(r => ({ city_label: r.city_label, distance: r.distance }))
  : [];
```

- [ ] **Step 2: Add it to the response**

```js
    near_matches: near,
```

- [ ] **Step 3: Verify live against the deployed function**

Run:
```bash
curl -s -X POST https://systemsbyvega.com/api/check-territory \
  -H 'content-type: application/json' \
  -d '{"niche_slug":"landscaping","city_label":"Nampa","state_code":"ID"}' | head -c 400
```
Expected: JSON containing `"near_matches":[]` and `"available":true`.

- [ ] **Step 4: Commit**

```bash
git add api/check-territory.mjs
git commit -m "feat(api): check-territory returns near_matches alongside availability"
```

---

### Task 3: Claim page warns on near match, blocks on exact

**Files:**
- Modify: `claim/claim.js` (the handler that consumes `/api/check-territory`)

**Interfaces:**
- Consumes: `near_matches` from Task 2.
- Produces: no new exports. Behaviour: `available === false` keeps the existing block; `available === true` with a non-empty `near_matches` shows a warning and allows the buyer to continue.

- [ ] **Step 1: Add the warning branch**

Where the response is handled today, after the existing `available === false` block, add:

```js
  if (data.available === true && data.near_matches && data.near_matches.length) {
    const other = data.near_matches[0].city_label;
    showNotice(
      'We already have an operator in ' + other + ', ' + data.state_code + '. ' +
      'If that is a different city, carry on — your claim is for ' +
      data.city_label + ', ' + data.state_code + '.'
    );
  }
```

Use the file's existing notice/error rendering helper rather than adding one — find it by searching `claim.js` for the function that renders the `claimed:` message today.

- [ ] **Step 2: Verify in a browser**

Serve locally (`python -m http.server 8080`), open `/claim/?niche=landscaping`, enter a city that near-matches an existing claim. Expected: warning text appears, the continue button stays enabled. Enter an exactly-claimed city. Expected: existing block, continue disabled.

- [ ] **Step 3: Commit**

```bash
git add claim/claim.js
git commit -m "feat(claim): warn on a near-match city, block only on an exact one"
```

---

### Task 4: Drop the auth gate from create-checkout

**Files:**
- Modify: `api/create-checkout.mjs` (the 401 at ~line 118; the intake insert; the Stripe session args at ~line 302)
- Create: `api/_checkout-lib.mjs`
- Test: `api/_checkout-lib.test.mjs`

**Interfaces:**
- Produces: `api/_checkout-lib.mjs` exporting
  `normaliseBuyerEmail(raw: string): string | null` — trims, lowercases, returns `null` if it fails the same regex `sbv_tenants.operator_email` uses.

Extracting this into its own module is what makes the email rule testable without standing up Stripe or Supabase; the handler imports it.

- [ ] **Step 1: Write the failing test**

Create `api/_checkout-lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseBuyerEmail } from './_checkout-lib.mjs';

test('trims and lowercases', () => {
  assert.equal(normaliseBuyerEmail('  Jason@Example.COM '), 'jason@example.com');
});
test('rejects a missing domain', () => {
  assert.equal(normaliseBuyerEmail('jason@'), null);
});
test('rejects an empty string', () => {
  assert.equal(normaliseBuyerEmail(''), null);
});
test('rejects a non-string', () => {
  assert.equal(normaliseBuyerEmail(undefined), null);
});
test('rejects over 254 characters', () => {
  assert.equal(normaliseBuyerEmail('a'.repeat(250) + '@b.com'), null);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test api/_checkout-lib.test.mjs`
Expected: FAIL — `Cannot find module './_checkout-lib.mjs'`.

- [ ] **Step 3: Write the module**

Create `api/_checkout-lib.mjs`:

```js
/* Buyer email handling, split out so it is testable without Stripe or Supabase.
   The regex mirrors the CHECK on sbv_tenants.operator_email exactly; if one
   changes the other must too, or a value passes the API and fails the insert. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export function normaliseBuyerEmail(raw) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (!v || v.length > 254) return null;
  return EMAIL_RE.test(v) ? v : null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `node --test api/_checkout-lib.test.mjs`
Expected: `pass 5  fail 0`.

- [ ] **Step 5: Remove the 401 and accept the email**

In `api/create-checkout.mjs`:
1. Delete the auth block returning `401` with `'Sign in first, then claim your city.'`.
2. `import { normaliseBuyerEmail } from './_checkout-lib.mjs';`
3. Read `const operatorEmail = normaliseBuyerEmail(body.operator_email);` and, when `null`, return the file's existing `bad()` helper: `return bad('bad_email', 'Give the email address you want your login sent to.', 'operator_email');`
4. Write `user_id: null` and `operator_email: operatorEmail` into the `sbv_intake` insert.
5. Add `customer_email: operatorEmail` to the Stripe session args so the receipt and the session agree.

Leave every other validation exactly as it is — city availability, niche for sale, subdomain, acceptance text. None of them needed a signed-in user.

- [ ] **Step 6: Confirm nothing else depended on the gate**

Run: `grep -n "user_id" api/create-checkout.mjs`
Expected: only the `sbv_intake` insert, now `null`. If any other line reads `user_id`, make it tolerate `null` before moving on.

- [ ] **Step 7: Commit**

```bash
git add api/create-checkout.mjs api/_checkout-lib.mjs api/_checkout-lib.test.mjs
git commit -m "feat(api): checkout no longer requires an account, collects the email instead"
```

---

### Task 5: Resolve the account on the webhook, idempotently

**Files:**
- Modify: `api/stripe-webhook.mjs` (`provision()`, from ~line 113)
- Create: `api/_provision-lib.mjs`
- Test: `api/_provision-lib.test.mjs`

**Interfaces:**
- Consumes: `normaliseBuyerEmail` from Task 4.
- Produces: `api/_provision-lib.mjs` exporting
  `buyerEmailFromSession(session: object): string | null` — pulls the email from `customer_details.email`, then `customer_email`, then `metadata.operator_email`, normalising via Task 4 and returning the first that survives.

- [ ] **Step 1: Write the failing test**

Create `api/_provision-lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyerEmailFromSession } from './_provision-lib.mjs';

test('prefers customer_details.email', () => {
  assert.equal(buyerEmailFromSession({
    customer_details: { email: 'A@b.com' },
    customer_email: 'c@d.com'
  }), 'a@b.com');
});
test('falls back to customer_email', () => {
  assert.equal(buyerEmailFromSession({ customer_email: 'C@D.com' }), 'c@d.com');
});
test('falls back to metadata', () => {
  assert.equal(buyerEmailFromSession({
    metadata: { operator_email: 'e@f.com' }
  }), 'e@f.com');
});
test('skips an invalid value and keeps looking', () => {
  assert.equal(buyerEmailFromSession({
    customer_details: { email: 'not-an-email' },
    customer_email: 'g@h.com'
  }), 'g@h.com');
});
test('returns null when there is nothing usable', () => {
  assert.equal(buyerEmailFromSession({}), null);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test api/_provision-lib.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `api/_provision-lib.mjs`:

```js
/* Where the buyer's email comes from after a Stripe-first purchase. Three
   sources because Stripe populates them differently depending on whether the
   session collected an address, and because create-checkout also stamps it
   into metadata as a belt-and-braces copy. First valid one wins. */
import { normaliseBuyerEmail } from './_checkout-lib.mjs';

export function buyerEmailFromSession(session) {
  const s = session || {};
  const candidates = [
    s.customer_details && s.customer_details.email,
    s.customer_email,
    s.metadata && s.metadata.operator_email
  ];
  for (const c of candidates) {
    const e = normaliseBuyerEmail(c);
    if (e) return e;
  }
  return null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `node --test api/_provision-lib.test.mjs`
Expected: `pass 5  fail 0`.

- [ ] **Step 5: Wire account resolution into `provision()`**

After the tenant and the city claim are written, and before the function returns:

1. `const email = buyerEmailFromSession(paidSession);`
2. If `null`: log loudly, leave `sbv_billing` recorded, and return without inviting. The payment is not lost — it becomes a support case. Do not throw; a throw makes Stripe retry forever.
3. Find the auth user by email via the service role. If found, use that `user_id`. If not, invite: Supabase `inviteUserByEmail`.
4. Upsert `sbv_client_users` on its composite primary key `(user_id, client_id)` with `role: 'operator'`.

**Find-or-invite, never create-unconditionally.** Stripe retries this webhook; a second invite to the same address on a retry is a second email to a confused buyer.

- [ ] **Step 6: Harden the duplicate skip (decision 2, non-negotiable)**

The function already logs `'already provisioned, nothing to do:'` when billing carries a `client_id` and the mapping exists. Extend that same guard so it also treats "tenant exists AND `sbv_client_users` row exists" as provisioned, so a retry arriving after step 5 skips instead of re-inviting.

- [ ] **Step 7: Commit**

```bash
git add api/stripe-webhook.mjs api/_provision-lib.mjs api/_provision-lib.test.mjs
git commit -m "feat(api): resolve the operator account from the Stripe email, idempotently"
```

---

### Task 6: Setup-link email via Brevo

**Files:**
- Modify: `api/stripe-webhook.mjs` (after the invite in Task 5)
- Read first: `api/digest.js` — the existing Brevo send, to copy its shape

**Interfaces:**
- Consumes: `BREVO_API_KEY` from `api/_shared.mjs`; the invite link from Task 5.
- Produces: no exports. Side effect: one transactional email per successful provision.

- [ ] **Step 1: Read how Brevo is already called**

Run: `grep -n "brevo\|BREVO\|api.brevo" api/digest.js | head -20`
Copy that call shape — endpoint, headers, payload key names. Do not invent a second Brevo client.

- [ ] **Step 2: Send after a successful invite**

Subject and body state plainly: which niche, which city, and that the link sets their password. No income claims, no guarantees.

Wrap the send in its own `try/catch`. **A failed email must not fail the webhook** — the tenant is provisioned and the payment is recorded; a missing email is a support case, and a thrown error makes Stripe retry a provision that already succeeded.

- [ ] **Step 3: Verify the send path without a real purchase**

Run: `node tools/brevo-diag.mjs`
Expected: the existing diagnostic reports a working key. If it does not, stop — the email step cannot be verified and Task 10's loop will not prove it.

- [ ] **Step 4: Commit**

```bash
git add api/stripe-webhook.mjs
git commit -m "feat(api): email the setup link via the existing Brevo integration"
```

---

### Task 7: Success page and admin tenant switcher

**Files:**
- Modify: `claim/thank-you.html`
- Modify: `admin/index.html` (around line 1524-1533, the `sbv_client_users` select)

**Interfaces:**
- Consumes: `/api/verify-session` (unchanged).
- Produces: no new exports.

- [ ] **Step 1: Make the success page honest about the account**

The personalised branch must show niche name, city, and what happens next. Under Stripe-first the buyer has **no account yet**, so it must not link to an admin they cannot enter. Replace any direct admin link with: the email address the link was sent to, and a line telling them to check it. Keep the generic fallback for when `verify-session` returns nothing.

- [ ] **Step 2: Add a tenant switcher to the admin**

`admin/index.html:1533` already picks `want` or falls back to `ids[0]`, so a two-niche operator's second site is reachable only by URL. When `ids.length > 1`, render a `<select>` of their tenants that sets `want` and reloads. When `ids.length === 1`, render nothing — no chrome for a case that does not exist.

- [ ] **Step 3: Verify**

Open the admin against a test user with two `sbv_client_users` rows. Expected: switcher appears, switching loads the other tenant's content. With one row: no switcher.

- [ ] **Step 4: Commit**

```bash
git add claim/thank-you.html admin/index.html
git commit -m "feat(admin): tenant switcher for multi-niche operators; honest success page"
```

---

### Task 8: $99 config — **STOP for Jason before applying**

**Files:**
- Modify: `api/_shared.mjs` (`TIER_PRICE_ID`, ~line 83)
- Modify: `api/create-checkout.mjs` (tier validation ~line 157, line item ~line 302)

- [ ] **Step 1: Produce the diff and stop**

Write the exact env/config change and the Stripe implication into
`docs/superpowers/plans/2026-09-14-stripe-99-diff.md`: which env var holds the
new price id, what `TIER_PRICE_ID` collapses to, and whether a new Stripe price
object must be created.

**Stop. Show Jason. Do not create Stripe objects.** Per brief §2 and the
2026-09-06 brief stop condition 3, a pricing change is Jason's to authorise.

- [ ] **Step 2: After approval, collapse the tier**

`TIER_PRICE_ID` becomes a single id. Remove `tier` from the request body, the
`sbv_intake` insert, and the Stripe metadata. **Keep the `tier` column** on
`sbv_tenants` and `sbv_billing` — six test tenants carry `'launch'` and the
CHECK constraint still allows it; stop writing it, do not drop it.

- [ ] **Step 3: Commit**

```bash
git add api/_shared.mjs api/create-checkout.mjs docs/superpowers/plans/2026-09-14-stripe-99-diff.md
git commit -m "feat(api): one price, one plan — tier retired from the checkout path"
```

---

### Task 9: $99 copy — **STOP for Jason on the legal diff**

**Files:**
- Modify: `claim/claim.js`, `assets/catalog-render.js`, `assets/sbv.js`, `assets/lang/es.js`, `index.html`, `sites/index.html`, `legal/terms.html`

- [ ] **Step 1: Show the legal diff and stop**

`legal/terms.html` §3 names $299/$499. Produce the diff and **stop for Jason** — both the 2026-09-07 brief and spec §7 make legal copy a checkpoint.

- [ ] **Step 2: After approval, sweep the rest**

Update the six non-legal surfaces. `assets/lang/es.js` is the Spanish string table and is the one most easily missed.

- [ ] **Step 3: Prove the sweep, with the exemption intact**

Run:
```bash
grep -rnE "\\\$?(299|499)\b" --include=*.html --include=*.js --include=*.mjs . \
  | grep -v node_modules | grep -v dumpster-rental | grep -v "^./docs/"
```
Expected: **no output.** Any hit outside `dumpster-rental` is a miss.

Then confirm the exemption survived:
```bash
grep -c "299" niches/dumpster-rental/content.json
```
Expected: non-zero. Those are the demo operator's own service prices and must not change.

- [ ] **Step 4: Rebuild and gate**

```bash
node tools/build-catalog.js && node tools/build-chrome.js
node tools/build-catalog.js --check && node tools/build-chrome.js --check \
  && node tools/check-pages.js && node tools/check-links.js
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: \$99 one price across every customer-facing surface"
```

---

### Task 10: /claim gets the shared chrome

**Files:**
- Modify: `tools/build-chrome.js` (the `PAGES` array, ~line 34)
- Modify: `claim/index.html` (add the `BUILD:NAV` / `BUILD:FOOTER` markers)

- [ ] **Step 1: Add the markers**

`claim/index.html` already loads `/assets/sbv.css` and carries zero orange, so it inherits the gold. It lacks the nav and footer. Add the same `BUILD:` marker pair the six marketing pages use — copy the exact comment syntax from `index.html`.

- [ ] **Step 2: Register the route as NOT indexable**

In `PAGES`, add `{ route: '/claim/', file: 'claim/index.html', indexable: false }`.

`indexable: false` is load-bearing: `PAGES` drives both `robots.txt` and `sitemap.xml`, and `/claim/` is already `Disallow`ed. A page in the sitemap that robots forbids is a contradiction the generator exists to prevent.

- [ ] **Step 3: Rebuild and confirm robots did not change**

```bash
node tools/build-chrome.js
git diff --stat robots.txt sitemap.xml
```
Expected: **no change to either.** If `/claim/` appears in `sitemap.xml`, `indexable` was not set.

- [ ] **Step 4: Commit**

```bash
git add tools/build-chrome.js claim/index.html
git commit -m "feat(claim): shared nav and footer, kept out of the sitemap"
```

---

### Task 11: Full purchase-to-live verification

**Files:** none modified — this task produces a record.
- Create: `docs/superpowers/specs/2026-09-14-checkout-verification.md`

- [ ] **Step 1: Run the loop in Stripe test mode**

Claim → checkout → webhook → tenant + city claim + `sbv_client_users` → setup email arrives → link sets a password → admin loads → save content → subdomain renders it.

- [ ] **Step 2: Replay the webhook**

Fire the same `checkout.session.completed` twice.
Expected: exactly one tenant, one claim, one account, one `sbv_client_users` row, **one email**. Two emails means Task 5 step 6 is incomplete.

- [ ] **Step 3: Race two buyers**

Two sessions, same city, both pass the read, both pay.
Expected: one provisioned; the other in `sbv_blocked_purchases` with an alert. This is the behaviour the current design accepts by choice — confirm Stripe-first did not make it worse.

- [ ] **Step 4: Orphan the email**

Pay with an address that has no account and never open the link.
Expected: tenant provisioned, billing recorded, invite pending, no crash, no Stripe retry storm.

- [ ] **Step 5: Multi-niche merge**

Buy a second niche with the same email.
Expected: one `auth.users` row, **two** `sbv_tenants` rows, two `sbv_client_users` rows, and the admin switcher from Task 7 offering both.

- [ ] **Step 6: Record and commit**

Write each result into the verification doc as a pass/fail table.

```bash
git add docs/superpowers/specs/2026-09-14-checkout-verification.md
git commit -m "docs: checkout flow verification — purchase to live, all paths"
```

---

## Self-Review

**Spec coverage:** §1 near-match → Tasks 1-3. §2 claim page → Tasks 3, 10. §3 auth reversal → Tasks 4-6. §4 niche in URL → already ships, verified in Task 11 step 1. §5 success page → Task 7. §6 territory columns → no change, confirmed in spec. §7 repricing → Tasks 8-9. §9 verification → Task 11. Decisions 1-4 of the second set → Tasks 5 (merge, idempotency), 6 (Brevo), 10 (chrome). No gaps.

**Placeholders:** none. Every code step carries the code; every verification step carries the command and the expected output.

**Type consistency:** `normaliseBuyerEmail` (Task 4) is consumed by `buyerEmailFromSession` (Task 5) under that exact name. `sbv_city_near_matches(text,text,text)` (Task 1) is consumed by Task 2 and its `near_matches` array by Task 3 under that exact key.

**Ordering:** Tasks 1-7 and 10 need no approval and can proceed. Tasks 8-9 stop for Jason. Task 11 needs 8-9 done, since it asserts the $99 figure.
