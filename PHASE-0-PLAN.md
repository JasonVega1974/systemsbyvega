# Phase 0 — systemsbyvega.com as the turnkey business catalog

**Status: awaiting Jason's approval. Nothing has been built or applied.**

Six artifacts below. Read (b), (d) and (e) closely — those are where I've diverged from the brief, and each divergence is flagged `⚠ DIVERGENCE` with the reason.

---

## Corrections to the brief, up front

These came out of reading the live siblings and the repo. Each one changes what gets built.

| # | The brief said | What's actually true | Consequence |
|---|---|---|---|
| 1 | ESB is `$497/3 cities` | ESB is **$497 + $39/month** after 30 days, plus $250/extra city. GSB is **$249 one-time, no monthly** — stated in eight places | The catalog can never imply a house-wide price shape. Each card carries its own. |
| 2 | "the 24 demo sites" | **23 niches** across **26 URLs** — DJ ships as one 3-Theme Kit (`/dj/`, `/dj/blue/`, `/dj/green/`, `/dj/pink/`) | All counts on the page use 23/26. |
| 3 | "hide below threshold 3" | GSB's actual code is `if (n <= REG_COUNT_FLOOR) return;` with floor `3` — so it renders at **4 or more** | I mirror the code, not the prose. Ports of a rule should match the rule. |
| 4 | link label "see a real operator site" | The 23 demos are fictional brands (Larkspur & Ledge, Cinder Hog BBQ) | ⚠ Renamed to **"See the site your customers would get →"**. Calling a spec demo a real operator site is the exact fabricated-proof problem the compliance rule exists to prevent. Real operator proof is ESB/GSB only. |
| 5 | — | Homepage claims `9 shipped projects`; `/portfolio/` renders **11** from `projects.json` | Fixed in this build. It's the one number a prospect can check in one click. |
| 6 | "not every site-shop niche fits… e.g. tattoo studio and child care" | Correct, but the shortfall is far larger: **14 of 23 are licensed trades**. Dumpster rental and moving — both named in the brief as candidates — also fail | See taxonomy. Territory-eligible set is smaller than the brief assumes. |

### 🔴 Three live compliance defects found in the demos

These are on the live site right now, and the catalog frame makes them worse by putting an honest parent brand around them.

1. **`sites/electrician/index.html:719-721` — three hardcoded `★★★★★` ratings.** `renderTestimonials()` writes the quote and the attribution but never touches `.review__stars`, so the page renders five stars three times under a "reviews" heading with the body text "Real review coming soon." This is the **only live fabricated social proof in the repo.** One-line fix.
2. **24 fabricated counts across 15 sites** — `1,400+ panels`, `4,000+ service calls`, `1,200+ roofs`, `1,200+ pieces healed`, `12 caregivers on our team`, `12K monthly listeners` (×3 DJ variants), plus 11 years-in-business claims. The footer disclosure that legitimizes them is wrapped in `<!-- SWAP:DISCLOSURE -->` markers — i.e. it is *designed to be deleted on rebrand* — while **the stats are not.** A buyer rebrands, the disclosure goes, the invented numbers stay.
3. **The DJ audience metrics are undisclosed.** The "placeholder content" notice lives only on `/dj/`; `/dj/blue/`, `/dj/green/` and `/dj/pink/` are directly linkable and carry all four fabricated figures with no label.

**Clean, for the record:** zero income claims anywhere in the 23 demos, zero fabricated testimonial *text* (every array is empty strings), zero fabricated credentials (already remediated by commits `aeee352` / `35c0ab0`), zero broken local assets, and all 23 carry `noindex` plus a fictional-business footer disclosure using the reserved `(208) 555-01XX` phone range.

---

## (a) Information architecture

One page, `/`, rendering from `sbv_niches`. Everything else is supporting.

```
/                         THE CATALOG  (new homepage — the product)
├── #how                  How it works — 3 steps
├── #catalog              The grid. 29 entries, 6 family plates. The whole product.
├── #proof                Proof strip — real artifacts only
├── #registry             One operator per city — mechanism, not promise
├── #founder              Jason Vega, Kingdom Creatives LLC, Nampa
├── #websites             SECONDARY: "Already run one of these?" → Site Shop
└── #faq                  Straight answers

/sites/                   Site Shop index — the secondary offer, kept whole
/sites/<slug>/            26 demo URLs, reframed as previews
/showcase/                Unchanged. Strongest single asset. Still noindex (confirm?)
/demo/                    Unchanged
/portfolio/               Unchanged — jasonvega1974.github.io still redirects here
/pricing/                 301 → /#websites   (agency positioning folds in)
/__owner__/               NEW. Demand console, admin-gated
/read-me.md               410 Gone — internal build plan, currently public
```

