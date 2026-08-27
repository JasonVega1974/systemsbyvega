/* Wave 1 conversion: fit an existing site into the template.
   node convert.mjs <slug>
   Writes niches/<slug>/*. Never touches sites/. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

/* Derived from this file's own location (tools/convert/), not hardcoded, so the
   tooling works in any clone. These scripts moved here out of a session
   scratchpad; the absolute path they used to carry pointed at one machine. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..').replace(/\\/g, '/');
const slug = process.argv[2];
if (!slug) { console.error('usage: node convert.mjs <slug>'); process.exit(2); }

const CFG = (await import('./convert.' + slug + '.mjs')).default;

/* Validate the config up front, with a readable message.
   convert.dumpster-rental.mjs exists only to give gate.mjs a token map — that
   site was extracted by wave0-build.mjs and its config carries no line ranges.
   Without this guard you get a raw TypeError on CFG.css[0], which inside a
   for-loop reads exactly like success. */
{
  const need = ['css', 'markup', 'js', 'tokenMap', 'literals', 'fonts', 'bootMarker', 'transform'];
  const missing = need.filter(k => CFG[k] == null);
  if (missing.length) {
    console.error('ABORT: convert.' + slug + '.mjs is not a conversion config.');
    console.error('       Missing: ' + missing.join(', '));
    console.error('       (dumpster-rental was extracted by wave0-build.mjs; its config is gate-only.)');
    process.exit(1);
  }
}

/* SOURCE MUST BE THE PRE-CONVERSION ORIGINAL, never sites/<slug>/.
   Once a site is built, sites/<slug>/index.html IS the build output: its :root
   holds generated tokens and every configured line range is meaningless. Feeding
   that back in produced a niche.css with two sets of font tokens and then an
   out-of-memory crash. Pass a pinned copy (git show HEAD:sites/<slug>/...) as
   argv[3]; refuse to run against a file that looks already-built. */
const origDir = process.argv[3] || `${REPO}/sites/${slug}`;
const src = fs.readFileSync(`${origDir}/index.html`, 'utf8');
const rawJson = fs.readFileSync(`${origDir}/content.json`, 'utf8');

if (/DO NOT EDIT — edit content\.json/.test(src) || /\{\{[A-Z_]+\}\}/.test(src)) {
  console.error('ABORT: ' + origDir + '/index.html is a BUILD OUTPUT, not the original.');
  console.error('       Pass a pinned original, e.g.:');
  console.error('         git -C <repo> show HEAD:sites/' + slug + '/index.html > /tmp/orig/index.html');
  console.error('         node convert.mjs ' + slug + ' /tmp/orig');
  process.exit(1);
}
const OUT = `${REPO}/niches/${slug}`;
fs.mkdirSync(OUT, { recursive: true });

const w = (f, s) => { fs.writeFileSync(path.join(OUT, f), s.endsWith('\n') ? s : s + '\n', 'utf8');
  console.log('  ' + f.padEnd(16) + String(s.split('\n').length).padStart(5) + ' lines'); };

const L = src.split(/\r?\n/);
const seg = (a, b) => L.slice(a - 1, b).join('\n');

/* ---- token rename + literal tokenisation ------------------------------ */
const MAP = CFG.tokenMap;
const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);
const LITS = Object.entries(CFG.literals).sort((a, b) => b[0].length - a[0].length);

/* Two phases with a sentinel, NOT a single sequential pass.
   A single pass reassigns s on every key, so a replacement CAN be re-read:
   whenever one token's target is also another token's source, the second key
   rewrites the first key's own output. tattoo-studio's --bone -> --ink and
   --ink -> --ground collapsed two roles into one that way, leaving body text
   the colour of the background — invisible, and silent, because the gate
   compares normalised tokens and both sides normalise identically.
   Role-based inversions make such chains normal, so order can't be the fix.
   Phase 1 rewrites every source to an index placeholder; phase 2 resolves
   placeholders to targets. A placeholder can never match a source and a target
   can never contain the sentinel, so nothing is ever re-read. */
