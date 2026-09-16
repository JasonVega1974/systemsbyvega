#!/usr/bin/env node
/* ============================================================================
   build-catalog.js — pre-render the catalog into index.html (and hand
   its figures to every page that still needs one)
   ----------------------------------------------------------------------------
   Reads assets/data/niches.seed.json and writes the finished catalog markup,
   the niche <select>, the inline seed, and every masthead figure between
   BUILD: markers. R16 moved the catalog board back onto index.html and
   deleted sites/index.html; platforms/, services/, work/ and claim/ each
   still need a subset of the same figures, so this file targets them too.

   WHY THIS EXISTS. The catalog is the product; it must be in the HTML. If the
   page drew itself from JavaScript, a visitor with JS disabled or a script that
   threw early would get an empty page — which is exactly the failure the demo
   sites under /sites/ carried before this task (their #svcGrid, #priceGrid and
   #faqList rendered as empty containers with JS off).

   It also means NO COUNT IS EVER TYPED BY HAND. "38 businesses listed" and
   "Three are open today" are computed from the seed on every build. An earlier
   homepage claimed nine shipped projects while the portfolio rendered eleven,
   because both numbers were written out by a person. This removes that class
   of error entirely.

   Ruling R1 — one marker set per file. inject() throws on a marker a file
   does not declare, so each target below names exactly what it carries.
   index.html carries TOTAL/OPEN/SITES for its proof strip, SITES_STEP for
   the one remaining prose "32" in #how, and — since R16 — CATALOG,
   NICHE_SELECT and EXTRAS_SCRIPT, the three that came across from the
   deleted sites/index.html when the board and the registry form moved onto
   the landing page. SITES_ALL and SITES_GRID left with the #sites band they
   fed, which was the second, flatter listing of the same thirty-two rows.

   Run:  node tools/build-catalog.js          (from the repo root)
         node tools/build-catalog.js --check  (verify, write nothing; CI-safe)
   ========================================================================= */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const SEED   = path.join(ROOT, 'assets', 'data', 'niches.seed.json');
const MANIFESTS = path.join(ROOT, 'assets', 'data', 'manifests.json');
const R      = require(path.join(ROOT, 'assets', 'catalog-render.js'));
const { inject } = require('./lib/inject');

const CHECK = process.argv.includes('--check');

/* Several files, different marker sets. The catalog is back on `/` after
   R16, and the landing page's proof strip still needs its three
   figures — and those figures must come from the same R.figures() call as
   everything else, or the landing page becomes a fourth place a count is
   written down. platforms/index.html only ever needed the seed script, which
   it used to carry by hand (see the removed TODO there). inject() throws on a
   missing marker, so each target names exactly what it carries. */
const TARGETS = [
  /* R16 folded /sites/ into the landing page, so index.html carries the
     catalog board's markers now — CATALOG, NICHE_SELECT and EXTRAS_SCRIPT all
     moved here from the deleted sites/index.html target. SITES_GRID and
     SITES_ALL went the other way: the flat #sites grid they fed WAS the
     duplicate the board replaces, so both markers left the file and this
     list with it. */
  { file: path.join(ROOT, 'index.html'),
    markers: ['TOTAL', 'OPEN', 'SITES', 'SITES_STEP', 'HERO_DEMO_BTN',
              'CATALOG', 'NICHE_SELECT', 'SEED_SCRIPT', 'EXTRAS_SCRIPT',
              'INCLUDED', 'PATH_INCLUDED'] },
  { file: path.join(ROOT, 'platforms', 'index.html'),
    markers: ['SEED_SCRIPT', 'PLAT_INLINE'] },
  /* Finding 3 of the final whole-branch review: three more pages hand-typed
     counts the project already ruled indefensible for the landing page
     (Ruling R20). Same fix, same reasoning — a marker fed from the one
     R.figures() call, so these cannot print a number that disagrees with
     the catalog a click away. */
  { file: path.join(ROOT, 'services', 'index.html'),
    markers: ['SVC_SITES'] },
  { file: path.join(ROOT, 'work', 'index.html'),
    markers: ['WK_SITES'] },
  /* Task 12b: /claim/?niche=<slug> validates the query string against this
     same seed before ever calling window.initClaim() — the R4 preview
     overlay's own pattern, applied to a page that takes payment instead of
     just opening a demo. Seed only; claim/index.html has no catalog board
     of its own to re-render, so it needs nothing else from build-catalog.js. */
  { file: path.join(ROOT, 'claim', 'index.html'),
    markers: ['SEED_SCRIPT'] },
];

