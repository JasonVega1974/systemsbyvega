slug:            dj  (THEMED NICHE — blue, green, pink)
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
