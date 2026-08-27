export default {
  scheme: 'light',       // cream ground, cherry accent

  css:    [29, 249],     // main <style> … </style>
  markup: [266, 701],    // after the noscript + demo-banner style blocks
  js:     [703, 1335],   // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 17 defs — the RICHEST illustration in the estate

  /* D-P. carTick is a damped spring driving the rendered-bay zone highlight,
     and it is called from setCarZone(), which reads the sound-picker's state.
     A renderer helper, not a standalone scene — the same shape as delivery's
     springPulse, so it stays in niche.js and is graded there. It snaps to
     target under reduced motion rather than looping. */
  sceneJs: null,
  animationInNiche: 'carTick — a damped spring (STIFF 210 / DAMP 22) lighting the bay zone for the selected symptom, with overshoot so the highlight pops then settles',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Zilla Slab', Georgia, serif",
    body:    "'Source Sans 3', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  /* THREE accents, not two: cherry is primary, navy is the alt, and brass is a
     genuine third used on the diagnostic callouts. --accent-3 is a discovered
     token (§5.2) rather than a niche-local prefix, because the role is the same
     one --accent-alt plays and a later site with three accents should reuse it. */
  tokenMap: {
    '--cream-soft':     '--ground-2',
    '--cream':          '--ground',
    '--panel':          '--panel',
    '--cherry-bright':  '--accent-2',
    '--cherry-deep':    '--accent-deep',
    '--cherry':         '--accent',
    '--navy-deep':      '--accent-alt-deep',
    '--navy':           '--accent-alt',
    '--brass-soft':     '--accent-3-soft',
    '--brass':          '--accent-3',
    '--ink':            '--ink',
    '--muted':          '--muted',
    '--hair':           '--hair',
    '--card-brd':       '--card-brd',
    '--card':           '--card',
    '--shadow':         '--shadow',
    '--maxw':           '--maxw'
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
    '--accent-ink':   'var(--panel-solid)',   // white on cherry red
    '--accent-soft':  'var(--accent-3-soft)',
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--panel-solid)',
    '--sheen-lo':     'var(--ground-2)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#B4453A',
    '--err-ink':      '#B4453A',
    '--panel-2':      'var(--ground-2)',
    '--ok':           'var(--accent-alt)'
  },

  /* priceRanges[{job,range}] -> canonical pricing[] as label + blurb, VERBATIM.
     The ranges stay strings on purpose: one row is "$95 — applied to the
     repair", which is not a range at all, and parsing the rest into numeric
     price/priceHigh would mean re-authoring the display string down to its
     en-dash. bin-cleaning and caregiving already carry their price in blurb.
     The cost is that seo.priceRange cannot be derived from these; it is taken
     from the original's JSON-LD instead. */
  jsReplace: [
    [`document.getElementById('priceList').innerHTML = c.priceRanges.map(function(p){`,
     `document.getElementById('priceList').innerHTML = c.pricing.map(function(p){`],
    [`'<div class="prow"><span class="job">' + esc(p.job) + '</span>`,
     `'<div class="prow"><span class="job">' + esc(p.label) + '</span>`],
  ],

  themeColor: '#F5EFE2',
  canonical:  'https://systemsbyvega.com/sites/auto-repair/',
  priceRange: '',

  transform(src, out) {
    for (const k of ['stats', 'services', 'testimonials', 'faq', 'social']) if (src[k]) out[k] = src[k];
    out.pricing = (src.priceRanges || []).map(p => ({ label: p.job, blurb: p.range }));
    out.niche = {
      sounds:        src.sounds || [],
      soundWhens:    src.soundWhens || [],
      soundResults:  src.soundResults || [],
      soundFallback: src.soundFallback || {},
      soundNote:     src.soundNote || '',
      pricingNote:   src.pricingNote || '',
      process:       src.process || []
    };
  },

  brief: `slug:            auto-repair
business:        Cherry & Co. Auto
city:            Nampa, ID
palette:         LIGHT GROUND — cherry red on cream, navy and brass;
                 ground #F5EFE2, ink #2A2118, accent #B3271E
                 THREE accents, the only site in the estate with a third
type:            Zilla Slab / Source Sans 3 / IBM Plex Mono
price anchors:   6 published job ranges, $75-$680, plus a $95 diagnostic
                 applied to the repair
differentiators: ranges published up front; the diagnostic fee comes off
tone:            straight-talking, unfussy
scene:           17 defs — the RICHEST illustration in the estate
animation:       REAL, in niche.js (D-P) — carTick, a damped spring lighting
                 the bay zone for the selected symptom, snapping to target
                 under reduced motion
interactive:     SOUND DIAGNOSER — 7 sounds x 6 timings resolve against 12
                 soundResults (culprits, what a visit covers, a price range and
                 a caveat), with soundFallback for the 30 combinations that have
                 no specific answer. The most elaborate interactive surface
                 converted so far
SCHEMA:          priceRanges[{job,range}] -> pricing[] as label + blurb,
                 verbatim (approved this batch). Ranges stay strings: one row
                 is "$95 — applied to the repair", not a range
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      soundNote is the important one — "a sound is a clue, not a
                 diagnosis" — and it must stay attached to the diagnoser output.
                 pricingNote qualifies the published ranges. Every soundResult
                 carries its own caveat field
licensing:       REGULATED in most states: repair-facility registration, and
                 emissions/safety-inspection work needs separate certification.
                 ASE certification is the industry norm but is NOT a licence —
                 do not let a buyer imply it. See Phase 0 D-2
niche data:      sounds[], soundWhens[], soundResults[], soundFallback{},
                 soundNote, pricingNote, process[]
`
};
