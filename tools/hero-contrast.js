#!/usr/bin/env node
'use strict';
/* hero-contrast.js — is the hero's copy actually legible on the photograph?
 *
 * WHAT CHANGED IN R14, AND WHY THIS FILE SURVIVED IT. The hero used to be 32
 * rotating screenshots under three measured scrim layers, and this tool ran
 * per FRAME to prove the scrim was heavy enough. There is one static
 * photograph now and no scrim at all, so it runs per WIDTH instead: the same
 * measurement, against the same 4.5:1 bar, on the six viewports the layout is
 * actually written for. Nothing else about it moved — a second measurement
 * tool would be a second set of assumptions to keep honest.
 *
 * IT MODELS NOTHING. It opens index.html in Chromium and SCREENSHOTS the exact
 * rectangle each piece of hero text occupies, with the glyphs made transparent
 * so what is sampled is the GROUND the text stands on. Every pixel it reads is
 * a pixel the browser really painted: the photo, `cover` cropping at that
 * viewport, JPEG artefacts, and any wash a button paints under its own label.
 *
 * WHY color:transparent AND NOT visibility:hidden. The primary button's ground
 * IS its own amber fill and the secondary's is a dark wash over the photo.
 * Hiding those elements would sample the photo where a button is and report a
 * contrast no visitor ever sees. Transparent glyphs leave every box painted
 * exactly as it ships and remove only the letters.
 *
 * EACH RECT IS MEASURED AGAINST ITS OWN TEXT COLOUR, read off the live element
 * before the glyphs are hidden. Four of the five are #FFFFFF; the primary CTA
 * is --acc-ink on amber, and calling that white would be measuring a button
 * that does not exist.
 *
 * WHY THE 90th PERCENTILE, not the mean or the max. A photograph can average
 * out perfectly while carrying a bright patch exactly where the headline sits.
 * The mean hides that pixel and the headline lands on it. The max is the
 * opposite error — one specular pixel would condemn the whole hero.
 *
 *   node tools/hero-contrast.js            all six widths; exit 1 under 4.5:1
 *   node tools/hero-contrast.js --width N  one width
 *   node tools/hero-contrast.js --keep     leave the probe screenshots in
 *                                          .preview/hero-contrast/
 */
const fs   = require('fs');
const http = require('http');
const path = require('path');

const { launchBrowser } = require('./lib/browser');
const WCAG = require('./lib/wcag');

const ROOT = path.resolve(__dirname, '..');

/* The page is SERVED, not opened off disk: every asset reference on it is
   root-relative (/assets/sbv.css, /assets/hero/owner.jpg), and under file://
   those resolve against the filesystem root and 404. A hero measured without
   its stylesheet would report a perfect score on a page that does not exist.
   Lifted from tools/a11y-sweep.js, which serves for the same reason. */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function serve() {
  return new Promise((res, rej) => {
    const s = http.createServer((req, r) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.writeHead(404); return r.end('nf');
      }
      r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      r.end(fs.readFileSync(f));
    });
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
}

/* The six the hero's rules are written for: the phone band, the tablet, the
   width the layout switches at, the two common laptops and the photo's own
   native width. */
const WIDTHS = (() => {
  const i = process.argv.indexOf('--width');
  if (i !== -1) return [parseInt(process.argv[i + 1], 10) || 1280];
  return [390, 768, 1024, 1280, 1440, 1920];
})();
const KEEP = process.argv.includes('--keep');
const SHOTS = path.join(ROOT, '.preview', 'hero-contrast');

const HEIGHT     = 900;
const PERCENTILE = 0.90;
const TARGET     = 4.5;

/* Everything the visitor reads inside the hero. Both CTAs included: the brief
   for R14 asked for them by name, and they are the two rects whose ground is
   not simply "the photo". */
const SELECTORS = [
  ['eyebrow',  '.hero-full .plate-sub'],
  ['headline', '.hero-full h1.display'],
  ['subcopy',  '.hero-full .thesis'],
  ['cta-1',    '.hero-full .plate-cta .btn-pri'],
  ['cta-2',    '.hero-full .plate-cta .btn-sec'],
];

/* ------------------------------------------------------------------ in-page */

/* Measure first, hide second — the rects and the colours have to be read while
   the type is still painted normally. */
const RECTS = (sels) => {
  const rgb = (css) => {
    const m = /rgba?\(([^)]+)\)/.exec(css);
    if (!m) return null;
    const p = m[1].split(',').map(parseFloat);
    return { r: p[0], g: p[1], b: p[2] };
  };
  const out = [];
  sels.forEach(([name, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    out.push({ name, sel,
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height),
      color: rgb(window.getComputedStyle(el).color) || { r: 255, g: 255, b: 255 } });
  });
  return out;
};

