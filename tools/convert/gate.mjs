/* Conversion gate: does the rebuilt page reproduce the original site?
   node gate.mjs <slug> <builtDir> */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

/* Derived from this file's own location (tools/convert/), not hardcoded, so the
   tooling works in any clone. These scripts moved here out of a session
   scratchpad; the absolute path they used to carry pointed at one machine. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..').replace(/\\/g, '/');
/* Flags are stripped before positionals so --theme can sit anywhere without
   shifting the optional pinned-original argument. */
const argv = process.argv.slice(2);
const tIdx = argv.indexOf('--theme');
const theme = tIdx > -1 ? argv[tIdx + 1] : '';
/* Guard the -1 sentinel: with no --theme, tIdx is -1 and "i !== tIdx + 1"
   would drop argv[0] — the slug. */
const pos = argv.filter((a, i) =>
  (tIdx < 0 || (i !== tIdx && i !== tIdx + 1)) && !a.startsWith('--'));
const slug = pos[0];
const builtDir = pos[1];
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
/* The merged view is what the build inlines, so it is what the single-source
   check has to compare against. */
function nicheContent() {
  const base = JSON.parse(fs.readFileSync(`${REPO}/niches/${slug}/content.json`, 'utf8'));
  if (!theme) return base;
  const ov = `${REPO}/niches/${slug}/themes/${theme}/content.json`;
  return fs.existsSync(ov) ? deepMerge(base, JSON.parse(fs.readFileSync(ov, 'utf8'))) : base;
}
const CFG = (await import('./convert.' + slug + '.mjs').catch(() => ({ default: null }))).default;

/* Optional 4th arg: a pinned copy of the ORIGINAL to compare against — e.g. an
   extract of git HEAD. Needed once the build has overwritten sites/<slug>/,
   because otherwise the gate compares the new file with itself and every check
   passes vacuously. */
const origDir = pos[2] || (theme ? `${REPO}/sites/${slug}/${theme}`
                                 : `${REPO}/sites/${slug}`);
const A = fs.readFileSync(`${origDir}/index.html`, 'utf8');
const B = fs.readFileSync(`${builtDir}/index.html`, 'utf8');

let fail = 0, warn = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (d ? '   ' + d : '')); if (!ok) fail++; };
const soft = (n, ok, d) => { console.log((ok ? 'PASS  ' : 'warn  ') + n + (d ? '   ' + d : '')); if (!ok) warn++; };
const diff = (a, b) => ({ onlyA: [...a].filter(x => !b.has(x)), onlyB: [...b].filter(x => !a.has(x)) });

/* normalise the original's identity tokens + literals into canonical names */
const MAP = CFG ? CFG.tokenMap : {};
/* The literals map in the config was derived from ONE variant (dj was converted
   from blue), so for another theme its hexes never appear and every themed
   declaration reads as missing. Derive the map from the THEME own niche.css
   instead: each token there declares that theme value, which is exactly the
   value -> token normalisation this comparison needs. */
let LIT = CFG ? CFG.literals : {};
if (theme) {
  const tcss = REPO + '/niches/' + slug + '/themes/' + theme + '/niche.css';
  if (fs.existsSync(tcss)) {
    const themed = {};
    for (const m of fs.readFileSync(tcss, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      const tok = m[1], val = m[2].trim();
      if (!/^(#|rgba?\()/i.test(val)) continue;
      if (!(val in themed)) themed[val] = tok;
      /* Zero alpha is written both ways in these sources — rgba(r,g,b,0) and
         rgba(r,g,b,.0) — and a token records only one. Register the other
         spelling against the same token or half of them read as missing. */
      const alt = /,\s*\.0\)$/.test(val) ? val.replace(/,\s*\.0\)$/, ',0)')
                : /,\s*0\)$/.test(val)   ? val.replace(/,\s*0\)$/, ',.0)') : null;
      if (alt && !(alt in themed)) themed[alt] = tok;
    }
    /* MERGE, do not replace. The config's map still carries entries the theme's
       :root does not declare, and a blue hex simply never appears in green's
       original, so keeping both is harmless and losing either is not. */
    LIT = Object.assign({}, LIT, themed);
  }
}
const NORM_SENTINEL = '\u0000';
const normTok = s => {
  let t = s;
  /* Two phases with a sentinel — the SAME defect convert.mjs's rename() had.
     Boundary matching stops a substring collision (--ink vs --ink-2); it does
     NOT stop a chain. When one token's target is another's source, a single
     pass rewrites its own output and the gate normalises the original into the
     corrupted value — so it agreed with a broken build and reported PASS.
     This function must stay in step with rename(); if one is changed the other
     has to be, or the gate stops testing anything. */
  const mk = Object.keys(MAP).sort((x, y) => y.length - x.length);
  for (let i = 0; i < mk.length; i++) {
    const ph = NORM_SENTINEL + i + NORM_SENTINEL;
    t = t.split('var(' + mk[i] + ')').join('var(' + ph + ')')
         .split('var(' + mk[i] + ',').join('var(' + ph + ',');
  }
  for (let i = 0; i < mk.length; i++)
    t = t.split(NORM_SENTINEL + i + NORM_SENTINEL).join(MAP[mk[i]]);
  for (const k of Object.keys(LIT).sort((x, y) => y.length - x.length)) t = t.split(k).join('var(' + LIT[k] + ')');
  return t;
};

