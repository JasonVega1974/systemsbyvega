#!/usr/bin/env node
'use strict';
/* build-scrim.js — the hero scrim, measured rather than eyeballed.
 * DATA ONLY: it emits assets/hero-scrim.css and styles nothing.
 *
 * DORMANT SINCE R14, AND KEPT ON PURPOSE. The landing hero is one static
 * photograph now; there is no rotator, no scrim, and index.html no longer
 * links assets/hero-scrim.css. Neither this tool nor that stylesheet is
 * referenced by anything the site serves. Both were left in place rather than
 * deleted: assets/shots/ is still the source of the /sites/ board and the
 * 32-card grid on /, so the frames this measures still exist, and a hero that
 * ever goes back to showing them will want these numbers rather than a second
 * derivation of them. Everything below describes the hero as it was BEFORE R14.
 *
 * THE SCRIM IS TWO LAYERS.
 *   1. a BASELINE, one constant, on every one of the 32 frames. It gives the
 *      hero a consistent brand tone so the weight does not visibly change as
 *      the rotator advances. A purely per-image alpha makes a dark frame look
 *      bare sitting next to a bright one.
 *   2. a per-image ADJUSTMENT (--scrim-extra) that tops up only the frames
 *      that actually need more. Most frames need nothing; that is expected,
 *      not a bug, and they emit an explicit 0 so a MISSING entry is always a
 *      bug rather than an intentional zero.
 *
 * THE CORRECTNESS POINT. The adjustment is solved ON TOP OF the baseline, over
 * the real two-layer composite — never solved independently and added. sRGB
 * compositing is not additive in alpha: baseline 0.34 plus adjustment 0.34 is
 * an effective 0.56, not 0.68. Solving the two separately and summing
 * overshoots the dark frames and, far worse, UNDERSHOOTS the bright ones.
 * Every number below comes from the full stack as the browser paints it:
 * baseline, then adjustment, then white text.
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
 * computed from LINEARISED channels. The closed form is easy to get subtly
 * wrong in a way that still looks plausible. So every alpha here is found by
 * stepping and measuring, using the same tools/lib/wcag.js functions that
 * tools/a11y-sweep.js measures the rest of the site with.
 *
 *   node tools/build-scrim.js            measure and write assets/hero-scrim.css
 *   node tools/build-scrim.js --check    verify, write nothing, exit 1 on drift
 *   node tools/build-scrim.js --verify   re-measure the FULL STACK from the
 *                                        committed CSS; assert all 32 >= 4.5:1
 *   node tools/build-scrim.js --baselines  print the baseline trade-off table
 *                                          that BASELINE was chosen from
 */
const fs = require('fs');
const path = require('path');

const { launchBrowser } = require('./lib/browser');
const WCAG = require('./lib/wcag');

const ROOT    = path.resolve(__dirname, '..');
const FRAMES  = path.join(ROOT, 'assets', 'shots', 'rotator');
const OUT     = path.join(ROOT, 'assets', 'hero-scrim.css');
const SEED    = path.join(ROOT, 'assets', 'data', 'niches.seed.json');

const CHECK     = process.argv.includes('--check');
const VERIFY    = process.argv.includes('--verify');
const BASELINES = process.argv.includes('--baselines');

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

/* THE BASELINE, and why this number.

   `--baselines` prints the table this was picked from. The count of frames
   needing NO adjustment climbs with the baseline and then flattens:

       0.28 -> 18    0.30 -> 20    0.32 -> 21    0.34 -> 22    0.40 -> 22
       0.29 -> 20    0.31 -> 20    0.33 -> 21    0.35 -> 22    0.50 -> 22

   0.34 is the knee. Every 0.01 beyond it dims all 32 frames and buys nothing:
   the ten frames still needing help are near-white storefront heroes nowhere
   near clearing, and no realistic baseline reaches them.

   It is also where the population splits cleanly. Below 0.34 the smallest
   non-zero adjustment is 0.02-0.05 — noise, a frame sitting on the boundary
   and contributing a cascade entry nobody can see. At 0.34 the adjustments
   start at 0.35: a frame is either comfortably covered by the baseline or it
   is genuinely fighting the text, with nothing in between.

   And it does not crush the dark end. #141821's own luminance is 0.0091,
   BRIGHTER than the median sampled pixel of the darkest frames (tattoo-studio
   sits at 0.0036). The baseline lifts those very slightly toward the brand's
   dark rather than flattening them — it behaves as a floor, not a crusher.
   Every frame still keeps two thirds of its own contrast. */