**Nav** (5 items, mobile-collapsing): Catalog · How it works · Proof · Websites · About
**Sticky mobile affordance:** a bottom bar `Browse the catalog` that swaps to `Get in line` once the grid is in view. Mirrors GSB's `.mcta`, which hides the nav buy button at the same breakpoint so the two never compete.

**Redirects** — nothing Google has indexed may 404:

| From | To | Why |
|---|---|---|
| `/pricing/` | `/#websites` | Agency pricing folds into the secondary offer |
| `/read-me.md` | 410 | Internal doc, currently served publicly |
| `/index.html` | `/` | Canonical |

`/portfolio/` **must survive** — `jasonvega1974.github.io` redirects into it, and that redirect would dead-end.

---

## (b) Niche taxonomy — 29 niches

**Test applied:** does one operator, with no license and no premises, plausibly run this across a whole metro through a platform we hand them? If the trade needs a state license, a physical shop, or is a personal-brand craft, it is website-only — selling a territory for it would be selling something we can't deliver.

### OPEN NOW — 2

| № | Niche | Price shape | Destination |
|---|---|---|---|
| SR-01 | Estate Sales | $497 + $39/mo · 3 cities | estatesalebiz.com |
| SR-02 | Garage Sales | $249 once · 3 cities | garagesalebiz.com |

### IN LINE — 11 (territory-eligible, not yet built)

| № | Niche | Source | Reasoning (one line) |
|---|---|---|---|
| SR-03 | Local Auctions | OYT | Platform-shaped; **auctioneer licensing varies by state** — card carries a check-your-state line |
| SR-04 | Consignment & Vintage | OYT | The platform is the catalog + consignor split; no premises needed to start |
| SR-05 | Market Vendors | OYT | Pure directory and booth-desk business; effectively zero barrier |
| HC-06 | Junk Removal | OYT | Truck and labor, unlicensed in most states — the cleanest fit in the whole catalog |
| HC-07 | Delivery / Courier | Site Shop | Unlicensed, dispatchable, scales on 1099 drivers; the zone map *is* the product |
| CE-08 | Pressure Washing | Site Shop | No license, ~$3K of equipment, quotable from a photo, one rig covers a metro |
| CE-09 | Bin Cleaning | Site Shop | Route-density business on a weekly cycle; proven in the family already (primebincleaning.com) |
| CE-10 | Landscaping | Site Shop | Maintenance work is largely unlicensed, recurring, route-dense, crews subcontractable |
| CE-11 | Painting | Site Shop | Most states don't license residential painting; **flag RRP certification** on pre-1978 homes |
| AU-12 | Car Detailing | Site Shop | Mobile and unlicensed; caps at the operator's own hands unless he subcontracts |
| PP-13 | Dog Walking | Site Shop | Unlicensed and route-based, but hyper-local — works as a walker marketplace, not a solo metro |

### ⚠ DIVERGENCE — dumpster rental and moving are **excluded**, against the brief

Both were named as candidates. Both fail the test, for different reasons:

- **Dumpster rental** is a capital-asset business, not a lead-gen play: hook-lift truck, a fleet of boxes, landfill accounts, DOT compliance. We'd be selling a territory to someone who then discovers the business needs $80K of steel.
- **Moving** requires intrastate household-mover authority (state DOT/PUC) and cargo insurance in most states. Brokering moves without that authority is specifically how brokers get fined.

Both stay **website-only**. Say the word and I'll add them with an explicit capital/licensing warning on the card — but I'd be selling a territory into a wall, and the registry would fill with people who can't act on it.

### WEBSITE ONLY — 16

| Niche | Why not a territory |
|---|---|
| Plumbing, Electrician, HVAC, Contracting, Roofing | State-licensed trades (HVAC adds EPA 608). **The license already grants the moat** — territory exclusivity from a software vendor sells nothing the state hasn't already sold. |
| Auto Repair, Auto Body, Metal Fabrication | Premises, lifts/booth/hood, and years of skill. Metal fab's own demo pitch is *"one welder, you talk to the welder."* |
| Dumpster Rental | Capital-asset business — see divergence above |
| Moving | Intrastate mover authority — see divergence above |
| Tattoo Studio | Bloodborne-pathogen cert + shop permit + the artist's portfolio. The least transferable business in the set. |
| Child Care | Licensed, staff ratios, and a negligence surface that makes an arms-length platform actively unwise |
| Caregiving | Home-care registration, bonding, W-2 employees, background checks |
| Personal Trainer, DJ, BBQ Food Truck | Personal-brand craft. The demo is literally named after the trainer. |

