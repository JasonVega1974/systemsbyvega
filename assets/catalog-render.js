/* ============================================================================
   SYSTEMS BY VEGA — catalog renderer (shared)
   ----------------------------------------------------------------------------
   ONE renderer, used twice:
     * at build time by tools/build-catalog.js, which writes the finished markup
       straight into index.html, so the catalog is present in the HTML and the
       page is complete with JavaScript disabled or broken;
     * at run time by assets/sbv.js, to re-render when live rows and real
       waiting counts come back from the database.

   It lives in its own file specifically so those two paths cannot drift.

   THE CARD WAS the "OWN YOUR TOWN" PLATE ported from the GarageSaleBiz repo
   (HEAD:niches.html) — a ruled yellow notepad surface, two galvanised staples
   through the top edge, a tilted circular price sticker in a stamped display
   face, and a red-arrow CTA row. It is not that any more.

   WHY IT CHANGED. The landing page sells with screenshots: .pcard and (at the
   time) .fcard — .scard since R6 replaced the featured six with all thirty-two
   — are square to the grid and lead with a real capture of the site
   they point at. The catalog board — the page that actually has to close the
   sale — was a different product visually, and a visitor moving from one to
   the other had no reason to believe the two came from the same shop. The
   board STRUCTURE was never the problem and is untouched: family plates,
   filter chips, the ledger bar, the live open/claimed status, the
   on-the-board count. What changed is the card surface, which now reads the
   same band tokens that card family does and leads with the same screenshot.

   WHAT WENT: the paper gradient, the ink border, both staples, the circular
   price sticker, the hard offset shadow, the pinned rotation and the rustle
   that went with it. WHAT ARRIVED: a 16:10 screenshot across the top, a
   family accent dot, a plain status pill, and a price printed as a line of
   text rather than stamped on a circle.

   THE FEATURE CHIPS MOVED TO THE MODAL. They described what a template ships
   with, which is detail, and at a 241px column they wrapped to four lines and
   were the single largest source of height variance on the board. chips()
   below is what the modal reads; the card no longer prints them.

   ONE CONSTRAINT SHAPED EVERYTHING ELSE HERE: any field this markup reads must
   also exist on the rows sbv_niches returns, because sbv.js re-renders from
   those rows the moment they arrive. A field that lives only in the JSON seed
   would render once and then vanish on the live overlay. That is why the price
   badge is DERIVED from price_label rather than added as a new seed field —
   no schema change, and nothing to disappear a second later.

   Pure functions: strings in, strings out. No DOM, no fetch, no globals.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SBVRender = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Counts render only ABOVE this floor. Mirrors garagesalebiz's
     `if (n <= REG_COUNT_FLOOR) return;` — so the first number a visitor can
     ever see is 4. A count of one or two argues against the exclusivity it is
     meant to evidence, and an invented number would be worse than either. */
  var FLOOR = 3;

  /* The CTA arrow was a 60x30 outlined flame-red chevron. A glyph in the
     link's own colour is the landing page's idiom (.scard-go) and needs no
     second palette to stay legible on a white card. */
  var ARROW = '<span class="go-arrow" aria-hidden="true">\u2192</span>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function host(url) { return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }

  function pad3(n) { return ('00' + n).slice(-3); }

  /* The index label: family code + the plate's position in seed order, so the
     board reads N° 001 through N° 029 top to bottom regardless of family. */
  function indexLabel(n, idx) {
    var fam = String(n.catalog_no || '').split('-')[0] || '--';
    return fam + ' · N° ' + pad3(idx);
  }

  /* R12 — never a broken image. Jason's ruling: a gradient placeholder built
     from the niche's OWN accent colour, painted on the CONTAINER behind the
     <img>, never an onerror handler. One background then covers every
     failure mode: the image loads and hides it; the image 404s at runtime
     and the gradient is already there; the build finds no file at all and
     never emits an <img> in the first place (see the noShot check below).

     The colour values are NEVER hand-copied here. They arrive through the
     extras lookup (window.SBV_EXTRAS at runtime, the same object
     tools/build-catalog.js's buildExtras() builds from
     assets/data/manifests.json at build time) exactly the way brandLine()
     and chips() already read that lookup. A slug the manifest does not cover
     gets no style attribute at all -- the container's own CSS background
     (var(--surface-2) / var(--fam)) is the fallback, never the literal
     string "undefined".

     THE GRADIENT STOPS AT 62% ON PURPOSE. The 32 manifest accents range from
     violet (#8177F2) to crimson (#B02E58) against grounds that are sometimes
     near-black and sometimes near-white -- there is no single label colour
     that clears 4.5:1 against every accent. Holding the ground colour solid
     through 62% of the diagonal keeps the centred label (place-items:center)
     inside the ground-only zone, so its contrast is always text-vs-ground,
     never text-vs-accent -- verified at a minimum of 11.15:1 across all 32
     manifests (assets/data/manifests.json, "caregiving"), comfortably past
     4.5:1. The accent only shows as a flare in the far corner, which is also
     why this reads as "subdued" rather than a decorative panel. --ph-text
     carries the manifest's own theme.text, which .card-shot-label reads with
     a fallback to the pre-existing var(--tx-3) so a slug with no manifest is
     visually unchanged. */
  function shotBg(x) {
    if (!x || !x.ground || !x.accent) return '';
    return ' style="background:linear-gradient(135deg,' + esc(x.ground) + ' 0%,' +
           esc(x.ground) + ' 62%,' + esc(x.accent) + ' 100%)' +
           (x.text ? ';--ph-text:' + esc(x.text) : '') + '"';
  }

  /* THE THUMBNAIL SOURCE IS DERIVED, never a new seed field — the constraint
     at the top of this file applies to it exactly like everything else.

     Two paths, both off real sbv_niches columns:
       demo_path set -> /assets/shots/rotator/<slug>.jpg. tools/build-shots.js
                        captures that directory from the same seed rows, one
                        file per slug, so the two cannot disagree about which
                        frames exist. The directory keeps the name it took
                        from the hero rotator R14 deleted; the catalog
                        board and the 32-card grid read it now.
       open_url set  -> /assets/shots/platforms/<host minus .com>.jpg. The
                        three open platforms have no demo_path, because they
                        are whole businesses rather than templates, but they
                        do have captures, and their hostnames land on those
                        filenames exactly: estatesalebiz.com, garagesalebiz.com,
                        consignmentbiz.com.

     Three waitlist ideas match neither and get the placeholder below, rather
     than a broken <img> or a collapsed card. */
  function shot(n) {
    if (n.demo_path) return '/assets/shots/rotator/' + esc(n.slug) + '.jpg';
    if (n.open_url) {
      var h = host(n.open_url).replace(/^www\./, '').replace(/\.com$/, '');
      if (h) return '/assets/shots/platforms/' + esc(h) + '.jpg';
    }
    return null;
  }

  /* 16:10 either way — the placeholder holds the same box the image would, so
     a family containing one of the three undemoed niches does not get a short
     card sitting beside tall ones. */
  function thumb(n, lookup) {
    var x = (lookup && lookup[n.slug]) || {};
    var src = shot(n);
    /* A demo_path with no file on disk yet (the 33rd-niche gap this ruling
       insures against) is a BUILD-TIME fact, not a visitor's problem -- so no
       <img> is emitted at all, only the accent placeholder. See shotBg()
       above and buildExtras() in tools/build-catalog.js, which sets
       x.noShot from fs.existsSync() on the exact path shot() returns. */
    if (!src || x.noShot) {
      return '<div class="card-shot card-shot-none"' + shotBg(x) + '>' +
               '<span class="card-shot-mark" aria-hidden="true"></span>' +
               '<span class="card-shot-label">No demo built yet</span>' +
             '</div>';
    }
    return '<div class="card-shot"' + shotBg(x) + '>' +
             '<img src="' + src + '" width="1280" height="800" loading="lazy" ' +
                  'decoding="async" alt="A screenshot of the ' + esc(n.name) + ' site.">' +
           '</div>';
  }

  /* THE PRICE, AND THE ONLY PLACE IT IS WRITTEN DOWN. tools/check-pages.js
     reads this constant out of this file by name and then refuses any dollar
     amount on a selling page that it cannot trace back to here, to a
     price_label in the seed, or to its own short ALLOWED_PRICES list. So the
     name and the shape of this line are load-bearing: rename it and the price
     guard goes red rather than quietly stopping.

     It used to be declared beside the hero offer card, which R13 removed. It
     belongs here instead, next to the only renderer that still prints it. */
  var PRICE = '$99';

  /* Price, printed as a line of text. The circular red sticker it replaces
     carried the same figure in a display face at 17px, rotated nine degrees.

     DELIBERATELY ONE TEXT NODE. assets/i18n.js keys translations off the
     English source string and walks text nodes, so wrapping the figure in a
     <b> would split "$99 one-time" into two nodes and drop the Spanish line
     that already exists for it. Weight is CSS's job here. */
  function priceLine(n) {
    var txt = null;
    if (n.status === 'open' && n.price_label) txt = n.price_label;
    else if (n.status === 'website_only')     txt = PRICE + ' one-time';
    if (!txt) return '';
    return '<p class="card-price">' + esc(txt) + '</p>';
  }

  /* The three strings are the filter chips' three strings, exactly. They were
     'Waitlist' and 'Website' here and 'In line' and 'Website only' on the
     chips, which had the board naming one state two ways. Aligning them also
     reuses the Spanish already in assets/lang/es.js for those chips, instead
     of needing two more dictionary lines for the same idea. */
  function statusTok(n) {
    if (n.status === 'open')    return { cls: 'open', text: 'Open now' };
    if (n.status === 'in_line') return { cls: 'wait', text: 'In line' };
    return { cls: 'site', text: 'Website only' };
  }

  /* Demo brand name and feature chips. These are NOT database columns and
     must never become ones: they describe the artifact on disk, not the
     product's commercial state. Passed in as a lookup so the runtime
     re-render has them too — a field that lives only in the seed renders
     once and disappears the moment live rows arrive.

     They are two functions now rather than one, because they render in two
     different places: the brand name stays on the card, under the trade,
     while the chips moved to the card-detail modal. Both still read the one
     SBV_EXTRAS lookup, so neither can go stale against the other. */
  function brandLine(n, lookup) {
    var x = (lookup && lookup[n.slug]) || {};
    return x.brand ? '<p class="card-brand">' + esc(x.brand) + '</p>' : '';
  }

  /* Read by assets/sbv.js's fillModal(). Returns the array, not markup — the
     modal decides how a row of chips is presented, the same way it decides
     that for every other field it lifts off a card. */
  function chips(n, lookup) {
    var x = (lookup && lookup[n.slug]) || {};
    return (x.chips && x.chips.length) ? x.chips.slice() : [];
  }

  /* "Claim this territory" opens the claim/claim.js modal — slug and name are
     real sbv_niches columns, so this survives the live re-render same as the
     rest of the card. Offered wherever a turnkey site actually exists to buy,
     regardless of whether the underlying business itself is open or in line. */
  function claimBtn(n) {
    if (!n.website_offer || !n.demo_path) return '';
    return '<button type="button" class="card-go claim-btn" data-slug="' + esc(n.slug) +
           '" data-name="' + esc(n.name) + '"><span>Claim this territory</span>' + ARROW + '</button>' +
           '<p class="card-claimed" data-claimed="' + esc(n.slug) + '" hidden></p>';
  }

  /* The price left this row for priceLine() above, which the card prints
     immediately before it — so an open card no longer reads
     "$497 + $39/mo · 3 cities · estatesalebiz.com" as one run-on note.

     The commercial structure is otherwise unchanged, deliberately. The
     primary action is still whatever that status can actually DO — buy it,
     get in line, claim the territory — and the demo link is secondary to it
     wherever a demo exists. What changed is that the secondary link says
     "See the demo" everywhere, which is what the landing page's cards say,
     instead of three different sentences for the same click.

     .js-preview + data-slug hand the click to the R4 preview overlay in
     sbv.js, which opens the demo in a full-screen iframe instead of
     navigating away from the board. It is ONE delegated listener on
     document matching exactly `.js-preview[data-slug]`, so the attributes
     are the whole wiring, and there is no per-card JS to add, and nothing to
     re-bind after loadLive() throws these nodes away and renders new ones.
     The href stays real: with JavaScript off, or if the slug does not
     resolve to a seed row, the link is still a working link to the demo. */
  function demoAlt(n) {
    return n.demo_path
      ? '<a class="card-alt js-preview" data-slug="' + esc(n.slug) + '" href="' +
        esc(n.demo_path) + '">See the demo \u2192</a>'
      : '';
  }

  function footRow(n, counts) {
    var c = (counts && counts[n.slug]) || {};
    var claim = claimBtn(n);

    if (n.status === 'open') {
      return '<a class="card-go" href="' + esc(n.open_url) + '">' +
               '<span>See the deal</span>' + ARROW +
             '</a>' +
             '<p class="card-note">' + esc(host(n.open_url)) + '</p>';
    }

    if (n.status === 'in_line') {
      var count = (typeof c.waiting === 'number' && c.waiting > FLOOR)
        ? '<p class="card-note"><b>' + c.waiting + '</b> in line</p>'
        : '';
      /* .js-line + data-niche are the hooks sbv.js binds to; they prefill the
         registry form with this niche. Unchanged from the previous card. */
      return '<a class="card-go js-line" href="#line" data-niche="' + esc(n.slug) + '">' +
               '<span>Claim a spot</span>' + ARROW +
             '</a>' + count +
             (n.website_offer && n.demo_path ? demoAlt(n) + claim : '');
    }

    return (claim || ('<a class="card-go" href="' + esc(n.demo_path || '#websites') + '">' +
             '<span>See the demo</span>' + ARROW +
           '</a>')) +
           (claim ? demoAlt(n) : '');
  }

  /* .entry.sheet, .code, .tok, h3, .job, .caveat, .card-go, .entry-foot,
     data-fam and id="n-<slug>" are all load-bearing for assets/sbv.js — it
     filters on them, counts on them, promotes the h3 into the modal button
     and lifts the modal's contents off them. The shape around them changed;
     not one of those names did.

     .card-body is new and wraps everything under the screenshot, because the
     card is now a flex column whose foot pins to the bottom: the thumbnail is
     a fixed-ratio block and the text has to be the part that stretches, or
     the CTA lands at a different height in every card in the row. That is
     the exact defect the featured grid had. */
  function entry(n, famName, counts, idx, extrasLookup) {
    var tok = statusTok(n);
    var cls = 'entry sheet reveal is-' + n.status.replace(/_/g, '-');

    return '<article class="' + cls + '" data-fam="' + esc(n.family) + '" id="n-' + esc(n.slug) + '">' +
             thumb(n, extrasLookup) +
             '<div class="card-body">' +
               '<span class="card-meta">' +
                 '<span class="fam-dot" aria-hidden="true"></span>' +
                 '<span class="code">' + esc(indexLabel(n, idx)) + '</span>' +
                 '<span class="tok ' + tok.cls + '">' + esc(tok.text) + '</span>' +
               '</span>' +
               '<h3>' + esc(n.name) + '</h3>' +
               brandLine(n, extrasLookup) +
               '<p class="job">' + esc(n.job_line) + '</p>' +
               (n.caveat ? '<p class="caveat">' + esc(n.caveat) + '</p>' : '') +
               '<div class="entry-foot">' + priceLine(n) + footRow(n, counts) + '</div>' +
             '</div>' +
           '</article>';
  }

  function catalog(families, niches, counts, extrasLookup) {
    /* Seed order decides the number on the plate, so it is computed once from
       the whole list before anything is grouped by family. */
    var seedIndex = {};
    niches.forEach(function (n, i) { seedIndex[n.slug] = i + 1; });

    return families.map(function (fam) {
      var rows = niches
        .filter(function (n) { return n.family === fam.key; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
      if (!rows.length) return '';

      return '<div class="family" data-fam="' + esc(fam.key) + '" style="--fam:var(--fam-' + esc(fam.key) + ')">' +
               '<div class="plate-head reveal">' +
                 '<span class="plate-no">Plate ' + esc(fam.code) + '</span>' +
                 '<h2 class="plate-title">' + esc(fam.name) + '</h2>' +
               '</div>' +
               '<p class="plate-note">' + esc(fam.note) + '</p>' +
               '<div class="grid">' +
                 rows.map(function (n) { return entry(n, fam.name, counts, seedIndex[n.slug], extrasLookup); }).join('') +
               '</div>' +
             '</div>';
    }).join('');
  }

  /* THE LANDING PAGE'S SITES GRID — every turnkey site, flat, four across.
     Replaces the hand-written "featured six + All 32 sites →" pattern that
     stood here before: six cards chosen by a person, each carrying a second
     hover capture, and a button promising twenty-six more somewhere else.

     IT IS THE ONLY LISTING ON `/` AGAIN AS OF R18. R16 dropped this grid for
     the catalog board (catalog() above) when /sites/ was deleted; R18
     reversed that choice and the board is what came out. One listing per page
     either way — printing both would be the same thirty-two rows twice.

     WHY IT IS GENERATED AND NOT WRITTEN. Thirty-two hand-written cards would
     be the largest hand-kept copy of the catalog in the project, and the one
     most likely to go stale — the featured six already carried brand names,
     trade names and job lines typed out a second time beside the seed that
     holds them. This reads the same seed rows every other surface reads, so a
     niche added to the seed joins this grid on the next build and one removed
     leaves it.

     FLAT ON PURPOSE. No family plates: those belong to catalog() above, and
     this grid's whole argument is "here is all of it at once". Sorted by the
     seed's own `sort`, which is the order the families themselves are in, so
     the grouping is still legible without headings asserting it.

     THE CARD IS THE PREVIEW CONTROL. .js-preview + data-slug hand the click
     to wirePreview() in assets/sbv.js — ONE delegated listener on document
     matching `.js-preview[data-slug]`, which closest() resolves from whatever
     inside the card was actually clicked. So there is no per-card JS, nothing
     to re-bind, and no second overlay implementation. The href is a real href
     to the demo: with JavaScript off, or a slug the seed cannot resolve, the
     card is still a working link to the site it pictures.

     Every child is a <span>, not a <div> or a <p>. The card is an <a>, and an
     <a> may only contain phrasing content — a <p> inside it is a parse error
     the browser silently repairs by closing the link early, which would leave
     three quarters of each card outside its own hit area.

     TWO FIELDS FROM THE SEED, ONE FROM EXTRAS. name and slug are real
     sbv_niches columns, so they survive the live re-render. The demo brand is
     not a column and must never become one (see brandLine above); it comes
     through the same SBV_EXTRAS lookup the catalog card uses, and falls back
     to the trade name if a demo has no content.json to read a brand from. */
  function siteGrid(niches, extrasLookup) {
    return niches
      .filter(function (n) { return n.website_offer && n.demo_path; })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
      .map(function (n) {
        var x = (extrasLookup && extrasLookup[n.slug]) || {};
        /* Same build-time noShot rule as thumb() above: a missing file never
           becomes a failed request, only the gradient standing alone. */
        var img = x.noShot ? '' :
          '<img src="' + shot(n) + '" width="1280" height="800" loading="lazy" ' +
               'decoding="async" alt="A screenshot of the ' + esc(n.name) + ' demo site.">';
        return '<a class="scard reveal js-preview" data-slug="' + esc(n.slug) + '" href="' +
                 esc(n.demo_path) + '">' +
                 '<span class="scard-shot"' + shotBg(x) + '>' + img + '</span>' +
                 '<span class="scard-body">' +
                   '<span class="scard-brand">' + esc(x.brand || n.name) + '</span>' +
                   '<span class="scard-trade">' + esc(n.name) + '</span>' +
                   '<span class="scard-go">Preview →</span>' +
                 '</span>' +
               '</a>';
      }).join('');
  }

  /* THE HERO'S DEMO BUTTON, and the only reason it is generated: the SLUG.

     The button opens the preview overlay, and wirePreview() in assets/sbv.js
     resolves .js-preview[data-slug] against the seed before it will open
     anything. Until R14 that attribute shipped EMPTY and the hero rotator
     filled it in at runtime from the frame on screen. R14 replaced the
     rotator with one static photograph, so something else has to put a real
     slug there — and the only honest source is the list every other surface
     already reads: the first niche in the seed that has a demo_path.

     TYPING A SLUG INTO index.html WOULD WORK TODAY AND ROT SILENTLY. A slug
     that no longer names a seed row does not throw, does not log, and does
     not look broken: the button simply stops opening anything. Emitting it
     here keeps the first demo recorded in exactly one place (Ruling R20),
     the same way no count on this page is ever typed.

     No demo in the seed means NO BUTTON, rather than a button that cannot
     open one. */
  function heroDemoBtn(niches) {
    var first = niches.filter(function (n) { return n.demo_path; })[0];
    if (!first) return '';
    return '<button type="button" class="btn btn-sec js-preview" data-slug="' +
           esc(first.slug) + '">See a live demo</button>';
  }

  /* WHAT'S INCLUDED — the $99 website deliverables, rendered into a
     BUILD marker on BOTH `/` and `/sites/` so the two surfaces cannot drift.

     EVERY LINE BELOW WAS CHECKED AGAINST SOMETHING THAT SHIPS. Nothing here
     is aspirational, and the provenance is recorded so a future editor can
     re-check it rather than trust it:

       subdomain   legal/terms.html section 6 ("a web address of the form
                   yourbusiness.systemsbyvega.com"); claim/thank-you.html
                   ("It is live right now"); api/stripe-webhook.mjs, which
                   sends "It opens with example content until you customise
                   it" — load-bearing, so the buyer does not report the demo
                   content as a bug.
       admin       Terms section 6 lists the editable fields; admin/index.html
                   carries them (#sec-business ... #sec-legal), including
                   hours and social links. Before/after slots are gated on the
                   niche manifest's merge.beforeAfter, hence "where the niche
                   uses them" rather than a flat promise.
       leads       api/submit-lead.mjs records every submission in sbv_leads
                   for the admin list AND leaves the existing email delivery
                   as the path of record. Both, which is why the line says
                   both. Terms section 8: "Any enquiry your site receives is
                   yours."
       kit         api/marketing-kit.mjs renders a social PNG and a Letter
                   flyer, each with a real QR to the operator's site; Terms
                   section 8 names all three.
       guide       sites/<niche>/guide.html — "How to run this business",
                   built per niche and branded.
       legal       _template/legal/{terms,privacy}.html carry BRAND_NAME,
                   BRAND_CITY, BRAND_PHONE, BRAND_EMAIL and SERVICE_AREA
                   tokens, filled at build into sites/<niche>/.
       reset       admin/index.html #sec-danger, "Reset to defaults".

     TWO THINGS ARE DELIBERATELY ABSENT.

     HOSTING is not mentioned. It is real (Terms section 10) but it is not a
     selling line, and naming it invites a support expectation this list is
     not the place to set.

     TERRITORY is not mentioned here, but it IS part of the offer. The old
     contradiction is gone: Terms section 4, the Refund Policy section 5 and
     the /sites/ FAQ now all say a purchase includes a marketing territory,
     matching the acceptance text every buyer ticks (ACCEPTANCE_TEXTS in
     api/_shared.mjs), the welcome email, and the partial unique index behind
     sbv_claim_city() that actually enforces it. Territory is carried by the
     comparison table (row 2) and the registry section rather than by this
     list, so it is said once in the place that evidences it. Adding it here
     as an eighth item is now unblocked, but it is a copy decision, not a
     correctness one. */
  var INCLUDED = [
    ['globe',   'Your site, on your own subdomain',
     'Live at yourbusiness.systemsbyvega.com from the moment you claim — carrying the example content until your first save.'],
    ['sliders', 'Your own operator admin',
     'Business details, hours, service area, photos, pricing, reviews and social links — plus before/after shots where the niche uses them.'],
    ['inbox',   'A leads inbox',
     'Every enquiry your site receives lands in your admin as a running list, and in your email.'],
    ['qr',      'A marketing kit',
     'A social image and a printable flyer, both carrying a QR code that points at your site.'],
    ['book',    'The owner guide',
     'How to run this business, written for your niche and carrying your brand.'],
    ['shield',  'Customer Terms and Privacy pages',
     'Pre-filled with your business name, city, contact details and service area.'],
    ['undo',    'Reset to defaults',
     'Put the site back to its example content and start over, whenever you want.'],
    ['calendar', 'Connect a booking link',
     'Paste your Calendly, Google Calendar or Square link and a Book online button appears in your header and footer automatically.'],
    ['link', 'Connect your own domain',
     'Point your CNAME at ours and your site answers to yourdomain.com instead of the subdomain.'],
  ];

  /* 20x20 stroke icons, currentColor, no icon font and no sprite file. */
  var INCL_ICONS = {
    globe:  '<circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c2 2.4 3 4.9 3 7.5s-1 5.1-3 7.5c-2-2.4-3-4.9-3-7.5s1-5.1 3-7.5z"/>',
    sliders:'<path d="M2.5 6h15M2.5 14h15"/><circle cx="7" cy="6" r="2.2"/><circle cx="13" cy="14" r="2.2"/>',
    inbox:  '<path d="M2.5 11.5 5 4h10l2.5 7.5v4a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"/><path d="M2.5 11.5h4l1 2h5l1-2h4"/>',
    qr:     '<rect x="2.5" y="2.5" width="6" height="6" rx="1"/><rect x="11.5" y="2.5" width="6" height="6" rx="1"/><rect x="2.5" y="11.5" width="6" height="6" rx="1"/><path d="M11.5 11.5h2.5v2.5M17.5 11.5v6h-6"/>',
    book:   '<path d="M3 3.5h4.5A2.5 2.5 0 0 1 10 6v11a2 2 0 0 0-2-2H3z"/><path d="M17 3.5h-4.5A2.5 2.5 0 0 0 10 6v11a2 2 0 0 1 2-2h5z"/>',
    shield: '<path d="M10 2.5 16.5 5v5c0 4-2.7 6.7-6.5 8-3.8-1.3-6.5-4-6.5-8V5z"/><path d="M7.3 10.2 9.2 12l3.5-3.6"/>',
    undo:   '<path d="M3.5 5v5h5"/><path d="M4.4 12.2a6.8 6.8 0 1 0 .6-5.2"/>',
    calendar: '<rect x="3" y="4.5" width="14" height="13" rx="1.5"/><path d="M3 8.5h14M7 2.5v3M13 2.5v3"/>',
    link: '<path d="M8 12a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24l-.5.5"/><path d="M12 8a3 3 0 0 0-4.24 0l-2 2a3 3 0 0 0 4.24 4.24l.5-.5"/>',
  };

  function included(opts) {
    var o = opts || {};
    return '' +
      /* .reveal (R8): this block IS the body of #offer on / and the WHOLE of
         #included on /sites/, so without it that second section had nothing
         to scroll-reveal. The class is inert until observe() in sbv.js adds
         .anim, which it only does when it can take it off again — so the
         no-JS rendering of this list is unchanged. */
      '<div class="incl reveal">' +
        '<h3 class="incl-h">' + esc(o.heading || "What's included with every site") + '</h3>' +
        '<ul class="incl-list">' +
          INCLUDED.map(function (row) {
            return '<li class="incl-item">' +
              '<span class="incl-ico" aria-hidden="true">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" ' +
                     'stroke-linecap="round" stroke-linejoin="round">' +
                  INCL_ICONS[row[0]] +
                '</svg></span>' +
              '<span class="incl-txt"><b>' + esc(row[1]) + '</b> ' + esc(row[2]) + '</span>' +
            '</li>';
          }).join('') +
        '</ul>' +
        '<p class="incl-note">What each of these covers, in full, is in the ' +
          '<a class="link" href="/legal/terms.html">Terms</a>.</p>' +
      '</div>';
  }

  /* THE SAME LIST, SHORTENED — for the self-serve card in #paths on `/`.

     R15 puts a two-path choice between the comparison table and the catalog
     board, and the left card has to say in four lines what the buyer gets
     for the one price. Those four lines are the first four entries of
     INCLUDED above, headline only, with the item's own icon.

     WHY A FUNCTION AND NOT FOUR <li>s TYPED INTO index.html. The card sits
     roughly two screens above #offer, which renders the full seven through
     included(). Two hand-kept copies of the same promise on one page is the
     exact drift this file exists to prevent — change a deliverable and the
     card would go on advertising the old one, above the block that already
     corrected itself. Taking the first n rows means the card can never name
     something the full list does not, because it is not a second list.

     THE QUALIFIER COMES WITH IT. An earlier cut printed the bold lead alone,
     which read as a tighter list and was the wrong trade twice over: it left
     a card-height hole above the CTA that the sibling card's form filled with
     real content, and — worse — a bare "Your site, on your own subdomain"
     promises more than the full list does, because the sentence that follows
     it in INCLUDED is the one saying it opens with example content. A
     shortened list must never be a bigger claim than the list it shortens, so
     this takes both halves of each row and shortens by COUNT only. */
  function includedBrief(n) {
    var rows = INCLUDED.slice(0, n || 4);
    return '<ul class="path-list">' +
      rows.map(function (row) {
        return '<li class="path-item">' +
          '<span class="path-ico" aria-hidden="true">' +
            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" ' +
                 'stroke-linecap="round" stroke-linejoin="round">' +
              INCL_ICONS[row[0]] +
            '</svg></span>' +
          '<span class="path-txt"><b>' + esc(row[1]) + '</b> ' + esc(row[2]) + '</span>' +
        '</li>';
      }).join('') +
    '</ul>';
  }

  function nicheSelect(niches) {
    var open = [], line = [];
    niches.forEach(function (n) {
      if (n.status === 'in_line') line.push(n);
      else if (n.status === 'open') open.push(n);
    });
    var html = '<option value="">Pick a business…</option>';
    if (line.length) {
      html += '<optgroup label="In line — tell me you want this one">' +
              line.map(function (n) { return '<option value="' + esc(n.slug) + '">' + esc(n.name) + '</option>'; }).join('') +
              '</optgroup>';
    }
    if (open.length) {
      html += '<optgroup label="Open today — go straight to the site">' +
              open.map(function (n) {
                return '<option value="' + esc(n.slug) + '" data-open="' + esc(n.open_url) + '">' + esc(n.name) + '</option>';
              }).join('') +
              '</optgroup>';
    }
    return html;
  }

  /* Every figure the masthead shows, derived from the data. Nothing here is
     ever written into the HTML by hand — that is how the previous homepage
     came to claim nine shipped projects while the portfolio rendered eleven. */
  function figures(niches) {
    var by = function (s) { return niches.filter(function (n) { return n.status === s; }).length; };
    return {
      total:       niches.length,
      open:        by('open'),
      inLine:      by('in_line'),
      websiteOnly: by('website_only'),
      /* Turnkey sites a buyer can actually claim today. Deliberately NOT the
         same as `total`: the board also lists ideas that are only in line and
         the three platforms that are whole businesses rather than websites. */
      sites:       niches.filter(function (n) { return n.website_offer; }).length,
      perCity:     1
    };
  }

  var WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  function numWord(n) { return n < WORDS.length ? WORDS[n] : String(n); }
  function thesisOpen(n) { return numWord(n) + (n === 1 ? ' is open today' : ' are open today'); }

  return {
    FLOOR: FLOOR,
    esc: esc,
    catalog: catalog,
    siteGrid: siteGrid,
    entry: entry,
    brandLine: brandLine,
    chips: chips,
    nicheSelect: nicheSelect,
    heroDemoBtn: heroDemoBtn,
    included: included,
    includedBrief: includedBrief,
    figures: figures,
    numWord: numWord,
    thesisOpen: thesisOpen,
    shot: shot,
    priceLine: priceLine,
    indexLabel: indexLabel
  };
}));
