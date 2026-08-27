slug:            moving
business:        Kraft & Carry Moving
city:            Nampa, ID
palette:         LIGHT GROUND — forest green on kraft paper, tape-tan second
                 accent; ground #F0E7D8, ink #2E2A24, accent #2F6B4F
type:            Bevan / Mulish / IBM Plex Mono
price anchors:   hourly by crew size, computed from the load estimate
differentiators: you see the ballpark before anyone calls you
tone:            plain, unhurried
scene:           9 defs inline — passes §6.1
animation:       NONE — zero rAF AND zero @keyframes. The only site in wave 3
                 with nothing at all. Real Phase 3 gap (§7)
interactive:     GENUINE LOAD CALCULATOR — 13 load items x crew tiers x truck
                 capacity against loadSettings produces an hours-and-rate
                 ballpark. Fourth site in the estate with real interactive
                 pricing, after delivery, dumpster-rental and child-care
pricing shape:   NO pricing[] — the calculator IS the pricing (niche.crewTiers
                 [].rate). Optional in the schema, so nothing invented
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      THREE notes — loadNote ("honest ballparks, not quotes"),
                 billableNote (when the clock starts), pricingNote (no fuel
                 surcharges). Kept with the data that produces the number
licensing:       interstate movers need USDOT/MC numbers and intrastate movers
                 a state permit in most states; cargo/liability insurance is
                 expected. Flag both in the business kit
niche data:      loadItems[], crewTiers[], trucks[], loadSettings{}, loadNote,
                 billableNote, pricingNote, process[]
