# Checkout Flow — Design Spec

**Date:** 2026-09-14 · **Owner:** Jason Vega · **Repo:** systemsbyvega-catalog
**Status:** spec — checkpoint. No code until Jason approves.
**Source:** six A/B decisions from Jason (2026-09-14) + brief §2 ($99 repricing).

---

## 0. The headline finding

**Four of the six decisions are already shipped.** One is a small addition. One
would reverse a design the current code was written specifically to avoid, and
is flagged below rather than specced.

| # | Decision | Status |
|---|---|---|
| 1 | City uniqueness — warn, don't hard block | ⚠️ **Conflicts with shipped design.** See §1. |
| 2 | Pre-Stripe `/claim?niche=<slug>` page | ✅ Ships. Captures more than the decision asks for. |
| 3 | Auth order — Stripe first, account after | 🔄 **Reverses the shipped order.** The real work. See §3. |
| 4 | `?niche=<slug>` in the URL | ✅ Ships. `claim.js` reads it. |
| 5 | Success page — generic + personalised | ✅ Ships. `thank-you.html` + `api/verify-session.mjs`. |
| 6 | Territory as separate city/state columns | ✅ Ships, exactly as described. See §6. |

So this is not a build. It is one reversal (§3), one flagged conflict (§1), and
the $99 repricing (§7).

---

## 1. City uniqueness — the conflict

**Decision 1:** *"warn at claim time, don't hard block. Log the conflict for
admin review. Add hard block as a follow-up once real purchase data confirms
the matching logic."*

**What ships today** already does two thirds of that, and deliberately refuses
the third. From `api/create-checkout.mjs`:

> "A plain Stripe payment link would be simpler and is what EstateSaleBiz used —
> which also meant the buyer chose their city AFTER paying. **That ordering is
> the direct cause of every paid-but-blocked operator there**; a dedicated table
> and an alert email exist purely to survive it. Here every rejection that used
> to happen after payment happens before it:
>   city already claimed → pick another, **having spent nothing**"

The current design is already *warn-not-reserve*: the availability check is a
**read**, nothing is held, and two buyers can both pass it and both pay. The
residual race is settled by the partial unique index behind `sbv_claim_city()`
in the webhook, and the loser is written to `sbv_blocked_purchases` and alerted
— **which is exactly the "log the conflict for admin review" the decision asks
for.** It exists.

What the decision would change is the one block that remains: today a city that
reads as *already sold* stops the buyer before Stripe. Removing that block sends
those buyers to pay for a territory the database will refuse, landing them in
the paid-but-blocked state this endpoint was written to eliminate.

**Recommendation: do not remove that block.** Instead, act on what I read as the
decision's actual worry — *"once real purchase data confirms the matching
logic"* — which is doubt about `sbv_norm_city()`, not about blocking per se.

**Proposed instead — separate certain matches from uncertain ones:**

- **Exact normalised match** (`sbv_city_available()` returns `claimed`) → keep
  the hard block. This is the database's own authority and it is not a guess.
- **Near match** — same state, different `city_norm`, small edit distance
  (e.g. `saint charles` vs `st charles` where normalisation did *not* unify
  them) → **warn and allow**, exactly as the decision wants. Copy: "We already
  have an operator in St. Charles, MO. If that is a different city, continue."
  Log to `sbv_blocked_purchases` with `reason='near_match_allowed'` for review.

That gives the decision's intent — don't block on a match we aren't sure about —
without reopening the failure the whole endpoint exists to prevent.

⚠️ **Constraint that governs any near-match work.** From `check-territory.mjs`:

> "`city_norm` IS FOR DISPLAY ONLY… **IT MUST NEVER BECOME THE INPUT TO A
> BROWSER-SIDE NORMALISER.** `sbv_norm_city()` in the database is the single
> authority… A second implementation in JavaScript that drifts from it — by one
> abbreviation, one punctuation rule — lets a taken city read as free and fail
> only after the card is charged. **That is the bug GarageSaleBiz carries.**"

So near-match detection is a **SQL function** beside `sbv_norm_city()`, never
JavaScript. Non-negotiable.

**This section needs Jason's answer before anything is built.**

---

## 2. The claim page — already ships

`/claim/` is three files: `index.html`, `claim.js` (36KB), `thank-you.html`.
`claim.js` reads `?niche=` (8 references). It already captures niche, city,
state, email, tier and an acceptance tick, and calls `POST /api/check-territory`
before `POST /api/create-checkout`.

**Change needed:** none for decision 2. The form's *tier* control is removed by
the repricing (§7), and the sign-in step is removed by §3.

---

## 3. Auth order — the real change

**Decision 3:** Stripe first, account created on webhook from the Stripe email,
setup link sent to that address.

**Today it is the opposite.** `create-checkout.mjs` returns `401` with *"Sign in
first, then claim your city."* The buyer authenticates, and the webhook maps the
already-known `user_id` into `sbv_client_users`.

This is a genuine conversion argument and it fits the brief's $99 goal: asking
someone to create an account *before* they have bought anything is the heaviest
friction in the funnel.

### What changes

**`api/create-checkout.mjs`**
- Drop the 401 auth gate. Accept `operator_email` from the claim form instead.
- Keep every other pre-payment validation exactly as-is — city availability,
  niche for sale, subdomain free, acceptance text current. None of them need a
  signed-in user.
- Park the submission in `sbv_intake` with `user_id = null` and the email.
- Pass the email to Stripe as `customer_email` so the receipt and the session
  agree.

