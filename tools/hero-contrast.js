#!/usr/bin/env node
'use strict';
/* hero-contrast.js — is the hero headline actually legible, on all 32 frames?
 *
 * WHY THIS EXISTS ALONGSIDE tools/build-scrim.js. build-scrim MODELS the stack:
 * it composites numbers in a canvas and publishes the per-frame alphas the hero
 * needs. That model is only as true as its assumptions, and R13 invalidated two
 * of them — the base layer is now flat black at 0.45 rather than --con at 0.34,
 * and the copy is CENTRED rather than sitting in the left 55% the model samples.
 * Re-deriving the arithmetic would have produced a second model to keep honest.
 *
 * So this tool models nothing. It opens index.html in Chromium, hides the copy
 * so only the ground it sits on is left, and SCREENSHOTS the exact rectangle
 * each piece of hero text occupies. Every pixel it reads is a pixel the browser
 * really painted: the gradient falloff, the elliptical plateau, object-fit
 * cropping, JPEG artefacts and the per-frame --scrim-extra, all of it, composed
 * the way a visitor gets it.
 *
 * WHAT IS SAMPLED. Three rects, every one of them white text on the frame:
 * the h1, the sub-copy, and the frame caption at the foot of the hero. The
 * element boxes are used rather than the glyph boxes, which is deliberately
 * conservative — a centred line of type is narrower than its block, so the
 * sample includes ground the letters never touch.
 *
 * WHY THE 90th PERCENTILE, not the mean or the max. Same reason build-scrim
 * uses it: a frame can average out perfectly while carrying a blown-out window
 * exactly where the headline sits. The mean hides that pixel and the headline
 * lands on it. The max is the opposite error — one specular pixel would black
 * out the whole hero.
 *
 *   node tools/hero-contrast.js           measure every frame at the committed
 *                                         --scrim-floor; exit 1 if any < 4.5:1
 *   node tools/hero-contrast.js --solve   measure with the pool OFF, then solve
 *                                         the smallest --scrim-floor that
 *                                         clears every frame, and verify it by
 *                                         measuring again at that value
 *   node tools/hero-contrast.js --width N measure at a different viewport
 */
const fs   = require('fs');
const http = require('http');
const path = require('path');

const { launchBrowser } = require('./lib/browser');
const WCAG = require('./lib/wcag');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'assets', 'data', 'niches.seed.json');
const CSS  = path.join(ROOT, 'assets', 'sbv.css');

/* The page is SERVED, not opened off disk: every asset reference on it is
   root-relative (/assets/sbv.css, /assets/shots/...), and under file:// those
   resolve against the filesystem root and 404. A hero measured without its
   stylesheet would report a perfect score on a page that does not exist.
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

const SOLVE = process.argv.includes('--solve');
const WIDTH = (() => {
  const i = process.argv.indexOf('--width');
  return i === -1 ? 1280 : parseInt(process.argv[i + 1], 10) || 1280;
})();

const HEIGHT     = 900;
const PERCENTILE = 0.90;
const TARGET     = 4.5;
/* The same +0.04-of-alpha spirit as build-scrim's margin, expressed where it is
   easier to check: solve to a ratio slightly above the bar so a frame that
   measures 4.50 on this machine is not a frame that measures 4.49 on another. */
const SOLVE_TO   = 4.60;
const STEP       = 0.01;

/* The rects to sample. Everything white that sits on the frame. */
const SELECTORS = [
  ['headline', '.hero-full h1.display'],
  ['subcopy',  '.hero-full .thesis'],
  ['eyebrow',  '.hero-full .plate-sub'],
  ['caption',  '.hero-full .seq-cap'],
];

/* --scrim-floor as the stylesheet actually commits it, so the default run
   reports the shipped hero rather than whatever this file last hard-coded. */
function committedFloor() {
  const m = /--scrim-floor:\s*([0-9.]+)/.exec(fs.readFileSync(CSS, 'utf8'));
  if (!m) throw new Error('no --scrim-floor in assets/sbv.css');
  return parseFloat(m[1]);
}

function slugs() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  return (seed.niches || []).filter(n => n.demo_path).map(n => n.slug);
}

const ratioFromLum = L => 1.05 / (L + 0.05);

/* ------------------------------------------------------------------ in-page */

/* Park the page in a known state: no timer advancing the frames underneath the
   measurement, nothing painted over the hero, and the copy hidden so the
   screenshot is of the GROUND rather than of the text standing on it.
   clearInterval over the whole id space is blunt, and it is the point — it does
   not need to know which handle the rotator took. */
const FREEZE = () => {
  for (let i = 1; i < 5000; i++) clearInterval(i);
  const s = document.createElement('style');
  s.id = '__probe';
  s.textContent =
    '.gnav,.rail{visibility:hidden !important}' +
    '.hero-copy,.hero-full .seq-meta{visibility:hidden !important}' +
    '.seq-layer{transition:none !important}';
  document.head.appendChild(s);
};

/* Point the hero at one frame and wait for it to be on screen for real. The
   data-slug has to move with it: it is what selects that frame's --scrim-extra
   out of the generated assets/hero-scrim.css. */
