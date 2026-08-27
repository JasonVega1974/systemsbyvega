export default {
  /* FIRST LIGHT-GROUND CONVERSION. The token contract is role-based precisely
     for this: --ground is whatever the page sits on, --ink is whatever reads on
     top. Here that inverts — a cream ground with dark ink. */
  scheme: 'light',

  css:    [29, 280],     // main <style> … </style>
  markup: [297, 535],    // after the noscript + demo-banner style blocks
  js:     [537, 826],    // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 10 defs, inline — passes §6.1
  sceneJs: null,         // zero rAF — Phase 3 gap (D-B)
  animationTodo: 'golden-hour light shifting across the window, settling warm',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Lora', Georgia, serif",
    body:    "'Nunito Sans', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--cream-soft':  '--ground-2',
    '--cream':       '--ground',
    '--panel':       '--panel',
    '--sage-bright': '--accent-2',
    '--sage-deep':   '--accent-deep',
    '--sage':        '--accent',
    '--gold-deep':   '--accent-alt-deep',
    '--gold':        '--accent-alt',
    '--ink':         '--ink',        // already canonical, name and meaning
    '--muted':       '--muted',
    '--hair':        '--hair',
    '--card-brd':    '--card-brd',
    '--card':        '--card',
    '--shadow':      '--shadow',
    '--maxw':        '--maxw'
  },

  dead: [],

  /* A light palette needs different literals from a dark one: these are section
     tints, not gradient stops on a dark ground. */
  literals: {
    '#FFFDF9': '--ink-max',      // on a light ground the "max" is the palest tint
    '#FFFEFA': '--tint-1',
    '#FCF6EA': '--tint-2',
    '#FBF4E7': '--tint-3',
    '#F5EBD6': '--tint-4',
    '#F3E8D2': '--tint-5',
    '#F3E7D2': '--tint-6',
    '#FAF3E6': '--tint-7',
    '#FFD9C6': '--err-tint',
    '#fff':    '--panel-solid'
  },

  /* base.css was extracted from a DARK reference, so it references tokens a
     light palette has no natural equivalent for. Each is derived from a token
     this site does define — never invented, never a guessed hex. */
  extraTokens: {
    '--ground-deep':  'var(--ground-2)',
    '--ink-bright':   'var(--ink)',
    '--ink-dim':      'var(--muted)',
    '--accent-ink':   'var(--panel-solid)',   // sage is mid-dark: white text on it
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--panel-solid)',
    '--sheen-lo':     'var(--ground-2)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#B4453A',
    '--err-ink':      '#B4453A',
    '--panel-2':      'var(--tint-2)',
    '--ok':           'var(--accent-deep)'
  },

  themeColor: '#FAF3E7',
  canonical:  'https://systemsbyvega.com/sites/caregiving/',
  priceRange: '',

  /* pricing[] name -> label; price is a DISPLAY STRING ("$32") -> blurb per D-M;
     per is "/hour"; features is a \n string -> array; best -> highlight.
     careNeeds[] and pricingNote -> niche. */
  jsReplace: [
  /* Folded back in from a hand-edit (see the config-record fix). These were
     applied directly to niche.js during the runtime work; without them here a
     re-conversion silently reverts the fix, and this file stops being the
     record tools/convert/README.md says it is. */
    ["var feats = (p.features || '').split('\\n').filter(Boolean).map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('');",
     "/* Canonical shape (§4.2): features is an ARRAY, highlight is the flag,\n         label is the name, and this niche carries its price in blurb. */\n      var feats = (p.features || []).map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('');"],
    ["(p.best ? ' best' : '')",
     "(p.highlight ? ' best' : '')"],
    ["(p.best ? '<span class=\"pnote\">'",
     "(p.highlight ? '<span class=\"pnote\">'"],
    ["esc(p.name)",
     "esc(p.label)"],
    ["esc(p.price)",
     "esc(p.blurb)"],
  ],

  transform(src, out) {
    out.pricing = (src.pricing || []).map(p => ({
      label: p.name,
      blurb: p.price,
      per: p.per,
      note: p.note,   // caregiving uses note as the HIGHLIGHT BADGE label
                      // ("Most common"), not as price fine print. Same field,
                      // slightly different sense; losing it would be worse.
      features: Array.isArray(p.features) ? p.features
              : String(p.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      highlight: !!p.best
    }));
    for (const k of ['stats', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = { careNeeds: src.careNeeds || [], pricingNote: src.pricingNote || '' };
  },

  brief: `slug:            caregiving
business:        Hearth Home Care
tagline:         Someone in the room who knows them
city:            Nampa, ID
palette:         LIGHT GROUND — sage on cream, gold second accent;
                 ground #FAF3E7, ink #3A342C, accent #7C9473
type:            Lora / Nunito Sans / IBM Plex Mono
price anchors:   from \$32/hour, 2-hour visit minimum
differentiators: same caregiver where possible; non-medical scope stated plainly
tone:            warm, unhurried, careful
scene:           10 defs inline — golden-hour window, passes §6.1
animation:       NONE — zero rAF. Phase 3 gap
interactive:     care-needs picker
pricing shape:   DISPLAY STRINGS -> blurb (D-M)
head fixed:      original had no canonical, og:url, twitter:card or theme-color
SCOPE / LEGAL:   NON-MEDICAL care. The FAQ already disclaims medical care and
                 medication administration — keep that wording intact. Home-care
                 registration, bonding and background checks vary by state and
                 must be flagged prominently in the business kit.
niche data:      careNeeds[], pricingNote
`
};
