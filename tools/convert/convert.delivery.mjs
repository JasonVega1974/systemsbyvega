export default {
  scheme: 'dark',

  css:    [28, 265],     // main <style> … </style>
  markup: [282, 660],    // after the noscript + demo-banner style blocks
  js:     [662, 1168],   // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 9 defs, inline — passes §6.1
  /* D-P: 4 rAF. springPulse drives the live map's pulse markers and is called
     from syncMap(), which reads the zone quoter's state — a renderer helper,
     not a standalone scene. Stays in niche.js and is graded there. */
  sceneJs: null,
  animationInNiche: 'springPulse + drawRoute — damped-spring pulse markers on the live zone map',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Syne', system-ui, sans-serif",
    body:    "'Inter Tight', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--bg-2':     '--ground-2',
    '--bg':       '--ground',
    '--panel':    '--panel',
    '--viz-deep': '--accent-deep',
    '--viz-soft': '--accent-soft',
    '--viz':      '--accent',
    '--steel':    '--ink-dim',
    '--ink':      '--ink',
    '--muted':    '--muted',
    '--hair':     '--hair',
    '--card-brd': '--card-brd',
    '--card':     '--card',
    '--shadow':   '--shadow',
    '--maxw':     '--maxw'
  },

  dead: [],

  literals: {
    '#10140A': '--accent-ink',   // text on the acid-lime accent, 10 uses
    '#6FE3FF': '--accent-alt',
    '#FFB4A3': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--ground-deep':  'var(--ground-2)',
    '--ink-bright':   'var(--ink-max)',
    '--accent-2':     'var(--accent)',
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--ink-max)',
    '--sheen-lo':     'var(--ink-dim)',
    '--sheen-accent': 'var(--accent)',
    '--err':          'var(--err-ink)',
    '--panel-2':      'var(--ground-2)',
    '--ok':           'var(--accent)'
  },

  themeColor: '#0B0E14',
  canonical:  'https://systemsbyvega.com/sites/delivery/',
  priceRange: '',

  /* No pricing[] in the source: rates are computed by the zone quoter from
     quoterZones x quoterSizes x quoterSpeeds against quoterSettings.bands.
     pricing[] is optional in the canonical schema, so nothing is invented.
     services[] {title,desc} is already canonical. */
  jsReplace: [
  /* Folded back in from a hand-edit (see the config-record fix). These were
     applied directly to niche.js during the runtime work; without them here a
     re-conversion silently reverts the fix, and this file stops being the
     record tools/convert/README.md says it is. */
    ["el.setAttribute('r', r.toFixed(2));",
     "/* The spring can overshoot below zero on the first frames (r starts at 3\n         and v is unbounded), and <circle r=\"-0.16\"> is an SVG error the browser\n         logs and then ignores. Clamp the ATTRIBUTE, not r itself — the spring\n         must keep its real value or the damping stops converging. */\n      el.setAttribute('r', Math.max(0, r).toFixed(2));"],
  ],

  transform(src, out) {
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = {
      quoterZones: src.quoterZones || [],
      quoterSizes: src.quoterSizes || [],
      quoterSpeeds: src.quoterSpeeds || [],
      quoterSettings: src.quoterSettings || {},
      dispatch: src.dispatch || [],
      business: src.business || []
    };
  },

  brief: `slug:            delivery
business:        Swiftwater Courier
tagline:         Across town, today
city:            Nampa, ID
palette:         acid-lime on near-black, cyan second accent;
                 ground #0B0E14, ink #F2F5F9, accent #C8F31D
type:            Syne / Inter Tight / IBM Plex Mono
price anchors:   zone-to-zone bands x size x speed, with a minimum
differentiators: live zone map; price before you book; same-day across the valley
tone:            fast, precise
scene:           9 defs inline — passes §6.1
animation:       REAL, in niche.js (D-P) — springPulse pulse markers on the live
                 zone map, driven by syncMap() off the quoter's state
interactive:     GENUINE ZONE QUOTER — pickup x drop x size x speed computes a
                 live price. One of only three sites in the estate with real
                 interactive pricing
pricing shape:   NO pricing[] — the quoter IS the pricing (niche.quoter*).
                 Optional in the schema, so nothing invented
head fixed:      original had no canonical, og:url, twitter:card or theme-color
MOBILE BUSINESS: like bbq-food-truck, but it DOES declare a serviceArea, so
                 D-N's fallback is not needed here
licensing:       unlicensed in most states, but commercial auto insurance and
                 the 1099-driver question are real — flag both in the kit
niche data:      quoterZones[], quoterSizes[], quoterSpeeds[], quoterSettings{},
                 dispatch[], business[]
`
};