const BASELINE = 0.34;

const TEXT_SIDE  = 0.55;   // sample the left 55% of the frame, full height
const PERCENTILE = 0.90;   // worst-case, not mean; see the header
const TARGET     = 4.5;    // WCAG AA for normal-size white text
const MARGIN     = 0.04;   // JPEG artefacts and browser scaling move pixels;
                           // a frame that measures exactly 4.50 fails in the wild
const ALPHA_MAX  = 0.95;
const ALPHA_STEP = 0.01;
const STEPS      = Math.round(ALPHA_MAX / ALPHA_STEP);
const EPS        = 1e-12;  // float slack on a <= comparison of two luminances

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
   and would soften exactly the blown-out patch we are hunting for. Applies the
   overlay STACK to every sampled pixel in paint order, then returns the
   percentile of the resulting luminance. `alphas: []` measures the bare frame. */
const PROBE = async (arg) => {
  const { dataUrl, alphas, scrim, side, pct } = arg;
  const { stackLum } = window.__wcag;

  const img = new Image();
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
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    L[i] = stackLum(scrim, px[p], px[p + 1], px[p + 2], alphas);
  }

  const sorted = Float64Array.from(L).sort();
  const at = Math.min(n - 1, Math.floor(pct * n));
  const target = sorted[at];

  /* The RGB of the pixel AT that percentile. The alpha solve needs channels,
     not just a luminance, because compositing is per-channel.

     It must be the DIMMEST pixel at or above the threshold, not the first one
     found in raster order — the first pixel above the p90 line can easily be a
     0.95-luminance highlight, which would hand the solver the MAX instead of
     the percentile and blacken the frame. (It did: christmas-lights measured a
     p90 of 0.126, already clearing 4.5:1 unaided, and was assigned 0.58.) */
  let pix = null, best = Infinity;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (L[i] >= target && L[i] < best) {
      best = L[i];
      pix = { r: px[p], g: px[p + 1], b: px[p + 2] };
      if (best === target) break;
    }
  }

  return { w, h, sampled: n, pLum: target, pPixel: pix,
           medLum: sorted[Math.floor(0.5 * n)], maxLum: sorted[n - 1] };
};

