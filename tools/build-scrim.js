#!/usr/bin/env node
'use strict';
/* build-scrim.js — the per-image hero scrim strength, measured rather than
 * eyeballed. DATA ONLY: it emits assets/hero-scrim.css and styles nothing.
 *
 * WHY PER IMAGE. The landing hero is full-bleed with white text laid over it,
 * cycling through 32 niche screenshots. One fixed overlay cannot serve all 32:
 * set it for the dark frames and the bright ones lose the headline; set it for
 * the bright frames and the dark ones turn to mud. So each frame gets its own
 * alpha, keyed by slug, and the rotator's active frame selects it.
 *
 * WHY A PERCENTILE AND NOT THE MEAN. A frame can average out perfectly while
 * carrying a blown-out window or a white van exactly where the headline sits.
 * The mean hides that pixel; the headline lands on it. We take the 90th
 * PERCENTILE of per-pixel relative luminance over the sampled region, so a
 * bright patch drives the scrim instead of being averaged away. Not the max
 * either — a single specular pixel should not black out the whole frame.
 *
 * WHY THE LEFT 55%. That is the text side. The right side is deliberately left
 * vivid and is never sampled.
 *
 * WHY NUMERIC AND NOT ALGEBRAIC. CSS composites in sRGB; WCAG luminance is
 * computed from LINEARISED channels. The closed form for alpha is easy to get
 * subtly wrong in a way that still looks plausible. So we step alpha from 0.00
 * to 0.95 in 0.01 and measure, using the same tools/lib/wcag.js functions that
 * tools/a11y-sweep.js measures the rest of the site with.
 *
 *   node tools/build-scrim.js            measure and write assets/hero-scrim.css
 *   node tools/build-scrim.js --check    verify, write nothing, exit 1 on drift
 *   node tools/build-scrim.js --verify   re-measure WITH the committed alphas
 *                                        and assert every frame clears 4.5:1
 */
const fs = require('fs');
const path = require('path');

const { launchBrowser } = require('./lib/browser');
const WCAG = require('./lib/wcag');

const ROOT    = path.resolve(__dirname, '..');
const FRAMES  = path.join(ROOT, 'assets', 'shots', 'rotator');
const OUT     = path.join(ROOT, 'assets', 'hero-scrim.css');
const SEED    = path.join(ROOT, 'assets', 'data', 'niches.seed.json');

const CHECK  = process.argv.includes('--check');
const VERIFY = process.argv.includes('--verify');

/* ---------------------------------------------------------------- constants */

/* The scrim colour is --con (#141821) from assets/sbv.css — the brand's dark
   CONSOLE ground, the tone every dark band on the site already uses. Not pure
   black (which reads as a grey wash over a photo and belongs to no brand) and
   not --ink #161B22, which is the TEXT ink; a scrim is a ground, so it takes
   the ground token. Kept as a literal here rather than parsed out of the
   stylesheet: the number is baked into the measurement below, so it must not
   be able to change without this tool being re-run. */
const SCRIM_HEX = '#141821';
const SCRIM     = WCAG.hexToRgb(SCRIM_HEX);

const TEXT_SIDE  = 0.55;   // sample the left 55% of the frame, full height
const PERCENTILE = 0.90;   // worst-case, not mean; see the header
const TARGET     = 4.5;    // WCAG AA for normal-size white text
const MARGIN     = 0.04;   // JPEG artefacts and browser scaling move pixels;
                           // a frame that measures exactly 4.50 fails in the wild
const ALPHA_MAX  = 0.95;
const ALPHA_STEP = 0.01;

/* --------------------------------------------------------------- the frames */

