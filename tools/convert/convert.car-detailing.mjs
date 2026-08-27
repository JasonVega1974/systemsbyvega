export default {
  scheme: 'dark',

  // source line ranges (1-indexed, inclusive) — inside the tags, not including them
  css:    [48, 537],     // main <style> … </style>
  markup: [555, 968],    // after the style blocks, up to the main <script>
  js:     [970, 1443],   // inside the main <script>

  defsSvg: false,        // no shared <defs> block; illustrations are inline
  sceneJs: null,         // no signature animation — Phase 3 gap (D-B)
  animationTodo: 'foam/gloss sweep across the hero car, settling to a static sheen',

  bootMarker: 'renderContent(CONTENT);',

  /* Read from the site's own fontsHref, NOT from memory. My first pass guessed
     Bebas Neue / Inter and both were wrong — nothing loads them. */
  fonts: {
    display: "'Saira Condensed', system-ui, sans-serif",
    body:    "'Manrope', system-ui, -apple-system, sans-serif",
    mono:    "'Space Mono', ui-monospace, Consolas, monospace"
  },

  // identity names -> canonical roles (SITELAB_TEMPLATE.md §5)
  tokenMap: {
    '--graphite-deep': '--ground-deep',
    '--graphite-2':    '--panel',
    '--graphite':      '--ground',
    '--steel-txt':     '--ink-dim',
    '--steel':         '--panel-2',
    '--gloss-bright':  '--accent-2',
    '--gloss-deep':    '--accent-deep',
    '--gloss':         '--accent',
    '--chrome':        '--ink',
    '--ice-soft':      '--ink-bright',
    '--ice':           '--ink-max',
    '--muted':         '--muted',
    '--line':          '--hair-accent',
    '--hair':          '--hair',
    '--card-brd':      '--card-brd',
    '--card':          '--card',
    '--shadow':        '--shadow',
    '--maxw':          '--maxw'
  },

  // declared but never referenced, as var() OR as a literal
  dead: [],

  /* Literal colours found inside structural CSS. Order matters: longest first.
     The demo-banner colours (#161B22, #323A48, #F3922F) are deliberately absent —
     the shell owns that chrome behind --demo, so they never reach niche.css. */
  literals: {
    '#062522': '--accent-ink',      // text on --accent, 7 uses
    '#0b1017': '--ground-2',        // page gradient mid stop
    '#b9ccd9': '--sheen-lo',
    '#ffffff': '--sheen-hi',
    '#0a2b29': '--accent-shade',
    '#5f6b78': '--placeholder',
    '#e0616b': '--err',
    '#ff9aa2': '--err-ink',
    '#fff':    '--ink-max'
  },

  /* base.css (extracted from dumpster) references --sheen-accent, the top stop of
     the accent-button gradient. car-detailing has no equivalent literal, so it is
     derived from this site's own bright accent rather than invented. */
  extraTokens: {
    '--sheen-accent': 'var(--accent-2)'
  },

  themeColor: '#0E131A',
  priceRange: '$89-$349',

  /* Schema normalisation (D-A, D-C).
     packages[] -> pricing[]   name->label, duration->per, popular->highlight,
                               best(string)->blurb, includes(\n string)->features[]
     addons/zones/notes/results -> niche.* extension block (§4.3) */
  transform(src, out) {
    out.pricing = (src.packages || []).map(p => ({
      label: p.name,
      price: p.price,
      per: p.duration,
      blurb: p.best,
      features: String(p.includes || '').split('\n').map(s => s.trim()).filter(Boolean),
      highlight: !!p.popular
    }));
    if (src.testimonials) out.testimonials = src.testimonials;
    if (src.social) out.social = src.social;
    out.niche = {
      addons: src.addons || [],
      zones: src.zones || [],
      notes: src.notes || {},
      results: src.results || []
    };
  },

  brief: `slug:            car-detailing
business:        Kestrel Auto Detailing
tagline:         Mobile detailing, done at your kerb
city:            Nampa, ID
palette:         gloss teal on graphite — ground #0E131A, accent #2DD4CE
type:            Saira Condensed / Manrope / Space Mono
price anchors:   Express Refresh $89, mid tier, full detail to $349
differentiators: fully mobile; no bay, no drop-off; five named detail zones
tone:            precise, unshowy
scene:           NONE YET — 4 inline gradients, below the 6-def minimum (§6)
animation:       NONE YET — Phase 3 gap, see scene.js
interactive:     zone picker (setZone) across 5 detail areas
licensing:       generally unlicensed; water-discharge rules vary by city
niche data:      addons[], zones[], notes{}, results[]
`
};
