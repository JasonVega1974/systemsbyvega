export default {
  scheme: 'dark',

  css:    [43, 503],     // main <style> … </style>
  markup: [520, 826],    // after the noscript + demo-banner style blocks
  js:     [828, 1147],   // inside the main <script>

  defsSvg: false,        // ZERO defs — joint-thinnest in the estate with tattoo-studio
  sceneJs: null,         // zero requestAnimationFrame — Phase 3 gap (D-B)
  animationTodo: 'current tracing the switchboard circuit, settling on the selected breaker',

  bootMarker: 'renderContent(CONTENT);',

  /* Read from fontsHref and per-role CSS usage, not from memory. */
  fonts: {
    display: "'Rajdhani', system-ui, sans-serif",
    body:    "'Inter', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--navy-deep':      '--ground-deep',
    '--navy-2':         '--panel',
    '--navy':           '--ground',
    '--panel-2':        '--panel-2',
    '--violet-bright':  '--accent-2',
    '--violet-deep':    '--accent-deep',
    '--violet':         '--accent',
    '--spark-deep':     '--accent-alt-deep',
    '--spark':          '--accent-alt',
    '--ink-soft':       '--ink-dim',
    '--ink':            '--ink',        // already canonical, name and meaning
    '--muted':          '--muted',
    '--line':           '--hair-accent',
    '--hair':           '--hair',
    '--card-brd':       '--card-brd',
    '--card':           '--card',
    '--shadow':         '--shadow',
    '--maxw':           '--maxw'
  },

  dead: [],

  literals: {
    '#050414': '--accent-ink',   // text on the violet accent, 5 uses
    '#ffffff': '--sheen-hi',
    '#c3caea': '--sheen-lo',
    '#070915': '--ground-2',
    '#3a4266': '--panel-3',
    '#232a48': '--panel-4',
    '#5b6690': '--placeholder',
    '#ff9aa2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#e0616b',   // this palette has err-ink but no err border
    '--ink-bright':   'var(--ink-max)'
  },

  themeColor: '#0A0D1C',
  priceRange: '$95-$3200',

  /* D-L(c). pricing is an OBJECT here, not an array, and its ranges are
     PRE-FORMATTED STRINGS ("$1,800 – $3,200") rather than numbers.

       ranges[]     -> pricing[]  label -> label, range -> blurb, NO price field.
                       Parsing currency out of display text would risk mangling a
                       tier silently; a range that exists only as a string is not
                       a structured offer, so these are correctly absent from
                       makesOffer.
       serviceCall  -> niche.serviceCall — a diagnostic fee is not a tier.

     services[] keeps its `id`: the switchboard interaction joins on it. label ->
     title brings it onto the canonical shape; the extra key is harmless.
     testimonials[].author -> name — third occurrence, all entries empty. */
  transform(src, out) {
    const p = src.pricing || {};
    out.pricing = (p.ranges || []).map(r => ({
      label: r.label,
      blurb: r.range
    }));
    out.services = (src.services || []).map(s => ({
      id: s.id,
      title: s.label,
      desc: s.desc
    }));
    if (src.faq) out.faq = src.faq;
    out.testimonials = (src.testimonials || []).map(t => ({
      quote: t.quote,
      name: t.author
    }));
    if (src.social) out.social = src.social;
    out.niche = { serviceCall: p.serviceCall || {} };
  },

  brief: `slug:            electrician
business:        Voltridge Electric
tagline:         One van, one electrician, one price
city:            Nampa, ID
palette:         violet on deep navy, spark-cyan second accent — ground #0A0D1C, accent #6C63FF
type:            Rajdhani / Inter / IBM Plex Mono
price anchors:   \$95 service call; repairs \$150-\$450; panel upgrade \$1,800-\$3,200
differentiators: the electrician answers the phone; price quoted before work starts
tone:            direct, unshowy
scene:           ZERO defs — joint-thinnest in the estate. Phase 3 gap (§6.1)
animation:       NONE — zero rAF. Phase 3 gap (§7)
interactive:     switchboard breaker picker (renderBreakers/renderReadout)
pricing shape:   RANGES AS STRINGS -> blurb, no numeric price (D-L c).
                 These tiers are deliberately absent from makesOffer.
licensing:       STATE-LICENSED TRADE. The territory question does not apply the
                 same way here — see the Phase 0 D-2 analysis before selling this
                 niche as an exclusive market.
niche data:      serviceCall{price,note}
`
};