const SENTINEL = '\u0000';
const rename = s => {
  for (let i = 0; i < KEYS.length; i++) {
    const ph = SENTINEL + i + SENTINEL;
    s = s.split('var(' + KEYS[i] + ')').join('var(' + ph + ')')
         .split('var(' + KEYS[i] + ',').join('var(' + ph + ',');
  }
  for (let i = 0; i < KEYS.length; i++)
    s = s.split(SENTINEL + i + SENTINEL).join(MAP[KEYS[i]]);
  return s;
};
const tokenise = s => { for (const [lit, tok] of LITS) s = s.split(lit).join('var(' + tok + ')'); return s; };

/* ---- niche.css -------------------------------------------------------- */
const cssRaw = seg(CFG.css[0], CFG.css[1]);
const rootRe = /:root\s*\{[\s\S]*?\}\s*/;
const rootBlock = rootRe.exec(cssRaw)[0];
const decls = [...rootBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)]
  .filter(([, n]) => !CFG.dead.includes(n));

const added = Object.entries(CFG.literals)
  .filter(([, tok]) => !decls.some(([, n]) => (MAP[n] || n) === tok))
  .reduce((a, [lit, tok]) => (a[tok] = a[tok] || lit, a), {});
/* Tokens base.css requires that this site has no literal for. Derived from the
   niche's own palette rather than invented — see convert.<slug>.mjs. */
for (const [tok, val] of Object.entries(CFG.extraTokens || {})) if (!added[tok]) added[tok] = val;

w('niche.css',
`/* ${slug} — tokens only. Structure lives in _template/base.css.
   Original identity names are recorded beside each mapped token. */
:root{
  --scheme: ${CFG.scheme};
${decls.map(([, n, v]) => {
  const c = MAP[n] || n;
  return '  ' + (c + ':').padEnd(16) + v.trim() + ';' + (c !== n ? '   /* was ' + n + ' */' : '');
}).join('\n')}

  /* Tokens the shared CSS needs that this site hardcoded inline. */
${Object.entries(added).map(([t, v]) => '  ' + (t + ':').padEnd(16) + v + ';').join('\n')}

  --display: ${CFG.fonts.display};
  --body:    ${CFG.fonts.body};
  --mono:    ${CFG.fonts.mono};
}`);

/* ---- sections.css -----------------------------------------------------
   Everything in this site's CSS that is NOT already in base.css verbatim.
   A rule is dropped only when base.css has the same selector AND the same
   declarations after token normalisation — provably redundant. Anything that
   differs is kept and, because sections.css is inlined last, overrides. */
function walk(src) {
  const out = []; let i = 0;
  while (i < src.length) {
    const br = src.indexOf('{', i);
    if (br < 0) break;
    let d = 0, end = br;
    for (let p = br; p < src.length; p++) {
      if (src[p] === '{') d++; else if (src[p] === '}') { d--; if (!d) { end = p + 1; break; } }
    }
    out.push({ sel: src.slice(i, br).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim(),
               body: src.slice(br + 1, end - 1), text: src.slice(i, end) });
    i = end;
  }
  return out;
}
const norm = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');

const baseCssRaw = fs.readFileSync(`${REPO}/_template/base.css`, 'utf8');
const baseRules = new Map();
for (const r of walk(baseCssRaw)) if (r.sel && !r.sel.startsWith('@')) baseRules.set(r.sel, norm(r.body));

const siteCss = tokenise(rename(cssRaw.replace(rootRe, '')));
const keep = []; let dropped = 0, kept = 0;
for (const r of walk(siteCss)) {
  if (!r.sel) continue;
  if (!r.sel.startsWith('@') && baseRules.get(r.sel) === norm(r.body)) { dropped++; continue; }
  keep.push(r.text); kept++;
}
w('sections.css',
`/* ${slug}/sections.css — rules for this niche's own sections.
   ${dropped} rule(s) were identical to base.css and dropped; ${kept} kept.
   Inlined after base.css, so anything here overrides shared chrome. */
${keep.join('').trim()}`);

