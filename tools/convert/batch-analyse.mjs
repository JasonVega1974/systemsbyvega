/* Batch-analyse the remaining wave-3 sites. One pass, so the shared decisions
   surface together instead of twelve separate approval cycles. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
/* Derived from this file's own location (tools/convert/), not hardcoded, so the
   tooling works in any clone. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(HERE, '..', '..').replace(/\\/g, '/');

const SITES = ['roofing', 'caregiving', 'bin-cleaning', 'dog-walking', 'tattoo-studio',
               'delivery', 'moving', 'child-care', 'hvac', 'personal-trainer',
               'auto-body', 'auto-repair'];

const rows = [];
const notes = [];

for (const s of SITES) {
  const html = fs.readFileSync(`${R}/sites/${s}/index.html`, 'utf8');
  const cj = JSON.parse(fs.readFileSync(`${R}/sites/${s}/content.json`, 'utf8'));
  const styleBlocks = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
  const js = (html.match(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g) || []).join('\n');

  const defs = (html.match(/<(linearGradient|radialGradient|filter)\b/g) || []).length;
  const raf = (js.match(/requestAnimationFrame/g) || []).length;
  const rootTokens = (/:root\s*\{([\s\S]*?)\}/.exec(html)?.[1].match(/--[a-z0-9-]+\s*:/gi) || []).length;

  // head completeness
  const head = ['rel="canonical"', 'property="og:url"', 'name="twitter:card"', 'name="theme-color"']
    .filter(t => !html.includes(t));

  // consent
  const consent = /id="[a-z]*-?consent"/i.test(html);

  // fonts, read not guessed
  const fams = [...new Set([...html.matchAll(/family=([A-Za-z+]+)/g)].map(m => m[1].replace(/\+/g, ' ')))];

  // schema shape
  const shapeIssues = [];
  if (!cj.brand?.tagline) shapeIssues.push('no brand.tagline');
  if (!cj.brand?.leadEmail) shapeIssues.push('no leadEmail');
  if (!cj.serviceArea?.region) shapeIssues.push('no serviceArea');
  for (const k of ['plans', 'packages']) if (cj[k]) shapeIssues.push(k + '->pricing');
  if (cj.pricing && !Array.isArray(cj.pricing)) shapeIssues.push('pricing is OBJECT');
  const tiers = Array.isArray(cj.pricing) ? cj.pricing
              : Array.isArray(cj.plans) ? cj.plans
              : Array.isArray(cj.packages) ? cj.packages : [];
  const priceTypes = [...new Set(tiers.map(t => typeof t.price))].filter(Boolean);
  if (priceTypes.includes('string')) shapeIssues.push('price=string');
  for (const f of ['best', 'featured', 'popular']) {
    if (tiers.some(t => typeof t[f] === 'boolean')) shapeIssues.push(f + '->highlight');
    if (tiers.some(t => typeof t[f] === 'string')) shapeIssues.push(f + '(str)->blurb');
  }
  if (tiers.some(t => typeof t.features === 'string')) shapeIssues.push('features=string');
  if ((cj.testimonials || []).some(t => 'author' in t)) shapeIssues.push('author->name');
  if ((cj.stats || []).some(t => 'lab' in t)) shapeIssues.push('lab->label');
  if ((cj.gallery || []).some(t => 'cat' in t)) shapeIssues.push('cat->tag');

  // boot marker candidate
  const bm = /(\w+\([^)]*\)\s*;)\s*[\r\n]+\s*fetch\('content\.json'/.exec(js);

  rows.push({ s, defs, raf, rootTokens, keys: Object.keys(cj).length,
              head: head.length, consent, fams: fams.slice(0, 3).join('/'),
              shape: shapeIssues, boot: bm ? bm[1] : '?' });
}

const pad = (v, n) => String(v).padEnd(n);
console.log(pad('site', 18) + pad('defs', 5) + pad('rAF', 4) + pad('tok', 4) + pad('keys', 5) +
            pad('head-miss', 10) + pad('consent', 8) + 'boot');
console.log('-'.repeat(84));
for (const r of rows) {
  console.log(pad(r.s, 18) + pad(r.defs, 5) + pad(r.raf, 4) + pad(r.rootTokens, 4) +
              pad(r.keys, 5) + pad(r.head, 10) + pad(r.consent ? 'yes' : 'NO', 8) + r.boot);
}

console.log('\n=== fonts (read from fontsHref) ===');
for (const r of rows) console.log('  ' + pad(r.s, 18) + r.fams);

console.log('\n=== schema work per site ===');
for (const r of rows) console.log('  ' + pad(r.s, 18) + (r.shape.length ? r.shape.join(', ') : 'clean'));

console.log('\n=== aggregate ===');
console.log('  sites with a real animation (rAF>1):', rows.filter(r => r.raf > 1).map(r => r.s).join(', ') || 'none');
console.log('  sites passing §6.1 (defs>=6):      ', rows.filter(r => r.defs >= 6).map(r => r.s).join(', ') || 'none');
console.log('  sites needing consent injection:   ', rows.filter(r => !r.consent).length);
console.log('  sites with incomplete <head>:      ', rows.filter(r => r.head > 0).length);
