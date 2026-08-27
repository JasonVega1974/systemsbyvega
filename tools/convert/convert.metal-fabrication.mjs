export default {
  scheme: 'dark',        // gunmetal ground, molten-orange accent

  css:    [44, 540],     // main <style> … </style>
  markup: [557, 974],    // after the noscript + demo-banner style blocks
  js:     [976, 1327],   // the outer IIFE, inclusive of open/close

  /* ZERO SVG defs. With hvac and tattoo-studio, the weakest illustration in the
     estate — the project board is CSS gradients and type, no vector artwork. */
  defsSvg: false,

  /* Decision 7. THREE rAF calls and not one loop: a nested double-rAF forces a
     style flush before a class is removed, and a third fades a toast. The old
     count>=2 rule would have graded this as a JS animation it does not have, and
     then looked for the reduced-motion gate in niche.js instead of the CSS.
     The real animation is one infinite keyframe: rise on .sparkp. Distinct from
     the shared `rise on .mote` (tattoo-studio, personal-trainer), so it counts
     as this niche's own under D-S. */
  sceneJs: null,
  animationInCss: 'rise on .sparkp — sparks drifting up off the forge, looping',

  bootMarker: 'renderContent(CONTENT);',

  /* Read from seo.fontsHref, never from memory: this is the site where supplying
     tokens from recall once put the wrong families on a shipped build. The CSS
     also names IBM Plex Mono once, but only inside the demo banner, which sits
     OUTSIDE the css range — JetBrains Mono is what the page actually loads. */
  fonts: {
    display: "'Saira Condensed', sans-serif",
    body:    "'Inter', system-ui, sans-serif",
    mono:    "'JetBrains Mono', ui-monospace, Consolas, monospace"
  },

  /* body{background:var(--gun)}, and theme-color is #14181d, so --gun is the
     ground — not --coal, which is a deeper shade used beneath it.
     Longest-first: --gun-2 before --gun, --card-brd before --card. */
  tokenMap: {
    '--gun-2':   '--ground-2',
    '--gun':     '--ground',
    '--coal':    '--ground-deep',
    '--steel':   '--panel',
    '--white':   '--ink',
    '--muted':   '--muted',
    '--melt':    '--accent',
    '--forge':   '--accent-deep',
    '--spark':   '--accent-alt',
    '--line':    '--hair',
    '--card-brd': '--card-brd',
    '--card':    '--card',
    '--glow':    '--accent-glow',
    '--shadow':  '--shadow',
    '--maxw':    '--maxw'
  },

  dead: [],

  /* 54 distinct literals, the most in the estate. Only the recurring ones are
     tokenised; the ~40 one-offs are the per-project board tints and stay as
     literals in sections.css, which is niche-scoped. Same call as tattoo-studio
     and contracting.
     #160b04 is the dark brown that sits ON the molten orange — the accent's ink.
     #1a2027 is just --gun-2 written out again. */
  literals: {
    '#ffffff': '--ink-max',
    '#160b04': '--accent-ink',
    '#D6DEE6': '--ink-bright',
    '#C6D0DA': '--ink-dim',
    '#1a2027': '--ground-2',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--ground-3':     'var(--panel)',
    '--panel-2':      'var(--ground-2)',
    '--accent-2':     'var(--accent-alt)',
    '--accent-soft':  'var(--accent-glow)',
    '--hair-accent':  'var(--card-brd)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--ink-max)',
    '--sheen-lo':     'var(--ink-dim)',
    '--sheen-accent': 'var(--accent-alt)',
    '--err':          '#e0616b',
    '--err-ink':      '#ff9aa2',
    '--ok':           'var(--accent-alt)'
  },

  /* Single-line anchors, no leading whitespace — the extracted IIFE body is
     de-indented by two spaces. */
  jsReplace: [
    /* brand.area is a SECOND nesting of serviceArea inside brand; contracting
       spelled it brand.serviceArea. Both retired in favour of the canonical
       top-level object. `c` is renderContent's parameter and is in scope. */
    [`b.area || b.city || ''`,
     `(c.serviceArea && c.serviceArea.region) || b.city || ''`],
    /* about{name,bio} is owner{name,bio,photo} under a different name. */
    [`var a = c.about || {};`, `var a = c.owner || {};`],
  ],

  themeColor: '#14181d',
  canonical:  'https://systemsbyvega.com/sites/metal-fabrication/',
  priceRange: '',

  /* brand.name is absent and lifted from the source's own JSON-LD.
     brand.tagline is absent and NOT invented (D-Q).
     No pricing[] at all: fabrication is quoted per job and the site publishes no
     numbers. Optional in the schema, so nothing is invented.

     specs[].chips carry a lightweight emphasis marker ("**TIG**"). chipHtml
     escapes the string FIRST and only then turns ** into <b>, so the content
     stays plain text and §4.4 holds — the renderer decides presentation, the
     content never carries HTML. */
  transform(src, out) {
    const b = src.brand || {};
    out.brand = {
      name: 'Black Anvil Fabrication',   // from the source's own JSON-LD
      phone: b.phone,
      email: b.email,
      leadEmail: b.leadEmail,
      city: b.city
    };
    out.serviceArea = { region: b.area || '' };

    const a = src.about || {};
    out.owner = { name: a.name || '', bio: a.bio || '', photo: a.photo || '' };

    if (src.stats) out.stats = src.stats;
    out.services = src.services || [];   // {icon,title,desc} already canonical

    out.niche = {
      projects: src.projects || [],
      specs:    src.specs || []
    };
  },

  brief: `slug:            metal-fabrication
business:        Black Anvil Fabrication
owner:           Cole Braddock
tagline:         NONE — absent in the source and deliberately not invented (D-Q)
city:            Caldwell, ID
palette:         DARK GROUND — molten orange on gunmetal, spark-yellow second
                 accent; ground #14181d, ink #EDF1F5, accent #FF6B1A
type:            Saira Condensed / Inter / JetBrains Mono
                 READ FROM fontsHref, not from memory — this is the site where
                 supplying tokens from recall once shipped the wrong families.
                 The CSS names IBM Plex Mono once, but only in the demo banner,
                 which sits outside the css range
price anchors:   NONE published — fabrication is quoted per job
differentiators: one welder start to finish; the rig comes to you
tone:            terse, working-shop
scene:           ZERO SVG defs — with hvac and tattoo-studio the weakest
                 illustration in the estate. Phase 3 gap (§6.1)
animation:       REAL, in CSS (D-S) — rise on .sparkp, sparks drifting up off
                 the forge. THREE rAF calls in the source and none of them a
                 loop: a nested double-rAF style-flush and a toast fade. The old
                 count-based rule would have graded this as a JS animation it
                 does not have; decision 7 replaced it with a named-callback test
interactive:     project board with category filtering — 8 jobs, filter chips.
                 Not interactive PRICING, so §9.3 still reports that gap

THREE-PLACE:     36 of 100 content values are ALSO hard-coded in the static
                 markup. Measured: ZERO disagreements between the two content
                 copies — the duplication is volume, not conflict, exactly as on
                 contracting. Not stripped (decision 1a): the static copy is the
                 no-JS fallback, and the build already guarantees
                 DEFAULT_CONTENT === content.json. See D-U; contracting remains
                 the higher-priority site to revisit at 47 of 91

STATIC SECTIONS: #faq, #how and #why are pure static markup with NO content.json
                 backing and no render hooks. Left that way (decision 6c), the
                 same call as contracting, to keep the two sites consistent and
                 to avoid inventing render behaviour during a consolidation pass.
                 CONSEQUENCE FOR THE BUYER: editing the FAQ or the how/why copy
                 requires an HTML change, not a content.json edit

SCHEMA:          brand.area -> serviceArea.region (a SECOND nesting of
                 serviceArea inside brand — contracting spelled it
                 brand.serviceArea; both now retired);
                 about{name,bio} -> owner{name,bio,photo}, a straight rename;
                 brand.name lifted from JSON-LD.
                 serviceArea.short and .cities left ABSENT — the source names a
                 region and nothing more, and inferring a city list would be
                 fabrication
head fixed:      original had no og:image
compliance:      Item 1 removed fabricated credential chips from this build
                 ("certified welder" among them). specs[].chips describe PROCESS
                 (TIG, MIG, Stick, oxy/plasma) — capabilities, not credentials —
                 and are legitimate. Do not let a buyer re-add certification
                 language without proof
licensing:       welding itself is generally unlicensed, but structural and
                 pressure work often requires certified welders (AWS D1.1 and
                 similar), and mobile rigs need commercial auto cover. A buyer
                 claiming certification must hold it. See Phase 0 D-2
niche data:      projects[], specs[]
`
};
