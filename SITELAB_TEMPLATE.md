# SITELAB_TEMPLATE.md

The canonical spec for SiteLab niche sites. A site is "done to Sawtooth standard"
when every item in [§9 QA checklist](#9-qa-checklist) passes.

Status: **draft, Phase 1 Item 3.** Nothing below has been applied to a site yet.

---

## 1. What this replaces

Today there is no shared template. All 23 deployed sites are self-contained forks
with no shared CSS or JS. Measured identifier overlap with the Sawtooth reference
(`sites/dumpster-rental/`) is low even for the closest sibling:

| Site | fn names | section ids | CSS tokens | content.json keys |
|---|---|---|---|---|
| car-detailing | 43% | 34% | 27% | 31% |
| landscaping | 33% | 33% | 31% | 40% |
| auto-repair | 17% | 3% | 20% | 21% |
| dj | 0% | 2% | 8% | 0% |

Convergent *style* was regenerated per site; nothing is actually shared.

---

## 2. The three-place problem

**This is the defect the architecture exists to fix.** Today a single content value
can live in three files that must be edited in lockstep, with nothing enforcing
agreement:

1. **Static markup** — hand-written HTML so the page isn't blank before JS runs
2. **`DEFAULT_CONTENT`** — an inline JS object literal, the offline fallback
3. **`content.json`** — the file the admin writes and the page fetches

Measured across all 22 non-DJ sites: **257 of 1,297 content values (19.8%) appear
in all three places.** Concentration is worst in exactly the richest builds:

| Site | 3-place | Site | 3-place |
|---|---|---|---|
| dumpster-rental *(the reference)* | **72%** | pressure-washing | 32% |
| contracting | **70%** | car-detailing | 24% |
| metal-fabrication | **68%** | auto-repair | 5% |

The most-duplicated fields are the ones an operator changes first:

```
22  brand.phone        17  serviceArea.short     12  services[].title
22  brand.email        16  brand.tagline         12  services[].desc
18  brand.name         15  serviceArea.region     7  pricing[].features[]
```

Two consequences worth stating plainly:

- **The reference is the worst offender.** The template cannot simply *be* Sawtooth.
  It must be Sawtooth's feature set on a different data architecture.
- **Item 1 proved the failure mode is real.** Fixing `black-anvil`'s fabricated
  credential took edits in three places; the first pass caught two and missed the
  third. The `<head>` copy — meta description, `og:description`, JSON-LD — was
  unreachable from the admin entirely, so an operator correcting their stats would
  still have shipped a false claim in their search snippet.

### 2.1 Source of truth, by field type

| Field type | Source of truth | How it reaches the page | Who maintains it |
|---|---|---|---|
| Content values (`brand`, `services`, `pricing`, `faq`, `owner`, `stats`…) | **`content.json`** | Build inlines it as `DEFAULT_CONTENT` **and** renders it into markup | Operator, via admin |
| SEO (`<title>`, meta description, OG, JSON-LD) | **`content.json` → `seo` block** | Build renders `<head>` from it | Derived — never hand-typed |
| Structure (section order, ids, markup) | **`_template/index.html`** | Copied verbatim at build | Us |
| Palette + type tokens | **`niches/<slug>/niche.css`** | Inlined into `<style>` at build | Us, at niche creation |
| Illustration + animation | **`niches/<slug>/scene.svg`, `scene.js`** | Inlined at build | Us, at niche creation |

**One rule: a content value is authored in exactly one file, `content.json`.**
The other two copies still exist in the shipped artifact — they must, for no-JS
rendering and offline fallback — but they are **generated**, never edited. They
cannot drift because neither is a source.

### 2.2 The build step

Approved as decision **D‑4**: source becomes modular, the shipped artifact stays a
single self-contained file. The `ADMIN-CLONE-SPEC.md` §6 guardrail ("public
index.html stays ONE file") is preserved in the thing that ships — only authoring
changes.

```
niches/<slug>/content.json   ─┐
niches/<slug>/niche.css      ─┤
niches/<slug>/sections.css   ─┤
niches/<slug>/niche.js       ─┤
niches/<slug>/scene.svg      ─┼─→  node tools/build-site.js <slug>  ─→  sites/<slug>/index.html
niches/<slug>/scene.js       ─┤                                          (one file, no deps)
_template/index.html         ─┤                                     ─→  sites/<slug>/content.json
_template/base.css, base.js  ─┘
```

The build must:

1. Inline the CSS in order — `niche.css` (tokens), then `base.css` (shared
   chrome), then `sections.css` (this niche, may override) — plus `scene.svg`
   into the illustration slot and `scene.js` into the animation slot.
2. Inline `content.json` verbatim as `var DEFAULT_CONTENT = {…}`.
3. Copy `sections.html` through **verbatim**. It is authored markup, not a
   template — see D-U below for what this costs and what should replace it.
4. Render `<head>` — title, description, OG, JSON-LD — from `content.json.seo`.
5. Copy `content.json` next to the built page so the runtime fetch still works.
6. **Fail** on any check in §9.1 or §9.2.

Runtime behaviour is unchanged: the page still fetches `content.json` and re-renders,
so an operator edit goes live without a rebuild.

#### D-U (tracked, not yet built): generate the static markup too

The build fixes two of §2's three places — `DEFAULT_CONTENT` is generated from
`content.json`, so those two cannot drift. The third, the static markup, is
copied verbatim and remains authored by hand.

The renderer replaces those nodes wholesale (`svcGrid.innerHTML = …`), so the
static copy is dead the moment JS runs. It matters in exactly two situations: JS
fails, and a crawler that does not execute JS. Edit `content.json` and the static
copy goes stale — invisible on screen, visible to those crawlers.

An earlier version of step 3 above claimed the build already rendered this from
`data-slot` markers. It never did: `data-slot` appears in no build script and no
niche's `sections.html`. The values agree today by authorship, not by
construction.

Measured duplication left in place, per site (values also hard-coded in markup):

| site | duplicated | of |
|---|---|---|
| **contracting** | **47** | **91** |
| dumpster-rental | 20 | 66 |
| car-detailing | 13 | 93 |
| roofing | 13 | 94 |
| delivery | 5 | 103 |
| auto-repair | 5 | 189 |

**`contracting` is the highest-priority site to revisit when this lands** — over
half its content is written twice, the largest duplicated surface in the estate.

Deliberately not done during consolidation: it is a build change affecting all 23
sites, and stalling the conversion on it would be the wrong trade. Stripping the
static copies instead is NOT the answer — it removes the no-JS fallback, which is
the reason the markup carries content at all.

> **Note for the consolidation pass:** no deployed `content.json` is machine-formatted.
> All 22 fail a `JSON.stringify(obj, null, 2)` round-trip — `summit-stone`'s, for
> instance, mixes expanded objects with compact one-line `gallery` entries. **Never
> re-serialize an existing `content.json`**; edit surgically, or the diff reflows
> dozens of unrelated lines. Files generated by the build are machine-formatted from
> the start, which retires this constraint going forward.

---

## 3. Directory layout

```
_template/
  index.html          structural chrome + data-slot attributes, no niche content
  base.css            reset, layout, type scale, .btn/.wrap, reveal, focus, forms
  base.js             esc(), num(), telHref(), telDigits(), smsHref(), val(),
                      postForm(), the reveal observer, and the content
                      fetch/merge lifecycle that calls the niche renderer.
                      NOT setErr/showDone: every niche examined defines its
                      own with a different signature, so sharing them would
                      be a silent behaviour change rather than a saving.
niches/<slug>/
  content.json        THE source of truth for all content
  niche.css           tokens only (§5) — no structural CSS         (~37 lines)
  sections.css        rules for THIS niche's own sections — the
                      ones whose hooks appear in no other site     (~136 lines)
  niche.js            renderContent() + this niche's interactive
                      logic (pricing, pickers, summaries)          (~480 lines)
  sections.html       this niche's body markup — sections differ
                      by product, so they are not shared (§3.1)    (~580 lines)
  scene.svg           the hero illustration (§6)                   (~80 lines)
  scene.js            the signature animation only (§7)            (~25 lines)
  brief.md            10–15 line niche brief
tools/
  build-site.js       the build (§2.2)
  qa-site.js          the QA checklist (§9), exit non-zero on failure
sites/<slug>/         BUILD OUTPUT — never edit by hand
```

### 3.1 The CSS is three layers, inlined in this order

```
niche.css      tokens          →  colour and type for this niche
base.css       shared chrome   →  reset, layout, type scale, .btn, forms, reveal
sections.css   this niche only →  its own sections; may override the above
```

A site's signature animation may live in this layer as well as in JavaScript —
`@keyframes` are niche-specific, so they belong in `sections.css`, and the site
then ships a documented no-op `scene.js`. See §7.0 (D-S).

**A rule belongs in `base.css` when its class/id hooks appear in the markup of
two or more deployed sites, or when it targets elements only.** A rule used by
exactly one niche belongs in that niche's `sections.css`. Order matters: because
`sections.css` is last, a niche overrides shared chrome without `!important`.

Measured when this split was made, sampling hook usage across all 22 deployed
sites: of 226 rules originally extracted from the reference, **169 were shared
and 63 were dumpster's alone** (`.picker`, `.size-card*`, `.mote`). The split was
verified lossless — 999 declarations and 226 selectors before and after.

The layering matters more than it looks. The first wave-1 conversion built a page
with car-detailing's markup, car-detailing's tokens, and **none of its section
rules** — `.pkg`, `.zone` and `.addon` had no styling at all, because `base.css`
had been extracted from one site and silently assumed to cover every other. It
does not: it covers about 70% of a second site's rules, which is real reuse, and
the remaining 30% is what `sections.css` exists to hold.

### 3.2 What consolidation actually buys — and what it does not

Measured on the reference: of the JS inside functions, **53 lines (21%) are
generic and 200 lines (79%) are niche-specific.** `renderContent` alone is 133
lines of dumpster-specific DOM writes. A dumpster size-picker and a tattoo flash
gallery are different products; their render layers do not converge.

So this is a **shared shell plus a per-niche renderer**, not one template
rendering 23 niches. State it plainly rather than discovering it at niche 12.
(The CSS splits the same way — see §3.1.)

| Consolidates | Stays per-niche |
|---|---|
| 522 lines of structural CSS, × 23 sites | Render logic (~200 lines each) |
| JS utilities + the fetch/merge lifecycle | Section markup — the sections differ by product |
| `<head>` generation from `seo` (§8) | Illustration and animation |
| Build and QA tooling | |
| The content schema (§4) and token contract (§5) | |

**None of the three goals depends on sharing render logic.** Three-place
duplication is killed by the build (§2.2). Token and schema drift is killed by the
contract (§4, §5). Fixes propagate through shared CSS and shared QA. All three
land regardless.

---

## 4. content.json schema

Types: `s` string, `n` number, `b` boolean, `[]` array. **R** required, **O** optional.

### 4.1 Required on every niche

```jsonc
{
  "brand": {
    "name":      "Sawtooth Dumpster Co.",   // R  s
    "tagline":   "No quote games.",         // O  s   see D-Q below
    "phone":     "(208) 555-0188",          // R  s   reserved 555-01XX range on demos
    "email":     "hello@example.com",       // R  s   the operator's public address
    "leadEmail": "info@kingdom-creatives.com", // R s  form delivery; never rendered
    "city":      "Nampa",                   // R  s
    "license":   ""                         // O  s   blank unless the operator holds one
  },
  // OPTIONAL as a block (D-N). A mobile business — a food truck, a courier —
  // parks at named stops on a schedule and serves no area. Where it is absent
  // every consumer falls back to brand.city: JSON-LD areaServed, the share
  // card's eyebrow, the footer. Deriving cities[] from address strings would
  // put inferred towns into the operator's structured data.
  "serviceArea": {
    "region": "Treasure Valley, Idaho",     // R within the block  s
    "short":  "Treasure Valley",            // R within the block  s
    "cities": ["Boise", "Meridian"]         // R within the block  []s
  },
  "seo": {
    "title":       "Sawtooth Dumpster Co. — Flat-Rate Roll-Off Dumpsters",  // R s
    "description": "Roll-off rental with honest flat pricing…",             // R s  ≤160 chars
    "ogTitle":     "No Quote Games. The Price Is the Price.",               // R s
    "ogDescription": "Flat-rate roll-offs from $299…",                      // R s
    "priceRange":  "$299-$554",             // R  s   feeds JSON-LD
    "schemaType":  "LocalBusiness"          // R  s   schema.org @type
  }
}
```

**`brand.tagline` is optional (D-Q).** Not every source has one. tattoo-studio's
`og:title` is a title, its meta description is a description, and its hero
subhead is a sentence — cropping any into a tagline is writing marketing copy on
the operator's behalf. Where it is absent the share card omits the line and
JSON-LD omits `slogan`.

`seo` is **new**. It exists because Item 1 found fabricated claims in
`<meta name="description">`, `og:description` and JSON-LD on sites whose admin
could not reach them. Deriving `<head>` from data closes that hole permanently.

### 4.2 Optional, shared shapes

Use these names and shapes exactly. The variants listed under "was" are drift found
in the audit and are **retired**.

```jsonc
{
  "services":     [{ "title": "s", "desc": "s", "icon": "s?", "from": "s?" }],
  "pricing":      [{ "label": "s", "price": 299, "priceHigh": 900, "per": "s?", "cta": "s?",
                     "blurb": "s?", "note": "s?", "features": ["s"],
                     "highlight": false }],
  "faq":          [{ "q": "s", "a": "s", "tags": "s?" }],
  "owner":        { "name": "s", "bio": "s", "photo": "s" },
  "testimonials": [{ "quote": "s", "name": "s" }],
  "stats":        [{ "num": "s", "label": "s" }],
  "gallery":      [{ "title": "s", "tag": "s", "image": "s", "style": "s?" }],
  "social":       [{ "label": "s", "url": "s", "icon": "s?" }]
}
```

| Canonical | Was, on some sites | Rule |
|---|---|---|
| `pricing[]` | `plans[]`, `packages[]` | One array, one name |
| `pricing[].price` | `n` **or** `s` | Always `n`. Formatting is the renderer's job |
| `pricing[].features` | `s` **or** `[]s` | Always `[]s` |
| `pricing[].highlight` | `best` (as a boolean), `featured`, `popular` | **Three** names for one flag. Always `highlight`, always `b` |
| `pricing[].blurb` | `best` (as a *string*), `freq` | A one-line tier description. Carried as `best` on dumpster's `sizes[]`, `best` on car-detailing's `packages[]`, `freq` on landscaping's `plans[]` |
| `pricing[].priceHigh` | `priceHigh` | Optional. When present the tier is a RANGE and both ends must render; when absent it is a fixed price. Canonical for the same reason as `note`: showing "$450" for something that costs $450–$900 misstates the price, and a high end kept anywhere else is decoration the renderer can drop. Distinct from `seo.priceRange`, which is the site-wide JSON-LD summary string |
| `pricing[].note` | `note` | The tier's **fine print** — a caveat that qualifies the price (`"past 600 ft² is billed at $0.18/ft²"`). Distinct from `blurb`: a short descriptor and a 100-character qualifier are not the same field. Canonical on **compliance grounds, not frequency** — only pressure-washing carries one today, but a price qualifier must stay structurally attached to the price it limits. Put it in `niche.*` and a later template change can render `$149 flat` with its "up to 600 sq ft" silently detached |
| `pricing[].per` | `period` | A fourth drift on one field. personal-trainer wrote `period`; everything else writes `per` |
| `services[].from` | — | **Optional.** A per-service starting price (`"from $16/hr"`). Canonical on the same compliance grounds as `note`: a price qualifier stays structurally attached to what it prices. Move it to `niche.*` and a later template change renders a service with no indication of what it costs |
| `faq[].tags` | — | **Optional.** Comma-separated filter keys (`"all,strength"`), read to filter FAQs by the visitor's selected goal. Canonical rather than niche-local because the alternative is duplicating every question into `niche` just to carry its tag |
| `social[].icon` | `platform` | **Optional.** Selects the glyph, exactly as `services[].icon` does |
| `pricing[].cta` | — | **Optional.** The tier's own button label (`"Start a refresh"`). A per-tier display attribute, attached to the tier for the same reason `note` is: the renderer falls back to a generic label when absent, and holding it anywhere else means a later change silently swaps copy the operator wrote |
| `testimonials[].name` | `author` | `name` |
| `stats[].label` | `lab` | `label` |
| `gallery[].tag` | `cat`, `meta` | `tag` |
| `serviceArea.region` | `brand.serviceArea` (a string nested in `brand`) | The canonical shape is a TOP-LEVEL object. `short` and `cities` stay absent when the source has none — inferring a territory from where past jobs happened to be is fabrication, and D-N already makes an absent `serviceArea` fall back to `brand.city` |
| `gallery[].style` | — | **Optional.** Selects a pre-built tile treatment used INSTEAD of `image` (`"patio"`, `"deck"`). Deliberately NOT named `icon` like `services[]` and `social[]`: those select a glyph, this selects the artwork itself, and a field called `icon` sitting beside `image` would be misread. Where every `image` is empty — as on contracting — this field IS the gallery |

`stats[].num` stays a **string**, deliberately — it holds `"Seasoned"` and `"Custom"`
as often as a figure. See §9.2.

### 4.3 Niche-specific data

Some niches carry data that genuinely does not generalise — delivery's quoter
zones and sizes, landscaping `seasons`, BBQ `menu`/`schedule`, auto-repair's
`soundResults`. Do **not** force these into a shared shape. Put them under
`niche`:

```jsonc
{ "niche": { "quoterZones": [...], "quoterSizes": [...], "quoterSettings": {...} } }
```

Document the shape in that niche's `brief.md`.

**One documented exception (D-T).** `dumpster-rental` keeps `sizes`, `durations`
and `terms` at the TOP level with no `niche` key at all. It was wave 0, converted
before this convention settled, and it is the only site out of step. The rule
above is what every later conversion follows; the reference site is not being
re-converted to match it, so do not read it as a counter-example.

**`base.js` DOES read `niche.*`** — an earlier version of this section claimed it
never did, and that claim cost fourteen sites their renderers. Niche renderers
were written against the pre-consolidation shape and read these keys flat
(`c.walkServices`, not `c.niche.walkServices`), so `base.js` flattens the
namespace onto the runtime object before anything renders — and flattens the
GLOBAL, because every `niche.js` aliases `window.DEFAULT_CONTENT` directly for
its interactive handlers. The authored `content.json` keeps its namespace; only
the runtime view is flat. Key collisions between `niche.*` and the top level are
therefore forbidden, and `qa-site.js` checks for them.

### 4.4 Rules

- No `null`. Absent means absent; empty means `""` or `[]`.
- Every string is plain text. The renderer escapes; content never carries HTML.
- `leadEmail` is **always** `info@kingdom-creatives.com` and is never rendered.
- Demo builds use the reserved `(208) 555-01XX` phone range.

---

## 5. CSS token contract

`niche.css` defines **only** these. Any other declaration belongs in `base.css`.
Names are canonical — `--hair` won, `--line` is retired (it appeared on 3 of 23).

### 5.1 Required

Names are **role-based, not brightness-based**. The estate is mixed — **15 sites
are dark-ground and 7 are light** — so a token called `--paper` would force a
mental inversion on two-thirds of them. `--ground` is whatever the page sits on;
`--ink` is whatever reads on top of it.

```css
:root{
  --scheme:     dark;      /* dark | light — base.css branches on this      */
  --ground:     #0e1f18;   /* page background, dark or light                */
  --ink:        #F2E9D8;   /* primary text ON --ground                      */
  --panel:      #132a20;   /* card / raised surface                         */
  --muted:      #A79C86;   /* secondary text — must hit 4.5:1 on --ground   */
  --hair:       rgba(242,233,216,.12);  /* hairline rules and borders       */
  --accent:     #FFC400;   /* the niche's signature colour                  */
  --accent-ink: #0e1f18;   /* text on --accent — must hit 4.5:1             */
  --accent-deep:#D89B00;   /* hover / pressed                               */
  --display: 'Anybody', system-ui, sans-serif;   /* headings   */
  --body:    'Inter', system-ui, sans-serif;     /* body       */
  --mono:    'IBM Plex Mono', ui-monospace, monospace; /* data */
}
```

*(Values shown are Sawtooth's, mapped to canonical names.)*

**`--paper` is retired.** So are per-niche poetic identity names — Sawtooth's
`--pine`, `--sand`, `--safety`, `--kraft`, `--moss` all map onto the roles above.
The colour survives; the bespoke name does not, because 542 lines of shared
structural CSS cannot reference a token only one niche defines.

### 5.2 Also required, discovered during extraction

The reference hardcoded **19 colours inside structural CSS**, which shared CSS may
not carry. Each became a token. `base.css` references all of these, so every niche
must define them:

```css
  --accent-ink:   #161105;   /* text on --accent                       */
  --ink-max:      #fff;      /* maximum-contrast headings              */
  --ground-2:     #0a1812;   /* page gradient mid stop                 */
  --ground-deep:  #08130e;   /* page gradient base                     */
  --sheen-hi:     #fffdf6;   /* top stop of the polished text gradient */
  --sheen-lo:     #d8c9a4;   /* bottom stop                            */
  --sheen-accent: #fff6dd;   /* accent-button top stop                 */
  --hair-accent:  rgba(255,196,0,.14);  /* accent-tinted hairline      */
  --placeholder:  #6f6a58;   /* input placeholder text                 */
  --err:          #e0616b;   /* invalid field border                   */
  --err-ink:      #ff9aa2;   /* error message text                     */
```

Plus `--ink-bright`, `--ink-dim`, `--panel-2`, `--accent-2`, `--card`, `--card-brd`,
`--shadow`, `--maxw`. **29 tokens total**, verified by `qa-site.js`.

`--w` is *not* a theme token — it is set per element inline (`style="--w:80%"` on a
meter bar) and correctly has no `:root` declaration.

### 5.3 Optional

`--accent-soft`, `--accent-alt`, `--radius`.

`--accent-alt` exists for a niche with a genuine second accent — landscaping
pairs larkspur purple with a terracotta `#D98A52`. One accent family is the
norm; two is allowed, three is a design smell.

### 5.4 Niche-local variables must be prefixed

**A variable a niche sets on an element — not in `:root` — must carry a scope
prefix (`--scene-*`, `--wheel-*`, `--card-*`) so it can never shadow a contract
token.**

Landscaping animates its yard illustration by setting `--ground` and `--foliage`
on the scene element per season, with CSS reading `var(--ground, #233826)`. That
name is also the contract's page-background token. Mapping the niche onto the
contract would have put `--ground` in `:root`, so the fallback could never fire
and the illustration's soil would render near-black **on first paint and with JS
disabled** — while looking correct the moment JS ran, which is exactly when
nobody is watching. Renamed to `--scene-ground` / `--scene-foliage`.

The general rule: `:root` belongs to the contract. Anything a niche invents
lives under a prefix.

### 5.5 Rules

- **Three families, three roles.** Display, body, mono. `tattoo-studio` ships two
  and is non-conforming.
- Contrast: body text ≥ 4.5:1, large display ≥ 3:1, `--accent-ink` on `--accent`
  ≥ 4.5:1. Checked in §9.
- One Google Fonts request, `display=swap`, with `preconnect` to both hosts.
- Niches never restyle structure. If a niche needs a layout change, it goes in
  `base.css` behind a modifier class, or it is a decision, not a fork.

---

## 6. SVG illustration slots

The hero illustration is the single largest driver of perceived quality. Sawtooth
carries 12 gradient/filter ids; `tattoo-studio` carries **zero real SVG** (CSS
gradients only) and `electrician` zero gradients — both non-conforming.

### 6.1 The bar is richness, not file location

**Count gradient and filter defs across `scene.svg` *and* `sections.html`
together. The threshold is ≥ 6 on the page as a whole.**

`scene.svg` is **optional**. It exists for a niche that gathers its defs into one
shared `<defs>` block, which the reference does — but that turned out to be a
Sawtooth habit rather than a house pattern. Both sites converted in wave 1 keep
their illustrations inline in the markup instead:

| Site | defs on the page | in `scene.svg` | verdict |
|---|---|---|---|
| dumpster-rental | 12 | 12 (shared `<defs>`) | pass |
| landscaping | **9** | 0 — inline in `sections.html` | **pass** |
| car-detailing | 4 | 0 — inline | fail: genuinely thin |

Counting `scene.svg` alone would have failed landscaping for filing its work
differently while passing nothing car-detailing lacks. Location is a filing
decision; the number of defs is the quality signal.

### 6.2 Requirements

- **≥ 6** gradient or filter defs across the page. Sawtooth's 12 is the target,
  not the floor.
- **Every id prefixed with the niche slug** (`dumpster-sky`, not `sky`) so that
  inlining several illustrations can never collide.
- `viewBox` set, no fixed `width`/`height`, `preserveAspectRatio` explicit.
- `aria-hidden="true"` unless it carries meaning; if it does, `role="img"` + `<title>`.
- Where a niche has a signature animation, the animated group carries a stable
  hook (`class="scene-rig"`, or the niche's own documented equivalent).
- No raster embeds. No external references.

Slots in `_template/index.html`:

| Slot | Required | Purpose |
|---|---|---|
| `{{SCENE_SVG}}` | O | A shared `<defs>` block, when the niche has one |
| `{{FAVICON}}` | R | Inline data-URI SVG, niche-specific (§8) |

---

## 7. Animation slots and reduced motion

Every site ships **one** signature animation. Not three, not zero.

### 7.0 Where the animation lives (D-P)

**The animation is graded wherever it lives — `scene.js` or `niche.js`.**

`scene.js` is the preferred home and is right when the scene stands alone:
dumpster-rental's spring drop, pressure-washing's wand canvas and plumbing's
drip physics all have zero `CONTENT` references and lift cleanly.

But some animations are **helpers the renderer calls**, not scenes.
bin-cleaning's `springPulse(el, cx, cy)` is invoked from `activateZone()`,
which reads `CONTENT.routeZones`; roofing's `stepGlow` is driven by its
self-check quiz state. Extracting those would split a function from its callers
to satisfy a filing convention, and risks breaking a working animation.

So a `scene.js` stub is legitimate when the animation is inseparable from the
renderer — its comment must name the file that holds it. The reduced-motion
gate (§7.1) is then checked in that same file.

**And it may not be JavaScript at all (D-S).** child-care's hero scene twinkles,
glows and steams on four infinite `@keyframes`; hvac's system-map hotspot ring
pulses on one. Both honour reduced motion. Neither uses a line of JS. Grading by
`requestAnimationFrame` alone reported those as missing, which would have sent
someone to build an animation that already existed.

So: **a signature animation is a LOOP, wherever it lives.**

| Home | Bar |
|---|---|
| `scene.js` / `niche.js` | ≥ 2 `requestAnimationFrame` — it re-schedules itself. One call is a deferred style write (a toast fade), not an animation |
| `sections.css` | an `@keyframes` used with `infinite` on a non-chrome selector, switched off by a `prefers-reduced-motion` block |

With one further condition on the CSS half: **at least one keyframe+selector pair
must be unique to that niche.** Four sites carry an identical
`pulse on .hero__art .halo` inherited from the reference build, and three share
`float on .hero__art svg`. Inherited boilerplate is not a signature — counting it
would mark sites done and quietly delete real Phase 3 work from the backlog.

This is the correction §6.1 already made for illustration defs: grade the thing,
not its address.

### 7.1 The contract

`scene.js` exports a single function that receives the rig element and returns a
teardown. It must:

1. **Check reduced motion first, before anything else**, and return early leaving
   the static scene rendered:
   ```js
   if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
   ```
2. Use `requestAnimationFrame`. No `setInterval`.
3. Be self-terminating — settle and stop, or stop when scrolled out of view.
4. **Remove its own transform when it settles**, so nothing lingers in the
   compositor. Sawtooth's `rig.removeAttribute('transform')` is the pattern.
5. Never move layout. Transform and opacity only.

### 7.2 Reference implementation

Sawtooth's damped-spring bin drop, `sites/dumpster-rental/index.html:1809-1834` —
Hooke's law with viscous damping (`a = -k·y - c·v`, `k=150`, `c=15`), semi-implicit
Euler, settles after 4 consecutive frames inside a 0.15 tolerance. Copy the shape,
not the constants.

### 7.3 Three layers of reduced-motion, all required

| Layer | Where | What |
|---|---|---|
| CSS | `base.css` | `@media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }` plus explicit overrides for `.reveal`, `.btn::after`, any meter/progress fill |
| JS gate | `scene.js` | Early return (§7.1) |
| Reveal gate | `base.js` | The IntersectionObserver reveal must render everything visible immediately when reduce is set |

A site that only does the CSS layer is non-conforming: the rAF loop still runs and
still burns battery.

---

## 8. Head requirements

All generated from `content.json.seo` (§4.1). None hand-typed.

| Item | Required | Notes |
|---|---|---|
| `<title>` | R | From `seo.title` |
| `<meta name="description">` | R | From `seo.description`, ≤ 160 chars |
| `<meta name="theme-color">` | R | `--ink`. Absent on 15 of 23 today |
| `<link rel="canonical">` | R | Absolute. Present on only 7 of 23 today |
| `<meta property="og:url">` | R | Matches canonical |
| `og:type`, `og:title`, `og:description` | R | |
| `og:image` + `twitter:image` | R | 1200×630. **Absent on all 23 including the reference** — Item 4 |
| `twitter:card` | R | `summary_large_image` |
| `<link rel="icon">` | R | Inline data-URI SVG, niche-specific |
| JSON-LD | R | `@type` from `seo.schemaType`; `name`, `description`, `telephone`, `areaServed`, `priceRange`; `makesOffer[]` whenever `pricing[]` exists |
| `<meta name="robots" content="noindex">` | R **on demos only** | Stripped by the clone tool for a real buyer |

**JSON-LD must never contain a claim absent from the rendered page.** It is generated
from the same data, so this holds by construction — but the QA check asserts it.

### 8.1 The share card — and when to regenerate it

`og:image` and `twitter:image` point at `sites/<slug>/og.png`, a **committed
artifact**. Two files, and the distinction matters:

| File | Role | Committed |
|---|---|---|
| `niches/<slug>/og.svg` | **Source.** Generated from `content.json` + `niche.css` by `tools/build-og.js`. Nothing hand-authored | yes |
| `niches/<slug>/og.png` | **Artifact.** 1200×630 raster of the above. What the crawlers actually fetch | yes |

**Why both.** Facebook, X and LinkedIn do not render SVG for `og:image` —
Facebook's spec lists JPG/PNG/GIF, X requires JPG/PNG/WEBP/GIF. Shipping the SVG
means those platforms show *no card at all*, which is worse than no tag. So the
SVG is the parameterised source and the PNG is what ships. Rasterising in the
build would mean a native image dependency in a repo that has none; rasterising
once and committing does not.

**The card is generated entirely from data** — brand name (wrapping to two lines
and dropping 96→78px if long), tagline, `serviceArea.region`, `seo.priceRange`,
and the niche's `--ground` / `--ground-2` / `--ground-deep` / `--accent` /
`--ink` / `--ink-dim` / `--muted` tokens plus all three typefaces.

#### Regenerate whenever any of these change

Brand name · tagline · service area · price range · any palette token · any font
token. If you change one and skip this, the page and its share card disagree.

```
1.  node tools/build-og.js <slug>          # or --all — rewrites og.svg
2.  Rasterise og.svg to og.png at exactly 1200x630, with the niche's webfonts
    loaded. Any headless browser will do; the card must be rendered at CSS
    scale, not device scale, or it comes out at 2x.
3.  node tools/build-site.js <slug> --demo # copies og.png into sites/<slug>/
4.  node tools/qa-site.js <slug>           # asserts the PNG exists and is 1200x630
```

Step 2 is the manual one. `qa-site.js` reads the PNG header directly and **fails**
on a missing file or wrong dimensions, so a forgotten regeneration cannot ship
silently — but it cannot detect a *stale* card whose text no longer matches
`content.json`. Re-run step 1 whenever the data changes and the SVG will tell you:
if `git diff` shows no change to `og.svg`, the PNG is still current.

> Learned the hard way: the first four cards were rasterised from wrappers built
> before a font correction landed, so two rendered in fallback faces — a serif
> where Oswald belonged. Always regenerate the SVG *and* re-rasterise; never
> re-shoot from a stale intermediate.

---

## 9. QA checklist

`node tools/qa-site.js <slug>` runs §9.1–§9.4 and exits non-zero on any failure.
A site is **done to Sawtooth standard** only when all four pass.

### 9.1 Structural

- [ ] `content.json` parses; every §4.1 required field present and non-empty
- [ ] No retired field name (`plans`, `packages`, `author`, `lab`, `cat`), and no
      boolean `best`/`featured`/`popular` on a tier. A **string** `best` is a
      description, not the retired flag — the check tests the type, because
      flagging it blind produced a false positive on both sites converted so far
- [ ] `pricing[].price` is a number; `pricing[].features` is an array; `highlight` is boolean
- [ ] Every §5.1 token defined in `niche.css`; no structural CSS in it
- [ ] `DEFAULT_CONTENT` in the built file is **byte-identical** to `content.json`
- [ ] Every `data-slot` in the built markup rendered — no `{{` left
- [ ] Inline scripts parse (`new vm.Script`); JSON-LD parses
- [ ] No external `<script src>` or `<link rel=stylesheet>` except Google Fonts

### 9.2 Credential sweep — the Item 1 regression guard

Bare-word match, **case-insensitive, no context requirement**, across
**`index.html` and `content.json` both**:

```
/(certified|certification|licen[sc]ed|insured|accredited|bloodborne|award-winning|AWS)/i
/\b\d[\d,]*\+|\b\d+\s*(yrs|years)\b|\bIn\s+20\d\d\b/i
```

Every hit must be either zero, or on the allowlist below. **Any other hit fails
the build.**

> **Why bare-word, no context.** Item 1's targeted greps missed three real
> occurrences across three rounds. `certified welder` ≠ `certified welds`;
> `Licensed & insured` ≠ `Licensed &amp; insured`. A verification regex that
> requires surrounding context silently skips matches near line boundaries — the
> exact bug that let `black-anvil:595` and `:948` through twice.

**Allowlist — verified legitimate, do not re-triage:**

| Pattern | Why it is fine | Seen on |
|---|---|---|
| `$150-$1000+`, `$500 - $15000+`, `$1,000+ / multi-session` | Price ranges | tattoo-studio, contracting |
| `18+`, `18+ only` | Age restriction — a policy | tattoo-studio |
| `72+ hours notice` | Reschedule policy | tattoo-studio |
| `150+ people`, `Wedding · 150+` | Catering capacity tier | bbq-food-truck |
| `licensed-trade tasks`, `licensed sub` | Refers to hiring licensed subs, not a self-claim | contracting |
| `Single-use needles, always` | Operating practice the operator controls | tattoo-studio |
| `%3+`, `stroke-width`, numeric CSS/SVG | Not prose | several |
| `2+ before/after projects` | Developer comment | contracting |

Anything asserting a credential the operator may not hold is a failure, whether it
sits in visible copy, a trust badge, a footer, a `<meta>` tag, JSON-LD, or a JS
render string. **Check render strings specifically** — `summit-stone` and
`sawtooth` both re-appended a claim in JS after the static markup was clean.

### 9.3 Feature parity with the reference

- [ ] **The page actually runs.** `node tools/runtime-check.js <builtDir>` loads
      the built page in headless Chrome and asserts zero console errors **and**
      that `renderContent` really ran. This is a required gate step, not an
      optional extra: every other check in this document reads TEXT, and the
      content values they look for sit in the inlined `DEFAULT_CONTENT` whether
      or not a line of JS executes. Fourteen sites passed the entire checklist
      with renderers that threw on their first line. The check FAILS when it
      cannot launch a browser — an unverified result is not a pass
- [ ] Signature animation present, and all three reduced-motion layers (§7.3)
- [ ] Interactive pricing — a control the visitor changes that updates a displayed
      figure. **Only 3 of 23 have this today** (delivery, moving, landscaping);
      a static price grid does not qualify
- [ ] `scene.svg` present with ≥ 6 defs, slug-prefixed ids
- [ ] FAQ section, owner section, booking/quote form
- [ ] **Consent checkbox** on every form that collects contact details.
      **Injected by the build** from `_template/consent.html` into any form with
      no `*-consent` control, so a converting niche picks it up with no per-site
      work. A niche that already ships one keeps its own wording; the build adds
      only the `/legal/privacy.html` link. Detection accepts any `*-consent` id —
      contracting uses `q-consent`, and a second checkbox is worse than none.
      `base.js` enforces it in the CAPTURE phase so an injected box is gated even
      though that niche's JS knows nothing about it; it does not stopPropagation,
      and supplies wording only if the niche handler set none. Enforcement is
      uniform, copy is not overridden. Was missing on 13 of 23 at Phase 1 start.
- [ ] All §8 head items present

### 9.4 Rendering and accessibility

- [ ] No horizontal overflow at 360 px
- [ ] Tap targets ≥ 44 px
- [ ] Contrast per §5.3
- [ ] Visible focus ring on every interactive element
- [ ] With JS disabled: hero, services, pricing, FAQ and footer all render
      (build-time rendering makes this automatic — it is currently broken on
      sites whose `#svcGrid`/`#priceGrid`/`#faqList` are empty containers)
- [ ] `info@kingdom-creatives.com` is the only address in `leadEmail`; the visible
      brand address is the niche persona's

---

## 10. Known deviations and open decisions

| Item | State |
|---|---|
| **`dj`** | Structural outlier — `DEFAULT_SITE`/`DOM` instead of `DEFAULT_CONTENT`/`CONTENT`, a 3-theme kit with no root `content.json`, 0% fn overlap with the reference. Also calls an **unpinned `api.allorigins.win` proxy** at `:1383` in each theme. Decide: normalise, or exempt and hand-maintain |
| **Demo persona emails** | Per decision D‑3, demo brands keep fictional addresses; the rule binds SBV-owned surfaces. `contracting` and `metal-fabrication` still carry `@example.com` with an unresolved `// SWAP: real lead inbox` |
| **`og:image`** | Absent on all 23 and on the reference. Item 4 |
| **Operator agreement** | Live at `/legal/operator-agreement.html`, deliberately unlinked until Phase 2 sets the territory model |
| **`sites/index.html` → `/pricing/`** | Links through a `vercel.json` 301 to `/#websites`. Works; one redundant hop |

---

## 11. Niche brief format

`niches/<slug>/brief.md`, 10–15 lines, filled before generation:

```markdown
slug:          dumpster-rental
business:      Sawtooth Dumpster Co.
tagline:       No quote games. The price is the price.
city:          Nampa, ID
palette:       safety yellow on deep forest; ink #0e1f18, accent #ffc400
type:          Anybody / Inter / IBM Plex Mono
price anchors: 10yd $299, 15yd $349, 20yd $399, +$45/extra day
differentiators: flat rate incl. delivery+pickup+2 tons; next-day; driveway-safe
tone:          blue-collar direct
scene:         roll-off box on a ridge, safety-yellow, morning light
animation:     damped-spring drop, box settles into place
interactive:   size × duration × rush → live price
licensing:     none in most states — kit flags DOT/landfill accounts
niche data:    sizes[], durations[], terms{includedTons, overagePerTon, rushFee}
```