function dataUrl(slug) {
  const buf = fs.readFileSync(path.join(FRAMES, slug + '.jpg'));
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

async function measure(page, slug, alphas) {
  return page.evaluate(PROBE, {
    dataUrl: dataUrl(slug), alphas: alphas || [],
    scrim: SCRIM, side: TEXT_SIDE, pct: PERCENTILE,
  });
}

/* ------------------------------------------------------------ the alpha solve */

const ratioOnWhite = rgb => WCAG.ratio(WCAG.WHITE, rgb);
const ratioFromLum = L => (1.0 + 0.05) / (L + 0.05);   // white's luminance is exactly 1

/* Step 1 — the smallest single-layer alpha at which white clears TARGET over
   `pixel`. Only used to locate the margin; the adjustment itself is solved on
   the real stack in step 3. Stepped, never solved in closed form. */
function solveFlat(pixel) {
  for (let i = 0; i <= STEPS; i++) {
    const a = i * ALPHA_STEP;
    if (ratioOnWhite(WCAG.composite(SCRIM, pixel, a)) >= TARGET) return a;
  }
  return null;
}

/* Step 3 — the smallest ADJUSTMENT, laid ON TOP OF the baseline, that brings
   the stack to `needLum` or darker. Walks the real two-layer composite: the
   baseline goes down first and each candidate alpha is painted over the RESULT,
   exactly as the browser will. Returns 0 when the baseline already gets there,
   which is the common case and is not a bug. */
function solveExtra(pixel, needLum) {
  const base = WCAG.composite(SCRIM, pixel, BASELINE);
  for (let i = 0; i <= STEPS; i++) {
    const x = i * ALPHA_STEP;
    if (WCAG.lum(WCAG.composite(SCRIM, base, x)) <= needLum + EPS) {
      return Math.round(x * 100) / 100;
    }
  }
  return null;
}

/* The whole solve for one frame, from its p90 pixel. */
function solve(pixel) {
  const flat = solveFlat(pixel);
  if (flat === null) return null;
  /* The safety margin lands on the FINAL STACK: the stack must end up as dark
     as (the alpha that just clears TARGET) + 0.04 would have made it. A frame
     that measures exactly 4.50 fails in the wild once JPEG artefacts and the
     browser's own scaling have moved a few pixels. */
  const flatMargined = Math.min(ALPHA_MAX, Math.round((flat + MARGIN) * 100) / 100);
  const needLum = WCAG.lum(WCAG.composite(SCRIM, pixel, flatMargined));
  const extra = solveExtra(pixel, needLum);
  return extra === null ? null : { flat, flatMargined, extra };
}

/* ----------------------------------------------------------------- rendering */

const HEADER = rows => [
  '/* GENERATED by tools/build-scrim.js — do not edit by hand.',
  ' *',
  ' * Hero scrim, measured per frame. TWO LAYERS, in paint order:',
  ' *',
  ` *   1. --scrim-base   ${BASELINE.toFixed(2)}  one constant, on every frame. Holds the hero`,
  ' *                           at a consistent brand tone so its weight does not',
  ' *                           visibly change as the rotator advances.',
  ' *   2. --scrim-extra        per frame, laid OVER the baseline. Tops up only',
  ' *                           the frames that need it. Most need none and say',
  ` *                           so with an explicit 0 — ${rows.filter(r => r.extra === 0).length} of ${rows.length} frames.`,
  ' *',
  ' * The adjustment is solved ON TOP OF the baseline over the real composite,',
  ' * never solved alone and added: sRGB compositing is not additive in alpha.',
  ` * Baseline ${BASELINE.toFixed(2)} + adjustment ${BASELINE.toFixed(2)} is an effective ` +
    `${(1 - (1 - BASELINE) * (1 - BASELINE)).toFixed(2)}, not ${(BASELINE * 2).toFixed(2)}.`,
  ' *',
  ` * Scrim colour  --con ${SCRIM_HEX} (the brand's dark console ground)`,
  ` * Sampled       left ${Math.round(TEXT_SIDE * 100)}% of the frame, full height`,
  ' *               (the right side is deliberately left vivid and never sampled)',
  ` * Statistic     ${Math.round(PERCENTILE * 100)}th percentile of per-pixel relative luminance`,
  ` * Target        >= ${TARGET.toFixed(1)}:1 for #FFFFFF, solved numerically in ${ALPHA_STEP} steps`,
  ` * Margin        +${MARGIN.toFixed(2)} of alpha on the FINAL stack`,
  ' *',
  ' * Regenerate:  node tools/build-scrim.js',
  ' * Verify:      node tools/build-scrim.js --check',
  ' *              node tools/build-scrim.js --verify   (re-measures the stack)',
  ' */',
].join('\n');

/* A zero is printed as a bare 0, not 0.00 — it should be scannable at a glance
   which frames the baseline already covers. */
const fmt = a => (a === 0 ? '0' : a.toFixed(2));

function render(rows) {
  const base = `.seq{--scrim-base:${BASELINE.toFixed(2)}}`;
  const rules = rows.map(r =>
    `.seq[data-slug="${r.slug}"]{--scrim-extra:${fmt(r.extra)}}`).join('\n');

  const w = Math.max(...rows.map(r => r.slug.length), 4);
  const table = [
    '/* MEASURED — the evidence, beside the result.',
    ' *',
    ' *   ' + 'slug'.padEnd(w) + '   p90 lum   bare    extra   eff a   ratio',
    ' *   ' + '-'.repeat(w) + '   -------   -----   -----   -----   -----',
  ].concat(rows.map(r =>
    ' *   ' + r.slug.padEnd(w) +
    '   ' + r.pLum.toFixed(4).padStart(7) +
    '   ' + r.bareRatio.toFixed(2).padStart(5) +
    '   ' + fmt(r.extra).padStart(5) +
    '   ' + r.effective.toFixed(2).padStart(5) +
    '   ' + r.ratio.toFixed(2).padStart(5)
  )).concat([
    ' *',
    ' *   bare  = contrast of white on the unscrimmed p90 pixel',
    ` *   extra = --scrim-extra, solved on top of the ${BASELINE.toFixed(2)} baseline`,
    ' *   eff a = the single alpha the two-layer stack is equivalent to',
    ' *   ratio = re-measured over the FULL STACK, every sampled pixel',
    ' */',
  ]).join('\n');

  return HEADER(rows) + '\n\n' + base + '\n\n' + rules + '\n\n' + table + '\n';
}

/* autocrlf is true with no .gitattributes, so the file on disk may be CRLF
   while this tool writes LF. Compare on content, not on line endings. */
const norm = s => s.replace(/\r\n/g, '\n');

/* Read the scrim back OUT of the generated stylesheet — --verify must trust the
   committed file, not this run's in-memory numbers, or it proves nothing. */
function readScrim(css) {
  const b = /\.seq\{--scrim-base:([0-9.]+)\}/.exec(css);
  const extras = new Map();
  const re = /\.seq\[data-slug="([^"]+)"\]\{--scrim-extra:([0-9.]+)\}/g;
  let m;
  while ((m = re.exec(css))) extras.set(m[1], Number(m[2]));
  return { base: b ? Number(b[1]) : null, extras };
}