### ⚠ DIVERGENCE — a niche can be in two states at once

The brief's three states are mutually exclusive. They shouldn't be. Pressure washing is simultaneously **in line for a territory** *and* **a website you can buy today**. Forcing one status either hides a live offer or misrepresents the roadmap.

So `sbv_niches` carries `status` **plus** `website_offer boolean`. A pressure-washing card reads:

> `IN LINE` · 12 waiting → *Get in line for your city*
> *— or buy just the website today, $299*

This makes the secondary offer convert off the primary grid instead of only from its own section. **7 of the 11** in-line niches get this dual state.

### ⚠ Gap: 4 niches have no preview

Auctions, Consignment, Market Vendors and Junk Removal have no demo under `/sites/`. Their cards get **no preview link and no substitute** — I won't point them at an unrelated demo. The card says plainly: *"Not built yet. Getting in line is what decides the order."* Building 4 demos is out of scope per the brief's no-new-platforms rule; say the word if you want them.

**Totals:** 2 open + 11 in line + 16 website-only = **29**.

---

## (c) Copy deck — homepage

Voice inherited from GSB: fragment-stack headlines, mechanism instead of promise, unprompted limitations, concrete nouns, refusal to project. Shifted from *this job* to *this house*.

**None of `niche-landing.html`'s blurbs survive.** They are income-adjacent: *"Never a slow Saturday," "sell out before setup," "fills your calendar," "Turn relocations into booked weekends."* All six rewritten.

### Masthead
> `KINGDOM CREATIVES LLC · NAMPA, IDAHO` — `REVISED {date from data}`
>
> # SYSTEMS BY VEGA
> `THE CATALOG OF TURNKEY LOCAL BUSINESSES`
>
> Pick a business. Check your city. Two are open today — the rest get built in the order people ask for them.
>
> [Browse the catalog] [How it works]
>
> **29** businesses listed · **2** open today · **1** operator per city

*(All three figures read from `sbv_niches`. None are typed into HTML.)*

### How it works
> `How it works`
> ## Three steps, and we are honest about which one you are on.
>
> **Pick a business.** Twenty-nine of them below. Two you can buy today. For the rest, the honest answer is that they are not built yet.
> **Claim your cities.** One operator per city. When a city is taken it is taken, and the checker on that product's own site will tell you so.
> **Launch with everything included.** The site, the documents, the training, the tools. You operate under your own name and keep what you collect.

### The registry — mirrors GSB's mechanism at parent level
> `The registry`
> ## One operator per city. Recorded, not promised.
>
> A city is one row. A row is written once. It cannot be written twice.
>
> For the two open businesses, that row already exists and their availability checkers read it. For everything else on this page there is nothing to check yet — so instead we write down who asked. When enough people ask for the same business, that is the one that gets built next, and the people who asked get the first offer on their own city before it is listed publicly.
>
> That is the whole mechanism. There is no bidding, no founding-member tier, and no countdown.
>
> **Counts appear only above three.** A registry that says "1 person waiting" argues against the thing it is meant to evidence, and an invented number would be worse than either.

### Founder note
> `Who is behind this`
> ## One person, in Nampa, Idaho.
>
> I'm Jason Vega. I build these platforms myself — the software, the documents, the training — and I answer the email. Kingdom Creatives LLC is me and a small company, not a franchise with a call centre.
>
> Two of these are finished and running: **estatesalebiz.com** and **garagesalebiz.com**. You can click into both, check a city, and read the operator agreement before you spend anything. That is the whole track record, and I would rather show you two real ones than list twenty-nine I have not built.

### The compliance trio — verbatim, on every relevant surface
> **What this is not.** These are not franchises and not business opportunities. You get no license to our brand, you pay no royalty and no franchise fee, and we exercise no control over how you operate.
>
> **What we do not do.** We do not find your clients, book your jobs, or run your business. We do not tell you what to charge, and we make no claim about what you will earn. Some operators never book a job. You could lose money on this.
>
> **Footer.** Systems by Vega provides software, documents, and training. It does not provide clients, leads, or locations, and makes no representation about income, revenue, profit, or results. Operators are independent businesses, not franchisees, employees, or agents of Kingdom Creatives LLC. Nothing on this site is legal, tax, or insurance advice.

### Secondary offer
> `Already running one of these?`
> ## Then you don't need a business. You need a website.
>
> Twenty-three trades, twenty-three sites already built. Pick the one closest to yours and it gets rebuilt under your name, your colors, your service area. $299 launch-ready, $499 custom. This is a website, not a territory — no exclusivity, no city, no registry.

