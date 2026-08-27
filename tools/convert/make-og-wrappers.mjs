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

const slugs = fs.readdirSync(REPO + '/niches', { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

for (const s of slugs) {
  const svg = fs.readFileSync(`${REPO}/niches/${s}/og.svg`, 'utf8');
  const cj = JSON.parse(fs.readFileSync(`${REPO}/niches/${s}/content.json`, 'utf8'));
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
