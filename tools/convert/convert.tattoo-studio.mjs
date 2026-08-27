export default {
  scheme: 'dark',

  css:    [60, 582],     // main <style> … </style>
  markup: [599, 913],    // after the noscript + demo-banner style blocks
  js:     [915, 1411],   // the outer IIFE, inclusive of open/close

  defsSvg: false,        // ZERO SVG defs — the illustrations are CSS gradients
  sceneJs: null,         // one rAF, a toast fade — Phase 3 gap
  animationTodo: 'ink bleeding into the linework, settling to the finished piece',

  bootMarker: 'renderContent(CONTENT);',

  /* D-Q. The source references 'IBM Plex Mono' in one CSS rule but never loads
     it — fontsHref requests only Cormorant Unicase and Space Grotesk, so that
     rule already falls back to the system stack. The token describes what
     ACTUALLY renders. Loading the font is a design decision (an extra network
     request), recorded in brief.md as Phase 3 work. */
  fonts: {
    display: "'Cormorant Unicase', Georgia, serif",
    body:    "'Space Grotesk', system-ui, -apple-system, sans-serif",
    mono:    "ui-monospace, Consolas, monospace"
  },

  tokenMap: {
    '--ink-3':          '--panel-2',
    '--ink-2':          '--panel',
    '--ink':            '--ground',      // this site's --ink is its GROUND, not its text
    '--crimson-bright': '--accent-2',
    '--crimson-deep':   '--accent-deep',
    '--crimson':        '--accent',
    '--gold':           '--accent-alt',
    '--bone':           '--ink',         // bone IS the text colour
    '--muted':          '--muted',
    '--hair':           '--hair',
    '--card-brd':       '--card-brd',
    '--card':           '--card',
    '--shadow':         '--shadow',
    '--maxw':           '--maxw'
  },

  dead: [],

  /* 40 distinct literals — the most in the estate, because the "illustrations"
     are CSS gradient compositions rather than SVG. Only the recurring ones are
     tokenised; one-offs stay as literals in sections.css, which is niche-scoped. */
  literals: {
    '#0c0b10': '--ground-2',
    '#fdf8ef': '--sheen-hi',
    '#0b0a0e': '--ground-3',
    '#fbf6ec': '--ink-bright',
    '#f6efe1': '--sheen-lo',
    '#17141a': '--panel-3',
    '#18151c': '--panel-4',
    '#121016': '--panel-5',
    '#f8f2e5': '--ink-warm',
    '#6f6759': '--placeholder',
    '#e0616b': '--err',
    '#ff9aa2': '--err-ink',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--ground-deep':   'var(--ground-3)',
    '--ink-dim':       'var(--muted)',
    '--accent-ink':    'var(--ink-max)',   // crimson is dark: light text on it
    '--hair-accent':   'var(--hair)',
    '--sheen-accent':  'var(--accent-2)',
    '--ok':            'var(--accent-alt)'
  },

  themeColor: '#0a0a0d',
  canonical:  'https://systemsbyvega.com/sites/tattoo-studio/',
  priceRange: '',

  /* brand has NO name and NO tagline in the source.
       name    -> lifted from the JSON-LD "name": "Static Rose Tattoo"
       tagline -> LEFT ABSENT (D-Q). og:title is a title, the meta description is
                  a description, the hero subhead is a sentence. Cropping any of
                  them is writing copy for the operator.
     gallery[] carries BOTH tag and cat — the last of the three naming drifts.
     cat is the filter key the gallery UI joins on, so it is preserved in niche.
     bio is a top-level string here, not owner.bio. */
  transform(src, out) {
    const b = src.brand || {};
    out.brand = {
      name: 'Static Rose Tattoo',   // from the source's own JSON-LD
      phone: b.phone,
      email: b.email,
      leadEmail: b.leadEmail,
      city: b.city
    };
    out.gallery = (src.gallery || []).map(g => ({
      title: g.title, tag: g.tag, image: g.image
    }));
    if (src.stats) out.stats = src.stats;
    if (src.social) out.social = src.social;
    out.niche = {
      galleryCats: (src.gallery || []).map(g => ({ title: g.title, cat: g.cat, art: g.art })),
      flash: src.flash || [],
      bio: src.bio || '',
      chips: src.chips || [],
      settings: src.settings || {}
    };
  },

  brief: `slug:            tattoo-studio
business:        Static Rose Tattoo
tagline:         NONE — absent in the source and deliberately not invented (D-Q)
city:            Boise, ID
palette:         crimson on near-black, gold second accent;
                 ground #0a0a0d, ink(text) #ede4d3, accent #c42b3d
type:            Cormorant Unicase / Space Grotesk / (no mono loaded)
price anchors:   flash pieces priced individually; custom work quoted
differentiators: private one-chair studio, by appointment, one client at a time
tone:            quiet, exacting
scene:           ZERO SVG defs — the illustrations are CSS gradient compositions.
                 Weakest visual in the estate. Phase 3 gap (§6.1)
animation:       NONE — one rAF, a toast fade. Phase 3 gap (§7)
interactive:     gallery filter and flash picker
TOKEN INVERSION: this site's --ink was its GROUND (#0a0a0d) and --bone was its
                 text. Mapped by ROLE, not by name — the clearest case yet for
                 why the contract is role-based.
FONT GAP:        the source references 'IBM Plex Mono' in one CSS rule but never
                 loads it. --mono describes what actually renders. Phase 3: load
                 it or drop the reference.
licensing:       REGULATED. Bloodborne-pathogen certification and a shop permit
                 are required in most states, and the artist's portfolio is the
                 business. See Phase 0 D-2 before selling this as a territory.
                 Item 1 removed fabricated 'Licensed · Idaho' and 'Bloodborne
                 pathogen certified' chips from the buyer-ready build.
niche data:      galleryCats[], flash[], bio, chips[], settings{}
`
};