function frames() {
  const files = fs.readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).sort();
  const slugs = files.map(f => f.slice(0, -4));

  /* The rotator builds its frame list from the seed rows that carry a
     demo_path (see rotator() in assets/sbv.js). If the directory and the seed
     ever disagree, one of them is stale and a scrim keyed by slug would miss —
     so say so loudly rather than emitting a quietly incomplete stylesheet. */
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const want = (seed.niches || []).filter(n => n.demo_path).map(n => n.slug).sort();
  const missing = want.filter(s => !slugs.includes(s));
  const extra   = slugs.filter(s => !want.includes(s));
  if (missing.length || extra.length) {
    throw new Error('assets/shots/rotator/ and the seed disagree.' +
      (missing.length ? `\n  seed has no frame for: ${missing.join(', ')}` : '') +
      (extra.length   ? `\n  frame with no demo_path seed row: ${extra.join(', ')}` : '') +
      '\n  Run: node tools/build-shots.js --only rotator');
  }
  return slugs;
}

/* ----------------------------------------------------------- measure a frame */

/* Runs INSIDE the page. Draws the frame at its natural size — NOT scaled to the
   hero box, because the browser's own downscaling averages neighbouring pixels
   and would soften exactly the blown-out patch we are hunting for. Composites
   the scrim over every sampled pixel at `alpha` (0 on the first pass), then
   returns the percentile of the resulting luminance. */
const PROBE = async (arg) => {
  const { dataUrl, alpha, scrim, side, pct } = arg;
  const { lum, compositeLum } = window.__wcag;

  const img = new Image();
  img.decoding = 'sync';
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('image failed to decode'));
    img.src = dataUrl;
  });

  const w = img.naturalWidth, h = img.naturalHeight;
  const cw = Math.max(1, Math.round(w * side));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, cw, h).data;

  const n = px.length / 4;
  const L = new Float64Array(n);
  let sum = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const v = alpha > 0
      ? compositeLum(scrim.r, scrim.g, scrim.b, px[p], px[p + 1], px[p + 2], alpha)
      : lum({ r: px[p], g: px[p + 1], b: px[p + 2] });
    L[i] = v;
    sum += v;
  }

  const sorted = Float64Array.from(L).sort();
  const at = Math.min(n - 1, Math.floor(pct * n));
  const target = sorted[at];

  /* The RGB of the pixel AT that percentile. The alpha solve needs channels,
     not just a luminance, because compositing is per-channel.

     It must be the DIMMEST pixel at or above the threshold, not the first one
     found in raster order — the first pixel above the p90 line can easily be a
     0.95-luminance highlight, which would hand the solver the max instead of
     the percentile and blacken the frame. (It did, before this loop was
     written this way: christmas-lights measured a p90 of 0.126 and was handed
     a pixel that demanded alpha 0.58.) */
  let pix = null, best = Infinity;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (L[i] >= target && L[i] < best) {
      best = L[i];
      pix = { r: px[p], g: px[p + 1], b: px[p + 2] };
      if (best === target) break;
    }
  }

  return { w, h, sampled: n, pLum: target, pPixel: pix,
           meanLum: sum / n, maxLum: sorted[n - 1] };
};

