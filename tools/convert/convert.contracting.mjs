export default {
  scheme: 'dark',        // coal ground, amber accent

  css:    [55, 691],     // main <style> … </style>
  markup: [708, 1178],   // after the noscript + demo-banner style blocks
  js:     [1180, 1642],  // the outer IIFE, inclusive of open/close

  defsSvg: false,        // only 2 defs — the weakest illustration after hvac/tattoo-studio

  /* D-S. One rAF, and it is a toast fade. The real animation is CSS, three
     infinite keyframes on selectors unique to this niche:
       pulse on .hero__badge .halo
       float on .hero-emblem
       rise  on .spark
     Distinct from the estate boilerplate (.hero__art .halo, .hero__art svg,
     .mote), so they count under the uniqueness rule. A reduced-motion block
     sets animation:none!important. */
  sceneJs: null,
  animationInCss: 'pulse, float and rise — a pulsing hero badge, a drifting emblem and rising sparks',

  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Big Shoulders Display', sans-serif",
    body:    "'Barlow', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  /* TOKEN INVERSION, like tattoo-studio. This site's --ink (#1a1408) is the DARK
     text that sits on amber; --cream (#f5efe3) is the light body text on the coal
     ground. Mapped by role: --cream becomes --ink, --ink becomes --accent-ink.
     There is no --panel token either, so the third charcoal step takes that role. */
  tokenMap: {
    '--asphalt-2':     '--panel',
    '--asphalt':       '--ground-2',
    '--coal':          '--ground',
    '--amber-bright':  '--accent-2',
    '--amber-deep':    '--accent-deep',
    '--amber':         '--accent',
    '--concrete-soft': '--ink-bright',
    '--concrete':      '--ink-dim',
    '--cream':         '--ink',          // the light text on coal
    '--ink':           '--accent-ink',   // the dark text on amber
    '--muted':         '--muted',
    '--line':          '--hair',
    '--card-brd':      '--card-brd',
    '--card':          '--card',
    '--glow':          '--accent-glow',
    '--shadow':        '--shadow',
    '--maxw':          '--maxw'
  },

  dead: [],

  /* 46 distinct literals, the most in the estate — the tile treatments in the
     work gallery are hand-painted CSS gradients, one palette per trade. Only the
     five recurring ones are tokenised; the 39 one-offs stay as literals in
     sections.css, which is niche-scoped. Same call as tattoo-studio.
     #f5a623 is just --amber written out again. */
  literals: {
    '#ffffff': '--ink-max',
    '#f5a623': '--accent',
    '#231d13': '--panel-2',
    '#ecd8ab': '--ink-warm',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--ground-deep':  'var(--ground)',
    '--ground-3':     'var(--panel)',
    '--accent-soft':  'var(--accent-glow)',
    '--accent-alt':   'var(--ink-warm)',
    '--hair-accent':  'var(--card-brd)',
    '--placeholder':  'var(--muted)',
    '--sheen-hi':     'var(--ink-max)',
    '--sheen-lo':     'var(--ink-dim)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          '#e0616b',
    '--err-ink':      '#ff9aa2',
    '--ok':           'var(--accent-2)'
  },

  /* Keep the renderer in step with the schema. Single-line anchors, no leading
     whitespace — the extracted IIFE body is de-indented by two spaces. */
  jsReplace: [
    [`(t.featured?' tier--best':'')`, `(t.highlight?' tier--best':'')`],
    [`esc(t.price)`, `esc(t.blurb)`],
    [`esc(it.meta)`, `esc(it.tag)`],
    /* serviceArea moves out of brand and becomes the canonical top-level object
       (decision 5). `c` is in scope here — it is renderContent's parameter. */
    [`esc(b.serviceArea || b.city || "")`,
     `esc((c.serviceArea && c.serviceArea.region) || b.city || "")`],
  ],

  themeColor: '#151109',
  canonical:  'https://systemsbyvega.com/sites/contracting/',
  priceRange: '',

  /* brand.name is absent and lifted from the source's own JSON-LD.
     brand.tagline is absent and NOT invented (D-Q).

     brand.license STAYS IN BRAND. It is not canonical, but Item 1 blanked it to
     "" and gated the render (`b.license ? ' · '+esc(b.license) : ''`) precisely
     so an unlicensed operator ships nothing rather than a fabricated number.
     Moving it under niche would read from the flattened object, not from `b`,
     and would silently un-gate that render. This is a licensed trade; the field
     is where a real licence number goes, and it stays attached to the brand.

     owner keeps `heading` — not in the canonical shape, but present on 9 of the
     17 converted sites with an owner block, so contracting is following the
     estate rather than deviating from it. Its bio and photo are empty strings
     in the source and stay empty; nothing is written on the operator's behalf.

     pricing[].price holds "$500–$2.5K" / "$2.5K–$15K" / "$15K+" — ranges with K
     shorthand and one open end, none parseable to a number. Carried verbatim in
     `blurb`, the same call approved for auto-repair and already shipped on
     bin-cleaning and caregiving. seo.priceRange is therefore not derived; the
     original's own JSON-LD value ("$500 - $15000+") is lifted instead. */
  transform(src, out) {
    const b = src.brand || {};
    out.brand = {
      name: 'Summit & Stone Contracting',   // from the source's own JSON-LD
      phone: b.phone,
      email: b.email,
      leadEmail: b.leadEmail,
      city: b.city,
      license: b.license || ''              // Item 1: blank, and the render is gated
    };
    out.serviceArea = { region: b.serviceArea || '' };
    out.owner = src.owner || {};
    out.services = src.services || [];      // {icon,title,desc} already canonical
    out.testimonials = src.testimonials || [];

    out.pricing = (src.pricing || []).map(p => ({
      label:     p.label,
      blurb:     p.price,                   // "$500–$2.5K" — verbatim, not parsed
      per:       p.per,
      cta:       p.cta,
      features:  p.features || [],
      highlight: p.featured === true
    }));

    out.gallery = (src.gallery || []).map(g => ({
      title: g.title, tag: g.meta, image: g.image, style: g.style
    }));

    out.niche = { projects: src.projects || [] };
  },

  brief: `slug:            contracting
business:        Summit & Stone Contracting
tagline:         NONE — absent in the source and deliberately not invented (D-Q)
city:            Nampa, ID
palette:         DARK GROUND — amber on coal, concrete/cream neutrals;
                 ground #151109, ink(text) #f5efe3, accent #f5a623
type:            Big Shoulders Display / Barlow / IBM Plex Mono
price anchors:   three range tiers — \$500–\$2.5K, \$2.5K–\$15K, \$15K+
differentiators: the owner answers the phone; price in writing before work
tone:            plain, unhurried, no-nonsense
scene:           only 2 defs — with hvac and tattoo-studio, the weakest
                 illustration in the estate. Phase 3 gap (§6.1)
animation:       REAL, in CSS (D-S) — pulse/float/rise on the hero badge, emblem
                 and sparks. Unique selectors, so it is a signature rather than
                 inherited boilerplate
interactive:     before/after drag slider on the project transform. NOT
                 interactive pricing — no figure changes — so §9.3 still reports
                 that gap, correctly
LARGEST SITE:    1646 lines, 100 KB, 17 tokens, 46 literal colours

THREE-PLACE:     47 of 91 content values are ALSO hard-coded in the static
                 markup — the largest duplicated surface in the estate. The
                 conversion does NOT strip them (decision 1a): they are the
                 no-JS fallback, and the build already guarantees
                 DEFAULT_CONTENT === content.json. The residual risk is that an
                 operator edit to content.json leaves the static copy stale —
                 invisible on screen, visible to crawlers that do not run JS.
                 CONTRACTING IS THE HIGHEST-PRIORITY SITE FOR D-U, the tracked
                 follow-up that would generate the static markup from
                 content.json the way DEFAULT_CONTENT already is.
                 Measured: zero disagreements between the two content copies —
                 the duplication is volume, not conflict.

STATIC SECTIONS: #faq (5 questions), #process (3 steps) and #transform are pure
                 static markup with NO content.json backing and no render hooks.
                 Left that way (decision 6c) rather than inventing render
                 behaviour the original never had.
                 CONSEQUENCE FOR THE BUYER: editing the FAQ, the process steps or
                 the transform copy requires an HTML change, not a content.json
                 edit. 14 of 20 converted sites have an operator-editable FAQ;
                 contracting does not. Lifting them is additive work for D-U or
                 Phase 3, not for consolidation.

SCHEMA:          pricing[].price -> blurb verbatim (not parsed);
                 pricing[].featured -> highlight; pricing[].cta adopted as
                 optional canonical; gallery[].meta -> tag; gallery[].style
                 adopted as optional canonical (it selects the tile artwork used
                 INSTEAD of image, and every image here is empty, so this field
                 IS the gallery); brand.serviceArea -> serviceArea.region, with
                 short and cities left ABSENT rather than inferred from where
                 past jobs happened to be
brand:           name lifted from JSON-LD; no tagline (D-Q); serviceArea.region
                 only; license kept in brand and blank, render gated (Item 1)
head fixed:      original had no canonical, og:url, og:image or twitter:card
licensing:       REGULATED. General contractors need a state licence in most
                 states, bonding and liability insurance are expected, and
                 several trades bundled here (electrical, plumbing) are
                 separately licensed. brand.license exists for exactly this and
                 ships blank. See Phase 0 D-2 before selling this as a territory
niche data:      projects[]
`
};
