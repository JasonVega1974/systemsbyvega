slug:            contracting
business:        Summit & Stone Contracting
tagline:         NONE — absent in the source and deliberately not invented (D-Q)
city:            Nampa, ID
palette:         DARK GROUND — amber on coal, concrete/cream neutrals;
                 ground #151109, ink(text) #f5efe3, accent #f5a623
type:            Big Shoulders Display / Barlow / IBM Plex Mono
price anchors:   three range tiers — $500–$2.5K, $2.5K–$15K, $15K+
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