/* ------------------------------------------------------------- validation */
/* A bad seed should stop the build, not ship a wrong catalog. */
function validate(seed) {
  const errs = [];
  const slugs = new Set();
  const cats  = new Set();
  const famKeys = new Set(seed.families.map(f => f.key));
  const famCode = Object.fromEntries(seed.families.map(f => [f.key, f.code]));

  seed.niches.forEach(n => {
    const at = n.slug || '(no slug)';
    if (slugs.has(n.slug)) errs.push(`duplicate slug: ${n.slug}`);
    slugs.add(n.slug);
    if (cats.has(n.catalog_no)) errs.push(`duplicate catalog_no: ${n.catalog_no}`);
    cats.add(n.catalog_no);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.slug || '')) errs.push(`bad slug: ${at}`);
    if (!famKeys.has(n.family)) errs.push(`${at}: unknown family "${n.family}"`);
    if (famCode[n.family] && n.catalog_no.split('-')[0] !== famCode[n.family]) {
      errs.push(`${at}: catalog_no "${n.catalog_no}" does not match family code "${famCode[n.family]}"`);
    }
    if (!['open', 'in_line', 'website_only'].includes(n.status)) errs.push(`${at}: bad status "${n.status}"`);

    // an open business must have somewhere to send people, and only an open one may
    if ((n.status === 'open') !== (n.open_url != null)) {
      errs.push(`${at}: open_url must be set if and only if status is "open"`);
    }
    // never offer a website preview we cannot show
    if (n.website_offer && !n.demo_path) errs.push(`${at}: website_offer with no demo_path`);
    if (!n.job_line) errs.push(`${at}: missing job_line`);

    // compliance tripwire: no figure that could read as an earnings claim
    const money = /\$[\d,]+/g;
    const fields = [n.job_line, n.caveat].filter(Boolean).join(' ');
    if (money.test(fields)) errs.push(`${at}: dollar figure in job_line/caveat — prices belong in price_label`);
  });

  // every demo_path must actually exist on disk
  seed.niches.forEach(n => {
    if (!n.demo_path) return;
    const p = path.join(ROOT, n.demo_path.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(p)) errs.push(`${n.slug}: demo_path ${n.demo_path} has no index.html on disk`);
  });

  return errs;
}

/* --------------------------------------------------------------- extras */
/* window.SBV_EXTRAS: a slug-keyed lookup of things that describe the demo
   ARTIFACT on disk (a brand name picked for the mockup, the feature chips a
   template happens to ship with) rather than the business's commercial state.
   Those can never become sbv_niches columns — see assets/catalog-render.js's
   header — so they travel next to the seed instead, read by both the build
   and the runtime re-render off the same file, same as SBV_SEED itself. */
const SECTION_LABEL = {
  pricing:      'Pricing tiers',
  beforeAfter:  'Before/after gallery',
  jobDetails:   'Job detail cards',
  reviews:      'Reviews',
  social:       'Social links',
  ownerBlock:   'Owner profile',
  footerContact:'Contact footer'
};

