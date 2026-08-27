export default {
  scheme: 'dark',

  css:    [48, 579],     // main <style> … </style>
  markup: [596, 1063],   // after the noscript + demo-banner style blocks
  js:     [1065, 1632],  // inside the main <script>

  defsSvg: false,        // 9 defs, but distributed inline — no shared <defs> block
  sceneJs: null,         // only rAF is the toast fade at :1454 — Phase 3 gap (D-B)
  animationTodo: 'seasonal transition — foliage and ground settle between seasons on the wheel',

  bootMarker: 'renderContent(CONTENT);',

  /* Read from the site's own fontsHref, NOT from memory. My first pass guessed
     Fraunces / Karla and both were wrong — nothing loads them. */
  fonts: {
    display: "'Oswald', system-ui, sans-serif",
    body:    "'Work Sans', system-ui, -apple-system, sans-serif",
    mono:    "'Space Mono', ui-monospace, Consolas, monospace"
  },

  /* D-G: --ground and --foliage are NICHE-LOCAL variables that JS sets on the
     scene element per season (niche.js setProperty). They collide with the
     contract's page-background token. Renamed FIRST — the key order below does
     not matter because rename() makes a single pass, but the intent does:
     --ground -> --scene-ground must not be re-processed by --loam -> --ground. */
  tokenMap: {
    '--ground':           '--scene-ground',
    '--foliage':          '--scene-foliage',
    '--loam-deep':        '--ground-deep',
    '--loam-2':           '--panel',
    '--loam':             '--ground',
    '--moss':             '--panel-2',
    '--larkspur-bright':  '--accent-2',
    '--larkspur-deep':    '--accent-deep',
    '--larkspur':         '--accent',
    '--clay':             '--accent-alt',
    '--cream-soft':       '--ink-bright',
    '--cream':            '--ink',
    '--stone':            '--ink-dim',
    '--muted':            '--muted',
    '--line':             '--hair-accent',
    '--hair':             '--hair',
    '--card-brd':         '--card-brd',
    '--card':             '--card',
    '--shadow':           '--shadow',
    '--maxw':             '--maxw'
  },

  /* The same rename inside niche.js, where the seasonal animation sets them.
     Quoted forms only, so the data keys colors.ground / colors.foliage are
     untouched — those are content, not CSS variables. */
  jsReplace: [
    ["'--foliage'", "'--scene-foliage'"],
    ["'--ground'",  "'--scene-ground'"]
  ],

  dead: [],

  /* #3c5c3f and #233826 are deliberately ABSENT: they are var() fallbacks for
     the scene variables above, not theme values. Tokenising them would defeat
     the fallback. They stay as literals in sections.css, which is niche-scoped. */
  literals: {
    '#12101F': '--accent-ink',      // text on the larkspur accent, 5 uses
    '#fffdf9': '--sheen-hi',
    '#cfc9b4': '--sheen-lo',
    '#0C1710': '--ground-2',
    '#5c6459': '--placeholder',
    '#e0616b': '--err',
    '#ff9aa2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--sheen-accent': 'var(--accent-2)'   // base.css needs it; derived, not invented
  },

  themeColor: '#101A13',
  priceRange: '$120-$385',

  /* plans[] -> pricing[]  (D-A, D-D)
       tier -> label, per -> per, freq -> blurb, best(bool) -> highlight
       price already a number, features already an array
     seasons[] / misc{} -> niche.* extension block (§4.3) */
  transform(src, out) {
    out.pricing = (src.plans || []).map(p => ({
      label: p.tier,
      price: p.price,
      per: p.per,
      blurb: p.freq,
      features: Array.isArray(p.features) ? p.features : [],
      highlight: !!p.best
    }));
    if (src.social) out.social = src.social;
    out.niche = {
      seasons: src.seasons || [],
      misc: src.misc || {}
    };
  },

  brief: `slug:            landscaping
business:        Larkspur & Ledge Landscape Co.
tagline:         Show up when you say you will
city:            Nampa, ID
palette:         larkspur purple on loam, terracotta second accent — ground #101A13, accent #8177F2
type:            Oswald / Work Sans / Space Mono
price anchors:   Basic Mow & Edge $120/mo, Full Yard Care $210/mo, Estate Grounds $385/mo
differentiators: same crew every visit; skip weeks with no penalty; text before every visit
tone:            warm, plainspoken
scene:           9 defs distributed inline — seasonal yard, no shared <defs> block
animation:       NONE YET — Phase 3 gap, see scene.js
interactive:     seasonal wheel (wheelRender) driving per-season service prices
licensing:       maintenance work largely unlicensed; pesticide application is not
niche data:      seasons[] (4, each with priced services[]), misc{}
scene vars:      --scene-ground / --scene-foliage, set per season by niche.js
`
};
