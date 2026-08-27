slug:            auto-repair
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