---

## (d) Design direction

**"American main street catalog" as an actual trade catalog plate.**

⚠ **First attempt was rejected by its own research.** I prototyped a rotated rubber `OPEN NOW` stamp on deed paper. GSB's stylesheet header explicitly claims exactly that — the rubber stamp, `#F6F0E1` deed paper, `#C0311F` stamp red, sub-2° rotations, hard zero-blur shadows. It was a third sibling in costume. Rebuilt.

The three-way split now:

| | Metaphor | Devices |
|---|---|---|
| **GSB** | Physical | Stapled corrugated sign, hard shadows, rotation, Anton |
| **ESB** | Atmospheric | Navy, gradients, glows, 22px radii, Sora |
| **SBV (parent)** | **Typographic** | **Flat, ruled, printed. Zero rotation, zero shadow, zero texture.** |

**Tokens**
```
--paper  #E9E8E3   cool catalog stock (deliberately not GSB's warm deed paper)
--card   #F8F7F4
--ink    #191B1E
--rule   #CBC9C2
--ledger #1B4079   structure, links, focus
```
Red is **retired entirely** — it belongs to GSB. Status is carried by *weight*: OPEN NOW is a solid ink-filled tag (maximum contrast = maximum priority), IN LINE is a hairline ledger row, WEBSITE ONLY is recessed. Color does family, not status.

**Type**
- **Display — Fraunces** (variable, `opsz` + `WONK`). Antique-American printing character without being Playfair.
- **Body/UI — Public Sans.** The US Web Design System typeface. Civic typography for a main-street brand — the conceptual pick, and rare enough to not read as a default.
- **Data — IBM Plex Mono.** Catalog numbers, status, legal microcopy. Carried over from the existing brand.

Self-hosted, subsetted woff2 — no render-blocking third party, which is most of the Lighthouse 90+ target.

**Structure is information.** Catalog numbers are real: family prefix + index (`SR-01`, `HC-07`). Not decoration — the prefix *is* the family. This is already the house language: your `niche-landing.html` uses `code:'EST · Nº 001'`. Six family plates: Sale & Resale, Haul & Clear, Curb & Exterior, Auto, Home & Trade, People & Pets.

**Signature element:** the ledger bar under the masthead — three real figures from `sbv_niches`, hairline-ruled, no icons.

**Motion:** counts settle once on scroll-in. Nothing else. `prefers-reduced-motion` respected.

**Mobile-first:** verified at 360px — no horizontal overflow, single-column grid, ≥48px tap targets.

---

## (e) Data model — `newjbexmvltvtmxollca`, prefix `sbv_`

Full DDL is drafted and ready to apply on approval. Shape:

**`sbv_niches`** — catalog source of truth. `slug` PK, `catalog_no`, `name`, `family`, `job_line`, `status` (`open|in_line|website_only`), `website_offer bool`, `open_url`, `price_label`, `demo_path`, `sort`, `is_listed`. Constraint: `(status='open') = (open_url IS NOT NULL)` — an open niche must have somewhere to go. Public SELECT only. **Flipping a niche to open is a row update, not a deploy.**

**`sbv_demand`** — the registry. `niche_slug` FK, `email`, `city_label`, `city_norm`, `state_code`, `full_name`, `source`, `created_at`. Unique on `(niche_slug, lower(email), city_norm)`. A `BEFORE INSERT` trigger computes `city_norm` server-side, so the client can never disagree with the server — the same discipline as `gsb_check_cities`.

**`sbv_demand_counts` / `sbv_demand_city_counts`** — aggregate views. **Emails are not reachable through them by any path**, and sub-threshold counts return `NULL` rather than a number the page could round up.

**RLS:** both tables `ENABLE` + `FORCE`. `sbv_demand` gets an INSERT policy and *no* SELECT policy — absence is the control, grants are the belt. Then `REVOKE ALL ... FROM anon, authenticated` across the whole catalog, **run last**, followed by the four explicit grants. Verification suite cross-checks every grant against every policy and asserts that a raw `anon` SELECT on `sbv_demand` fails.

**⚠ BLOCKER — `gsb_norm_city`.** The brief says port it; the fence says never query the GSB project. Both cannot hold. I need **the function's source text pasted here**. Options:
1. You paste it → faithful port, city dedupe stays consistent family-wide. *(preferred)*
2. You say skip → I write a fresh normalizer and document the divergence in `SETUP.sql`.

Everything else proceeds regardless; only this one function is blocked.

