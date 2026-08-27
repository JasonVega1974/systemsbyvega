export default {
  scheme: 'dark',

  css:    [29, 247],     // main <style> … </style>
  markup: [264, 501],    // after the noscript + demo-banner style blocks
  js:     [503, 888],    // the outer IIFE, inclusive of its own open/close

  defsSvg: false,        // 4 defs, inline — below §6.1's 6, Phase 3 gap
  /* REAL signature animation: gravity-accelerated drop physics on a canvas
     (GRAV = 0.17, elongation with velocity, ripples on impact). Self-contained
     IIFE, closes over `reduce`, and returns early under reduced motion leaving a
     static faucet. Lines 755-791 of the original. */
  sceneJs: [755, 791],

  bootMarker: 'renderContent(CONTENT);',

  /* Read from fontsHref and per-role usage, not from memory. */
  fonts: {
    display: "'Chivo', system-ui, sans-serif",
    body:    "'Public Sans', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--slate-deep':     '--ground-deep',
    '--slate-2':        '--panel',
    '--slate':          '--ground',
    '--steel':          '--panel-2',
    '--cobalt-bright':  '--accent-2',
    '--cobalt-deep':    '--accent-deep',
    '--cobalt':         '--accent',
    '--copper-bright':  '--accent-alt-2',
    '--copper':         '--accent-alt',
    '--ice-soft':       '--ink-bright',
    '--ice':            '--ink',
    '--muted':          '--muted',
    '--green':          '--ok',          // semantic success; §5.3 optional
    '--line':           '--hair-accent',
    '--hair':           '--hair',
    '--card-brd':       '--card-brd',
    '--card':           '--card',
    '--shadow':         '--shadow',
    '--maxw':           '--maxw'
  },

  dead: [],

  literals: {
    '#04101f': '--accent-ink',   // text on cobalt, 4 uses
    '#c9d8f5': '--sheen-lo',
    '#e4574f': '--err',
    '#ff8a75': '--err-ink',
    '#fff':    '--ink-max'
  },

  /* This palette is leaner than the reference's: no dim ink, no second ground
     stop, no placeholder colour, no sheen top stop. Each is derived from a token
     this site DOES define rather than invented. */
  extraTokens: {
    '--ink-dim':      'var(--muted)',
    '--ground-2':     'var(--ground-deep)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--ink-max)',
    '--sheen-accent': 'var(--accent-2)'
  },

  /* The original has NO canonical, og:url, twitter:card or theme-color — the
     worst head in the estate (Phase 0). The build generates all of them from
     seo, so conversion fixes that; these two must be supplied because there is
     nothing in the source to read them from. */
  themeColor: '#0D121C',
  canonical:  'https://systemsbyvega.com/sites/plumbing/',
  priceRange: '$89-$800',

  /* D-M. pricing[].price holds DISPLAY STRINGS: "$89", "$150–$450", "$800+".
     The last has no canonical numeric form — price: 800 alone would read as
     exactly $800, misstating an open-ended figure. Parsing two of three and
     leaving the third would split one array across three shapes, which is the
     drift the schema exists to stop. So all three go to blurb with no numeric
     price, consistent with D-L(c) on electrician; these tiers are correctly
     absent from makesOffer.

     featured -> highlight: the third of the three retired flag names to appear
     in practice, after best and popular.
     stats/services/testimonials/faq are already canonical — no renames.
     dripCalc{} -> niche.dripCalc, the calculator's constants. */
  transform(src, out) {
    out.pricing = (src.pricing || []).map(p => ({
      label: p.label,
      blurb: p.price,
      per: p.per,
      features: String(p.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      highlight: !!p.featured
    }));
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) {
      if (src[k]) out[k] = src[k];
    }
    out.niche = { dripCalc: src.dripCalc || {} };
  },

  brief: `slug:            plumbing
business:        Cascade & Copper Plumbing
tagline:         The leak stops here
city:            Nampa, ID
palette:         cobalt on slate, copper second accent — ground #0D121C, accent #2E6FF2
type:            Chivo / Public Sans / IBM Plex Mono
price anchors:   \$89 service call (waived on repair); repairs \$150-\$450; repipe \$800+
differentiators: 24/7 emergency line; written quote before work; trip fee waived
tone:            calm, competent
scene:           4 defs inline — below §6.1's 6. Phase 3 gap
animation:       REAL — gravity drop physics on canvas, ripples on impact (scene.js)
interactive:     drip-cost calculator (a water-waste estimate, NOT service pricing)
                 and an emergency/scheduled mode toggle
pricing shape:   DISPLAY STRINGS -> blurb, no numeric price (D-M). "\$800+" has
                 no canonical numeric form; tiers absent from makesOffer.
head fixed:      the original shipped with no canonical, og:url, twitter:card or
                 theme-color. The build now generates all four.
licensing:       STATE-LICENSED TRADE — see the Phase 0 D-2 analysis before
                 selling this niche as an exclusive market.
niche data:      dripCalc{mlPerDrop,costPerGallon,minRate,maxRate,defaultRate,note}
`
};
