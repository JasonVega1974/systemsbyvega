export default {
  scheme: 'dark',        // coal ground, wine accent

  css:    [29, 254],     // main <style> … </style>
  markup: [271, 543],    // after the noscript + demo-banner style blocks
  js:     [545, 993],    // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 5 defs — one short of §6.1's 6, reported as a warn

  /* Second site in the estate, after moving, with NO animation of any kind:
     zero rAF AND zero @keyframes, so this is not a CSS animation that the
     pre-D-S check missed. A real Phase 3 gap, documented no-op scene.js. */
  sceneJs: null,
  animationTodo: 'the before/after reveal wiping itself once on entry, then settling',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Sora', sans-serif",
    body:    "'Inter Tight', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  /* Longest-first. --silver and --pearl are both light neutrals sitting either
     side of --ink: pearl is brighter than ink, silver dimmer. */
  tokenMap: {
    '--coal-2':      '--ground-2',
    '--coal':        '--ground',
    '--panel':       '--panel',
    '--wine-bright': '--accent-2',
    '--wine-deep':   '--accent-deep',
    '--wine':        '--accent',
    '--silver':      '--ink-dim',
    '--pearl':       '--ink-bright',
    '--ink':         '--ink',
    '--muted':       '--muted',
    '--hair':        '--hair',
    '--card-brd':    '--card-brd',
    '--card':        '--card',
    '--shadow':      '--shadow',
    '--maxw':        '--maxw'
  },

  dead: [],

  /* The four near-black violets are the panel ramp behind the reveal slider;
     #4A1226 / #2A0C17 are the wine shadow under it. */
  literals: {
    '#171219': '--panel-2',
    '#16121A': '--ground-deep',
    '#141018': '--ground-3',
    '#211A29': '--panel-3',
    '#4A1226': '--accent-shade',
    '#2A0C17': '--accent-shade-deep',
    '#FFD3C2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--accent-ink':   'var(--ink-max)',      // wine is dark: light text on it
    '--accent-soft':  'var(--accent-shade)',
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--ink-max)',
    '--sheen-lo':     'var(--ink-dim)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          'var(--err-ink)',
    '--ok':           'var(--accent-2)'
  },

  themeColor: '#16121A',
  canonical:  'https://systemsbyvega.com/sites/auto-body/',
  priceRange: '',

  /* Schema is already clean — services[] {title,desc} and faq[] {q,a} are
     canonical, and owner/serviceArea/stats/testimonials are present. Only seo
     has to be built from <head>.
     No pricing[]: collision work is quoted per vehicle and the site says so
     rather than publishing numbers. Optional in the schema, so nothing is
     invented. process[] follows the established route into niche. */
  transform(src, out) {
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.niche = {
      repairStages: src.repairStages || [],
      revealNote:   src.revealNote || '',
      claims:       src.claims || [],
      claimsNote:   src.claimsNote || '',
      process:      src.process || []
    };
  },

  brief: `slug:            auto-body
business:        Wineberry Collision
city:            Nampa, ID
palette:         DARK GROUND — wine on coal, pearl/silver neutrals;
                 ground #16121A, ink #F2EDF6, accent #B02E58
type:            Sora / Inter Tight / IBM Plex Mono
price anchors:   none published — collision work is quoted per vehicle
differentiators: you see the repair stages; insurance handled either way
tone:            calm, procedural
scene:           5 defs — ONE SHORT of §6.1's 6. Same cheap fix as child-care
animation:       NONE — zero rAF AND zero @keyframes. Second site after moving
                 with nothing at all. Real Phase 3 gap (§7)
interactive:     DRAG-DIVIDER before/after reveal over the repair stages.
                 Not interactive PRICING — no figure changes — so §9.3 still
                 reports the interactive-pricing gap, correctly
pricing shape:   NO pricing[]. Optional in the schema, so nothing invented
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      revealNote frames the slider as illustrative; claimsNote makes
                 the out-of-pocket path explicit ("same estimate either way")
licensing:       collision shops need a state repair-facility registration in
                 most states, and insurance-claim handling is separately
                 regulated. Flag both in the business kit
niche data:      repairStages[], revealNote, claims[], claimsNote, process[]
`
};
