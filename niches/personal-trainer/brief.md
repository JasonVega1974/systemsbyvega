slug:            personal-trainer
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