/* ---- base.css compatibility check ------------------------------------- */
const baseCss = fs.readFileSync(`${REPO}/_template/base.css`, 'utf8');
const needed = new Set([...baseCss.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map(m => m[1]));
needed.delete('--w');
const nicheHas = new Set([...decls.map(([, n]) => MAP[n] || n), ...Object.keys(added),
                          '--scheme', '--display', '--body', '--mono']);
const missing = [...needed].filter(t => !nicheHas.has(t));
if (missing.length) {
  console.log('\n  !! base.css references tokens this niche does not define:');
  console.log('     ' + missing.join(', '));
  console.log('     (add to convert.' + slug + '.json literals/tokenMap, or accept a fallback)');
}

/* ---- scene.svg + sections.html ---------------------------------------- */
const markup = seg(CFG.markup[0], CFG.markup[1]);
let sceneSvg = '', body = markup;
if (CFG.defsSvg) {
  const a = markup.indexOf('<svg'), b = markup.indexOf('</svg>', a) + 6;
  sceneSvg = markup.slice(a, b); body = markup.slice(b);
} else {
  sceneSvg = `<!-- ${slug}/scene.svg — this site keeps its illustrations inline in
     sections.html rather than in a shared <defs> block. Placeholder so the
     build slot resolves; see brief.md. -->\n<svg width="0" height="0" aria-hidden="true" style="position:absolute"></svg>`;
}
w('scene.svg', tokenise(rename(sceneSvg)));
w('sections.html',
`<!-- ${slug}/sections.html — this niche's body markup.
     Sections differ by product (SITELAB_TEMPLATE.md §3.1), so this is per-niche. -->
${tokenise(rename(body)).trim()}`);

/* ---- scene.js --------------------------------------------------------- */
/* sceneReplace is to scene.js what jsReplace is to niche.js. The scene is
   excised BEFORE jsReplace runs, so a jsReplace aimed at scene content silently
   targets text that is no longer there — dj needed it because its canvas builds
   the gradient in JavaScript, and without swapping those literals for theme
   tokens all three themes would render the same palette.
   A miss ABORTS, for the same reason jsReplace does. */
function sceneText() {
  let s = seg(CFG.sceneJs[0], CFG.sceneJs[1]);
  for (const [from, to] of (CFG.sceneReplace || [])) {
    const n = s.split(from).length - 1;
    if (!n) {
      console.error('ABORT: sceneReplace matched nothing:\n  ' + from.split('\n')[0].slice(0, 120));
      process.exit(1);
    }
    s = s.split(from).join(to);
  }
  return s;
}

w('scene.js', CFG.sceneJs
  ? `/* ${slug}/scene.js — the signature animation, extracted verbatim from the
   original's main script. base.js calls window.initScene(reduce) after first
   render; the block below closes over that parameter exactly as it closed over
   the outer-scope \`reduce\` before, so the reduced-motion path is unchanged. */
window.initScene = function (reduce) {
${sceneText()}
};`
  : CFG.animationInNiche ? `/* ${slug}/scene.js — the animation lives in niche.js.
   ${CFG.animationInNiche}
   It is a helper the RENDERER calls, not a standalone scene, so extracting it
   would split a function from its callers (SITELAB_TEMPLATE.md 7.0, D-P).
   qa-site.js grades the animation wherever it lives. */
window.initScene = function (reduce) { /* see niche.js */ };`
  : CFG.animationInCss ? `/* ${slug}/scene.js — the animation is CSS, in sections.css.
   ${CFG.animationInCss}
   It loops on @keyframes and is switched off by the prefers-reduced-motion
   block in that same file, so there is nothing for JavaScript to drive
   (SITELAB_TEMPLATE.md 7.0, D-S). A stub here is the correct shape, NOT a gap.
   qa-site.js grades the animation wherever it lives. */
window.initScene = function (reduce) { /* see sections.css */ };`
  : `/* ${slug}/scene.js — NO SIGNATURE ANIMATION.
   This site arrived without one: its only requestAnimationFrame is a toast
   fade. Per SITELAB_TEMPLATE.md §9.3 that is a Phase 3 gap, deliberately not
   filled during consolidation so the conversion diff stays reviewable.
   qa-site.js reports it every run until it is built.
   Contract when it is: check reduce FIRST, rAF, self-terminate, clear transform. */
window.initScene = function (reduce) {
  if (reduce) return;
  /* TODO (Phase 3): ${CFG.animationTodo || 'design the signature animation'} */
};`);

/* ---- niche.js --------------------------------------------------------- */
function braceSpan(s, from) {
  const o = s.indexOf('{', from); let d = 0;
  for (let p = o; p < s.length; p++) { if (s[p] === '{') d++; else if (s[p] === '}') { d--; if (!d) return [o, p + 1]; } }
  return null;
}
let js = seg(CFG.js[0], CFG.js[1]);
/* The inlined content object is removed here because build-site.js re-inlines it
   from content.json. It is NOT always spelled "var DEFAULT_CONTENT": dj declares
   `const DEFAULT_SITE`. indexOf then returned -1, braceSpan(-1) found the first
   brace in the whole script, and js.slice(0,-1)+js.slice(dcB) DUPLICATED most of
   the file — surfacing three steps later as "scene block appears 2 times".
   Match the declaration, and abort rather than corrupt when there is none. */
const dcM = /(?:var|let|const)\s+(DEFAULT_CONTENT|DEFAULT_SITE)\s*=\s*\{/.exec(js);
if (!dcM) {
  console.error('ABORT: no inlined content object found (var/let/const DEFAULT_CONTENT | DEFAULT_SITE = {…}).');
  console.error('       build-site.js re-inlines it from content.json, so the original declaration must be removed.');
  process.exit(1);
}
const dcI = dcM.index;
const span = braceSpan(js, dcI);
if (!span) { console.error('ABORT: unbalanced braces in ' + dcM[1]); process.exit(1); }
js = js.slice(0, dcI) + js.slice(span[1]).replace(/^\s*;\s*/, '');
/* base.js calls window.renderContent, but a niche may name its renderer
   anything — painting uses renderAll(). Derive it from the boot marker instead
   of assuming, which silently exported an undefined identifier. */
const RENDER_FN = (CFG.bootMarker.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/) || [, 'renderContent'])[1];
const bootI = js.indexOf(CFG.bootMarker);
if (bootI < 0) {
  console.error('ABORT: boot marker not found: ' + JSON.stringify(CFG.bootMarker));
  const near = [...js.matchAll(/^\s*([A-Za-z_$][\w$]*\s*\([^)]*\)\s*;)\s*$/gm)]
    .map(m => m[1].trim())
    .filter(s => /render|init|boot|start|apply/i.test(s));
  const fetchLine = /(\w+)\s*\([^)]*\)\s*;\s*[\r\n]+\s*fetch\('content\.json'/.exec(js);
  if (fetchLine) console.error('       Likely marker (the call just before the content fetch): ' +
                               JSON.stringify(fetchLine[0].split(/[\r\n]/)[0].trim()));
  if (near.length) console.error('       Other candidates: ' + [...new Set(near)].slice(0, 6).join('  '));
  process.exit(1);
}
{
  /* Excise the boot STATEMENT only — base.js owns the lifecycle now. Anything
     defined after it (painting puts setErr/buildSms/showDone there) must
     survive; cutting to end-of-script silently dropped three functions. */
  /* Two SEPARATE cuts, with whatever sits between them preserved.
     The old rule cut straight through from the boot call to the end of the
     fetch chain whenever they were within 400 characters, assuming the gap was
     empty. personal-trainer disproves that: 332 chars of gap holding its
     ?goal= deep-link preselect. Nothing would have caught the loss — the gate
     compares function DEFINITIONS and gap code only calls existing ones, and
     the runtime check sees no error because the feature simply never runs.

     Audited across all 14 previously converted sites: only dumpster-rental and
     electrician had a non-empty gap, and both held nothing but lifecycle calls
     base.js now owns, so their output is unchanged by this. */
  const bootStmtEnd = bootI + CFG.bootMarker.length;
  const fetchI = js.indexOf("fetch('content.json'", bootStmtEnd);
  let gap = '', afterEnd = bootStmtEnd;

  if (fetchI > -1 && fetchI - bootStmtEnd < 400) {       // the fetch chain belongs to boot
    /* Find the END of the whole fetch statement by depth, not by "first ; after
       .catch(". Most niches chain .then(…).catch(…); so the shortcut worked, but
       dj chains .then().catch().then(d=>{ … }); — the semicolon it found sat
       INSIDE the last callback, cutting the statement in half and leaving an
       orphaned fragment that failed to parse three steps later.
       Walk from the fetch call, tracking (), {} and string/template literals,
       and stop at the first ; that is genuinely at depth zero. */
    let semi = -1;
    {
      let depth = 0, q = null;
      for (let p = fetchI; p < js.length; p++) {
        const ch = js[p], prev = js[p - 1];
        if (q) { if (ch === q && prev !== '\\') q = null; continue; }
        if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
        if (ch === '(' || ch === '{' || ch === '[') depth++;
        else if (ch === ')' || ch === '}' || ch === ']') depth--;
        else if (ch === ';' && depth === 0) { semi = p; break; }
      }
    }
    if (semi > -1) {
      /* base.js calls initReveal() and initScene(reduce) itself, so those two
         must NOT survive the cut or they run twice. Everything else is this
         niche's own and is kept verbatim. */
      const OWNED = /^\s*(?:if\s*\([^)]*typeof[^)]*\)\s*)?(?:window\.)?(?:initReveal|initScene)\s*\([^)]*\)\s*;?\s*$/;
      gap = js.slice(bootStmtEnd, fetchI)
              .split('\n')
              .filter(l => !OWNED.test(l))
              .join('\n')
              .replace(/^\s*[\r\n]+/, '')
              .replace(/[\r\n]+\s*$/, '');
      afterEnd = semi + 1;
    }
  }

  const removed = js.slice(bootI, afterEnd).split('\n').length;
  const kept = gap.trim() ? '\n' + gap + '\n' : '';
  js = js.slice(0, bootI) + '/* boot handed to base.js */' + kept + js.slice(afterEnd);
  console.log('  boot statement excised (' + removed + ' lines)' +
              (kept ? '; ' + gap.trim().split('\n').length + ' gap line(s) PRESERVED' : '') +
              '; ' + js.slice(bootI).split('\n').length + ' lines retained after it');
}

