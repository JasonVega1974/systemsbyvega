export default {
  scheme: 'dark',        // charcoal ground, ember accent

  css:    [59, 540],     // main <style> … </style>
  markup: [557, 1006],   // after the noscript + demo-banner style blocks
  js:     [1008, 1566],  // the outer IIFE, inclusive of open/close

  defsSvg: false,        // 11 defs, inline — passes §6.1

  /* A genuinely standalone scene, like dog-walking's: a spark fountain with
     gravity acceleration and momentum, in its own IIFE that opens with
     `if(reduce) return;`. Lifts cleanly into scene.js — the body only, since
     convert.mjs re-wraps it as window.initScene(reduce) and the block already
     closes over exactly that name. */
  sceneJs: [1068, 1097],

  /* THE BOOT GAP. 332 characters sit between this call and the content fetch,
     holding the ?goal= deep-link preselect. The old excision rule cut straight
     through and would have deleted it silently — no function definition
     disappears, so the gate says nothing, and nothing throws, so the runtime
     check says nothing either. convert.mjs now makes two separate cuts and
     preserves the gap. */
  bootMarker: 'renderContent(CONTENT);',

  fonts: {
    display: "'Bebas Neue', sans-serif",
    body:    "'Inter', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, Consolas, monospace"
  },

  /* No --panel in this site's :root — it uses a three-step charcoal ramp
     instead, so --char-3 takes the panel role. */
  tokenMap: {
    '--char-3':       '--panel',
    '--char-2':       '--ground-2',
    '--char':         '--ground',
    '--ember-bright': '--accent-2',
    '--ember-deep':   '--accent-deep',
    '--ember':        '--accent',
    '--chalk':        '--accent-alt',
    '--bone':         '--ink',
    '--muted':        '--muted',
    '--hair':         '--hair',
    '--card-brd':     '--card-brd',
    '--card':         '--card',
    '--shadow':       '--shadow',
    '--maxw':         '--maxw'
  },

  dead: [],

  /* 17 literals — the warm off-whites are the light "chalk board" panels that
     invert the dark ground, so they are named by role rather than by hue. */
  literals: {
    '#fff8f2': '--sheen-hi',
    '#fbf9f4': '--invert-1',
    '#f6f2e9': '--invert-2',
    '#f8f4ea': '--invert-3',
    '#f3ede1': '--invert-4',
    '#fffaf5': '--invert-5',
    '#101316': '--ground-deep',
    '#14181c': '--ground-3',
    '#16191d': '--ground-4',
    '#181c21': '--panel-2',
    '#1c2127': '--panel-3',
    '#c9b9a6': '--invert-ink',
    '#cbb89a': '--invert-ink-2',
    '#6b6a63': '--invert-muted',
    '#ff8a6b': '--accent-tint',
    '#ffab8f': '--accent-tint-2',
    '#fff':    '--ink-max'
  },

  extraTokens: {
    '--ink-bright':   'var(--ink-max)',
    '--ink-dim':      'var(--muted)',
    '--accent-ink':   'var(--ink-max)',      // ember is mid-dark: light text on it
    '--accent-soft':  'var(--accent-tint)',
    '--hair-accent':  'var(--hair)',
    '--placeholder':  'var(--muted)',
    '--sheen-lo':     'var(--ground-2)',
    '--sheen-accent': 'var(--accent-2)',
    '--err':          'var(--accent-tint-2)',
    '--err-ink':      'var(--accent-tint-2)',
    '--ok':           'var(--accent-alt)'
  },

  /* packages[] -> pricing[], and the renderer has to be told. Note that unlike
     hvac, `note` is KEPT: this renderer has a real fine-print path for
     non-highlighted tiers, `(!p.best && p.note)`. Only the redundant
     "Most popular" on the highlighted tier is dropped, because highlight
     already means exactly that and the badge falls back to the same literal. */
  jsReplace: [
    [`renderPricing(c.packages, c.pricingNote);`,
     `renderPricing(c.pricing, c.pricingNote);`],
    [`var feats = String(p.features || '').split('\\n').map(function(x){ return x.trim(); }).filter(Boolean);`,
     `var feats = (p.features || []).map(function(x){ return String(x).trim(); }).filter(Boolean);`],
    /* Single-line, no leading whitespace: convert.mjs de-indents the extracted
       IIFE body by two spaces, so a multi-line anchor carrying the original
       indentation silently fails to match. It warns rather than aborting, which
       is easy to scroll past. Keep every anchor indentation-independent. */
    [`(p.best ? ' price-card--best' : '')`,
     `(p.highlight ? ' price-card--best' : '')`],
    [`(p.best ? '<span class="price-card__badge">'`,
     `(p.highlight ? '<span class="price-card__badge">'`],
    [`'<div class="price-card__name">' + esc(p.name) + '</div>'`,
     `'<div class="price-card__name">' + esc(p.label) + '</div>'`],
    [`'<div class="price-card__price"><b>' + esc(p.price) + '</b><span>' + esc(p.period || '') + '</span></div>'`,
     `'<div class="price-card__price"><b>$' + esc(p.price) + '</b><span>' + esc(p.per || '') + '</span></div>'`],
    [`+ (!p.best && p.note ? '<div class="price-card__note">' + esc(p.note) + '</div>' : '')`,
     `+ (!p.highlight && p.note ? '<div class="price-card__note">' + esc(p.note) + '</div>' : '')`],
    [`socSvg(s.platform)`, `socSvg(s.icon)`],
    [`esc(s.label || s.platform)`, `esc(s.label || s.icon)`],
  ],

  themeColor: '#14181c',
  canonical:  'https://systemsbyvega.com/sites/personal-trainer/',
  priceRange: '',

  /* brand has NO name and NO tagline, and there is no serviceArea at all.
       name        -> lifted from the JSON-LD "name": "Cora Vale Fitness"
       tagline     -> LEFT ABSENT (D-Q)
       serviceArea -> LEFT ABSENT (D-N); consumers fall back to brand.city
     packages -> pricing with five drifts, including `period`, a fourth name for
     `per` (now retired). social[].platform -> social[].icon, faq[].tags stays
     canonical: it is read to filter FAQs by the visitor's selected goal, and
     carrying it in niche would mean duplicating every question. */
  transform(src, out) {
    const b = src.brand || {};
    out.brand = {
      name: 'Cora Vale Fitness',       // from the source's own JSON-LD
      phone: b.phone,
      email: b.email,
      leadEmail: b.leadEmail,
      city: b.city
    };
    if (src.stats) out.stats = src.stats;
    out.gallery = src.gallery || [];   // already canonical {title,tag,image}
    out.testimonials = src.testimonials || [];
    out.faq = (src.faq || []).map(f => ({ q: f.q, a: f.a, tags: f.tags }));
    out.social = (src.social || []).map(s => ({ label: s.label, url: s.url, icon: s.platform }));

    out.pricing = (src.packages || []).map(p => ({
      label:     p.name,
      price:     Number(String(p.price).replace(/[^0-9.]/g, '')),
      per:       p.period,
      features:  String(p.features || '').split('\n').map(x => x.trim()).filter(Boolean),
      /* "Most popular" duplicates highlight; the badge renders that literal by
         default. Any OTHER note is real fine print and is kept. */
      note:      p.note === 'Most popular' ? '' : (p.note || ''),
      highlight: p.best === true
    }));

    out.niche = {
      goals:       src.goals || [],
      chips:       src.chips || [],
      bio:         src.bio || '',
      pricingNote: src.pricingNote || '',
      settings:    src.settings || {}
    };
  },

  brief: `slug:            personal-trainer
business:        Cora Vale Fitness
tagline:         NONE — absent in the source, deliberately not invented (D-Q)
city:            Eagle, ID
palette:         DARK GROUND — ember on charcoal, chalk-teal second accent;
                 ground #14181c, ink #EDEDE6, accent #FF5A2E
type:            Bebas Neue / Inter / IBM Plex Mono
price anchors:   $65 small group, then 1:1 tiers
differentiators: programs written by hand; texts back the same day
tone:            direct, encouraging, no hype
scene:           11 defs inline — passes §6.1
animation:       REAL, in scene.js — a spark fountain with gravity
                 acceleration and momentum, its own IIFE in the source opening
                 with if(reduce) return. Lifts cleanly, like dog-walking's
interactive:     GOAL PICKER — 4 goals, each with its own programs and proof,
                 filtering the FAQ by tag and preselecting the booking form.
                 Deep-linkable via ?goal=strength
BOOT GAP:        332 chars between the boot call and the content fetch hold the
                 ?goal= deep-link. The old excision rule would have deleted it
                 SILENTLY — no function definition disappears so the gate is
                 quiet, and nothing throws so the runtime check is quiet too.
                 convert.mjs now preserves the gap
SCHEMA:          packages->pricing, name->label, "$65"->65, period->per (a
                 FOURTH name for per, now retired), features string->array,
                 best->highlight. social[].platform->icon and faq[].tags both
                 adopted as canonical-optional this batch
brand:           name lifted from JSON-LD; no tagline (D-Q); NO serviceArea at
                 all (D-N) — consumers fall back to brand.city
head/consent:    the only site in wave 3-4 that arrived with a COMPLETE <head>
                 and its own consent checkbox. build-site.js detects the
                 existing *-consent id and adds only the privacy link
SWEEP EXCEPTION: the over50 goal's tagline is "Train for the next 30 years".
                 §9.2 flags any "N years" because that is how an experience
                 claim reads. This one points FORWARD, at the customer's own
                 future, and says nothing about the operator's past. qa-site.js
                 exempts "for the next N years" specifically; "30 years
                 experience", "30 years in business" and every other phrasing
                 stay flagged. Recorded here per the Item 3 rule that sweep
                 exceptions are flagged, never silently widened
compliance:      settings.acceptingClients gates the booking form into waitlist
                 mode with settings.closedNote. pricingNote covers billing
                 cadence. Keep both wired
licensing:       personal training is UNLICENSED in every US state, but
                 certification (NASM/ACE/NSCA) is the industry norm and liability
                 insurance is expected. Do not let a buyer imply a licence.
                 Scope-of-practice matters: nutrition advice crosses into
                 dietetics, which IS regulated. See Phase 0 D-2
niche data:      goals[], chips[], bio, pricingNote, settings{}
`
};
