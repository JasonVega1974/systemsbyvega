export default {
  scheme: 'light',       // kraft-paper ground, dark ink

  css:    [29, 255],     // main <style> … </style>
  markup: [272, 570],    // after the noscript + demo-banner style blocks
  js:     [572, 991],    // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 9 defs, inline — passes §6.1

  /* The ONLY site in wave 3 with no animation of any kind: zero rAF and zero
     @keyframes. Not a CSS animation the rAF check missed (D-S) — genuinely
     absent. Real Phase 3 gap, documented no-op scene.js per D-B. */
  sceneJs: null,
  animationTodo: 'the packing scene settling — boxes stacking, tape pulling taut',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Bevan', serif",
    body:    "'Mulish', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  /* Longest-first: --kraft-soft before --kraft, --forest-bright/-deep before
     --forest, --tape-soft before --tape, --card-brd before --card. */
  tokenMap: {
    '--kraft-soft':    '--ground-2',
    '--kraft':         '--ground',
    '--panel':         '--panel',
    '--forest-bright': '--accent-2',
    '--forest-deep':   '--accent-deep',
    '--forest':        '--accent',
    '--tape-soft':     '--accent-alt-soft',
    '--tape':          '--accent-alt',
    '--ink':           '--ink',
    '--muted':         '--muted',
    '--hair':          '--hair',
    '--card-brd':      '--card-brd',
    '--card':          '--card',
    '--shadow':        '--shadow',
    '--maxw':          '--maxw'
  },

  dead: [],

  /* The five kraft shades are the corrugated-cardboard ramp on the hero boxes.
     #F3922F / #161B22 / #323A48 are demo-banner colours and sit OUTSIDE the css
     range, so they are not tokenised here. */
  literals: {
    '#f7f0e4': '--tint-1',
    '#f1e8da': '--tint-2',
    '#ece1cf': '--tint-3',
    '#e6dbc5': '--tint-4',
    '#e0d3bb': '--tint-5',
    '#FFD9C6': '--err-tint',
    '#fff':    '--panel-solid'
  },

  extraTokens: {
    '--ground-deep':     'var(--ground-2)',
    '--ink-max':         'var(--panel-solid)',
    '--ink-bright':      'var(--ink)',
    '--ink-dim':         'var(--muted)',
    '--accent-ink':      'var(--panel-solid)',   // white on forest green
    '--accent-alt-deep': 'var(--accent-alt)',
    '--hair-accent':     'var(--hair)',
    '--placeholder':     'var(--muted)',
    '--sheen-hi':        'var(--panel-solid)',
    '--sheen-lo':        'var(--ground-2)',
    '--sheen-accent':    'var(--accent-2)',
    '--err':             '#B4453A',
    '--err-ink':         '#B4453A',
    '--panel-2':         'var(--tint-1)',
    '--ok':              'var(--accent)'
  },

  themeColor: '#F0E7D8',
  canonical:  'https://systemsbyvega.com/sites/moving/',
  priceRange: '',

  /* No pricing[] in the source: an hourly rate is computed by the load
     calculator from crewTiers[].rate against loadItems x loadSettings, and
     capped by trucks[]. pricing[] is optional in the canonical schema, so
     nothing is invented. services[] {title,desc} is already canonical.
     process[] follows howItWorks[] (bin-cleaning, dog-walking) into niche.
     THREE compliance notes ride along — loadNote calls the calculator output
     "honest ballparks, not quotes", billableNote defines when the clock starts,
     pricingNote rules out fuel surcharges. All three qualify a price the buyer
     is shown, so they stay attached to the data that produces it. */
  transform(src, out) {
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = {
      loadItems:    src.loadItems || [],
      crewTiers:    src.crewTiers || [],
      trucks:       src.trucks || [],
      loadSettings: src.loadSettings || {},
      loadNote:     src.loadNote || '',
      billableNote: src.billableNote || '',
      pricingNote:  src.pricingNote || '',
      process:      src.process || []
    };
  },

  brief: `slug:            moving
business:        Kraft & Carry Moving
city:            Nampa, ID
palette:         LIGHT GROUND — forest green on kraft paper, tape-tan second
                 accent; ground #F0E7D8, ink #2E2A24, accent #2F6B4F
type:            Bevan / Mulish / IBM Plex Mono
price anchors:   hourly by crew size, computed from the load estimate
differentiators: you see the ballpark before anyone calls you
tone:            plain, unhurried
scene:           9 defs inline — passes §6.1
animation:       NONE — zero rAF AND zero @keyframes. The only site in wave 3
                 with nothing at all. Real Phase 3 gap (§7)
interactive:     GENUINE LOAD CALCULATOR — 13 load items x crew tiers x truck
                 capacity against loadSettings produces an hours-and-rate
                 ballpark. Fourth site in the estate with real interactive
                 pricing, after delivery, dumpster-rental and child-care
pricing shape:   NO pricing[] — the calculator IS the pricing (niche.crewTiers
                 [].rate). Optional in the schema, so nothing invented
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      THREE notes — loadNote ("honest ballparks, not quotes"),
                 billableNote (when the clock starts), pricingNote (no fuel
                 surcharges). Kept with the data that produces the number
licensing:       interstate movers need USDOT/MC numbers and intrastate movers
                 a state permit in most states; cargo/liability insurance is
                 expected. Flag both in the business kit
niche data:      loadItems[], crewTiers[], trucks[], loadSettings{}, loadNote,
                 billableNote, pricingNote, process[]
`
};