function buildExtras(seed) {
  let manifests = {};
  try { manifests = JSON.parse(fs.readFileSync(MANIFESTS, 'utf8')); }
  catch (e) { /* no manifest data — extras degrade to brand-only or empty */ }

  const extras = {};
  seed.niches.forEach(n => {
    if (!n.demo_path) return;
    const dirSlug = n.demo_path.replace(/^\/sites\//, '').replace(/\/$/, '');
    const contentPath = path.join(ROOT, 'sites', dirSlug, 'content.json');

    let brand = null;
    try {
      const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
      brand = (content.brand && content.brand.name) || null;
    } catch (e) { /* no content.json — brand stays unset, the card still renders */ }

    const sections = (manifests[dirSlug] && manifests[dirSlug].sections) || {};
    const chips = Object.keys(SECTION_LABEL)
      .filter(k => sections[k])
      .map(k => SECTION_LABEL[k]);
    if (n.website_offer) chips.push('Owner admin panel (live CMS)');

    /* R12 — the accent-gradient placeholder's colour data, straight off the
       SAME manifests object already loaded above for `sections`. Never a
       second read, never a hand-copied hex: catalog-render.js's shotBg()
       only ever sees what lands in this lookup. A niche whose manifest has
       no theme (or an incomplete one) simply gets no ground/accent/text
       here, and shotBg() falls back to the existing neutral placeholder --
       it is never handed the literal string "undefined". */
    const theme = manifests[dirSlug] && manifests[dirSlug].theme;
    /* The exact path shot() in catalog-render.js emits for this niche. If it
       is not on disk, the build must not emit an <img> pointing at it -- a
       missing file is caught here, at build time, not as a 404 a visitor
       causes. */
    const shotPath = path.join(ROOT, 'assets', 'shots', 'rotator', n.slug + '.jpg');
    const noShot = !fs.existsSync(shotPath);

    if (brand || chips.length || (theme && theme.ground && theme.accent) || noShot) {
      extras[n.slug] = {};
    }
    if (brand) extras[n.slug].brand = brand;
    if (chips.length) extras[n.slug].chips = chips;
    if (theme && theme.ground && theme.accent) {
      extras[n.slug].ground = theme.ground;
      extras[n.slug].accent = theme.accent;
      if (theme.text) extras[n.slug].text = theme.text;
    }
    if (noShot) extras[n.slug].noShot = true;
  });
  return extras;
}

/* -------------------------------------------------------------------- run */
function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

  const errs = validate(seed);
  if (errs.length) {
    console.error('SEED INVALID — nothing written:\n' + errs.map(e => '  · ' + e).join('\n'));
    process.exit(1);
  }

  const fig    = R.figures(seed.niches);
  const extras = buildExtras(seed);

  const seedScript =
    '\n<script>window.SBV_SEED=' +
    JSON.stringify({ families: seed.families, niches: seed.niches }) +
    ';</script>\n';
  const extrasScript =
    '\n<script>window.SBV_EXTRAS=' + JSON.stringify(extras) + ';</script>\n';

  /* Every value ANY target might ask for, built once from the one R.figures()
     call — so index.html and platforms/index.html cannot
     print three different counts for the same seed. Each target's own
     `markers` list decides which of these it actually receives. */
  const VALUES = {
    THESIS_OPEN:  R.thesisOpen(fig.open),
    TOTAL:        String(fig.total),
    OPEN:         String(fig.open),
    SITES:        String(fig.sites),
    /* Ruling R20 gave index.html distinct marker names for each prose spot
       that prints the site count, because inject() splices between the FIRST
       open/close pair and so a name cannot repeat in one file. R16 deleted
       the #sites band and SITES_ALL with it; SITES_STEP ("32 built and
       live…" in #how) is the one that remains, still fed this same fig. */
    SITES_STEP:   String(fig.sites),
    /* Finding 3: services/index.html and work/index.html each print the
       site count once in prose; platforms/index.html prints the in-line
       count right above the chips that already render it. All three fed
       from this same fig, never typed by hand a second time. */
    SVC_SITES:    String(fig.sites),
    WK_SITES:     String(fig.sites),
    PLAT_INLINE:  String(fig.inLine),
    /* The hero's "See a live demo" button, generated for its data-slug and
       for nothing else. R14 replaced the rotating screenshots with one
       static photograph; the rotator used to write that attribute at
       runtime, and a button whose slug names no seed row opens nothing and
       reports nothing. R.heroDemoBtn() takes the first niche in this same
       seed that has a demo_path, so the first demo is recorded once, here,
       and never typed into index.html. */
    HERO_DEMO_BTN: R.heroDemoBtn(seed.niches),
    /* The same list on `/` and `/sites/`, from one function, so the two
       cannot drift apart the way two hand-kept copies would. */
    INCLUDED:     '\n' + R.included() + '\n',
    /* R15's self-serve card, two bands above #offer, names the first four of
       that same list. Fed from the same INCLUDED array through
       R.includedBrief() so the short version can never advertise something
       the full one below it has stopped shipping — see the function's own
       note in assets/catalog-render.js. */
    PATH_INCLUDED: '\n' + R.includedBrief(4) + '\n',
    /* The catalog board — plates, cards, chips and all — now on `/`. It is
       the ONLY listing of the thirty-two on that page: R16 deleted the flat
       SITES_GRID band it used to sit alongside on /sites/, because the board
       and the grid were the same thirty-two rows twice on one page.
       Server-rendered for the same reason it always was: with JavaScript off
       the board is still the whole board. */
    CATALOG:      '\n' + R.catalog(seed.families, seed.niches, {}, extras) + '\n',
    NICHE_SELECT: '\n' + R.nicheSelect(seed.niches) + '\n',
    SEED_SCRIPT:  seedScript,
    EXTRAS_SCRIPT: extrasScript
  };

  let anyDrift = false;

  TARGETS.forEach(target => {
    const label = path.relative(ROOT, target.file);
    let html = fs.readFileSync(target.file, 'utf8');
    const before = html;

    target.markers.forEach(marker => {
      html = inject(html, marker, VALUES[marker], label);
    });

    if (CHECK) {
      if (before !== html) {
        console.error(`${label} is out of date with the seed.`);
        anyDrift = true;
      } else {
        console.log(`${label} is in sync with the seed.`);
      }
      return;
    }

    fs.writeFileSync(target.file, html);
    console.log(`built ${label} from seed`);
  });

  if (CHECK) {
    if (anyDrift) {
      console.error('Run: node tools/build-catalog.js');
      process.exit(1);
    }
    return;
  }

  console.log(`  ${fig.total} listed · ${fig.open} open · ${fig.inLine} in line · ${fig.websiteOnly} website-only`);
  console.log(`  ${seed.families.length} family plates`);
}

main();