for (const name of ['esc', 'num', 'telHref']) {
  const re = new RegExp('(?:^|\\n)[ \\t]*(?:function\\s+' + name + '\\s*\\(|var\\s+' + name + '\\s*=\\s*function\\s*\\()');
  const m = re.exec(js);
  if (!m) continue;
  const sp = braceSpan(js, m.index + m[0].length - 1);
  if (sp) js = js.slice(0, m.index) + js.slice(sp[1]).replace(/^\s*;/, '');
}
/* If the signature animation was extracted into scene.js, remove it from the
   main script or it ships twice — once in each file, both binding the same
   canvas listeners. */
if (CFG.sceneJs) {
  const sceneText = seg(CFG.sceneJs[0], CFG.sceneJs[1]);
  const n = js.split(sceneText).length - 1;
  /* Disjoint ranges mean the scene lives in its own <script> block (dog-walking),
     so it was never part of niche.js and there is nothing to remove. */
  const disjoint = CFG.sceneJs[0] > CFG.js[1] || CFG.sceneJs[1] < CFG.js[0];
  if (n === 0 && disjoint) {
    console.log('  scene lives in its own <script> block — nothing to excise from niche.js');
  } else if (n !== 1) {
    console.error(`ABORT: scene block appears ${n} times in the main script, expected 1`);
    process.exit(1);
  }
  if (n === 1) {
    js = js.split(sceneText).join('\n  /* signature animation extracted to scene.js */\n');
    console.log('  scene block excised from niche.js (' + sceneText.split('\n').length + ' lines)');
  }
}

