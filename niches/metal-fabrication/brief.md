slug:            metal-fabrication
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
