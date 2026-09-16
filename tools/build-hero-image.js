#!/usr/bin/env node
'use strict';
/* build-hero-image.js — re-encode the hero photograph to a shippable JPEG.
 *
 * WHY A TOOL AND NOT A ONE-OFF. The hero photo is the largest above-the-fold
 * byte on the landing page, so how it was produced has to be reproducible: the
 * source, the width, the quality that was actually chosen and the budget it was
 * chosen against. A drag into an online converter records none of that.
 *
 * WHY CHROMIUM. There is no image library in this repo and none may be added
 * (Ruling: no new npm dependencies). Chromium is already here for build-shots,
 * build-scrim, hero-contrast and a11y-sweep, and it carries a complete JPEG
 * encoder behind canvas.toDataURL(). tools/lib/browser.js is the one resolver
 * for it, so this file adds no second fallback chain.
 *
 * WHAT IT DOES. Decodes assets/hero/owner-source.png in a page, draws it into a
 * canvas at OUT_W, and steps the JPEG quality DOWN from Q_HI until the encoded
 * bytes fit BUDGET. The quality actually used is printed, not assumed.
 *
 * WHY NO @2x. The source is 1919px wide. A 3840px "@2x" would be an upscale —
 * bytes spent on interpolation rather than on detail — and it would not fit the
 * ~400 KB the brief allows anyway. There is no 2x file, deliberately.
 *
 *   node tools/build-hero-image.js            encode assets/hero/owner.jpg
 *   node tools/build-hero-image.js --profile  also print the column-brightness
 *                                             profile used to place the copy
 */
const fs   = require('fs');
const path = require('path');
const http = require('http');

const { launchBrowser } = require('./lib/browser');

const ROOT   = path.resolve(__dirname, '..');
const SRC    = path.join(ROOT, 'assets', 'hero', 'owner-source.png');
const OUT    = path.join(ROOT, 'assets', 'hero', 'owner.jpg');

const OUT_W   = 1920;
const BUDGET  = 250 * 1024;   /* the brief's ceiling for the 1920w file */
const Q_HI    = 0.86;
const Q_LO    = 0.40;
const Q_STEP  = 0.02;

const PROFILE = process.argv.includes('--profile');

/* Served rather than read off disk: a canvas that has drawn a file:// image is
   tainted and toDataURL() throws a SecurityError on it. Same reason
   tools/hero-contrast.js serves the page it measures. */
function serve() {
  return new Promise((res, rej) => {
    const s = http.createServer((req, r) => {
      const p0 = decodeURIComponent(req.url.split('?')[0]);
      /* One blank page to run the canvas in, same origin as the image it
         draws — a canvas that has drawn a cross-origin (or file://) bitmap is
         tainted and toDataURL() throws on it. */
      if (p0 === '/') {
        r.writeHead(200, { 'content-type': 'text/html' });
        return r.end('<!doctype html><meta charset="utf-8"><title>encode</title>');
      }
      const f = path.join(ROOT, p0);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.writeHead(404); return r.end('nf');
      }
      r.writeHead(200, { 'content-type': 'image/png' });
      r.end(fs.readFileSync(f));
    });
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
}

/* In-page: decode, scale, then encode at each quality until one fits. The loop
   runs in the browser because every encode is a canvas call; only the winning
   data URL crosses back. */
const ENCODE = async (arg) => {
  const { url, outW, budget, qHi, qLo, qStep } = arg;
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = () => rej(new Error('source decode failed'));
    img.src = url;
  });
  const outH = Math.round(outW * (img.naturalHeight / img.naturalWidth));
  const cv = document.createElement('canvas');
  cv.width = outW; cv.height = outH;
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, 0, 0, outW, outH);

  const bytes = (d) => Math.floor((d.length - (d.indexOf(',') + 1)) * 3 / 4);
  const tried = [];
  for (let q = qHi; q >= qLo - 1e-9; q -= qStep) {
    const qq = Math.round(q * 100) / 100;
    const d = cv.toDataURL('image/jpeg', qq);
    const n = bytes(d);
    tried.push({ q: qq, bytes: n });
    if (n <= budget) {
      return { ok: true, q: qq, data: d, tried,
               srcW: img.naturalWidth, srcH: img.naturalHeight, outW, outH };
    }
  }
  return { ok: false, tried, srcW: img.naturalWidth, srcH: img.naturalHeight, outW, outH };
};

/* The copy sits on the photo's dark left region and nothing may sit on the
   person. Both edges are properties of the PIXELS, so they are read off the
   image rather than eyeballed: mean luminance per column, reported as the
   fraction of the width at which it first crosses a threshold. */
const COLUMNS = async (arg) => {
  const { url } = arg;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, cv.width, cv.height).data;
  const cols = [];
  const STEP = 20;
  for (let x = 0; x < cv.width; x += STEP) {
    let sum = 0, n = 0;
    for (let y = 0; y < cv.height; y += 4) {
      const p = (y * cv.width + x) * 4;
      sum += 0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2];
      n++;
    }
    cols.push({ x, pct: Math.round(x / cv.width * 1000) / 10, mean: Math.round(sum / n) });
  }
  return cols;
};

async function main() {
  if (!fs.existsSync(SRC)) throw new Error('missing ' + path.relative(ROOT, SRC));
  const before = fs.statSync(SRC).size;

  const { s, port } = await serve();
  const browser = await launchBrowser();
  const page = await (await browser.newContext()).newPage();
  const url = `http://127.0.0.1:${port}/assets/hero/owner-source.png`;
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

  if (PROFILE) {
    const cols = await page.evaluate(COLUMNS, { url });
    console.log('\n  column mean luminance (0-255), every 20px of the source:');
    cols.forEach(c => console.log(
      '   ' + String(c.pct).padStart(5) + '%  ' + String(c.mean).padStart(3) + '  ' +
      '#'.repeat(Math.round(c.mean / 3))));
  }

  const r = await page.evaluate(ENCODE,
    { url, outW: OUT_W, budget: BUDGET, qHi: Q_HI, qLo: Q_LO, qStep: Q_STEP });
  if (!r.ok) {
    console.error('  no quality between ' + Q_LO + ' and ' + Q_HI + ' fits ' +
                  Math.round(BUDGET / 1024) + ' KB:');
    r.tried.forEach(t => console.error('    q ' + t.q + ' -> ' + t.bytes + ' B'));
    process.exit(1);
  }

  const b64 = r.data.slice(r.data.indexOf(',') + 1);
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(OUT, buf);

  await browser.close();
  s.close();

  console.log('\n  source  ' + path.relative(ROOT, SRC) +
              '  ' + r.srcW + 'x' + r.srcH + '  ' + before + ' B (' +
              (before / 1024).toFixed(0) + ' KB)');
  r.tried.forEach(t => console.log('    q ' + t.q.toFixed(2) + '  ' + t.bytes + ' B' +
                                   (t.q === r.q ? '   <- written' : '')));
  console.log('  output  ' + path.relative(ROOT, OUT) +
              '  ' + r.outW + 'x' + r.outH + '  ' + buf.length + ' B (' +
              (buf.length / 1024).toFixed(0) + ' KB)  quality ' + r.q);
  console.log('  saved   ' + (before - buf.length) + ' B, ' +
              Math.round((1 - buf.length / before) * 100) + '% smaller');
  console.log('  no @2x: the source is ' + r.srcW + 'px wide, so a 3840px file would be an upscale.');
}

main().catch(e => { console.error(e); process.exit(1); });
