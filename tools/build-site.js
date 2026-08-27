#!/usr/bin/env node
/* tools/build-site.js — build one SiteLab niche into a single self-contained page.
 *
 *   node tools/build-site.js <slug> [--out <dir>] [--demo]
 *
 * Inputs   _template/{index.html,base.css,base.js,consent.html}
 *          niches/<slug>/{content.json,niche.css,sections.css,niche.js,
 *                         sections.html,scene.svg,scene.js,og.png}
 * Outputs  <out>/index.html   one file, no runtime dependency but Google Fonts
 *          <out>/content.json copied verbatim, so the runtime fetch still works
 *          <out>/og.png       the share card
 *
 * Why a build step exists: see SITELAB_TEMPLATE.md §2. A content value is authored
 * once, in content.json. DEFAULT_CONTENT and the rendered markup are generated
 * from it, so the three copies in the shipped file cannot drift.
 *
 * Zero dependencies. Node 18+.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const outFlag = args.indexOf('--out');
const isDemo = args.includes('--demo');

if (!slug) {
  console.error('usage: node tools/build-site.js <slug> [--out <dir>] [--demo]');
  process.exit(2);
}

const TPL = path.join(REPO, '_template');
const SRC = path.join(REPO, 'niches', slug);
const OUT = outFlag > -1 ? path.resolve(args[outFlag + 1]) : path.join(REPO, 'sites', slug);

const read = p => {
  if (!fs.existsSync(p)) { console.error('missing input: ' + path.relative(REPO, p)); process.exit(1); }
  return fs.readFileSync(p, 'utf8');
};

const shell      = read(path.join(TPL, 'index.html'));
const baseCss    = read(path.join(TPL, 'base.css'));
const baseJs     = read(path.join(TPL, 'base.js'));
const nicheCss   = read(path.join(SRC, 'niche.css'));
const nicheJs    = read(path.join(SRC, 'niche.js'));
const sceneSvg   = read(path.join(SRC, 'scene.svg'));
const sceneJs    = read(path.join(SRC, 'scene.js'));
let   sections   = read(path.join(SRC, 'sections.html'));
const sectionCss = fs.existsSync(path.join(SRC, 'sections.css'))
  ? fs.readFileSync(path.join(SRC, 'sections.css'), 'utf8') : '';
const contentRaw = read(path.join(SRC, 'content.json'));

/* ---- consent control (§9.3) --------------------------------------------
 * A form that collects a phone number for follow-up needs consent. Injected
 * here rather than authored per niche, so the sites that lack one pick it up
 * the moment they convert. Detection accepts ANY *-consent id: contracting
 * uses q-consent, and a second checkbox would be worse than none.
 */
{
  const hasConsent = /id="[a-z]*-?consent"/i.test(sections);
  if (/<form/i.test(sections) && !hasConsent) {
    const snippet = read(path.join(TPL, 'consent.html')).replace(/^<!--[\s\S]*?-->\s*/, '');
    const honey = /(\n[ \t]*<!-- spam honeypot[\s\S]*?<input[^>]*_honey[^>]*>)/i;
    if (honey.test(sections)) {
      sections = sections.replace(honey, () => '\n' + snippet + RegExp.$1);
    } else if (/<button[^>]*type="submit"/i.test(sections)) {
      sections = sections.replace(/(\n[ \t]*<button[^>]*type="submit")/i, (m) => '\n' + snippet + m);
    } else {
      sections = sections.replace(/(<\/form>)/i, (m) => snippet + '\n' + m);
    }
    console.log('  consent control injected');
  } else if (hasConsent && !/legal\/privacy\.html/.test(sections)) {
    // Keep the niche's own wording; append the privacy link only.
    sections = sections.replace(
      /(<label class="consent">[\s\S]*?)(<\/span>)/i,
      (m, a, b) => a + ' See our <a href="/legal/privacy.html">privacy policy</a>.' + b);
    console.log('  privacy link added to existing consent');
  }
}

let content;
try { content = JSON.parse(contentRaw); }
catch (e) { console.error('content.json does not parse: ' + e.message); process.exit(1); }

const seo = content.seo || {};
/* priceRange is NOT required: 13 of 23 originals have none, and inventing one
   puts a number we made up into the operator's structured data. Absent is fine. */
const REQUIRED_SEO = ['title', 'description', 'ogTitle', 'ogDescription', 'schemaType', 'canonical', 'themeColor'];
const missing = REQUIRED_SEO.filter(k => !seo[k]);
if (missing.length) { console.error('content.json seo is missing: ' + missing.join(', ')); process.exit(1); }