/* Park the page in a known state: nothing floating over the hero, and the
   glyphs transparent so the screenshot is of the GROUND rather than of the
   text standing on it. The eyebrow's amber rule is a MARK, not type — it
   carries no contrast obligation and would otherwise dominate the p90 of the
   box it shares with the eyebrow's words, so it is faded out too (opacity, so
   the box it occupies is still measured, as photo). */
const FREEZE = () => {
  const s = document.createElement('style');
  s.id = '__probe';
  s.textContent =
    '.gnav,.rail{visibility:hidden !important}' +
    '.hero-full .hero-copy, .hero-full .hero-copy *' +
      '{color:transparent !important;text-shadow:none !important;' +
      ' -webkit-text-fill-color:transparent !important}' +
    '.hero-full .plate-sub::before{opacity:0 !important}';
  document.head.appendChild(s);
  return true;
};

/* Read one screenshot back: the p90 of per-pixel luminance over the rect. */
const READ = async (dataUrl) => {
  const { lum } = window.__wcag;
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = () => rej(new Error('probe decode failed'));
    img.src = dataUrl;
  });
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, cv.width, cv.height).data;
  const n = px.length / 4;
  const L = new Float64Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) L[i] = lum({ r: px[p], g: px[p + 1], b: px[p + 2] });
  const sorted = Float64Array.from(L).sort();
  const target = sorted[Math.min(n - 1, Math.floor(0.90 * n))];
  let pix = null, best = Infinity;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (L[i] >= target && L[i] < best) {
      best = L[i];
      pix = { r: px[p], g: px[p + 1], b: px[p + 2] };
      if (best === target) break;
    }
  }
  return { lum: target, pixel: pix, n };
};

/* --------------------------------------------------------------- the driver */

/* Where the copy ENDS as a fraction of the viewport. The photo's dark band
   runs to 44% of the width (tools/build-hero-image.js --profile); a rect that
   ends past that is the failure mode the layout is written to prevent, and it
   is worth reporting even on a width that still passes 4.5:1. */
function reach(rects, width) {
  let far = 0;
  rects.forEach(r => { far = Math.max(far, r.x + r.w); });
  return far / width;
}

function table(width, rows, far) {
  /* Below 1000px the copy is on flat colour and the photo is a band under
     it, so how far the copy reaches says nothing about the picture. */
  const where = width < 1000
    ? 'stacked — copy on flat ground, photo in the band below'
    : 'copy reaches ' + (far * 100).toFixed(1) + '% of the width (dark band ends at 44%)';
  console.log(`\n  ${width}x${HEIGHT}   ${where}`);
  console.log('  where      text       p90 lum   ratio');
  console.log('  --------   --------   -------   -----');
  rows.forEach(r => console.log(
    '  ' + r.where.padEnd(8) +
    '   ' + ('#' + [r.color.r, r.color.g, r.color.b]
               .map(v => Math.round(v).toString(16).padStart(2, '0')).join('')).padEnd(8) +
    '   ' + r.lum.toFixed(4).padStart(7) +
    '   ' + r.ratio.toFixed(2).padStart(5) +
    (r.ratio < TARGET ? '  FAIL' : '')));
}

async function main() {
  const { s, port } = await serve();
  const browser = await launchBrowser();
  if (KEEP) fs.mkdirSync(SHOTS, { recursive: true });

  const all = [];

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: HEIGHT },
                                           deviceScaleFactor: 1 });
    await ctx.addInitScript({ content: WCAG.SRC });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    /* The photo is a CSS background; `load` covers it, but one more frame
       costs nothing and rules out measuring a pre-paint composite. */
    await page.evaluate(() => new Promise(r =>
      requestAnimationFrame(() => requestAnimationFrame(r))));

    const rects = await page.evaluate(RECTS, SELECTORS);
    await page.evaluate(FREEZE);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    const rows = [];
    for (const r of rects) {
      const shot = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
      if (KEEP) fs.writeFileSync(path.join(SHOTS, `${width}-${r.name}.png`), shot);
      const got = await page.evaluate(READ, 'data:image/png;base64,' + shot.toString('base64'));
      rows.push({ width, where: r.name, color: r.color, lum: got.lum, pixel: got.pixel,
                  ratio: WCAG.ratio(r.color, got.pixel) });
    }
    table(width, rows, reach(rects, width));
    all.push(...rows);
    await ctx.close();
  }

  await browser.close();
  s.close();

  all.sort((a, b) => a.ratio - b.ratio);
  const worst = all[0];
  console.log(`\n  worst across ${WIDTHS.length} width(s): ${worst.ratio.toFixed(2)}:1 ` +
              `on ${worst.where} at ${worst.width}px   target ${TARGET.toFixed(1)}:1`);

  if (worst.ratio < TARGET) {
    console.error('\n  A piece of hero copy is under 4.5:1 on the photograph.');
    console.error('  Narrow the copy column or darken that rect locally — see THE PHOTO');
    console.error('  HERO in assets/sbv.css for where the dark band actually ends.');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