**`api/stripe-webhook.mjs`**
- `provision()` currently reads `user_id` from intake or session metadata
  (lines 189-190) and tolerates `null` — `sbv_billing.client_id` is *already*
  nullable "precisely so the payment can be recorded before a tenant exists"
  (header comment, line 31). The shape needed already exists.
- New step, after the tenant and claim are written: resolve the account from
  `paidSession.customer_details.email` — find an existing Supabase auth user by
  email, or invite one — then write `sbv_client_users`.
- **Idempotency is mandatory.** Stripe retries. Resolution must be
  find-or-invite, never create-unconditionally. The function already handles
  "resuming half-finished provisioning" (line 141); account resolution joins
  that path.

**Setup link.** Supabase `inviteUserByEmail` / magic link to the Stripe email.
The email address is verified by the act of opening it, which is what makes
Stripe-first safe: payment proves the card, the setup link proves the mailbox,
and nothing sensitive is reachable until both land.

### Risks, stated plainly

- **Typo'd email → orphaned purchase.** Today sign-in guarantees a reachable
  address. Mitigation: the claim form already collects the email; confirm it on
  the review step before Stripe, and have the success page show it back with a
  "wrong address? contact us" line. `sbv_billing` still records the payment, so
  nothing is lost — it becomes a support case, not a black hole.
- **Someone else's email.** A buyer could type an address they do not own. They
  would be paying to send a stranger a setup link. Low incentive, and the
  territory stays unusable until the link is opened. Accept.
- **Loss of the pre-payment `user_id`.** Any code reading `intake.user_id` must
  tolerate `null`. It already does.

---

## 4. Niche in the URL — already ships

`claim.js` reads `?niche=`. The decision's *"in the checkout session URL"* is
satisfied by `success_url` carrying the niche back to `thank-you.html` for §5.
Verify the round-trip; no new mechanism.

---

## 5. Success page — already ships

`claim/thank-you.html` (20KB) with `api/verify-session.mjs` behind it. The
decision asks for generic fallback, personalised when data is available, showing
niche name, city and admin link.

**Change needed:** confirm the personalised branch renders all three, and add
whichever is missing. Under §3 the admin link becomes *"check your email for
your setup link"* until the account exists — the page must not link to an admin
the buyer cannot yet enter.

---

## 6. Territory columns — already ship

`sbv_city_claims` in `sql/COMMERCE.sql`:

```
city_label   text  check (length(btrim(city_label)) between 2 and 120)
city_norm    text  -- written by trigger from sbv_norm_city(), never by client
state_code   text  check (state_code ~ '^[A-Z]{2}$')
unique index (niche_slug, city_norm, state_code) where active
```

Exactly the decision's shape: separate columns, two-letter state, displayed as
"City, ST". **No change.** The decision's *"make it clear at checkout"* is a copy
task on the claim page and the Stripe line item description, not schema work.

---

## 7. $99 repricing (brief §2)

**Price source:** `TIER_PRICE_ID` in `api/_shared.mjs`, keyed by tier, values
from environment. `create-checkout.mjs:302` uses
`line_items: [{ price: TIER_PRICE_ID[tier] }]`.

**Retiring the tier concept** means `TIER_PRICE_ID` collapses to one id and the
`tier` parameter leaves the claim form, the request body, `sbv_intake`, and the
Stripe metadata. Keep the column; stop writing to it.

**Surfaces carrying 299/499** — verified list, dumpster-rental excluded because
those are the demo operator's own service prices and must not change:

```
api/create-checkout.mjs   api/_shared.mjs      claim/claim.js
assets/catalog-render.js  assets/sbv.js        assets/lang/es.js   ← Spanish
legal/terms.html          index.html           sites/index.html
```

⚠️ **Stripe is a stop condition.** Per brief §2: show Jason the exact env/config
diff and the Stripe product implications **before** applying; **do not create
Stripe price objects unprompted.** A new $99 price object almost certainly must
exist — that is Jason's to create, and this spec does not assume it.

⚠️ **Legal is a checkpoint.** `legal/terms.html` §3 and the refund page name
$299/$499. Diff shown to Jason before commit, per brief §2 and the 2026-09-07
brief's stop condition.

`recurring_price` stays null per brief §2. No billing built.

---

## 8. Build order

1. **§1 decision from Jason** — blocks everything, because it decides whether
   the pre-payment block survives.
2. $99 config + Stripe diff → **Jason approves before applying**.
3. Legal copy diff → **Jason approves before commit**.
4. Auth reversal (§3): checkout endpoint, then webhook, then claim form.
5. Success page gaps (§5).
6. Tier removal across the nine surfaces (§7).

---

## 9. Verification

- Full purchase-to-live loop in Stripe test mode, per the 2026-09-06 brief §6:
  claim → webhook provisions tenant + claim + `sbv_client_users` → setup link
  arrives → admin loads → content saves → subdomain renders.
- **Webhook replay** — fire the same `checkout.session.completed` twice and
  confirm exactly one tenant, one claim, one account, one `sbv_client_users`
  row.
- **Race test** — two sessions, same city, both pass the read, both pay. Expect:
  one provisioned, one in `sbv_blocked_purchases` with an alert. This is the
  behaviour the current design accepts by choice; confirm §3 does not worsen it.
- **Orphan test** — pay with an address with no account; confirm the invite
  path and that replaying the webhook does not send a second invite.
- `299` and `499` appear nowhere customer-facing except dumpster-rental's own
  service pricing. Build gate green; check-links; a11y sweep no regressions.

---

## 10. Open question for Jason

**§1 only.** Everything else is either already shipped or follows from decisions
already made. The question is whether to remove the pre-payment block on an
exact normalised match — which reopens paid-but-blocked — or adopt the
near-match split proposed in §1, which delivers the intent without that cost.