/* Niche-local variable renames inside the JS that sets them (§5.4). Applied as
   plain string swaps on quoted forms, so data keys of the same name are safe. */
/* A jsReplace exists to keep a renderer in step with a schema rename. If it
   does not match, the renderer keeps reading a field the transform just removed
   and the page breaks at runtime — so a miss is an ABORT, not a log line that
   scrolls past. personal-trainer hit exactly this: a multi-line anchor carrying
   the source's original indentation, which no longer matches because the IIFE
   body is de-indented by two spaces on extraction. Prefer single-line anchors
   with no leading whitespace. */
for (const [from, to] of (CFG.jsReplace || [])) {
  const n = js.split(from).length - 1;
  if (!n) {
    console.error('ABORT: jsReplace matched nothing:\n  ' + from.split('\n')[0].slice(0, 120));
    console.error('       (multi-line anchors must not carry the source indentation — the');
    console.error('        extracted IIFE body is de-indented by two spaces)');
    process.exit(1);
  }
  js = js.split(from).join(to);
}
/* Most source scripts are ONE outer IIFE. We re-wrap in niche.js, so both ends
   of that wrapper have to go.

   But dj is not: its script is top-level code plus several INDEPENDENT IIFEs.
   Stripping a trailing "})();" there removed the LAST inner IIFE's closer, the
   re-wrap's own "})();" then closed that inner one instead, and the wrapper was
   left open — surfacing only as "Unexpected end of input".
   So strip the tail only when the segment actually opens with an IIFE. */
