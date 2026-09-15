#!/usr/bin/env node
'use strict';
/* check-pages.js — structural and compliance gate over the marketing pages.
 *
 * WHY THIS EXISTS. build-catalog.js already proves no catalog COUNT is typed
 * by hand. This proves the rest: that every page carries the disclaimer, the
 * analytics tag, a canonical, and the shared chrome — and that no page carries
 * a forbidden string. The failure it exists to prevent is the one the audit
 * found: prose drifting away from data with nothing watching.
 *
 * Static text inspection only. No browser, no network. a11y-sweep.js owns the
 * rendered checks.
 *
 *   node tools/check-pages.js          exit 0 clean, 1 on failure
 *   node tools/check-pages.js --list   print registered routes
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* Every public marketing page. A page task is not done until its route is
   here and this file exits 0. */
const PAGES = [
  { route: '/',       file: 'index.html',       sharedAssets: true },
  { route: '/sites/', file: 'sites/index.html', sharedAssets: true },
  { route: '/platforms/', file: 'platforms/index.html', sharedAssets: true },
  { route: '/services/', file: 'services/index.html', sharedAssets: true },
  { route: '/work/', file: 'work/index.html', sharedAssets: true },
  { route: '/about/', file: 'about/index.html', sharedAssets: true },
];

const DISCLAIMER = 'makes no representation about income, revenue, profit, or results';

/* Ruling R9 — sentences that legitimately contain a banned substring BECAUSE
   they are the disclaimer of that very thing. Stripped before the FORBIDDEN
   scan, or the gate flags the copy that exists to protect us: "I make no claim
   about what you will earn" contains "you will earn".
   Whole sentences only, never fragments — an over-broad entry here would hide
   a real claim, and this list is meant to be auditable at a glance. */
const EXEMPT = [
  'I make no claim about what you will earn',
  'makes no representation about income, revenue, profit, or results',
  'We will not answer that, and you should be wary of anyone who does',
];

/* Substrings no page may contain. Each carries the reason, because a future
   reader deserves to know why a string is banned rather than guessing. */
const FORBIDDEN = [
  ['Interstate V2',    'employer work — never on this site'],
  ['GS Travel Planner','employer work — never on this site'],
  ['Command Center',   'employer work — the /work/ card was removed'],
  ['AI-powered',       'buzzword; /services/ states the process as fact instead'],
  ['guaranteed income','income claim'],
  ['you will earn',    'income claim'],
  ['average operator', 'income claim + fabricated proof'],
];

/* Spelled-out counts that were wrong on the homepage for months. Banning the
   words is cruder than checking the numbers, and that is the point: a count
   belongs in data, so a spelled-out one in prose is the bug. */
const BANNED_COUNTS = [
  'twenty-three sites', 'twenty-three trades', 'twenty-seven entries',
  'twenty-nine I have not built', 'Two of these are finished',
];

/* Ruling R5: failures are counted PER PAGE as well as in total, so a page
   that just failed a check cannot also print an "ok" line. A gate whose own
   output contradicts itself is the exact failure this project exists to fix. */
let failures = 0;
let pageFailures = 0;
const bad = (route, msg) => { failures++; pageFailures++; console.log(`  FAIL  ${route}  ${msg}`); };
const ok  = (route, msg) => console.log(`  ok    ${route}  ${msg}`);

if (process.argv.includes('--list')) {
  PAGES.forEach(p => console.log(p.route + '  ' + p.file));
  process.exit(0);
}

