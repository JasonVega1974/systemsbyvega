import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
/* Derived from this file's own location (tools/convert/), not hardcoded, so the
   tooling works in any clone. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..').replace(/\\/g, '/');
const slug = process.argv[2];
const html = fs.readFileSync(`${REPO}/sites/${slug}/index.html`, 'utf8');
const raw  = fs.readFileSync(`${REPO}/sites/${slug}/content.json`, 'utf8');
const cj   = JSON.parse(raw);
const L = html.split(/\r?\n/);
const line = i => html.slice(0, i).split(/\r?\n/).length;

console.log(`=== ${slug} — ${L.length} lines, ${(html.length/1024).toFixed(1)} KB\n`);

console.log('--- segment boundaries ---');
for (const [label, re] of [['<style> open', /<style[^>]*>/g], ['</style>', /<\/style>/g],
                           ['<script> open', /<script(?![^>]*\bsrc=)[^>]*>/g], ['</script>', /<\/script>/g]]) {
  const at = [...html.matchAll(re)].map(m => line(m.index));
  console.log('  ' + label.padEnd(16) + at.join(', '));
}

console.log('\n--- top-level sections ---');
for (const m of html.matchAll(/<(section|header|footer|nav|main)\b[^>]*\bid="([A-Za-z0-9_-]+)"/g)) {
  console.log('  ' + m[1].padEnd(8) + '#' + m[2].padEnd(18) + '@' + line(m.index));
}

console.log('\n--- :root tokens ---');
const root = /:root\s*\{([\s\S]*?)\}/.exec(html);
const decl = root ? [...root[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)] : [];
decl.forEach(([, n, v]) => console.log('  ' + n.padEnd(18) + v.trim()));
console.log('  total: ' + decl.length);

console.log('\n--- literal colours in CSS (need tokenising) ---');
const styleBlocks = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n')
  .replace(/:root\s*\{[\s\S]*?\}/, '');
const lits = {};
for (const m of styleBlocks.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) lits[m[0]] = (lits[m[0]] || 0) + 1;
const litList = Object.entries(lits).sort((a, b) => b[1] - a[1]);
console.log('  ' + (litList.length ? litList.map(([h, c]) => `${h}×${c}`).join('  ') : 'none'));

console.log('\n--- SVG defs ---');
const defs = (html.match(/<(linearGradient|radialGradient|filter)\b/g) || []);
const byType = defs.reduce((a, t) => (a[t] = (a[t] || 0) + 1, a), {});
console.log('  ' + (defs.length ? JSON.stringify(byType) : 'NONE') + `   total ${defs.length}`);

console.log('\n--- animation ---');
const js = (html.match(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g) || []).join('\n');
console.log('  requestAnimationFrame: ' + (js.match(/requestAnimationFrame/g) || []).length);
console.log('  @keyframes:            ' + (styleBlocks.match(/@keyframes/g) || []).length);
console.log('  prefers-reduced-motion:' + (html.match(/prefers-reduced-motion/g) || []).length);

console.log('\n--- JS functions ---');
const fns = new Set();
for (const m of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) fns.add(m[1]);
for (const m of js.matchAll(/(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) fns.add(m[1]);
console.log('  ' + [...fns].join(', '));

console.log('\n--- content.json shape ---');
function shape(o, ind = '  ') {
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) {
      const t = v.length && typeof v[0] === 'object' ? '[{' + Object.keys(v[0]).join(',') + '}]' : '[]';
      console.log(ind + k.padEnd(16) + t + '  ×' + v.length);
    } else if (v && typeof v === 'object') {
      console.log(ind + k.padEnd(16) + '{' + Object.keys(v).join(',') + '}');
    } else {
      console.log(ind + k.padEnd(16) + typeof v + '  ' + JSON.stringify(v).slice(0, 40));
    }
  }
}
shape(cj);

console.log('\n--- canonical-schema gaps ---');
const need = ['brand.name','brand.tagline','brand.phone','brand.email','brand.leadEmail','brand.city',
              'serviceArea.region','serviceArea.short','serviceArea.cities'];
const get = p => p.split('.').reduce((o,k)=>o==null?o:o[k], cj);
need.forEach(p => { const v = get(p); if (v==null||v==='') console.log('  MISSING  ' + p); });
if (!cj.seo) console.log('  MISSING  seo (must be built from <head>)');
for (const [k, why] of [['plans','-> pricing[]'],['packages','-> pricing[]'],['addons','niche extension?']])
  if (cj[k]) console.log('  RENAME   ' + k + '  ' + why);
for (const arr of ['pricing','plans','packages']) {
  if (cj[arr] && !Array.isArray(cj[arr])) { console.log("  SHAPE    "+arr+" is an OBJECT, canonical wants an array: {"+Object.keys(cj[arr]).join(",")+"}"); continue; }
  (cj[arr]||[]).forEach((r,i)=>{
    if ('best' in r) console.log(`  RETIRED  ${arr}[${i}].best -> highlight`);
    if ('featured' in r) console.log(`  RETIRED  ${arr}[${i}].featured -> highlight`);
    if (typeof r.price === 'string') console.log(`  TYPE     ${arr}[${i}].price is string -> number`);
    if (typeof r.features === 'string') console.log(`  TYPE     ${arr}[${i}].features is string -> array`);
  });
}
(cj.testimonials||[]).forEach((r,i)=>{ if ('author' in r) console.log(`  RENAME   testimonials[${i}].author -> name`); });
(cj.stats||[]).forEach((r,i)=>{ if ('lab' in r) console.log(`  RENAME   stats[${i}].lab -> label`); });
(cj.gallery||[]).forEach((r,i)=>{ if ('cat' in r) console.log(`  RENAME   gallery[${i}].cat -> tag`); });