/* ---- JSON-LD, generated from the same data the page renders ------------ */
function buildJsonLd() {
  const b = content.brand || {};
  const sa = content.serviceArea || {};
  const ld = {
    '@context': 'https://schema.org',
    '@type': seo.schemaType,
    name: b.name || '',
    description: seo.description,
    telephone: '+1' + String(b.phone || '').replace(/[^0-9]/g, ''),
    email: b.email || '',
    areaServed: sa.region || b.city || ''
  };

  /* Use the source's value when it had one — including schema.org's price-TIER
     forms ("$", "$$"). Otherwise derive from pricing[]. Otherwise omit: an
     absent priceRange is honest, an invented one is not. */
  const CUR = String.fromCharCode(36);
  let pr = seo.priceRange;
  if (!pr) {
    const nums = (content.pricing || [])
      .flatMap(p => [p.price, p.priceHigh])
      .filter(n => typeof n === 'number');
    if (nums.length) pr = CUR + Math.min(...nums) + '-' + CUR + Math.max(...nums);
  }
  if (pr) ld.priceRange = pr;
  if (b.tagline) ld.slogan = b.tagline;

  // makesOffer whenever the niche exposes priced items
  const offers = [];
  (content.pricing || []).forEach(p => {
    if (p && p.label != null && p.price != null) {
      offers.push({ '@type': 'Offer', name: String(p.label), price: String(p.price), priceCurrency: 'USD' });
    }
  });
  (((content.niche || {}).sizes) || content.sizes || []).forEach(s => {
    if (s && s.yd != null && s.price != null) {
      offers.push({ '@type': 'Offer', name: s.yd + ' Yard Roll-Off', price: String(s.price), priceCurrency: 'USD' });
    }
  });
  if (offers.length) ld.makesOffer = offers;
  return JSON.stringify(ld, null, 2);
}

/* ---- demo chrome -------------------------------------------------------
 * The "Demo — this site is for sale" banner is deploy-time chrome for our own
 * catalogue, not niche content: it wears SBV brand colours, not niche tokens.
 * It ships only with --demo, so a buyer's build never carries it and the clone
 * tool has nothing to strip.
 */
const DEMO_BANNER = `<div id="svDemoBanner" role="note" aria-label="Demo site notice">
  <span class="svDemoBanner__dot" aria-hidden="true"></span>
  <span>Demo — this site is for sale</span>
  <a href="/sites/">View all sites →</a>
</div>
<style>
#svDemoBanner{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 9px;background:#161B22;color:#fff;font-family:'IBM Plex Mono',ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.01em;padding:9px 16px;border-radius:20px;border:1px solid #323A48;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:calc(100vw - 24px);text-align:center}
#svDemoBanner .svDemoBanner__dot{width:7px;height:7px;border-radius:50%;background:#F3922F;flex:none}
#svDemoBanner a{color:#F3922F;font-weight:700;text-decoration:none}
#svDemoBanner a:hover{text-decoration:underline}
@media(max-width:820px){#svDemoBanner{bottom:78px;font-size:11.5px;padding:8px 14px}}
</style>`;

/* ---- assemble ---------------------------------------------------------- */
const subs = {
  SLUG: slug,
  ROBOTS: isDemo ? '<meta name="robots" content="noindex">' : '',
  DEMO_BANNER: isDemo ? DEMO_BANNER : '',
  SEO_TITLE: seo.title,
  SEO_DESCRIPTION: seo.description,
  SEO_THEME_COLOR: seo.themeColor,
  SEO_CANONICAL: seo.canonical,
  SEO_OG_TITLE: seo.ogTitle,
  SEO_OG_DESCRIPTION: seo.ogDescription,
  SEO_OG_IMAGE: seo.ogImage || (seo.canonical.replace(/\/$/, '') + '/og.png'),
  FAVICON: seo.favicon || '',
  FONTS_HREF: seo.fontsHref || '',
  JSON_LD: buildJsonLd(),
  NICHE_CSS: nicheCss.trim(),
  BASE_CSS: baseCss.trim(),
  SECTIONS_CSS: sectionCss.trim(),
  SCENE_SVG: sceneSvg.trim(),
  SECTIONS: sections.trim(),
  DEFAULT_CONTENT: JSON.stringify(content, null, 2),
  NICHE_JS: nicheJs.trim(),
  SCENE_JS: sceneJs.trim(),
  BASE_JS: baseJs.trim()
};

/* split/join, never replace(): a replacement STRING containing $ is interpreted
   by replace() as a special pattern. That corrupted this very file once —
   $' expanded to "everything after the match" and duplicated the whole tail. */
let out = shell;
for (const [k, v] of Object.entries(subs)) {
  out = out.split('{{' + k + '}}').join(v == null ? '' : String(v));
}

const leftover = out.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) { console.error('unresolved placeholders: ' + [...new Set(leftover)].join(', ')); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), out, 'utf8');
fs.writeFileSync(path.join(OUT, 'content.json'), contentRaw, 'utf8');

/* The share card. og.png is a COMMITTED ARTIFACT rasterised from og.svg — see
   SITELAB_TEMPLATE.md §8.1. Facebook, X and LinkedIn do not render SVG for
   og:image, so the PNG is what ships and what the <head> points at. */
const ogPng = path.join(SRC, 'og.png');
if (fs.existsSync(ogPng)) {
  fs.copyFileSync(ogPng, path.join(OUT, 'og.png'));
} else {
  console.warn('  ! no og.png for ' + slug + ' — run: node tools/build-og.js ' + slug + ', then rasterise (§8.1)');
}

const rel = p => path.relative(REPO, p).replace(/\\/g, '/');
console.log('built ' + slug);
console.log('  ' + rel(path.join(OUT, 'index.html')) + '  ' + out.split('\n').length + ' lines, ' +
            (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1) + ' KB');
console.log('  ' + rel(path.join(OUT, 'content.json')));
