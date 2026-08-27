export default {
  scheme: 'dark',

  css:    [47, 505],     // main <style> … </style>
  markup: [522, 953],    // after the noscript + demo-banner style blocks
  js:     [955, 1335],   // inside the main <script>

  defsSvg: false,        // 10 defs, distributed inline — passes §6.1
  /* No signature ANIMATION: zero requestAnimationFrame. The colour visualizer is
     a signature INTERACTION (8 swatches recolouring an SVG wall via a CSS
     transition), which §9.3 scores separately. Ruled a Phase 3 gap under D-K
     rather than widening §7 to admit any reduced-motion-gated transition. */
  sceneJs: null,
  animationTodo: 'roller sweep laying colour across the wall, settling to the chosen swatch',

  bootMarker: 'renderAll();',

  /* Read from the site's own fontsHref and per-role CSS usage, not from memory. */
  fonts: {
    display: "'Fraunces', Georgia, serif",
    body:    "'Karla', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--char-deep':          '--ground-deep',
    '--char-2':             '--panel-2',
    '--char':               '--ground',
    '--panel':              '--panel',
    '--terracotta-bright':  '--accent-2',
    '--terracotta-deep':    '--accent-deep',
    '--terracotta':         '--accent',
    '--sage':               '--accent-alt',
    '--cream-soft':         '--ink-bright',
    '--cream':              '--ink',
    '--stone':              '--ink-dim',
    '--muted':              '--muted',
    '--line':               '--hair-accent',
    '--hair':               '--hair',
    '--card-brd':           '--card-brd',
    '--card':               '--card',
    '--shadow':             '--shadow',
    '--maxw':               '--maxw'
  },

  dead: [],

  literals: {
    '#221208': '--accent-ink',   // text on terracotta, 5 uses
    '#fffdf9': '--sheen-hi',
    '#d8cbb8': '--sheen-lo',
    '#0F0D0C': '--ground-2',
    '#17130f': '--panel-3',
    '#100e0c': '--panel-4',
    '#6b6157': '--placeholder',
    '#e0616b': '--err',
    '#ff9aa2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--sheen-accent': 'var(--accent-2)'
  },

  themeColor: '#131110',
  priceRange: '$450-$6500',

  /* pricing[] -> pricing[]  (D-A, D-J)
       tier -> label, unit -> per, best(bool) -> highlight,
       priceLow -> price, priceHigh -> priceHigh (range preserved end to end)
       features already an array
     services[] / faq[] / testimonials[] are ALREADY canonical — including
     testimonials[].name, the first site not to carry the author drift.
     swatches[] -> niche.swatches (§4.3) — the visualizer's palette */
  transform(src, out) {
    out.pricing = (src.pricing || []).map(p => ({
      label: p.tier,
      price: p.priceLow,
      priceHigh: p.priceHigh,
      per: p.unit,
      features: Array.isArray(p.features) ? p.features : [],
      highlight: !!p.best
    }));
    if (src.services) out.services = src.services;
    if (src.faq) out.faq = src.faq;
    if (src.testimonials) out.testimonials = src.testimonials;
    if (src.social) out.social = src.social;
    out.niche = { swatches: src.swatches || [] };
  },

  brief: `slug:            painting
business:        Bristlecone Paint Co.
tagline:         Colour you can live with
city:            Nampa, ID
palette:         terracotta on charcoal, sage second accent — ground #131110, accent #C97B63
type:            Fraunces / Karla / IBM Plex Mono
price anchors:   Room Refresh $450-$900, mid tier, whole-home to $9,800 (per JSON-LD)
differentiators: colour visualizer before you commit; two coats, colour-matched; furniture moved
tone:            warm, unhurried
scene:           10 defs distributed inline — passes §6.1
animation:       NONE YET — Phase 3 gap. It has a strong signature INTERACTION
                 (the swatch visualizer) but nothing self-animating; see D-K.
interactive:     colour visualizer, 8 swatches recolouring an SVG wall
pricing shape:   RANGES — priceLow/priceHigh, both ends must render (D-J)
licensing:       most states do not license residential painting; flag RRP
                 certification for pre-1978 homes in the business kit
niche data:      swatches[] (8)
`
};
