#!/usr/bin/env node
/* runtime-check.js — load a BUILT page in a real browser and assert it runs.
 *
 * WHY THIS EXISTS
 * ---------------
 * gate.mjs and qa-site.js both validate TEXT: element ids, selector counts,
 * JSON parse, "does this content value appear in the page". Fourteen converted
 * sites passed every one of those checks while their renderers were dead on
 * load — because the content values sit in the inlined DEFAULT_CONTENT blob, so
 * they are present in the source whether or not a single line of JS ever runs.
 *
 * Two real bugs hid behind that for four waves:
 *   1. the shell emitted base.js last, so `var SL = window.SL` in every
 *      niche.js read undefined and threw on its first line;
 *   2. content.json namespaces per-niche data under `niche`, and nothing
 *      unpacked it, so every renderer reading c.<nicheKey> got undefined.
 * Both are invisible to a text check and obvious to a browser.
 *
 * STANDING RULE: this check FAILS when it cannot run. A missing browser is an
 * unknown result, not a pass — that distinction is the whole point of the file.
 *
 * Usage:  node tools/runtime-check.js <builtDir> [--quiet]
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
                '.webp': 'image/webp', '.ico': 'image/x-icon' };

/* Noise that is not a defect in the page under test: the harness serves no
   favicon, and a missing favicon has no bearing on whether the site runs.
   Keep this list SHORT and specific — every entry is a thing we stop seeing. */
const IGNORE = [/\/favicon\.ico/i];

function resolvePlaywright() {
  const tried = [];
  const candidates = [
    process.env.SITELAB_PLAYWRIGHT,
    'playwright',
    'C:/Users/JasonVega/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright',
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch (e) { tried.push(c); }
  }
  throw new Error('playwright not found. Tried: ' + tried.join(', ') +
                  '\n  Set SITELAB_PLAYWRIGHT to a playwright install to override.');
}

function serve(root) {
  const ROOT = path.resolve(root);
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      /* Answer the browser's automatic favicon probe rather than 404ing it.
         Chrome logs a bare "Failed to load resource: 404" with no URL in the
         message, so it cannot be filtered downstream — killing it at the source
         is the only way to keep the error list meaningful. */
      if (p === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (p.endsWith('/')) p += 'index.html';
      /* path.join yields backslashes on Windows, so ROOT must be resolved too
         or every startsWith() guard below fails and the whole site 404s. */
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); return res.end('not found');
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(fs.readFileSync(f));
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

async function launch(pw) {
  /* Prefer the system Chrome channel: the bundled chromium download is often
     absent on a dev box, and a real Chrome is a more honest target anyway. */
  try { return await pw.chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { return await pw.chromium.launch({ headless: true }); }
}

async function main() {
  const dir = process.argv[2];
  const quiet = process.argv.includes('--quiet');
  if (!dir) { console.error('usage: node tools/runtime-check.js <builtDir>'); process.exit(2); }
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    console.error('runtime: no index.html in ' + dir); process.exit(2);
  }

  const pw = resolvePlaywright();
  const { srv, port } = await serve(dir);
  const browser = await launch(pw);
  const page = await browser.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('UNCAUGHT ' + e.message));
  page.on('requestfailed', r => errors.push('REQUEST FAILED ' + r.url()));

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  /* boot() runs on DOMContentLoaded and then fetches content.json and
     re-renders, so the second render must be given a chance to throw too. */
  await page.waitForTimeout(1200);

  /* Prove the renderer actually ran, not merely that nothing threw: a page
     whose niche.js never defined renderContent produces zero errors AFTER the
     typeof guard swallows it. Absent and correct are different results. */
  const ran = await page.evaluate(() =>
    typeof window.renderContent === 'function' && !!window.CONTENT);

  await browser.close();
  srv.close();

  const real = errors.filter(t => !IGNORE.some(re => re.test(t)));
  const ok = real.length === 0 && ran;

  if (!quiet) {
    if (!ran) console.log('  FAIL  runtime: renderContent never defined, or CONTENT never set');
    real.forEach(t => console.log('  FAIL  runtime: ' + t.split('\n')[0].slice(0, 140)));
    if (ok) console.log('  PASS  runtime: page loads and renders, 0 console errors');
  }
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error('  FAIL  runtime: ' + e.message); process.exit(1); });
