export default {
  scheme: 'light',       // ice ground, dark ink

  css:    [29, 272],     // main <style> … </style>
  markup: [289, 501],    // after the noscript + demo-banner style blocks
  js:     [503, 882],    // the outer IIFE, inclusive of open/close

  /* ZERO SVG defs — the house cutaway is built from flat shapes and CSS
     gradients, like tattoo-studio. Joint-weakest illustration in the estate. */
  defsSvg: false,

  /* D-S. Zero rAF, one looping CSS animation:
       hsPulse 2.6s infinite  .hs-ring / .hs-halo
     the hotspot ring on the interactive system map, switched off by a
     prefers-reduced-motion block. This is the CSS analogue of delivery's
     springPulse map markers, which were graded a real animation last batch —
     same thing, different language. Weaker than child-care's four-keyframe
     scene, but it loops, it is niche-specific, and it honours reduced motion. */
  sceneJs: null,
  animationInCss: 'hsPulse — the hotspot ring pulsing on the interactive system map (.hs-ring, .hs-halo)',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Kanit', sans-serif",
    body:    "'Albert Sans', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--ice-soft':     '--ground-2',
    '--ice':          '--ground',
    '--panel':        '--panel',
    '--steel-bright': '--accent-2',
    '--steel-deep':   '--accent-deep',
    '--steel-soft':   '--accent-soft',
    '--steel':        '--accent',
    '--coral-deep':   '--accent-alt-deep',
    '--coral-soft':   '--accent-alt-soft',
    '--coral':        '--accent-alt',
    '--ink':          '--ink',
    '--muted':        '--muted',
    '--hair':         '--hair',
    '--card-brd':     '--card-brd',
    '--card':         '--card',
    '--shadow':       '--shadow',
    '--maxw':         '--maxw'
  },

  dead: [],

  literals: {
    '#FFD9C6': '--err-tint',
    '#fff':    '--panel-solid'
  },

  extraTokens: {
    '--ground-deep':  'var(--ground-2)',
    '--ink-max':      'var(--panel-solid)',
    '--ink-bright':   'var(--ink)',
    '--ink-dim':      'var(--muted)',
    '--accent-ink':   'var(--panel-solid)',   // white on steel blue
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--panel-solid)',
    '--sheen-lo':     'var(--ground-2)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#B4453A',
    '--err-ink':      '#B4453A',
    '--panel-2':      'var(--ground-2)',
    '--ok':           'var(--accent)'
  },

  themeColor: '#F2F7FB',
  canonical:  'https://systemsbyvega.com/sites/hvac/',
  priceRange: '',

  /* The heaviest schema transform in wave 3 — four drifts on one array:
       plans[]            -> pricing[]
       plans[].name       -> pricing[].label
       plans[].price "$89"-> pricing[].price 89        (number; the renderer formats)
       plans[].features   -> array, split on the newlines it was already
                             split on at render time
       plans[].best       -> pricing[].highlight       (boolean)
       plans[].note       -> DROPPED.
     note is not fine print here. It renders ONLY when best is true, and the
     original renderer reads `p.note || 'Most popular'` with note set to exactly
     "Most popular" — so highlight:true alone reproduces byte-identical output.
     Mapping it onto canonical note would misuse a field reserved for a caveat
     that qualifies a price. Storing the same fact twice is what this
     consolidation exists to remove.

     services[].pole ('heat','cool','air','plan') -> services[].icon. It selects
     the glyph, which is what icon is for.

     systemMap[] carries per-component price ranges as free text ("$89 tune-up ·
     repairs quoted flat first") and is the second interactive surface, so it
     stays whole under niche alongside sysNote. */
  jsReplace: [
  /* Folded back in from a hand-edit (see the config-record fix). These were
     applied directly to niche.js during the runtime work; without them here a
     re-conversion silently reverts the fix, and this file stops being the
     record tools/convert/README.md says it is. */
    ["c.plans.map(function(p){",
     "c.pricing.map(function(p){"],
    ["var feats = (p.features || '').split('\\n').filter(Boolean).map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('');",
     "/* Canonical shape (§4.2): pricing[], features is an ARRAY, highlight is the\n         flag, label is the name, and price is a NUMBER — formatting is the\n         renderer's job, which is why the currency symbol is added here.\n         The old note field held \"Most popular\", which is exactly what highlight\n         already means, so it was dropped and the badge text is literal now. */\n      var feats = (p.features || []).map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('');"],
    ["(p.best ? ' best' : '')",
     "(p.highlight ? ' best' : '')"],
    /* note held exactly "Most popular", which is what highlight already means,
       so the field was dropped and the badge renders that literal. */
    ["(p.best ? '<span class=\"pnote\">' + esc(p.note || 'Most popular') + '</span>' : '')",
     "(p.highlight ? '<span class=\"pnote\">Most popular</span>' : '')"],
    ["esc(p.name)",
     "esc(p.label)"],
    /* price is a NUMBER now (89, not "$89"), so the renderer adds the symbol. */
    ["'<div class=\"pnum\">' + esc(p.price)",
     "'<div class=\"pnum\">$' + esc(p.price)"],
    ["var pole = svcIcos[s.pole] ? s.pole : 'plan';",
     "/* pole was renamed to the canonical services[].icon (§4.2). */\n      var pole = svcIcos[s.icon] ? s.icon : 'plan';"],
  ],

  transform(src, out) {
    for (const k of ['stats', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];

    out.services = (src.services || []).map(s => ({
      title: s.title, desc: s.desc, icon: s.pole
    }));

    out.pricing = (src.plans || []).map(p => ({
      label:     p.name,
      price:     Number(String(p.price).replace(/[^0-9.]/g, '')),
      per:       p.per,
      features:  String(p.features || '').split('\n').filter(Boolean),
      highlight: p.best === true
    }));

    out.niche = {
      systemMap:   src.systemMap || [],
      sysNote:     src.sysNote || '',
      seasonal:    src.seasonal || [],
      pricingNote: src.pricingNote || ''
    };
  },

  brief: `slug:            hvac
business:        Steelhead Heating & Air
city:            Nampa, ID
palette:         LIGHT GROUND — steel blue on ice, coral second accent;
                 ground #F2F7FB, ink #152435, accent #1E6FB0
type:            Kanit / Albert Sans / IBM Plex Mono
price anchors:   $89 tune-up, $159 season pass, $249 whole-home — repairs
                 always quoted flat and approved before work starts
differentiators: flat quotes before the wrench comes out; no sales pitch
tone:            direct, technical
scene:           ZERO SVG defs — the house cutaway is flat shapes and CSS
                 gradients. Joint-weakest illustration with tattoo-studio.
                 Phase 3 gap (§6.1)
animation:       REAL, in CSS (D-S) — hsPulse loops on the system-map hotspot
                 ring, with a reduced-motion override. The CSS analogue of
                 delivery's springPulse markers. Zero rAF, which is why the
                 pre-D-S check called it a gap
interactive:     SYSTEM MAP — click a component on the house and get its
                 symptoms, what a visit covers, and a price range. Plus a
                 three-tier plan grid
SCHEMA (heavy):  plans->pricing, name->label, "$89"->89, features string->array,
                 best->highlight, services[].pole->icon.
                 plans[].note "Most popular" DROPPED — it rendered only when
                 best was true and the renderer already defaults to that exact
                 string, so highlight:true reproduces it. One fact, one place
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      pricingNote — "repairs are always quoted flat and approved"
                 before work. sysNote covers the "not sure what's wrong" path.
                 systemMap[].range is deliberately free text, not a number: it
                 holds "Free with any tune-up" as often as a figure
licensing:       REGULATED. HVAC contractors need a state licence in most
                 states, EPA Section 608 certification is federally required to
                 handle refrigerant, and bonding is common. One of the five
                 licensed trades the catalog keeps. See Phase 0 D-2
niche data:      systemMap[], sysNote, seasonal[], pricingNote
`
};
