export default {
  scheme: 'light',       // sky-blue ground, dark ink

  css:    [29, 282],     // main <style> … </style>
  markup: [299, 690],    // after the noscript + demo-banner style blocks
  js:     [692, 1051],   // the MAIN script — note this site has three <script> blocks

  defsSvg: false,        // 15 defs, inline — passes §6.1 comfortably
  /* The signature animation is its OWN third <script> block (1054-1099): a
     standalone IIFE with gravity + restitution on the ball and an
     energy-decaying spring burst on the tail. Genuinely self-contained, so
     unlike roofing and bin-cleaning it belongs in scene.js. It declares its own
     `reduce` and returns to a static resting pose under reduced motion. */
  sceneJs: [1055, 1098],

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Baloo 2', system-ui, sans-serif",
    body:    "'Varela Round', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--sky-soft':    '--ground-2',
    '--sky':         '--ground',
    '--panel':       '--panel',
    '--blue-bright': '--accent-2',
    '--blue-deep':   '--accent-deep',
    '--blue-soft':   '--accent-soft',
    '--blue':        '--accent',
    '--tan-deep':    '--accent-alt-deep',
    '--tan-soft':    '--accent-alt-soft',
    '--tan':         '--accent-alt',
    '--grass-soft':  '--ok-soft',
    '--grass':       '--ok',
    '--ink':         '--ink',
    '--muted':       '--muted',
    '--hair':        '--hair',
    '--card-brd':    '--card-brd',
    '--card':        '--card',
    '--shadow':      '--shadow',
    '--maxw':        '--maxw'
  },

  dead: [],

  literals: {
    '#3d6e2a': '--ok-deep',
    '#3a2a12': '--accent-alt-ink',
    '#FFD9C6': '--err-tint',
    '#F3F9FE': '--tint-1',
    '#E7F1FB': '--tint-2',
    '#79BEEF': '--tint-3',
    '#F6E6CB': '--tint-4',
    '#EACFA0': '--tint-5',
    '#FFFFFF': '--panel-solid',
    '#fff':    '--panel-solid'
  },

  extraTokens: {
    '--ground-deep':  'var(--ground-2)',
    '--ink-max':      'var(--panel-solid)',
    '--ink-bright':   'var(--ink)',
    '--ink-dim':      'var(--muted)',
    '--accent-ink':   'var(--panel-solid)',
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--panel-solid)',
    '--sheen-lo':     'var(--ground-2)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#B4453A',
    '--err-ink':      '#B4453A',
    '--panel-2':      'var(--tint-1)'
  },

  themeColor: '#F7FAFD',
  canonical:  'https://systemsbyvega.com/sites/dog-walking/',
  priceRange: '',

  /* No pricing[] in the source — rates live on walkServices[] (rate20/30/45,
     driven by the duration picker) and on services[].price. pricing[] is
     optional in the canonical schema, so nothing is invented here.
     services[] {title,desc,price} is already canonical shape. */
  transform(src, out) {
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = {
      walkServices: src.walkServices || [],
      walkSettings: src.walkSettings || {},
      howItWorks: src.howItWorks || []
    };
  },

  brief: `slug:            dog-walking
business:        Bluebird & Biscuit
tagline:         Same walker, every walk
city:            Nampa, ID
palette:         LIGHT GROUND — blue on sky, tan and grass accents;
                 ground #F7FAFD, ink #22364A, accent #3B9AE1
type:            Baloo 2 / Varela Round / IBM Plex Mono
price anchors:   per-walk rates by duration (20/30/45 min), multi-day discounts
differentiators: the same walker each time; photo after every walk
tone:            friendly, reassuring
scene:           15 defs inline — the richest illustration in wave 3
animation:       REAL, in scene.js — gravity + restitution on the ball, energy-
                 decaying spring burst on the tail. Its own third <script> block
                 in the source, genuinely standalone
interactive:     walk-duration and frequency picker driving live rates
pricing shape:   NO pricing[] — rates live on walkServices[] (niche). Optional in
                 the schema, so nothing invented
head fixed:      original had no canonical, og:url, twitter:card or theme-color
licensing:       generally unlicensed; some cities cap dogs per walker and
                 require a commercial licence — flag in the business kit
niche data:      walkServices[], walkSettings{}, howItWorks[]
`
};
