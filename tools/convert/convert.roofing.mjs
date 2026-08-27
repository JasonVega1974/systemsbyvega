export default {
  scheme: 'dark',

  css:    [29, 234],     // main <style> … </style>
  markup: [251, 589],    // after the noscript + demo-banner style blocks
  js:     [591, 960],    // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 11 defs, inline — passes §6.1
  /* D-P: stepGlow is a damped spring (k=0.16, damp=0.74) driven by the
     self-check quiz state and reading #chkGlow. It is a helper the renderer
     calls, not a standalone scene, so it stays in niche.js. */
  sceneJs: null,
  animationInNiche: 'stepGlow — damped-spring glow across the roof self-check',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Anton', system-ui, sans-serif",
    body:    "'Rubik', system-ui, -apple-system, sans-serif",
    mono:    "'Overpass Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--deep':           '--ground-deep',
    '--slate-2':        '--panel',
    '--slate':          '--ground',
    '--fog':            '--panel-2',
    '--copper-bright':  '--accent-2',
    '--copper-deep':    '--accent-deep',
    '--copper':         '--accent',
    '--steel':          '--ink-dim',
    '--mist-soft':      '--ink-bright',
    '--mist':           '--ink',
    '--muted':          '--muted',
    '--green':          '--ok',
    '--line':           '--hair-accent',
    '--hair':           '--hair',
    '--card-brd':       '--card-brd',
    '--card':           '--card',
    '--shadow':         '--shadow',
    '--maxw':           '--maxw'
  },

  dead: [],

  literals: {
    '#1a0d05': '--accent-ink',   // text on copper, 5 uses
    '#0a121a': '--ground-2',
    '#5f7386': '--placeholder',
    '#e8836a': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--sheen-hi':     'var(--ink-max)',
    '--sheen-lo':     'var(--ink-dim)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          'var(--err-ink)'
  },

  themeColor: '#121B24',
  canonical:  'https://systemsbyvega.com/sites/roofing/',
  priceRange: '',

  /* pricing[] keeps its name. price is a DISPLAY STRING with an en-dash range
     ("$350–$1,200") -> blurb per D-M; featured -> highlight.
     stats/services/testimonials/faq already canonical.
     selfCheck -> niche.selfCheck, the quiz the animation is driven by. */
  transform(src, out) {
    out.pricing = (src.pricing || []).map(p => ({
      label: p.label,
      blurb: p.price,
      per: p.per,
      features: Array.isArray(p.features) ? p.features
              : String(p.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      highlight: !!p.featured
    }));
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = { selfCheck: src.selfCheck || {} };
  },

  brief: `slug:            roofing
business:        Stormridge Roofing
tagline:         Straight answers about your roof
city:            Nampa, ID
palette:         copper on slate — ground #121B24, accent #B5541F
type:            Anton / Rubik / Overpass Mono
price anchors:   repairs \$350-\$1,200; larger work quoted after inspection
differentiators: self-check quiz before you call; written scope before work
tone:            calm, straight
scene:           11 defs inline across two scenes — passes §6.1
animation:       REAL, in niche.js (D-P) — stepGlow, damped spring k=0.16
                 damp=0.74, driven by the self-check quiz state
interactive:     roof self-check quiz
pricing shape:   DISPLAY STRINGS -> blurb, no numeric price (D-M)
head fixed:      original had no canonical, og:url, twitter:card or theme-color
licensing:       STATE-LICENSED TRADE in most states — see Phase 0 D-2 before
                 selling this niche as an exclusive market
niche data:      selfCheck{}
`
};