for (const page of PAGES) {
  pageFailures = 0;
  const abs = path.join(ROOT, page.file);
  if (!fs.existsSync(abs)) { bad(page.route, `missing file ${page.file}`); continue; }
  const html = fs.readFileSync(abs, 'utf8');

  if (!html.includes(DISCLAIMER)) bad(page.route, 'footer disclaimer missing');
  if (!/data-i18n-skip/.test(html)) bad(page.route, 'disclaimer missing data-i18n-skip');
  if (!html.includes('/_vercel/insights/script.js')) bad(page.route, 'analytics tag missing');
  if (!/<link rel="canonical" href="https:\/\/systemsbyvega\.com/.test(html))
    bad(page.route, 'canonical missing or not absolute');
  if (!/<!-- BUILD:NAV -->/.test(html))    bad(page.route, 'no BUILD:NAV marker');
  if (!/<!-- BUILD:FOOTER -->/.test(html)) bad(page.route, 'no BUILD:FOOTER marker');

  /* Ruling R11: sharedAssets is a declared, reasoned exception, not silence.
     A page that opts out still gets a line on every run, so the debt stays
     visible instead of disappearing the way the missing /sites/ disclaimer
     once did. */
  if (page.sharedAssets) {
    if (!html.includes('/assets/sbv.css')) bad(page.route, 'does not load /assets/sbv.css');
    if (!html.includes('/assets/sbv.js'))  bad(page.route, 'does not load /assets/sbv.js');
  } else {
    console.log(`  pend  ${page.route}  shared assets deferred — ${page.pending}`);
  }

  /* Strip the exempt sentences before scanning (Ruling R9). */
  let scan = html;
  for (const e of EXEMPT) scan = scan.split(e).join('');

  for (const [s, why] of FORBIDDEN) {
    if (scan.includes(s)) bad(page.route, `forbidden string "${s}" — ${why}`);
  }
  for (const s of BANNED_COUNTS) {
    if (html.includes(s)) bad(page.route, `stale hand-typed count "${s}"`);
  }
  if (pageFailures === 0) ok(page.route, 'structure + compliance');
}

/* work/projects.json renders straight onto /work/ (wkCardHtml/wkFillModal in
   assets/sbv.js) but, as a JSON data file rather than an HTML page, was never
   in the PAGES loop above — a forbidden string typed into a project's
   tagline or description would ship silently. Same FORBIDDEN list and EXEMPT
   stripping; the structural checks (disclaimer, canonical, BUILD markers)
   do not apply to a data file, so only the string scans run here. */
{
  const route = 'work/projects.json';
  const abs = path.join(ROOT, 'work', 'projects.json');
  pageFailures = 0;
  if (!fs.existsSync(abs)) {
    bad(route, 'missing file work/projects.json');
  } else {
    let scan = fs.readFileSync(abs, 'utf8');
    for (const e of EXEMPT) scan = scan.split(e).join('');
    for (const [s, why] of FORBIDDEN) {
      if (scan.includes(s)) bad(route, `forbidden string "${s}" — ${why}`);
    }
    for (const s of BANNED_COUNTS) {
      if (scan.includes(s)) bad(route, `stale hand-typed count "${s}"`);
    }
    if (pageFailures === 0) ok(route, 'forbidden-string scan');
  }
}

/* ── THE PRICE GUARD ───────────────────────────────────────────────────────
   The defect this exists to prevent: "$99" is typed by hand ten times on /,
   twenty-six times on /sites/ and once in the Terms, while the number itself
   lives in exactly one place — PRICE in assets/catalog-render.js. Change the
   constant and the prose keeps quoting the old figure, which is the count bug
   that build-catalog already prevents, wearing a dollar sign.

   Nine BUILD markers would be heavier than the problem and nobody maintains
   them. So this is the forbidden-string scan turned inside out: on a page that
   sells, every dollar amount must be one we can NAME the source of. Anything
   else is a hand-typed price and the gate goes red.

   Three legitimate sources, in descending order of trust:
     1. PRICE, read out of assets/catalog-render.js — the single source.
     2. Every amount inside a price_label in assets/data/niches.seed.json —
        the sibling platforms' own prices, which are data, not prose.
     3. ALLOWED_PRICES below — the short, reasoned literal list, same shape
        and same discipline as FORBIDDEN.
   Budget bands ($5k, $40k+) are not prices: AMOUNT_RE's lookahead rejects an
   amount followed by k or m, and one followed by a further digit or separator
   so a partial match can never be read as a whole one. */
const PRICE_SRC = 'assets/catalog-render.js';
const SEED_SRC  = 'assets/data/niches.seed.json';

/* Prices that are real, hand-typed, and not ours to source from PRICE. Each
   carries its reason, because a future reader deserves to know why an amount
   is waved through rather than guessing. */
const ALLOWED_PRICES = [
  ['$25',  'Care Plan, monthly — legal/terms.html section 3 and section 5'],
  ['$299', 'services/ HTML comment contrasting us with a template shop; not our price'],
];

/* Every surface whose text a buyer reads before or after paying. Wider than
   PAGES on purpose: the Terms quote the price too, and a Terms page quoting a
   stale price is worse than a landing page doing it — and the shared JS at the
   end renders price strings straight into those same pages, so a figure typed
   there ships exactly like a figure typed in the HTML. */
const PRICE_PAGES = [
  'index.html', 'sites/index.html', 'platforms/index.html',
  'services/index.html', 'work/index.html', 'about/index.html',
  'legal/terms.html', 'legal/refund.html', 'legal/privacy.html',
  'legal/operator-agreement.html',
  'assets/catalog-render.js', 'assets/sbv.js', 'assets/lang/es.js',
];

/* Pages that must actually STATE the price. Without this the guard would be
   satisfied by deleting every mention, which is not the same as being right. */
const MUST_STATE_PRICE = ['index.html', 'sites/index.html', 'legal/terms.html'];

const AMOUNT_RE = /\$\d[\d,]*(?:\.\d{2})?(?![\d.,]|\s*[kKmM]\b)/g;

{
  const route = 'price guard';
  pageFailures = 0;

  let price = null;
  const priceAbs = path.join(ROOT, PRICE_SRC);
  if (!fs.existsSync(priceAbs)) {
    bad(route, `missing price source ${PRICE_SRC}`);
  } else {
    const m = fs.readFileSync(priceAbs, 'utf8').match(/\bPRICE\s*=\s*'(\$[\d,]+(?:\.\d{2})?)'/);
    if (!m) bad(route, `could not read PRICE out of ${PRICE_SRC}`);
    else price = m[1];
  }

  /* Seed amounts are data. Reading them here rather than listing them means a
     sibling's price can change without anybody having to remember this file. */
  const seedAmounts = new Set();
  const seedAbs = path.join(ROOT, SEED_SRC);
  if (!fs.existsSync(seedAbs)) {
    bad(route, `missing seed ${SEED_SRC}`);
  } else {
    let seed;
    try { seed = JSON.parse(fs.readFileSync(seedAbs, 'utf8')); }
    catch (e) { bad(route, `${SEED_SRC} is not valid JSON — ${e.message}`); seed = []; }
    const rows = Array.isArray(seed) ? seed : (seed.niches || []);
    for (const row of rows) {
      const label = row && row.price_label;
      if (typeof label !== 'string') continue;
      for (const a of label.match(AMOUNT_RE) || []) seedAmounts.add(a);
    }
  }

  if (price) {
    const allowed = new Map();
    allowed.set(price, `PRICE in ${PRICE_SRC}`);
    for (const a of seedAmounts) if (!allowed.has(a)) allowed.set(a, `price_label in ${SEED_SRC}`);
    for (const [a, why] of ALLOWED_PRICES) if (!allowed.has(a)) allowed.set(a, why);

    for (const file of PRICE_PAGES) {
      const abs = path.join(ROOT, file);
      if (!fs.existsSync(abs)) { bad(route, `missing file ${file}`); continue; }
      const html = fs.readFileSync(abs, 'utf8');

      const unsourced = new Map();
      for (const a of html.match(AMOUNT_RE) || []) {
        if (allowed.has(a)) continue;
        unsourced.set(a, (unsourced.get(a) || 0) + 1);
      }
      for (const [a, n] of unsourced) {
        bad(route, `${file} states ${a}${n > 1 ? ' \u00d7' + n : ''} — not ${price} ` +
                   `(${PRICE_SRC}) and not in the seed or ALLOWED_PRICES`);
      }

      if (MUST_STATE_PRICE.includes(file) && !html.includes(price)) {
        bad(route, `${file} never states ${price} — the price guard is not ` +
                   `satisfied by removing the price`);
      }
    }
  }

  if (pageFailures === 0) {
    ok(route, `every price on ${PRICE_PAGES.length} surface(s) traces to ${price} or to data`);
  }
}

console.log(failures ? `\n${failures} failure(s)`
                     : `\n${PAGES.length} page(s) + projects.json + the price guard clean`);
process.exit(failures ? 1 : 0);