const wrappedInIife = /^\s*\(function\s*\(\s*\)\s*\{/.test(js);
if (wrappedInIife) js = js.replace(/\s*\}\s*\)\s*\(\s*\)\s*;\s*$/, '\n');
else console.log('  source script is not a single IIFE — trailing wrapper not stripped');
js = js.replace(/^\(function\(\)\{\s*/, '').replace(/^\s*"use strict";\s*/, '')
       .replace(/^\s*var reduce = window\.matchMedia\([^)]*\)\.matches;\s*/m, '')
       .replace(/^\s*var CONTENT\s*=\s*DEFAULT_CONTENT;\s*/m, '');

const nicheJs = `/* ${slug}/niche.js — this niche's renderer and interactive logic.
   Shared utilities come from _template/base.js via SL; the aliases below keep
   every extracted call site unchanged. base.js owns the reduced-motion flag,
   the reveal observer, the content fetch/merge lifecycle, and calling
   window.renderContent(). val/setErr/showDone are NOT aliased — this niche
   defines its own with different signatures. */
(function () {
  'use strict';

  var SL = window.SL;
  var esc = SL.esc, num = SL.num, telHref = SL.telHref;
  var reduce = SL.reduce;
  var CONTENT = window.DEFAULT_CONTENT;

${js.trimEnd()}

  window.renderContent = ` + RENDER_FN + `;
})();
`;
try { new vm.Script(nicheJs); } catch (e) {
  /* Dump the failing file. A syntax error here means an excision or a jsReplace
     cut in the wrong place, and "Unexpected end of input" says nothing about
     WHERE — guessing at it wastes far more time than writing the artefact out. */
  const bad = path.join(OUT, 'niche.js.bad');
  fs.writeFileSync(bad, nicheJs, 'utf8');
  console.error('ABORT: niche.js syntax: ' + e.message);
  console.error('       wrote ' + path.relative(REPO, bad) + ' for inspection');
  process.exit(1);
}
w('niche.js', nicheJs);

/* ---- content.json ----------------------------------------------------- */
const cj = JSON.parse(rawJson);
const head = seg(1, CFG.css[0] - 2);
const pick = re => { const m = re.exec(head); return m ? m[1] : ''; };
const out = {};
for (const k of ['brand', 'serviceArea', 'owner']) if (cj[k]) out[k] = cj[k];
CFG.transform(cj, out);
out.seo = {
  title: pick(/<title>([^<]*)<\/title>/),
  description: pick(/<meta name="description" content="([^"]*)"/),
  ogTitle: pick(/<meta property="og:title" content="([^"]*)"/) || pick(/<title>([^<]*)<\/title>/),
  ogDescription: pick(/<meta property="og:description" content="([^"]*)"/) || pick(/<meta name="description" content="([^"]*)"/),
  priceRange: pick(/"priceRange":\s*"([^"]*)"/) || CFG.priceRange || '',
  schemaType: pick(/"@type":\s*"([^"]*)"/) || 'LocalBusiness',
  canonical: pick(/<link rel="canonical" href="([^"]*)"/) || `https://systemsbyvega.com/sites/${slug}/`,
  themeColor: pick(/<meta name="theme-color" content="([^"]*)"/) || CFG.themeColor || '',
  favicon: pick(/<link rel="icon" href="([^"]*)"/),
  fontsHref: pick(/<link href="(https:\/\/fonts\.googleapis\.com[^"]*)"/),
  ogImage: pick(/<meta property="og:image" content="([^"]*)"/) ||
           `https://systemsbyvega.com/sites/${slug}/og.png`
};
w('content.json', JSON.stringify(out, null, 2));

w('brief.md', CFG.brief);
console.log('\n  done — nothing in sites/ was touched.');
