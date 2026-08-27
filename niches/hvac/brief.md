slug:            hvac
business:        Steelhead Heating & Air
city:            Nampa, ID
palette:         LIGHT GROUND — steel blue on ice, coral second accent;
                 ground #F2F7FB, ink #152435, accent #1E6FB0
type:            Kanit / Albert Sans / IBM Plex Mono
price anchors:   $89 tune-up, $159 season pass, $249 whole-home — repairs
                 always quoted flat and approved before work starts
differentiators: flat quotes before the wrench comes out; no sales pitch
tone:            direct, technical
scene:           ZERO SVG defs — the house cutaway is flat shapes and CSS
                 gradients. Joint-weakest illustration with tattoo-studio.
                 Phase 3 gap (§6.1)
animation:       REAL, in CSS (D-S) — hsPulse loops on the system-map hotspot
                 ring, with a reduced-motion override. The CSS analogue of
                 delivery's springPulse markers. Zero rAF, which is why the
                 pre-D-S check called it a gap
interactive:     SYSTEM MAP — click a component on the house and get its
                 symptoms, what a visit covers, and a price range. Plus a
                 three-tier plan grid
SCHEMA (heavy):  plans->pricing, name->label, "$89"->89, features string->array,
                 best->highlight, services[].pole->icon.
                 plans[].note "Most popular" DROPPED — it rendered only when
                 best was true and the renderer already defaults to that exact
                 string, so highlight:true reproduces it. One fact, one place
head fixed:      original had no canonical, og:url, twitter:card or theme-color
compliance:      pricingNote — "repairs are always quoted flat and approved"
                 before work. sysNote covers the "not sure what's wrong" path.
                 systemMap[].range is deliberately free text, not a number: it
                 holds "Free with any tune-up" as often as a figure
licensing:       REGULATED. HVAC contractors need a state licence in most
                 states, EPA Section 608 certification is federally required to
                 handle refrigerant, and bonding is common. One of the five
                 licensed trades the catalog keeps. See Phase 0 D-2
niche data:      systemMap[], sysNote, seasonal[], pricingNote