function dataUrl(slug) {
  const buf = fs.readFileSync(path.join(FRAMES, slug + '.jpg'));
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

async function measure(page, slug, alpha) {
  return page.evaluate(PROBE, {
    dataUrl: dataUrl(slug), alpha: alpha || 0,
    scrim: SCRIM, side: TEXT_SIDE, pct: PERCENTILE,
  });
}

/* ------------------------------------------------------------ the alpha solve */

const ratioOnWhite = rgb => WCAG.ratio(WCAG.WHITE, rgb);
const ratioFromLum = L => (1.0 + 0.05) / (L + 0.05);   // white's luminance is exactly 1

/* Smallest alpha in 0.01 steps at which white clears TARGET over `pixel`.
   Stepped, never solved in closed form — see the header. */
function solveAlpha(pixel) {
  for (let i = 0; i <= Math.round(ALPHA_MAX / ALPHA_STEP); i++) {
    const a = i * ALPHA_STEP;
    if (ratioOnWhite(WCAG.composite(SCRIM, pixel, a)) >= TARGET) {
      return Math.round(a * 100) / 100;
    }
  }
  return null;
}

/* ----------------------------------------------------------------- rendering */

const HEADER = [
  '/* GENERATED by tools/build-scrim.js — do not edit by hand.',
  ' *',
  ' * Per-frame hero scrim strength. One custom property per rotator slug: the',
  ' * minimum overlay alpha at which white text clears WCAG AA (4.5:1) over the',
  ' * TEXT SIDE of that frame, plus a safety margin.',
  ' *',
  ` * Scrim colour  --con ${SCRIM_HEX} (the brand's dark console ground)`,
  ` * Sampled       left ${Math.round(TEXT_SIDE * 100)}% of the frame, full height`,
  ` *               (the right side is deliberately left vivid and never sampled)`,
  ` * Statistic     ${Math.round(PERCENTILE * 100)}th percentile of per-pixel relative luminance`,
  ` * Target        >= ${TARGET.toFixed(1)}:1 against #FFFFFF, solved numerically in ${ALPHA_STEP} steps`,
  ` * Margin        +${MARGIN.toFixed(2)} on the solved minimum, clamped to ${ALPHA_MAX}`,
  ' *',
  ' * Regenerate:  node tools/build-scrim.js',
  ' * Verify:      node tools/build-scrim.js --check',
  ' */',
].join('\n');

function render(rows) {
  const rules = rows.map(r =>
    `.seq[data-slug="${r.slug}"]{--scrim:${r.alpha.toFixed(2)}}`).join('\n');

  const w = Math.max(...rows.map(r => r.slug.length), 4);
  const table = [
    '/* MEASURED — the evidence, beside the result.',
    ' *',
    ' *   ' + 'slug'.padEnd(w) + '   p90 lum   bare    min a   alpha   ratio',
    ' *   ' + '-'.repeat(w) + '   -------   -----   -----   -----   -----',
  ].concat(rows.map(r =>
    ' *   ' + r.slug.padEnd(w) +
    '   ' + r.pLum.toFixed(4).padStart(7) +
    '   ' + r.bareRatio.toFixed(2).padStart(5) +
    '   ' + r.minAlpha.toFixed(2).padStart(5) +
    '   ' + r.alpha.toFixed(2).padStart(5) +
    '   ' + r.ratio.toFixed(2).padStart(5)
  )).concat([
    ' *',
    ` *   bare  = contrast of white on the unscrimmed p90 pixel`,
    ` *   min a = smallest alpha reaching ${TARGET.toFixed(1)}:1;  alpha = min a + ${MARGIN.toFixed(2)} (clamped ${ALPHA_MAX})`,
    ` *   ratio = re-measured at the chosen alpha`,
    ' */',
  ]).join('\n');

  return HEADER + '\n\n' + rules + '\n\n' + table + '\n';
}

/* autocrlf is true with no .gitattributes, so the file on disk may be CRLF
   while this tool writes LF. Compare on content, not on line endings. */
const norm = s => s.replace(/\r\n/g, '\n');

/* ---------------------------------------------------------------------- main */

/* Read the alphas back out of the generated stylesheet — --verify must trust
   the committed file, not this run's in-memory numbers, or it proves nothing. */
function readAlphas(css) {
  const out = new Map();
  const re = /\.seq\[data-slug="([^"]+)"\]\{--scrim:([0-9.]+)\}/g;
  let m;
  while ((m = re.exec(css))) out.set(m[1], Number(m[2]));
  return out;
}

