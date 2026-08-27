export default {
  scheme: 'light',       // mint ground, dark ink — second light-ground conversion

  css:    [29, 246],     // main <style> … </style>
  markup: [263, 546],    // after the noscript + demo-banner style blocks
  js:     [548, 901],    // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 7 defs, inline — passes §6.1
  /* D-P: springPulse(el, cx, cy) is a damped spring (k=0.14, damp=0.6) called
     from activateZone(), which reads CONTENT.routeZones. A renderer helper, not
     a standalone scene — it stays in niche.js and qa grades it there. It already
     snaps to the final state under reduced motion. */
  sceneJs: null,
  animationInNiche: 'springPulse — damped-spring glow over the active route zone',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    body:    "'Figtree', system-ui, -apple-system, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--mint-soft':     '--ground-2',
    '--mint':          '--ground',
    '--panel':         '--panel',
    '--spruce-bright': '--accent-2',
    '--spruce-deep':   '--accent-deep',
    '--spruce':        '--accent',
    '--lime-soft':     '--accent-alt-soft',
    '--lime':          '--accent-alt',
    '--ink':           '--ink',
    '--muted':         '--muted',
    '--hair':          '--hair',
    '--card-brd':      '--card-brd',
    '--card':          '--card',
    '--shadow':        '--shadow',
    '--maxw':          '--maxw'
  },

  dead: [],

  literals: {
    '#FFD9C6': '--err-tint',
    '#fff':    '--panel-solid'
  },

  /* Light palette; base.css was extracted from a dark reference. Every value
     below is derived from a token this site defines. */
  extraTokens: {
    '--ground-deep':  'var(--ground-2)',
    '--ink-max':      'var(--panel-solid)',
    '--ink-bright':   'var(--ink)',
    '--ink-dim':      'var(--muted)',
    '--accent-ink':   'var(--panel-solid)',   // spruce is dark: white text on it
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--panel-solid)',
    '--sheen-lo':     'var(--ground-2)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#B4453A',
    '--err-ink':      '#B4453A',
    '--panel-2':      'var(--ground-2)',
    '--ok':           'var(--accent-deep)'
  },

  themeColor: '#F3F8F5',
  canonical:  'https://systemsbyvega.com/sites/bin-cleaning/',
  priceRange: '',

  /* plans[] -> pricing[]: name -> label, price display string -> blurb (D-M),
     features \n string -> array, best -> highlight, note carried through.
     howItWorks / routeZones / routeNote / whyClean / pricingNote -> niche. */
  transform(src, out) {
    out.pricing = (src.plans || []).map(p => ({
      label: p.name,
      blurb: p.price,
      per: p.per,
      note: p.note,
      features: Array.isArray(p.features) ? p.features
              : String(p.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      highlight: !!p.best
    }));
    for (const k of ['stats', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = {
      howItWorks: src.howItWorks || [],
      routeZones: src.routeZones || [],
      routeNote: src.routeNote || '',
      whyClean: src.whyClean || [],
      pricingNote: src.pricingNote || ''
    };
  },

  brief: `slug:            bin-cleaning
business:        Sage & Suds Bin Cleaning
tagline:         Your bins, actually clean
city:            Nampa, ID
palette:         LIGHT GROUND — spruce on mint, lime second accent;
                 ground #F3F8F5, ink #1F3229, accent #0F8A6C
type:            Bricolage Grotesque / Figtree / IBM Plex Mono
price anchors:   from \$12 per bin per visit, monthly
differentiators: hot pressure wash inside and out; routed right after pickup
tone:            bright, practical
scene:           7 defs inline — passes §6.1
animation:       REAL, in niche.js (D-P) — springPulse, damped spring k=0.14
                 damp=0.6 over the active route zone; snaps under reduced motion
interactive:     route-zone picker driving the spring highlight
pricing shape:   DISPLAY STRINGS -> blurb (D-M)
head fixed:      original had no canonical, og:url, twitter:card or theme-color
licensing:       generally unlicensed; wastewater capture and discharge rules
                 vary by city — flag in the business kit
niche data:      howItWorks[], routeZones[], routeNote, whyClean[], pricingNote
`
};
