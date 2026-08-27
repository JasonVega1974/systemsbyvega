export default {
  scheme: 'light',       // oat ground, dark ink

  css:    [29, 287],     // main <style> … </style>
  markup: [304, 593],    // after the noscript + demo-banner style blocks
  js:     [595, 1182],   // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 5 defs — one short of §6.1's 6, reported as a warn

  /* D-S. Zero rAF, but the hero scene is genuinely animated — in CSS:
       hkTwinkle 3.2s infinite  .hs-glint
       hkGlow    6s   infinite  .hs-glow
       hkSteam   4.2s infinite  .hs-steam
       hkTwinkle 5s   infinite  .hs-win
     All four loop; a prefers-reduced-motion block sets animation:none. The
     fifth keyframe, hkMoment (.5s … both), is a card entrance and is correctly
     NOT counted — it does not loop. */
  sceneJs: null,
  animationInCss: 'hkTwinkle, hkGlow and hkSteam — a twinkling, glowing, gently steaming evening scene on .hs-*',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Fredoka', sans-serif",
    body:    "'Atkinson Hyperlegible', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--oat-soft':    '--ground-2',
    '--oat':         '--ground',
    '--panel':       '--panel',
    '--huck-bright': '--accent-2',
    '--huck-deep':   '--accent-deep',
    '--huck':        '--accent',
    '--sun-soft':    '--accent-alt-soft',
    '--sun':         '--accent-alt',
    '--ink':         '--ink',
    '--muted':       '--muted',
    '--hair':        '--hair',
    '--card-brd':    '--card-brd',
    '--card':        '--card',
    '--shadow':      '--shadow',
    '--maxw':        '--maxw'
  },

  dead: [],

  /* #2A2140 is the night sky behind the hero scene, #3A2410 the warm window
     interior — both one-offs, but named because the scene reads by them. */
  literals: {
    '#2A2140': '--scene-night',
    '#3A2410': '--scene-warm',
    '#FFD9C6': '--err-tint',
    '#fff':    '--panel-solid'
  },

  extraTokens: {
    '--ground-deep':     'var(--ground-2)',
    '--ink-max':         'var(--panel-solid)',
    '--ink-bright':      'var(--ink)',
    '--ink-dim':         'var(--muted)',
    '--accent-ink':      'var(--panel-solid)',   // white on huckleberry purple
    '--accent-alt-deep': 'var(--accent-alt)',
    '--hair-accent':     'var(--hair)',
    '--placeholder':     'var(--muted)',
    '--sheen-hi':        'var(--panel-solid)',
    '--sheen-lo':        'var(--ground-2)',
    '--sheen-accent':    'var(--accent-2)',
    '--err':             '#B4453A',
    '--err-ink':         '#B4453A',
    '--panel-2':         'var(--ground-2)',
    '--ok':              'var(--accent)'
  },

  themeColor: '#FDF7EF',
  canonical:  'https://systemsbyvega.com/sites/child-care/',
  priceRange: '',

  /* services[].from ("from $16/hr") is carried through as a CANONICAL optional
     string, not moved to niche. It is a price qualifier and it stays attached to
     the service it qualifies — the same compliance argument that made
     pricing[].note canonical. Detach it and a later template change renders a
     service with no indication of what it costs.

     rates {base:"16", perExtraKid:"3", weekendBump:"2"} stay STRINGS under
     niche. The renderer does arithmetic on them via Number(); coercing here
     would be a behaviour change for no gain, and niche.* has no type contract.

     howItWorks[] and approach[] follow bin-cleaning and dog-walking into niche.
     No pricing[]: the planner computes from rates against the age/time/needs
     pickers. Optional in the schema, so nothing is invented. */
  transform(src, out) {
    for (const k of ['stats', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.services = (src.services || []).map(s => ({
      title: s.title, desc: s.desc, from: s.from
    }));
    out.niche = {
      ageBands:   src.ageBands || [],
      careTimes:  src.careTimes || [],
      careNeeds:  src.careNeeds || [],
      rundown:    src.rundown || [],
      rates:      src.rates || {},
      ratesNote:  src.ratesNote || '',
      howItWorks: src.howItWorks || [],
      approach:   src.approach || []
    };
  },

  brief: `slug:            child-care
business:        Huckleberry Sitters
city:            Boise, ID
palette:         LIGHT GROUND — huckleberry purple on oat, sun-gold second
                 accent; ground #FDF7EF, ink #3A3128, accent #7A5BA6
type:            Fredoka / Atkinson Hyperlegible / IBM Plex Mono
                 (Atkinson Hyperlegible is a legibility face — a deliberate
                 accessibility choice for a parent-facing site, keep it)
price anchors:   hourly base, plus per-extra-kid and weekend bumps
differentiators: the same sitter, a written rundown, rates agreed up front
tone:            warm, concrete
scene:           5 defs — ONE SHORT of §6.1's 6. Reported as a warn; the
                 cheapest §6.1 fix in the estate
animation:       REAL, in CSS (D-S) — hkTwinkle/hkGlow/hkSteam loop forever on
                 the hero evening scene, switched off by a reduced-motion block.
                 Zero rAF, which is why the pre-D-S check called it a gap.
                 hkMoment is a one-shot card entrance and does not count
interactive:     RATE PLANNER — age bands x care times x needs against
                 rates{} produces a live estimate, and sendPlanToForm() carries
                 the result into the booking form
pricing shape:   NO pricing[] — the planner IS the pricing (niche.rates).
                 Optional in the schema, so nothing invented
SCHEMA:          services[].from is canonical-optional (approved this batch),
                 NOT niche data. A price qualifier stays attached to what it
                 prices — same argument as pricing[].note
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      ratesNote — "every rate is confirmed together before" the
                 booking. Kept with the rate data
licensing:       REGULATED and the sharpest case in wave 3. In-home sitting is
                 usually exempt, but ratios, background checks and CPR/first-aid
                 certification are expected, and licensed child care has hard
                 state thresholds on child count and hours. See Phase 0 D-2
                 before selling this as a territory. Item 1 removed fabricated
                 credential chips from the buyer-ready build
niche data:      ageBands[], careTimes[], careNeeds[], rundown[], rates{},
                 ratesNote, howItWorks[], approach[]
`
};