(async () => {
  const slugs = frames();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 },
                                         deviceScaleFactor: 1 });
  await ctx.addInitScript({ content: WCAG.SRC });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  try {
    if (VERIFY) {
      if (!fs.existsSync(OUT)) {
        console.error('no assets/hero-scrim.css — run: node tools/build-scrim.js');
        process.exit(1);
      }
      const alphas = readAlphas(fs.readFileSync(OUT, 'utf8'));
      const results = [];
      let failed = 0;
      for (const slug of slugs) {
        const a = alphas.get(slug);
        if (a === undefined) {
          console.error(`  MISSING  ${slug} has no --scrim rule`);
          failed++; continue;
        }
        /* An independent re-measure: composite the scrim over EVERY sampled
           pixel at the committed alpha, then take the p90 of what comes out.
           This does not reuse the pixel the solve picked. */
        const m = await measure(page, slug, a);
        const ratio = ratioFromLum(m.pLum);
        results.push({ slug, alpha: a, ratio });
        const bad = ratio < TARGET;
        if (bad) failed++;
        console.log(`  ${bad ? 'FAIL' : 'ok  '}  ${slug.padEnd(20)} a=${a.toFixed(2)}  ${ratio.toFixed(2)}:1`);
      }
      results.sort((x, y) => x.ratio - y.ratio);
      console.log(`\n  ${results.length} frames · lowest three: ` +
        results.slice(0, 3).map(r => `${r.slug} ${r.ratio.toFixed(2)}:1`).join(' · '));
      if (failed) {
        console.error(`\n  ${failed} frame(s) below ${TARGET}:1 — the floor does NOT hold.`);
        process.exit(1);
      }
      console.log(`  floor holds: every frame >= ${TARGET}:1`);
      return;
    }

    const rows = [];
    for (const slug of slugs) {
      const bare = await measure(page, slug, 0);
      if (!bare.pPixel) throw new Error(`${slug}: no pixels sampled`);

      const minAlpha = solveAlpha(bare.pPixel);
      if (minAlpha === null) {
        throw new Error(`${slug}: no alpha up to ${ALPHA_MAX} reaches ${TARGET}:1 ` +
                        `on a p90 pixel of rgb(${bare.pPixel.r},${bare.pPixel.g},${bare.pPixel.b})`);
      }
      const alpha = Math.min(ALPHA_MAX, Math.round((minAlpha + MARGIN) * 100) / 100);

      /* Re-measure at the chosen alpha the same way --verify will: composite
         every sampled pixel, take the p90 of the result. The number in the
         table is therefore the number the page will actually show. */
      const after = await measure(page, slug, alpha);
      const ratio = ratioFromLum(after.pLum);

      rows.push({ slug, pLum: bare.pLum, meanLum: bare.meanLum, maxLum: bare.maxLum,
                  bareRatio: ratioFromLum(bare.pLum), minAlpha, alpha, ratio,
                  sampled: bare.sampled, size: `${bare.w}x${bare.h}` });
      console.log(`  ${slug.padEnd(20)} p90 ${bare.pLum.toFixed(4)}  a ${alpha.toFixed(2)}  ${ratio.toFixed(2)}:1`);
    }

    const css = render(rows);

    if (CHECK) {
      const on = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
      if (norm(on) !== norm(css)) {
        console.error('\nassets/hero-scrim.css is out of date with the frames.');
        console.error('Run: node tools/build-scrim.js');
        process.exit(1);
      }
      console.log(`\n  assets/hero-scrim.css is in sync · ${rows.length} frames`);
      return;
    }

    fs.writeFileSync(OUT, css);

    const low = rows.slice().sort((a, b) => a.ratio - b.ratio).slice(0, 3);
    const heavy = rows.slice().sort((a, b) => b.alpha - a.alpha).slice(0, 3);
    const as = rows.map(r => r.alpha);
    console.log(`\n  wrote assets/hero-scrim.css · ${rows.length} frames`);
    console.log(`  alpha ${Math.min(...as).toFixed(2)} – ${Math.max(...as).toFixed(2)}` +
                `  ·  heaviest: ${heavy.map(r => `${r.slug} ${r.alpha.toFixed(2)}`).join(', ')}`);
    console.log(`  lowest ratios: ${low.map(r => `${r.slug} ${r.ratio.toFixed(2)}:1`).join(', ')}`);
    if (low[0].ratio < TARGET) {
      console.error(`\n  ${low[0].slug} lands at ${low[0].ratio.toFixed(2)}:1 — below ${TARGET}.`);
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('build-scrim failed: ' + e.message); process.exit(1); });
