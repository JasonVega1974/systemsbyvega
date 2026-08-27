export default {
  scheme: 'dark',        // near-black ground, one accent per theme

  /* THIS IS A THEMED NICHE — the only one. Convert from the blue variant:
       node tools/convert/convert.mjs dj sites/dj/blue
     Shared output lands in niches/dj/; the three palettes are written afterwards
     into niches/dj/themes/<theme>/ by dj-write-themes.mjs.

     Proven before any of this was written: normalising colour and brand name
     collapses the three 1507-line originals to BYTE-IDENTICAL. The fork existed
     only because 98 colours per theme were written into rules instead of :root —
     a token-contract failure, not three different products. */
  css:    [32, 609],     // main <style> … </style>
  markup: [625, 897],    // after the demo-banner style block (no noscript block here)
  js:     [899, 1613],   // the outer IIFE, inclusive of open/close

  defsSvg: false,        // ONE def — the weakest illustration in the estate

  /* The north-star animation the rest of the estate's comments cite: a canvas
     audio visualiser with per-bar amplitude, a dimmed reflection below the
     horizon and glowing tips. A named self-scheduling loop, so decision 7's
     rafLoop() grades it here. Its own IIFE, so it lifts cleanly. */
  sceneJs: [1510, 1596],

  bootMarker: 'renderAll();',

  /* One family for all three roles — the source sets --f-disp, --f-body and
     --f-mono to the same stack. Read from fontsHref, never from memory. */
  fonts: {
    display: "'Montserrat', system-ui, sans-serif",
    body:    "'Montserrat', system-ui, sans-serif",
    mono:    "'Montserrat', system-ui, sans-serif"
  },

  /* Mapped BY ROLE. --gold is whatever the theme's primary is (blue, green or
     pink); --violet is its deep shade; --cream is the text on the dark ground. */
  tokenMap: {
    '--night-2':  '--ground-2',
    '--night':    '--ground',
    '--violet-2': '--accent-deep-2',
    '--violet':   '--accent-deep',
    '--gold-hi':  '--accent-2',
    '--gold':     '--accent',
    '--coral':    '--accent-alt',
    '--cyan':     '--accent-3',
    '--cream':    '--ink',
    '--muted':    '--muted',
    '--line':     '--hair',
    '--maxw':     '--maxw',
    '--f-disp':   '--display',
    '--f-body':   '--body',
    '--f-mono':   '--mono',
    '--pad':      '--pad',
    '--r':        '--radius',
    '--ease-out':  '--ease-out',
    '--ease-soft': '--ease-soft'
  },

  dead: [],

  /* 50 distinct in-rule colours, DERIVED not hand-typed: 49 are a declared role
     at some alpha, so they name themselves once tokenMap is applied. Pure white
     is its own role (--sheen) rather than --hair — --line merely happens to BE
     white at .10, and calling a dozen white overlays "hairline border" would
     teach the next author the wrong convention.
     Every one maps 1:1 across all three themes (0 inconsistencies), which is
     what lets a single sections.css serve three palettes. */
  literals: {
    "rgba(5,11,30,.72)": "--ground-2-a72",
    "rgba(61,139,255,.32)": "--accent-a32",
    "rgba(61,139,255,.5)": "--accent-a5",
    "rgba(255,154,60,.45)": "--accent-alt-a45",
    "rgba(27,58,143,.65)": "--accent-deep-a65",
    "rgba(5,11,30,0)": "--ground-2-a0",
    "rgba(255,255,255,.5)": "--sheen-a5",
    "rgba(255,255,255,.4)": "--sheen-a4",
    "rgba(255,255,255,.35)": "--sheen-a35",
    "rgba(255,255,255,.3)": "--sheen-a3",
    "rgba(87,231,255,.22)": "--accent-3-a22",
    "#FFFFFF": "--sheen-a1",
    "rgba(0,0,0,.5)": "--ground-a5",
    "rgba(0,0,0,.42)": "--ground-a42",
    "rgba(61,139,255,.22)": "--accent-a22",
    "rgba(61,139,255,.36)": "--accent-a36",
    "rgba(61,139,255,.55)": "--accent-a55",
    "rgba(255,255,255,.04)": "--sheen-a04",
    "rgba(255,255,255,.22)": "--sheen-a22",
    "rgba(0,0,0,.85)": "--ground-a85",
    "rgba(0,0,0,.7)": "--ground-a7",
    "rgba(0,0,0,.9)": "--ground-a9",
    "#000": "--ground-a1",
    "rgba(61,139,255,.06)": "--accent-a06",
    "rgba(255,154,60,.03)": "--accent-alt-a03",
    "rgba(61,139,255,.18)": "--accent-a18",
    "#fff": "--sheen-a1",
    "rgba(255,255,255,.03)": "--sheen-a03",
    "#DCE6F7": "--ink-dim",
    "rgba(5,11,30,.0)": "--ground-2-a0",
    "rgba(5,11,30,.85)": "--ground-2-a85",
    "rgba(234,242,255,.9)": "--ink-a9",
    "rgba(5,11,30,.55)": "--ground-2-a55",
    "rgba(0,0,0,.25)": "--ground-a25",
    "rgba(255,255,255,.02)": "--sheen-a02",
    "rgba(61,139,255,.05)": "--accent-a05",
    "rgba(255,154,60,.2)": "--accent-alt-a2",
    "rgba(61,139,255,.92)": "--accent-a92",
    "rgba(5,11,30,.8)": "--ground-2-a8",
    "rgba(234,242,255,.75)": "--ink-a75",
    "rgba(0,0,0,.75)": "--ground-a75",
    "rgba(255,255,255,.09)": "--sheen-a09",
    "rgba(255,255,255,.06)": "--sheen-a06",
    "rgba(61,139,255,.25)": "--accent-a25",
    "rgba(61,139,255,.12)": "--accent-a12",
    "rgba(255,154,60,.06)": "--accent-alt-a06",
    "rgba(61,139,255,0)": "--accent-a0",
    "rgba(5,11,30,.97)": "--ground-2-a97",
    "rgba(61,139,255,.4)": "--accent-a4",
    "rgba(61,139,255,.04)": "--accent-a04",
  },

  extraTokens: {
    '--panel':       'var(--ground-2)',
    '--accent-ink':  'var(--ground)',     // buttons put --night on the accent
    '--card':        'var(--sheen-a03)',
    '--card-brd':    'var(--sheen-a09)',
    '--shadow':      '0 28px 60px -24px rgba(0,0,0,.8)',
    '--ink-dim':     'var(--muted)',
    '--placeholder': 'var(--muted)',
    '--sheen-hi':    'var(--sheen)',
    '--sheen-lo':    'var(--sheen-a3)',
    '--err':         '#e0616b',
    '--err-ink':     '#ff9aa2',
    '--ok':          'var(--accent-3)',
    /* base.css references these; the theme palette supplies --ink-bright, the
       rest are aliases so the shared build resolves cleanly too. */
    '--ground-deep': 'var(--ground)',
    '--hair-accent': 'var(--hair)',
    '--ink-max':     'var(--sheen)',
    '--ink-bright':  'var(--sheen)'
  },

  /* jsReplace, in order:
       1-7   the shared lifecycle. Every other niche names these DEFAULT_CONTENT
             and CONTENT, which is what base.js drives; dj was the last holdout.
       8     the scene reads its palette from the document, once.
       9-16  the eight themed colours the canvas gradient hardcoded.
       17    base.js owns the reduced-motion flag and passes it to initScene, so
             the scene must not redeclare it — a const in the same scope as the
             parameter is a SyntaxError, not a shadow.
       18    the allorigins proxy, removed (approved). An unpinned third-party
             CORS proxy had script-execution reach into an operator's site
             through unescaped ids and thumbnail URLs. It never fired in the demo
             (channelId ships empty). The official API path and the graceful
             "watch on YouTube" empty state both stay.
       19-23 escaping, on the OFFICIAL path too. Titles went through escYt; ids
             and thumbnail URLs did not, and both are remote data. extractYtId
             already validated the id shape — it was simply never applied to
             feed-derived ids. The last also stops the booking handler putting
             the visitor's own name into innerHTML raw.
       24    lead routing (decision 1). The form previewed a request and sent
             NOTHING; it now posts through base.js like every other niche. */
  jsReplace: [
    ["let DOM = DEFAULT_SITE;",
     "/* CONTENT is declared by the niche.js preamble (var CONTENT =\n   window.DEFAULT_CONTENT), so this line only drops the old alias.\n\n   base.js owns the content lifecycle now, and the fetch chain that used to\n   kick off the YouTube library went with it. Re-arm it here, keyed on the\n   channel/key pair so the first render loads with the inlined defaults and a\n   later render reloads only if content.json actually changed them. */\nvar _ytSig = null;\nfunction _ytMaybe(){\n  var Y = CONTENT.youtube || {};\n  var sig = (Y.apiKey || \"\") + \"|\" + (Y.channelId || \"\");\n  if (sig === _ytSig) return;\n  _ytSig = sig;\n  loadYouTubeLibrary();\n}"],
    ["DOM.",
     "CONTENT."],
    ["const A = CONTENT.artist || {};",
     "const A = {\n    name:    (CONTENT.brand || {}).name,\n    tagline: (CONTENT.brand || {}).tagline,\n    about:   (CONTENT.owner || {}).bio,\n    role:    CONTENT.role,\n    genres:  CONTENT.genres\n  };"],
    ["renderEmbeds();\nrenderLinks();",
     "renderEmbeds();\nrenderLinks();\n_ytMaybe();"],
    ["  if(!videos.length && cid){",
     "  if(false){   /* RSS-via-proxy fallback removed — see brief.md */"],
    ["<img src=\"${thumb}\" alt=\"\" loading=\"eager\"",
     "<img src=\"${escYt(thumb)}\" alt=\"\" loading=\"eager\""],
    ["<img src=\"${thumb}\" alt=\"\" loading=\"lazy\"",
     "<img src=\"${escYt(thumb)}\" alt=\"\" loading=\"lazy\""],
    ["embed/${video.id}?autoplay=1",
     "embed/${extractYtId(video.id)}?autoplay=1"],
    ["data-id=\"${v.id}\"",
     "data-id=\"${escYt(v.id)}\""],
    ["${name.split(' ')[0]}",
     "${escYt(name.split(' ')[0])}"],
    ["msg.innerHTML=`\n    <h4>Demo — request previewed ✦</h4>",
     "SL.postForm(CONTENT.brand.leadEmail, { name: name, email: email,\n    date: dateInput.value, type: f.type.value });\n  msg.innerHTML=`\n    <h4>Request sent ✦</h4>"],
  ],

  /* sceneReplace is to scene.js what jsReplace is to niche.js. The scene is
     excised BEFORE jsReplace runs, so anything aimed at scene content has to go
     here or it silently targets text that is no longer present.
     This niche needs it because the canvas builds its gradient in JavaScript:
     without swapping those eight literals for theme tokens, all three themes
     would render the same blue visualiser. */
  sceneReplace: [
    ["const c=$('#sky'), ctx=c.getContext('2d');",
     "/* $ lives in niche.js's closure; scene.js is a separate script and cannot\n   see it, so the scene carries its own. */\nconst $=s=>document.querySelector(s);\nconst c=$('#sky'), ctx=c.getContext('2d');\n    /* Palette from the active theme, read once. The gradient is built in JS,\n       so without this all three themes would render a blue visualiser. */\n    const _CS=getComputedStyle(document.documentElement);\n    const TOK=n=>_CS.getPropertyValue(n).trim();"],
    ["'#3D8BFF'",
     "TOK('--accent')"],
    ["'#FF9A3C'",
     "TOK('--accent-alt')"],
    ["'#57E7FF'",
     "TOK('--accent-3')"],
    ["'#9CC7FF'",
     "TOK('--accent-2')"],
    ["'#E3EEFF'",
     "TOK('--ink-bright')"],
    ["const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;",
     "/* reduce is initScene's parameter — base.js owns the media query */"],
  ],

  themeColor: '#000000',
  canonical:  'https://systemsbyvega.com/sites/dj/blue/',
  priceRange: '',

  /* artist{} IS the brand (decision 2). stats[].lab and social[].n are two more
     spellings of label. Everything the themes differ on — artist.name,
     artist.about and the four seo strings — lives in the per-theme overlay, NOT
     here, so this file holds only what all three share.
     releases[].c1/c2 become token references: var() resolves in the inline style
     the renderer writes, so release gradients follow the theme instead of being
     copied three times. */
  transform(src, out) {
    const a = src.artist || {};
    out.brand = {
      name: a.name,
      tagline: a.tagline,
      city: a.location,
      leadEmail: 'info@kingdom-creatives.com'   // §4.4, and decision 1
    };
    out.owner = { name: a.name, bio: a.about || '', photo: src.portraitUrl || '' };
    out.stats = (src.stats || []).map(s => ({ num: s.num, label: s.lab, sub: s.sub }));
    out.social = (src.social || []).map(s => ({ label: s.n, url: s.url }));

    /* Six distinct release colours per theme, all drawn from the palette. */
    const TOKENS = ['var(--accent)', 'var(--accent-alt)', 'var(--accent-3)',
                    'var(--accent-mid)', 'var(--ground-3)', 'var(--accent-2)'];
    const seen = [];
    const asToken = hex => {
      let i = seen.indexOf(hex);
      if (i < 0) { seen.push(hex); i = seen.length - 1; }
      return TOKENS[i] || 'var(--accent)';
    };
    out.releases = (src.releases || []).map(r => ({
      t: r.t, y: r.y, url: r.url, c1: asToken(r.c1), c2: asToken(r.c2)
    }));

    out.niche = {
      role:     a.role || '',
      genres:   a.genres || [],
      links:    src.links || {},
      youtube:  src.youtube || {},
      heroMini: src.heroMini || [],
      shows:    src.shows || [],
      videos:   src.videos || [],
      merch:    src.merch || [],
      photos:   src.photos || [],
      settings: src.settings || {}
    };
  },

  brief: `slug:            dj  (THEMED NICHE — blue, green, pink)
business:        DJ Nova / DJ Pulse / DJ Bloom — one site, three themes
palette:         DARK GROUND, one accent per theme;
                 blue #3D8BFF · green #2EE58A · pink #FF4DA6
type:            Montserrat for all three roles
STRUCTURE:       the only themed niche. niches/dj/ holds ONE sections.html,
                 sections.css, niche.js and scene.js; niches/dj/themes/<t>/ holds
                 that theme's niche.css, content overlay and og.png.
                 Proven before converting: normalise colour and brand and the
                 three 1507-line originals are BYTE-IDENTICAL. The fork existed
                 only because 98 colours per theme sat in rules, not :root
scene:           ONE def — weakest illustration in the estate (§6.1 gap)
animation:       REAL, in scene.js — the canvas audio visualiser the rest of the
                 estate cites as the north-star. Named self-scheduling loop,
                 graded by decision 7's rafLoop().
                 ITS PALETTE IS READ FROM CSS TOKENS at runtime: the gradient is
                 built in JS, so without that all three themes render blue
interactive:     YouTube library, release grid, booking calendar
PROXY REMOVED:   api.allorigins.win, an unpinned third-party CORS proxy used as
                 an RSS fallback when an operator set a channelId but no API key.
                 It never fired in the demo, but it had script-execution reach
                 through unescaped ids and thumbnail URLs. The official API path
                 and the "watch on YouTube" empty state both remain
ESCAPING:        thumb and video.id now escaped/validated on the OFFICIAL path
                 too, and the booking handler no longer puts the visitor's own
                 name into innerHTML raw
LEAD ROUTING:    the booking form previewed a request and sent NOTHING. It now
                 posts through base.js to brand.leadEmail like every other niche
                 (decision 1) — a call-to-action that does nothing is not a
                 sellable product. This ADDS behaviour, deliberately
SCHEMA:          artist{} IS the brand — name/tagline/location -> brand,
                 about -> owner.bio, role and genres -> niche (decision 2);
                 stats[].lab -> label; social[].n -> label; releases[].c1/c2
                 become var() token references so gradients follow the theme
licensing:       none — a DJ needs no licence, though venue/event insurance and
                 PRO music-licensing obligations are real for the operator
niche data:      role, genres[], links{}, youtube{}, heroMini[], shows[],
                 videos[], merch[], photos[], settings{}
`
};
