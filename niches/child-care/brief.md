slug:            child-care
business:        Huckleberry Sitters
city:            Boise, ID
palette:         LIGHT GROUND — huckleberry purple on oat, sun-gold second
                 accent; ground #FDF7EF, ink #3A3128, accent #7A5BA6
type:            Fredoka / Atkinson Hyperlegible / IBM Plex Mono
                 (Atkinson Hyperlegible is a legibility face — a deliberate
                 accessibility choice for a parent-facing site, keep it)
price anchors:   hourly base, plus per-extra-kid and weekend bumps
differentiators: the same sitter, a written rundown, rates agreed up front
tone:            warm, concrete
scene:           5 defs — ONE SHORT of §6.1's 6. Reported as a warn; the
                 cheapest §6.1 fix in the estate
animation:       REAL, in CSS (D-S) — hkTwinkle/hkGlow/hkSteam loop forever on
                 the hero evening scene, switched off by a reduced-motion block.
                 Zero rAF, which is why the pre-D-S check called it a gap.
                 hkMoment is a one-shot card entrance and does not count
interactive:     RATE PLANNER — age bands x care times x needs against
                 rates{} produces a live estimate, and sendPlanToForm() carries
                 the result into the booking form
pricing shape:   NO pricing[] — the planner IS the pricing (niche.rates).
                 Optional in the schema, so nothing invented
SCHEMA:          services[].from is canonical-optional (approved this batch),
                 NOT niche data. A price qualifier stays attached to what it
                 prices — same argument as pricing[].note
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      ratesNote — "every rate is confirmed together before" the
                 booking. Kept with the rate data
licensing:       REGULATED and the sharpest case in wave 3. In-home sitting is
                 usually exempt, but ratios, background checks and CPR/first-aid
                 certification are expected, and licensed child care has hard
                 state thresholds on child count and hours. See Phase 0 D-2
                 before selling this as a territory. Item 1 removed fabricated
                 credential chips from the buyer-ready build
niche data:      ageBands[], careTimes[], careNeeds[], rundown[], rates{},
                 ratesNote, howItWorks[], approach[]
