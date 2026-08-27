export default {
  scheme: 'dark',

  css:    [48, 527],     // main <style> … </style>
  markup: [546, 872],    // after the noscript + demo-banner style blocks
  js:     [874, 1573],   // inside the main <script>

  defsSvg: false,        // only 1 def, inline — §6.1 Phase 3 gap
  /* The wand-reveal canvas: two stacked canvases, destination-out compositing
     erases the grime layer along the drag path. Self-contained IIFE at 994-1291,
     zero CONTENT references, and it already handles reduced motion by revealing a
     static patch instead of running the ambient sweep. First real scene of wave 1. */
  sceneJs: [994, 1291],

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body:    "'Manrope', system-ui, -apple-system, sans-serif",
    mono:    "'Space Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--deep':         '--ground-deep',
    '--navy-2':       '--panel',
    '--navy':         '--ground',
    '--teal':         '--panel-2',
    '--aqua-bright':  '--accent-2',
    '--aqua-deep':    '--accent-deep',
    '--aqua':         '--accent',
    '--grime':        '--accent-alt',
    '--ink-soft':     '--ink-dim',
    '--ink':          '--ink',          // already canonical, name and meaning
    '--muted':        '--muted',
    '--line':         '--hair-accent',
    '--hair':         '--hair',
    '--card-brd':     '--card-brd',
    '--card':         '--card',
    '--shadow':       '--shadow',
    '--maxw':         '--maxw'
  },

  dead: [],

  literals: {
    '#04222b': '--accent-ink',   // text on the aqua button, 5 uses
    '#051620': '--ground-2',     // page gradient top stop
    '#bfe4ee': '--sheen-lo',     // text-gradient bottom stop
    '#5c7480': '--placeholder',
    '#e0616b': '--err',
    '#ff9aa2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    // #fff serves double duty here: plain white AND the text-gradient top stop.
    '--sheen-hi':     '#fff',
    '--sheen-accent': 'var(--accent-2)',
    // This palette has --ink and --ink-soft but no brighter variant; base.css
    // wants one. Derived from the site's own maximum, not invented.
    '--ink-bright':   'var(--ink-max)'
  },

  themeColor: '#071e29',
  priceRange: '$149-$499',

  /* pricing[] keeps its name but three fields move (D-A, D-I):
       name -> label, unit -> per, best(bool) -> highlight,
       features (\n string) -> features[], note -> note (now canonical)
     testimonials[].author -> name — first occurrence of this drift; all three
     entries are empty strings, so the rename costs nothing.
     surfaces[] -> niche.surfaces (§4.3) */
  transform(src, out) {
    out.pricing = (src.pricing || []).map(p => ({
      label: p.name,
      price: p.price,
      per: p.unit,
      note: p.note,
      features: String(p.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      highlight: !!p.best
    }));
    out.testimonials = (src.testimonials || []).map(t => ({
      quote: t.quote,
      name: t.author,
      location: t.location
    }));
    if (src.social) out.social = src.social;
    out.niche = { surfaces: src.surfaces || [] };
  },

  brief: `slug:            pressure-washing
business:        Grit & Gleam Power Wash
tagline:         The grime comes off, or you don't pay
city:            Nampa, ID
palette:         aqua on deep navy, grime-tan second accent — ground #071e29, accent #22D3EE
type:            Space Grotesk / Manrope / Space Mono
price anchors:   Driveway Refresh $149, mid tier, full exterior to $499
differentiators: hot-water blast; before/after photos texted; square footage quoted up front
tone:            direct, no-nonsense
scene:           1 inline def only — §6.1 Phase 3 gap despite a strong animation
animation:       REAL — canvas wand-reveal, destination-out erase on drag (scene.js)
interactive:     drag-to-clean canvas; package picker (pickPackage)
licensing:       generally unlicensed; water-reclamation rules vary by city
niche data:      surfaces[] (5)
`
};