**Email:** Brevo transactional via a **Vercel function**, not a Supabase Edge Function — the site is already deploying to Vercel, and one runtime beats two. From `info@kingdom-creatives.com`. **Click-tracking off** on anything containing links. No gmail address anywhere, ever.

**Owner console** `/__owner__/`: demand by niche ranked, by city within niche, threshold report, CSV export. Gated by an RPC that compares a key held server-side — the key never ships in the page.

---

## (f) Workstreams

Five parallel tracks. 1 and 2 start immediately on approval; 3 is independent of both; 4 and 5 gate on them.

| # | Workstream | Depends on | Output |
|---|---|---|---|
| **1** | **Catalog & data** — apply schema, seed 29 niches, verification suite, owner console | Supabase auth + `gsb_norm_city` answer | `SETUP.sql`, verification results |
| **2** | **Design system & homepage** — tokens, self-hosted fonts, masthead → FAQ, catalog cards rendering from `sbv_niches` | 1 (schema shape only) | `/index.html`, `/assets/sbv.css` |
| **3** | **Demo repurposing** — see the six jobs below | none | 26 edited demos + audit report |
| **4** | **Migration & plumbing** — Vercel config, demand + Brevo functions, redirects | 1, 2 | `vercel.json`, `DNS-MIGRATION.md`, `BREVO-SETUP.md` |
| **5** | **QA** — 360px + desktop screenshot pack, link audit across all 26 demos, income-claim grep, Lighthouse | all | Verification pack |

**Sequencing note:** #3 has no dependencies and is the largest mechanical job, so it runs the whole time rather than waiting for a gate.

### Workstream 3 in detail — six jobs across 26 URLs

1. **Kill the fabricated star ratings.** `electrician/index.html:719-721`. Gate `.review__stars` on `item.quote` in `renderTestimonials()`. Not optional.
2. **Resolve the 24 fabricated counts.** ⚠ **This needs your decision — I'm not choosing it for you.** Three options, my recommendation first:
   - **(A) Replace with non-numeric pills.** `car-detailing`, `contracting` and `dumpster-rental` already do this — `Mobile` / `Flat` / `Local`. The pattern exists, it looks good, and nothing invented survives a rebrand. **Recommended.**
   - **(B) Wrap in `SWAP:` markers** so they're flagged as replace-me alongside the disclosure. Keeps the visual density; relies on the buyer actually swapping them.
   - **(C) Blank to `""`** in both `content.json` and inline `DEFAULT_CONTENT`. Safest, leaves visible holes in the layouts.
3. **Add the placeholder disclosure to the three DJ theme pages.** They're directly linkable and currently carry four unlabelled audience metrics.
4. **Reframe the demo banner.** Currently `"Demo — this site is for sale"` on all 25 — a sales frame. Becomes a preview frame keyed to the niche's catalog status, linking back to its catalog entry.
5. **Fix 11 off-domain canonicals + 2 dead `og:image`s.** Every premium-pass site canonicalizes to `jasonvega1974.github.io/<name>-demo/`. Harmless while `noindex` holds — but the moment a buyer removes `noindex` on rebrand, the site self-cannibalizes to a github.io URL. `contracting:18` and `metal-fabrication:19` point `og:image` at fictional domains (`summitstonecontracting.com`, `blackanvilfab.example.com`).
6. **Collapse the `content.json` duplication.** Each of the 25 pages ships an inline `DEFAULT_CONTENT` *and* fetches a byte-identical `content.json` over it. Two sources of truth for the same 24 fabricated stats, edited in lockstep by hand, with no test enforcing agreement — which is exactly how a "fixed" claim comes back. I'll add a check that fails if they diverge.

**Deliberately out of scope** (report, don't silently patch): the `AllOrigins` CORS proxy the DJ sites call unpinned; the 23 separate Google Fonts requests; and the JS-off degradation where `#svcGrid` / `#priceGrid` / `#faqList` render as empty containers.

---

## What I need from you

1. **Approve or amend (a)–(f).**
2. **Authorize the Supabase MCP** — link is in the chat above. *(Blocks all of workstream 1.)*
3. **`gsb_norm_city` source text** — paste it, or tell me to write a fresh one. *(Blocks the city-dedupe port only.)*
4. **Pick an option for the 24 fabricated stats** — A, B, or C above. I recommend A.
5. **Dumpster rental and moving** — accept my exclusion, or tell me to include them with warnings.
6. **Confirm:** should `/showcase/` stay `noindex`? It's the strongest asset on the site and is currently invisible to search by choice.

Items 2 and 3 are the only true blockers, and each blocks one thing rather than the build. Everything else I can proceed on with a default if you'd rather just say "go."

Nothing gets built, and no SQL is applied, until you say go.
