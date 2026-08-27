/* usage: node tools/convert/make-og-wrappers.mjs [outDir]
   Then: node tools/convert/serve.mjs <outDir> [port]
/* Build one exact-size HTML wrapper per niche so headless Chrome can rasterise
   the card with the niche's real webfonts loaded. Throwaway — the wrappers are
   not committed; only the resulting og.png is. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

/* Derived from this file's own location (tools/convert/), not hardcoded, so the
   tooling works in any clone. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..').replace(/\\/g, '/');
/* Where the throwaway wrappers land. An argument, not a constant: this used to
   point at one machine's scratchpad. The wrappers are never committed — only the
   og.png rasterised from them is.
     node tools/convert/make-og-wrappers.mjs [outDir] */
const OUT = (process.argv[2] || path.join(os.tmpdir(), 'sitelab-og')).replace(/\\/g, '/');
fs.mkdirSync(OUT, { recursive: true });

function deepMerge(base, over) {
  if (Array.isArray(over)) return over;
  if (!over || typeof over !== 'object') return over === undefined ? base : over;
  const out = Object.assign({}, base);
  for (const k of Object.keys(over)) {
    out[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k]))
      ? deepMerge(base[k], over[k]) : deepMerge(undefined, over[k]);
  }
  return out;
}

/* One entry per CARD, not per niche: a themed niche contributes one for each
   themes/<t>/ that has an og.svg, named "<slug>-<theme>" so the wrapper files
   and the screenshots that follow stay unambiguous. */
function cards() {
  const out = [];
  for (const d of fs.readdirSync(REPO + '/niches', { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const base = `${REPO}/niches/${d.name}`;
    const themes = `${base}/themes`;
    if (fs.existsSync(themes)) {
      for (const t of fs.readdirSync(themes)) {
        if (fs.existsSync(`${themes}/${t}/og.svg`)) {
          out.push({ slug: d.name, theme: t, dir: `${themes}/${t}`, name: `${d.name}-${t}` });
        }
      }
    } else if (fs.existsSync(`${base}/og.svg`)) {
      out.push({ slug: d.name, theme: '', dir: base, name: d.name });
    }
  }
  return out;
}

for (const card of cards()) {
  const s = card.name;
  const svg = fs.readFileSync(`${card.dir}/og.svg`, 'utf8');
  let cj = JSON.parse(fs.readFileSync(`${REPO}/niches/${card.slug}/content.json`, 'utf8'));
  if (card.theme) {
    const ov = `${card.dir}/content.json`;
    if (fs.existsSync(ov)) cj = deepMerge(cj, JSON.parse(fs.readFileSync(ov, 'utf8')));
  }
  const fonts = (cj.seo || {}).fontsHref || '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts ? `<link rel="stylesheet" href="${fonts}">` : ''}
<style>
  html,body{margin:0;padding:0;background:#000;width:1200px;height:630px;overflow:hidden}
  svg{display:block;width:1200px;height:630px}
</style></head>
<body>
${svg}
</body></html>`;
  fs.writeFileSync(`${OUT}/${s}.html`, html, 'utf8');
  console.log('  ' + s.padEnd(18) + 'fonts: ' + (fonts ? fonts.slice(38, 78) + '…' : 'NONE'));
}
console.log('\nwrappers in ' + OUT);