const SHOW = async (arg) => {
  const { src, slug, floor } = arg;
  const seq = document.querySelector('[data-rotator]');
  const on  = seq.querySelector('.seq-layer.is-on');
  const hero = seq.closest('.hero-full');
  if (floor === null) hero.style.removeProperty('--scrim-floor');
  else hero.style.setProperty('--scrim-floor', String(floor));
  seq.setAttribute('data-slug', slug);
  seq.style.removeProperty('--scrim-hold');
  on.setAttribute('src', src);
  await on.decode();
  /* Two frames, not one: decode() resolves when the bitmap is ready, which is
     before it has been composited. Measuring one rAF early samples the frame
     that was there before. */
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
};

const RECTS = (sels) => {
  const out = [];
  sels.forEach(([name, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    out.push({ name,
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height) });
  });
  return out;
};

/* Read one screenshot back: p90 of per-pixel luminance, plus the RGB of the
   dimmest pixel at or above that percentile. The RGB is what makes --solve
   possible without a second screenshot per candidate alpha — the pool is flat
   black at full strength over these rects, so painting it is exactly
   channel * (1 - alpha), which can be stepped in node. */
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

async function measureAll(page, list, rects, floor) {
  const rows = [];
  for (const slug of list) {
    const src = '/assets/shots/rotator/' + slug + '.jpg';
    await page.evaluate(SHOW, { src, slug, floor });
    let worst = null;
    for (const r of rects) {
      const shot = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
      const got = await page.evaluate(READ, 'data:image/png;base64,' + shot.toString('base64'));
      const row = { slug, where: r.name, lum: got.lum, pixel: got.pixel,
                    ratio: ratioFromLum(got.lum) };
      if (!worst || row.ratio < worst.ratio) worst = row;
    }
    rows.push(worst);
  }
  rows.sort((a, b) => b.ratio - a.ratio);
  return rows;
}

/* The smallest black alpha over `pixel` at which white clears `to`. Stepped,
   never solved in closed form: CSS composites in sRGB and WCAG luminance is
   computed from linearised channels, and the closed form is easy to get subtly
   and plausibly wrong. */
function solveFloor(pixel, to) {
  for (let i = 0; i <= Math.round(0.95 / STEP); i++) {
    const a = i * STEP;
    const c = { r: pixel.r * (1 - a), g: pixel.g * (1 - a), b: pixel.b * (1 - a) };
    if (ratioFromLum(WCAG.lum(c)) >= to) return Math.round(a * 100) / 100;
  }
  return null;
}

function table(rows, floor) {
  const w = Math.max(...rows.map(r => r.slug.length), 4);
  console.log(`\n  --scrim-floor ${floor === null ? '(as committed)' : floor.toFixed(2)}` +
              `   viewport ${WIDTH}x${HEIGHT}   p90 of ${rows.length} frames\n`);
  console.log('  ' + 'slug'.padEnd(w) + '   where      p90 lum   ratio');
  console.log('  ' + '-'.repeat(w) + '   --------   -------   -----');
  rows.forEach(r => console.log(
    '  ' + r.slug.padEnd(w) + '   ' + r.where.padEnd(8) +
    '   ' + r.lum.toFixed(4).padStart(7) +
    '   ' + r.ratio.toFixed(2).padStart(5) +
    (r.ratio < TARGET ? '  FAIL' : '')));
}

async function main() {
  const list = slugs();
  const { s, port } = await serve();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT },
                                         deviceScaleFactor: 1 });
  await ctx.addInitScript({ content: WCAG.SRC });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.evaluate(FREEZE);
  const rects = await page.evaluate(RECTS, SELECTORS);
  console.log('  sampling: ' + rects.map(r => `${r.name} ${r.w}x${r.h}`).join(', '));

  let failed = false;

  if (SOLVE) {
    const bare = await measureAll(page, list, rects, 0);
    table(bare, 0);
    let need = 0, driver = null;
    bare.forEach(r => {
      const f = solveFloor(r.pixel, SOLVE_TO);
      if (f === null) throw new Error(`no alpha clears ${SOLVE_TO}:1 on ${r.slug}`);
      if (f > need) { need = f; driver = r; }
    });
    console.log(`\n  SOLVED  --scrim-floor:${need.toFixed(2)}` +
                `   driven by ${driver.slug} (${driver.where})`);
    const check = await measureAll(page, list, rects, need);
    table(check, need);
    const worst = check[check.length - 1];
    console.log(`\n  worst after the pool: ${worst.ratio.toFixed(2)}:1 on ` +
                `${worst.slug} (${worst.where})`);
    failed = worst.ratio < TARGET;
  } else {
    const floor = committedFloor();
    const rows = await measureAll(page, list, rects, null);
    table(rows, floor);
    const worst = rows[rows.length - 1];
    console.log(`\n  worst: ${worst.ratio.toFixed(2)}:1 on ${worst.slug} (${worst.where})` +
                `   target ${TARGET.toFixed(1)}:1`);
    failed = worst.ratio < TARGET;
  }

  await browser.close();
  s.close();
  if (failed) {
    console.error('\n  A hero frame is under 4.5:1. Raise --scrim-floor in assets/sbv.css');
    console.error('  (node tools/hero-contrast.js --solve prints the value to use).');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
