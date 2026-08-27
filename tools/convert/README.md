# Conversion tooling

How a legacy standalone site becomes a SiteLab niche, and the record of how each
of the converted ones was produced.

These lived in a session scratchpad until now. That was a mistake: the per-site
configs *are* the conversion — every token mapping, every literal, every schema
decision, and the exact line ranges the extraction depended on. `brief.md` in
each niche records the intent; these record the mechanics.

## Files

| | |
|---|---|
| `convert.mjs` | Reads a per-site config, writes `niches/<slug>/*`. **Never touches `sites/`.** |
| `gate.mjs` | Proves a rebuilt page reproduces its original. Ten checks, ending with a real browser load. |
| `convert.<slug>.mjs` | One per converted site. The config, and the record. |

`REPO` is derived from this directory's location, so the tools work in any clone.

## The loop

```bash
node tools/convert/convert.mjs <slug>                 # -> niches/<slug>/
node tools/build-site.js <slug> --demo --out /tmp/x   # -> a built page
node tools/convert/gate.mjs <slug> /tmp/x             # does it match the original?
node tools/qa-site.js <slug> --built /tmp/x           # does it meet §9?
```

Only write `sites/<slug>/` once the gate passes. The gate compares against
`sites/<slug>/` by default, so **gate before you write** — afterwards you are
comparing a file with itself and every check passes vacuously. Pass a pinned
original as a 4th argument if the site is already overwritten.

## Things that cost real time

**Never feed `convert.mjs` its own output.** It reads a *pinned original*.
Re-converting from `sites/<slug>/` fed it build output, which duplicated font
tokens and eventually exhausted the heap. There is a guard now; do not rely on
it alone.

**The boot gap.** Excision makes two cuts — the boot statement, and the
`content.json` fetch chain — and preserves whatever sits between them, minus the
`initReveal`/`initScene` calls `base.js` owns. It used to cut straight through,
which would have silently deleted personal-trainer's `?goal=` deep-link. Nothing
would have caught it: the gate compares function *definitions* and gap code only
calls existing ones, and the runtime check sees no error because the feature
simply never runs.

**`jsReplace` anchors must be single-line with no leading whitespace.** The
extracted IIFE body is de-indented by two spaces, so an anchor copied from the
source with its original indentation will not match. A miss is now an abort,
because it means a renderer still reads a field the transform just removed.

**A schema rename needs a matching `jsReplace`.** Renaming `plans[]`→`pricing[]`
in `transform()` without updating the renderer produces a page that passes every
text-based check and renders nothing. That is how fourteen sites shipped with
dead renderers.

**Text checks are not enough.** Content values live in the inlined
`DEFAULT_CONTENT` whether or not a line of JS executes, so a dead page passes
structural checks. `gate.mjs` ends by loading the page in headless Chrome
(`tools/runtime-check.js`); it fails when it cannot launch a browser, because an
unverified result is not a pass.

## Config shape

```js
export default {
  scheme: 'dark' | 'light',
  css:    [firstLineInsideStyle, lastLineInsideStyle],
  markup: [afterLastStyleClose, beforeScriptOpen],
  js:     [insideScriptOpen, insideScriptClose],
  defsSvg: false,               // true if the illustration lifts to scene.svg
  sceneJs: [from, to] | null,   // a standalone animation block, body only
  animationInNiche: '…',        // OR: it is a renderer helper, graded in place
  animationInCss:   '…',        // OR: it loops in sections.css (D-S)
  animationTodo:    '…',        // OR: there is none — a real Phase 3 gap
  bootMarker: 'renderContent(CONTENT);',
  fonts: { display, body, mono },   // read from seo.fontsHref, never from memory
  tokenMap: { '--their-name': '--ours' },   // longest-first
  literals: { '#hex': '--token' },
  extraTokens: { '--needed-by-base': 'var(--something)' },
  dead: [],
  jsReplace: [[from, to]],      // keep the renderer in step with the schema
  themeColor, canonical, priceRange,
  transform(src, out) { … },    // canonical fields out, the rest under niche
  brief: `…`                    // becomes brief.md
};
```

Map tokens by **role**, never by name. tattoo-studio's `--ink` was its *ground*
and `--bone` its text; mapping by name would have inverted the whole site.