/* ---------------------------------------------------------------------- main */

(async () => {
  const slugs = frames();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 },
                                         deviceScaleFactor: 1 });
  await ctx.addInitScript({ content: WCAG.SRC });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  try {
    /* ---- --verify: trust only the committed file ---- */
    if (VERIFY) {
      if (!fs.existsSync(OUT)) {
        console.error('no assets/hero-scrim.css — run: node tools/build-scrim.js');
        process.exit(1);
      }
      const { base, extras } = readScrim(fs.readFileSync(OUT, 'utf8'));
      if (base === null) {
        console.error('assets/hero-scrim.css has no .seq{--scrim-base} rule');
        process.exit(1);
      }
      console.log(`  baseline ${base.toFixed(2)} from the committed stylesheet\n`);
      const results = [];
      let failed = 0;
      for (const slug of slugs) {
        if (!extras.has(slug)) {
          console.error(`  MISSING  ${slug} has no --scrim-extra rule`);
          failed++; continue;
        }
        const x = extras.get(slug);
        /* An independent re-measure of the FULL STACK: baseline then adjustment
           over EVERY sampled pixel, then the p90 of what comes out. It does not
           reuse the single pixel the solver was handed. */
        const m = await measure(page, slug, [base, x]);
        const ratio = ratioFromLum(m.pLum);
        results.push({ slug, x, ratio });
        const bad = ratio < TARGET;
        if (bad) failed++;
        console.log(`  ${bad ? 'FAIL' : 'ok  '}  ${slug.padEnd(20)} ` +
                    `base ${base.toFixed(2)} + ${fmt(x).padStart(4)}  ${ratio.toFixed(2)}:1`);
      }
      results.sort((a, b) => a.ratio - b.ratio);
      console.log(`\n  ${results.length} frames · ${results.filter(r => r.x === 0).length} need no adjustment`);
      console.log('  lowest three: ' +
        results.slice(0, 3).map(r => `${r.slug} ${r.ratio.toFixed(2)}:1`).join(' · '));
      if (failed) {
        console.error(`\n  ${failed} frame(s) below ${TARGET}:1 — the floor does NOT hold.`);
        process.exit(1);
      }
      console.log(`  floor holds: every frame >= ${TARGET}:1 over the full stack`);
      return;
    }

    /* ---- measure every frame once ---- */
    const bare = new Map();
    for (const slug of slugs) {
      const m = await measure(page, slug, []);
      if (!m.pPixel) throw new Error(`${slug}: no pixels sampled`);
      bare.set(slug, m);
    }

    /* ---- --baselines: the trade-off table BASELINE was chosen from ---- */
    if (BASELINES) {
      const dark = slugs.slice().sort((a, b) => bare.get(a).pLum - bare.get(b).pLum)[0];
      /* sRGB grey with a given relative luminance — the inverse of lum() for a
         neutral. Used only for the crush readout in the last column. */
      const greyOf = L => {
        const inv = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
        return inv(L) * 255;
      };
      console.log(`\n  darkest frame: ${dark} — median sampled luminance ` +
                  `${bare.get(dark).medLum.toFixed(4)}; scrim colour ${WCAG.lum(SCRIM).toFixed(4)}`);
      console.log('\n  baseline   need 0   adjustments   its median after baseline');
      console.log('  --------   ------   -----------   -------------------------');
      for (let i = 20; i <= 50; i += i < 24 || i >= 40 ? 5 : 1) {
        const B = i / 100;
        const xs = slugs.map(s => {
          const flat = solveFlat(bare.get(s).pPixel);
          const need = WCAG.lum(WCAG.composite(SCRIM, bare.get(s).pPixel,
            Math.min(ALPHA_MAX, Math.round((flat + MARGIN) * 100) / 100)));
          const base = WCAG.composite(SCRIM, bare.get(s).pPixel, B);
          for (let j = 0; j <= STEPS; j++) {
            const x = j * ALPHA_STEP;
            if (WCAG.lum(WCAG.composite(SCRIM, base, x)) <= need + EPS) return Math.round(x * 100) / 100;
          }
          return null;
        });
        const nz = xs.filter(x => x > 0);
        /* Crush check: the darkest frame's MEDIAN pixel put through the
           baseline alone, so the column shows whether the baseline flattens
           the dark end or floats it. */
        const g = greyOf(bare.get(dark).medLum);
        const medAfter = WCAG.lum(WCAG.composite(SCRIM, { r: g, g: g, b: g }, B));
        console.log(`  ${B.toFixed(2)}       ${String(xs.filter(x => x === 0).length).padStart(2)}       ` +
          `${nz.length ? Math.min(...nz).toFixed(2) + '-' + Math.max(...nz).toFixed(2) : '   none   '}` +
          `              ${medAfter.toFixed(4)}`);
      }
      console.log('\n  The last column RISES with the baseline: the scrim colour is brighter');
      console.log('  than the darkest frames, so the baseline floors them rather than');
      console.log(`  crushing them. Chosen: ${BASELINE.toFixed(2)} — see the note beside BASELINE.`);
      return;
    }

    /* ---- solve, then re-measure the whole stack ---- */
    const rows = [];
    for (const slug of slugs) {
      const m = bare.get(slug);
      const sol = solve(m.pPixel);
      if (!sol) {
        throw new Error(`${slug}: no adjustment up to ${ALPHA_MAX} over a ${BASELINE} baseline ` +
          `reaches ${TARGET}:1 on a p90 pixel of rgb(${m.pPixel.r},${m.pPixel.g},${m.pPixel.b})`);
      }
      /* Re-measure the stack exactly as --verify will: baseline then adjustment
         over every sampled pixel, p90 of the result. The number in the table is
         therefore the number the page will actually show. */
      const after = await measure(page, slug, [BASELINE, sol.extra]);
      const ratio = ratioFromLum(after.pLum);
      if (ratio < TARGET) {
        throw new Error(`${slug}: stack re-measured at ${ratio.toFixed(2)}:1, below ${TARGET}`);
      }
      rows.push({ slug, pLum: m.pLum, bareRatio: ratioFromLum(m.pLum),
                  flat: sol.flat, extra: sol.extra, ratio,
                  effective: 1 - (1 - BASELINE) * (1 - sol.extra) });
      console.log(`  ${slug.padEnd(20)} p90 ${m.pLum.toFixed(4)}  +${fmt(sol.extra).padStart(4)}  ${ratio.toFixed(2)}:1`);
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

    const low   = rows.slice().sort((a, b) => a.ratio - b.ratio).slice(0, 3);
    const heavy = rows.slice().sort((a, b) => b.extra - a.extra).slice(0, 3);
    const nz    = rows.filter(r => r.extra > 0).map(r => r.extra);
    console.log(`\n  wrote assets/hero-scrim.css · ${rows.length} frames`);
    console.log(`  baseline ${BASELINE.toFixed(2)} · ${rows.length - nz.length} need no adjustment · ` +
      `adjustment ${nz.length ? Math.min(...nz).toFixed(2) + ' – ' + Math.max(...nz).toFixed(2) : 'none'}`);
    console.log(`  heaviest: ${heavy.map(r => `${r.slug} +${fmt(r.extra)}`).join(', ')}`);
    console.log(`  lowest ratios: ${low.map(r => `${r.slug} ${r.ratio.toFixed(2)}:1`).join(', ')}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('build-scrim failed: ' + e.message); process.exit(1); });