const cssOf = s => (s.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/<\/?style[^>]*>/g, '').replace(/<\/?noscript>/g, '');

// 1. element ids
{
  const g = s => new Set([...s.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
  const a = g(A), b = g(B), d = diff(a, b);
  check('element ids', d.onlyA.length === 0, `orig=${a.size} built=${b.size}` +
    (d.onlyA.length ? '  MISSING: ' + d.onlyA.join(',') : '') + (d.onlyB.length ? '  added: ' + d.onlyB.join(',') : ''));
}

// 2. CSS selectors
{
  const g = s => new Set([...cssOf(s).matchAll(/(^|\})\s*([^{}@][^{}]*?)\s*\{/g)]
    .map(m => m[2].replace(/\s+/g, ' ').trim()).filter(Boolean));
  const a = g(A), b = g(B), d = diff(a, b);
  check('CSS selectors', d.onlyA.length === 0, `orig=${a.size} built=${b.size}` +
    (d.onlyA.length ? '  MISSING: ' + d.onlyA.slice(0, 5).join(' | ') : ''));
}

// 3. CSS declarations (token-normalised)
{
  // normalise the ORIGINAL only — the built page is already canonical
  const g = (s, canon) => new Set([...(canon ? normTok(cssOf(s)) : cssOf(s)).replace(/:root\s*\{[\s\S]*?\}/g, '')
    .matchAll(/([a-z-]+)\s*:\s*([^;{}]+)[;}]/g)].map(m => (m[1] + ':' + m[2]).replace(/\s+/g, '')));
  const a = g(A, true), b = g(B, false), d = diff(a, b);
  check('CSS declarations', d.onlyA.length === 0, `orig=${a.size} built=${b.size}` +
    (d.onlyA.length ? `  MISSING ${d.onlyA.length}: ` + d.onlyA.slice(0, 4).join(' | ') : ''));
}

// 4. JS functions
{
  const g = s => {
    const js = (s.match(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g) || []).join('\n');
    const o = new Set();
    for (const m of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) o.add(m[1]);
    for (const m of js.matchAll(/(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) o.add(m[1]);
    return o;
  };
  const a = g(A), b = g(B), d = diff(a, b);
  check('JS functions', d.onlyA.length === 0, `orig=${a.size} built=${b.size}` +
    (d.onlyA.length ? '  MISSING: ' + d.onlyA.join(',') : '') + (d.onlyB.length ? '  added: ' + d.onlyB.join(',') : ''));
}

// 5. content values reach the built page
{
  const cj = nicheContent();
  const leaves = (o, out = []) => {
    if (typeof o === 'string') { if (o.trim().length >= 10) out.push(o); return out; }
    if (Array.isArray(o)) { o.forEach(v => leaves(v, out)); return out; }
    if (o && typeof o === 'object') { Object.values(o).forEach(v => leaves(v, out)); return out; }
    return out;
  };
  const esc = v => JSON.stringify(v).slice(1, -1);
  const ls = leaves(cj), gone = ls.filter(v => !B.includes(v) && !B.includes(esc(v)));
  check('content values in built page', gone.length === 0,
    `${ls.length} checked` + (gone.length ? '  MISSING: ' + gone.slice(0, 3).map(x => x.slice(0, 36)).join(' | ') : ''));
}

// 5b. nothing from the ORIGINAL content.json was lost in the schema transform
{
  const before = JSON.parse(fs.readFileSync(`${origDir}/content.json`, 'utf8'));
  const leaves = (o, out = []) => {
    if (typeof o === 'string') { if (o.trim().length >= 10) out.push(o); return out; }
    if (Array.isArray(o)) { o.forEach(v => leaves(v, out)); return out; }
    if (o && typeof o === 'object') { Object.values(o).forEach(v => leaves(v, out)); return out; }
    return out;
  };
  const esc = v => JSON.stringify(v).slice(1, -1);
  const ls = leaves(before);
  /* A value may have been legitimately RESTRUCTURED rather than lost — the
     canonical schema splits `\n`-delimited strings into arrays (includes ->
     features[]). Treat it as present when every one of its parts is. */
  const present = v => B.includes(v) || B.includes(esc(v)) ||
    (v.includes('\n') && v.split('\n').map(s => s.trim()).filter(Boolean)
      .every(part => B.includes(part) || B.includes(esc(part))));
  const gone = ls.filter(v => !present(v));
  check('original content survives the transform', gone.length === 0,
    `${ls.length} checked` + (gone.length ? '  LOST: ' + gone.slice(0, 3).map(x => x.slice(0, 36)).join(' | ') : ''));
}

// 6. head items
{
  const items = { title: /<title>[^<]+<\/title>/, description: /name="description"/,
    'theme-color': /name="theme-color"/, canonical: /rel="canonical"/, 'og:url': /property="og:url"/,
    'og:title': /property="og:title"/, 'og:image': /property="og:image"/,
    'twitter:card': /name="twitter:card"/, favicon: /rel="icon"/, 'JSON-LD': /application\/ld\+json/ };
  const miss = Object.entries(items).filter(([, re]) => !re.test(B)).map(([k]) => k);
  const origMiss = Object.entries(items).filter(([, re]) => !re.test(A)).map(([k]) => k);
  check('head items', miss.length === 0, miss.length ? 'missing: ' + miss.join(', ')
    : 'all present (original was missing: ' + (origMiss.join(', ') || 'none') + ')');
}

// 7. syntax
{
  let bad = 0;
  for (const m of B.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g))
    try { new vm.Script(m[1]); } catch (e) { bad++; console.log('      ' + e.message); }
  for (const m of B.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g))
    try { JSON.parse(m[1]); } catch (e) { bad++; console.log('      JSON-LD: ' + e.message); }
  check('scripts + JSON-LD parse', bad === 0);
}

// 8. single source of truth
{
  const m = /var DEFAULT_CONTENT = ([\s\S]*?);\s*\n<\/script>/.exec(B);
  let okk = false;
  if (m) { try {
    okk = JSON.stringify(JSON.parse(m[1])) ===
          JSON.stringify(nicheContent());
  } catch {} }
  check('single source of truth', okk, okk ? 'DEFAULT_CONTENT === content.json (generated)' : 'MISMATCH');
}

// 9. every class hook in the markup has a rule somewhere
{
  const css = cssOf(B);
  /* Markup only. Scanning <script> too picks up fragments of JS string
     concatenation — `class="pkg' + (p.popular ? …` yields hooks like
     `pkg'`, `(p.popular`, `?` — which are noise, not unstyled elements. */
  const body = B.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
                .replace(/<script[\s\S]*?<\/script>/g, '');
  const hooks = new Set();
  for (const m of body.matchAll(/class="([^"]+)"/g))
    m[1].split(/\s+/).forEach(c => { if (/^[A-Za-z][\w-]*$/.test(c)) hooks.add(c); });
  const unstyled = [...hooks].filter(h => !css.includes('.' + h));
  soft('every class hook has a rule', unstyled.length === 0,
    unstyled.length ? unstyled.length + ' unstyled: ' + unstyled.slice(0, 8).join(', ') : `${hooks.size} hooks`);
}

// 10. THE PAGE ACTUALLY RUNS.
/* Checks 1-9 all read text. Fourteen sites passed every one of them with a
   renderer that threw on its first line: the values they look for sit in the
   inlined DEFAULT_CONTENT, present whether or not a line of JS executes.
   This step loads the built page in Chrome and asserts zero console errors AND
   that renderContent actually ran. See tools/runtime-check.js. */
{
  let out = '', ok = true;
  try {
    out = execFileSync(process.execPath,
      [REPO + '/tools/runtime-check.js', builtDir], { encoding: 'utf8' });
  } catch (e) {
    ok = false;
    out = (e.stdout || '') + (e.stderr || '');
  }
  const detail = out.split('\n').map(l => l.trim()).filter(Boolean)
                    .map(l => l.replace(/^(PASS|FAIL)\s+runtime:\s*/, ''))
                    .join(' | ').slice(0, 200);
  check('page runs in a browser', ok, detail);
}

console.log('\n' + (fail ? `${fail} FAILED, ${warn} warning(s)` : `ALL CHECKS PASSED${warn ? ` (${warn} warning)` : ''}`));
process.exit(fail ? 1 : 0);
