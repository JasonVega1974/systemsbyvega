export default {
  scheme: 'dark',

  css:    [45, 546],     // main <style> … </style>
  markup: [563, 821],    // after the noscript + demo-banner style blocks
  js:     [823, 1399],   // inside the main <script>

  defsSvg: false,        // ZERO defs — joint-thinnest with electrician
  /* No signature ANIMATION per §7: the single rAF is a toast fade. The ambient
     smoke and embers are CSS radial-gradient divs across 5 @keyframes — a
     signature LOOK, not a self-animating moment. Same D-K ruling as painting. */
  sceneJs: null,
  animationTodo: 'smoke rising off the smoker stack, settling to the ambient drift',

  bootMarker: 'renderContent();',

  fonts: {
    display: "'Alfa Slab One', Georgia, serif",
    body:    "'Nunito Sans', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--char':        '--ground-deep',
    '--coal-2':      '--panel',
    '--coal':        '--ground',
    '--ember-hot':   '--accent-2',
    '--ember-deep':  '--accent-deep',
    '--ember':       '--accent',
    '--mustard':     '--accent-alt',
    '--paper-dim':   '--ink-dim',
    '--paper':       '--ink',
    '--muted':       '--muted',
    '--line':        '--hair-accent',
    '--hair':        '--hair',
    '--card-brd':    '--card-brd',
    '--card':        '--card',
    '--glow':        '--glow',
    '--shadow':      '--shadow',
    '--maxw':        '--maxw'
  },

  dead: [],

  literals: {
    '#180B04': '--accent-ink',   // text on ember, 7 uses
    '#FFFDF7': '--sheen-hi',
    '#E2C79B': '--sheen-lo',
    '#FFD68A': '--sheen-accent',
    '#12100D': '--ground-2',
    '#0A0806': '--ground-3',
    '#221710': '--panel-2',
    '#140E09': '--panel-3',
    '#D89A5E': '--accent-alt-2',
    '#7d6a55': '--placeholder',
    '#E0616B': '--err',
    '#FF9AA2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--ink-bright': 'var(--ink-max)'
  },

  themeColor: '#0C0A08',
  priceRange: '',        // source carries "$$" — a schema.org price TIER; kept verbatim

  /* D-N(a) + D-O. This is a MOBILE business and the data says so.

     brand.formEmail -> brand.leadEmail   a rename; the value is already correct
     brand.tagline                        absent from content.json; lifted from
                                          the head's JSON-LD "slogan"
     serviceArea                          ABSENT and left absent. A truck parks
                                          at named stops; brand.city carries
                                          "Nampa & Boise, Idaho" and every
                                          consumer falls back to it.
     catering.packages[] -> pricing[]     a genuine tier list. price is a display
                                          string ("$21") so it goes to blurb per
                                          D-M; label/per/features/best all map.
     menu{} -> niche.menu                 four food categories are not a tier list.
     schedule[] -> niche.schedule         seven days of pitches. */
  transform(src, out) {
    const b = src.brand || {};
    out.brand = {
      name: b.name,
      tagline: 'Smoked All Night. Parked Near You.',   // from the source's JSON-LD slogan
      phone: b.phone,
      email: b.email,
      leadEmail: b.formEmail,
      city: b.city,
      instagram: b.instagram
    };
    out.pricing = ((src.catering || {}).packages || []).map(p => ({
      label: p.label,
      blurb: p.price,
      per: p.per,
      features: Array.isArray(p.features) ? p.features : [],
      highlight: !!p.best
    }));
    if (src.social) out.social = src.social;
    out.niche = {
      announcement: src.announcement || {},
      about: src.about || {},
      schedule: src.schedule || [],
      menu: src.menu || {}
    };
  },

  brief: `slug:            bbq-food-truck
business:        Cinder Hog BBQ
tagline:         Smoked All Night. Parked Near You.
city:            Nampa & Boise, Idaho
palette:         ember orange on charcoal, mustard second accent — ground #171310, accent #E8590C
type:            Alfa Slab One / Nunito Sans / IBM Plex Mono
price anchors:   plates from \$18; catering from \$21 per person
differentiators: 14-hour oak-smoked brisket; one truck, one fire; schedule posted weekly
tone:            warm, plainspoken, proud
scene:           ZERO SVG defs. The look is CSS radial-gradient smoke and embers
                 across 5 keyframes — Phase 3 gap on §6.1 regardless
animation:       NONE per §7 — the single rAF is a toast fade (D-K)
interactive:     weekly schedule (renderWeek) and a catering package picker
MOBILE BUSINESS: no serviceArea by design (D-N). It parks at six named spots;
                 brand.city carries the metro and every consumer falls back to it.
pricing shape:   catering packages only. Display strings -> blurb (D-M). The MENU
                 is niche data — four food categories are not a tier list.
licensing:       mobile food vending — permits, commissary and health inspection
                 vary by county. Flag prominently in the business kit.
niche data:      schedule[] (7 days), menu{plates,sandwiches,sides,drinks},
                 announcement{}, about{}
`
};
