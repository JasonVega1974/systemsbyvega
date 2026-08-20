#!/usr/bin/env node
/* ============================================================================
   build-previews.js — emit /a /b /c and /preview from the built homepage
   ----------------------------------------------------------------------------
   TEMPORARY. This exists only so Jason can click between three dark design
   directions on the preview deployment. Once he picks one, the winner's CSS
   becomes assets/sbv.css and this file and the three routes are deleted.

   It deliberately does NOT touch build-catalog.js. It reads the already-built
   index.html and rewrites exactly two things — the stylesheet href and the
   <title> — then injects a switcher. Same markup, same data hooks, same IDs,
   same JS. The only variable between the three pages is the design system,
   which is the whole point of the exercise: anything else that differed would
   make the comparison dishonest.

   Run: node tools/build-previews.js      (after build-catalog.js)
   ========================================================================= */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'index.html');

const DIRECTIONS = [
  { key: 'a', css: 'sbv-a.css', name: 'Neon Main Street after dark',
    blurb: 'Warm charcoal, electric cyan, per-family neon. Cards glow like lit shopfronts.' },
  { key: 'b', css: 'sbv-b.css', name: 'Premium operator console',
    blurb: 'Cool near-black, milled panels, violet accent. The catalog as an instrument.' },
  { key: 'c', css: 'sbv-c.css', name: 'Bold catalog, dark edition',
    blurb: 'Black ground, a saturated colour band per family. Printed ink, not light.' },
  { key: 'd', css: 'sbv-d.css', name: 'House colours',
    blurb: "Direction B's layout in the original Systems by Vega identity — navy, amber, Archivo, the V-square.",
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
];

function switcher(active) {
  const links = DIRECTIONS.map(d =>
    `<a href="/${d.key}/"${d.key === active ? ' aria-current="page"' : ''}>${d.key.toUpperCase()}</a>`
  ).join('');
  return `
<div id="dirbar" role="navigation" aria-label="Design direction">
  <span>Direction</span>${links}<a href="/preview/">?</a>
</div>
<style>
#dirbar{position:fixed;right:12px;bottom:12px;z-index:200;display:flex;align-items:center;gap:2px;
  padding:5px 6px;border-radius:999px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.18);font:600 11px/1 ui-monospace,Consolas,monospace;
  letter-spacing:.1em;text-transform:uppercase;box-shadow:0 6px 24px rgba(0,0,0,.5)}
#dirbar span{color:#9aa;padding:0 8px 0 6px}
#dirbar a{color:#e8e8ef;text-decoration:none;padding:7px 10px;border-radius:999px;min-width:30px;
  text-align:center;transition:background .15s,color .15s}
#dirbar a:hover{background:rgba(255,255,255,.14)}
#dirbar a[aria-current="page"]{background:#fff;color:#111}
@media (max-width:820px){#dirbar{bottom:86px;right:10px}}
@media print{#dirbar{display:none}}
</style>`;
}

const WORDS = ["no","One","Two","Three","Four","Five","Six"];
const COUNT_WORD = WORDS[DIRECTIONS.length] || String(DIRECTIONS.length);

function main() {
  if (!fs.existsSync(PAGE)) {
    console.error('index.html not found — run node tools/build-catalog.js first');
    process.exit(1);
  }
  const base = fs.readFileSync(PAGE, 'utf8');

  if (!base.includes('/assets/sbv.css')) {
    console.error('index.html does not link /assets/sbv.css — refusing to guess');
    process.exit(1);
  }

  DIRECTIONS.forEach(d => {
    const cssPath = path.join(ROOT, 'assets', d.css);
    if (!fs.existsSync(cssPath)) {
      console.error('missing ' + d.css + ' — refusing to emit a page with no design system');
      process.exit(1);
    }

    let html = base
      .split('/assets/sbv.css').join('/assets/' + d.css);

    // Swap the webfont request when a direction uses a different family set.
    // Built by locating the tag rather than by regex, so a stray character in
    // a Google Fonts URL can never quietly fail to match.
    if (d.fonts) {
      const i = html.indexOf('<link href="https://fonts.googleapis.com');
      if (i === -1) {
        console.error('no Google Fonts <link> found in index.html — refusing to emit /' +
                      d.key + ' with the wrong typefaces');
        process.exit(1);
      }
      const j = html.indexOf('>', i);
      html = html.slice(0, i) + '<link href="' + d.fonts + '" rel="stylesheet">' + html.slice(j + 1);
    }

    html = html
      .replace(/<title>[\s\S]*?<\/title>/,
        '<title>' + d.key.toUpperCase() + ' — ' + d.name + ' · Systems by Vega</title>')
      // preview routes must never be indexed or treated as canonical
      .replace(/<link rel="canonical"[^>]*>/, '<meta name="robots" content="noindex, nofollow">')
      .replace('</body>', switcher(d.key) + '\n</body>');

    const dir = path.join(ROOT, d.key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  });

  const cards = DIRECTIONS.map(d => `
    <li>
      <a class="card" href="/${d.key}/">
        <span class="k">${d.key.toUpperCase()}</span>
        <span class="n">${d.name}</span>
        <span class="b">${d.blurb}</span>
      </a>
    </li>`).join('');

  const index = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Design directions · Systems by Vega</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0C0C10;color:#EDEDF2;font:16px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;
  min-height:100vh;display:grid;place-items:center;padding:40px 22px}
.wrap{width:100%;max-width:760px}
h1{font-size:clamp(26px,5vw,40px);line-height:1.1;letter-spacing:-.025em;margin-bottom:10px}
p.sub{color:#A0A0B0;margin-bottom:30px;max-width:60ch}
ul{list-style:none;display:grid;gap:12px}
.card{display:grid;grid-template-columns:52px 1fr;gap:4px 18px;align-items:start;
  padding:22px;background:#16161E;border:1px solid #2B2B38;border-radius:12px;
  text-decoration:none;color:inherit;transition:border-color .16s,transform .16s,background .16s}
.card:hover{border-color:#6E6EFF;transform:translateY(-2px);background:#1B1B25}
.card:focus-visible{outline:2px solid #8A8AFF;outline-offset:3px}
.k{grid-row:1/3;font:700 22px/1 ui-monospace,Consolas,monospace;color:#8A8AFF;
  display:grid;place-items:center;height:52px;width:52px;border:1px solid #2B2B38;border-radius:10px}
.n{font-weight:700;font-size:18px}
.b{color:#A0A0B0;font-size:14.5px}
.foot{margin-top:28px;font:12px/1.7 ui-monospace,Consolas,monospace;color:#70707E}
</style></head><body>
<div class="wrap">
  <h1>${COUNT_WORD} dark directions</h1>
  <p class="sub">Same content, same structure, same data. Only the design system differs.
  Pick one and the other ${DIRECTIONS.length - 1} get deleted.</p>
  <ul>${cards}
  </ul>
  <p class="foot">Preview only · noindex · not linked from the live site</p>
</div>
</body></html>`;

  fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'preview', 'index.html'), index);

  console.log('previews built: ' + DIRECTIONS.map(d => '/' + d.key).join(' ') + ' /preview');
  DIRECTIONS.forEach(d => console.log('  /' + d.key + '  ' + d.name));
}

main();
