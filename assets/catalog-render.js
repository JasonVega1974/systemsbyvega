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

   WHY IT CHANGED. The landing page sells with screenshots: .pcard and .fcard
   are white, square to the grid, and lead with a real capture of the site
   they point at. The catalog board — the page that actually has to close the
   sale — was a different product visually, and a visitor moving from one to
   the other had no reason to believe the two came from the same shop. The
   board STRUCTURE was never the problem and is untouched: family plates,
   filter chips, the ledger bar, the live open/claimed status, the
   on-the-board count. What changed is the card surface, which now reads the
   same band tokens .fcard does and leads with the same screenshot.

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
     link's own colour is the landing page's idiom (.fcard-go) and needs no
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

  /* THE THUMBNAIL SOURCE IS DERIVED, never a new seed field — the constraint
     at the top of this file applies to it exactly like everything else.

     Two paths, both off real sbv_niches columns:
       demo_path set -> /assets/shots/rotator/<slug>.jpg. tools/build-shots.js
                        captures that directory from the same seed rows, one
                        file per slug, so the two cannot disagree about which
                        frames exist (heroRotator() below reads it the same
                        way).
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
  function thumb(n) {
    var src = shot(n);
    if (!src) {
      return '<div class="card-shot card-shot-none">' +
               '<span class="card-shot-mark" aria-hidden="true"></span>' +
               '<span class="card-shot-label">No demo built yet</span>' +
             '</div>';
    }
    return '<div class="card-shot">' +
             '<img src="' + src + '" width="1280" height="800" loading="lazy" ' +
                  'decoding="async" alt="A screenshot of the ' + esc(n.name) + ' site.">' +
           '</div>';
  }

  /* Price, printed as a line of text. The circular red sticker it replaces
     carried the same figure in a display face at 17px, rotated nine degrees.

     DELIBERATELY ONE TEXT NODE. assets/i18n.js keys translations off the
     English source string and walks text nodes, so wrapping the figure in a
     <b> would split "$99 one-time" into two nodes and drop the Spanish line
     that already exists for it. Weight is CSS's job here. */
  function priceLine(n) {
    var txt = null;
    if (n.status === 'open' && n.price_label) txt = n.price_label;
    else if (n.status === 'website_only')     txt = '$99 one-time';
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
     instead of three different sentences for the same click. */
  function demoAlt(n) {
    return n.demo_path
      ? '<a class="card-alt" href="' + esc(n.demo_path) + '">See the demo ' +
        '\u2192</a>'
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
             thumb(n) +
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

  /* The landing-page hero rotator. One frame per niche that has a demo, in
     seed order, captured by tools/build-shots.js into assets/shots/rotator/
     under the niche's own slug — so this function and that tool read the same
     list and cannot disagree about which frames exist.

     Only FRAME 1 gets a src here. The other thirty-one are fetched by
     assets/sbv.js, one ahead of the one showing, which is the whole reason
     the hero can carry 32 frames without 32 downloads. That also means the
     no-JS and reduced-motion renderings are this markup exactly as it
     stands: frame 1, its caption, and the full trade list below.

     THE SCRIM IS PART OF THIS MARKUP, AND SO IS data-slug. The hero is
     full-bleed now — the headline sits ON the frame — so white text clears
     4.5:1 only because assets/hero-scrim.css darkens each frame by an amount
     MEASURED for that frame. Three things that markup owns:

       data-slug        keys the per-frame alpha. It ships on frame 1 so the
                        no-JS and reduced-motion renderings are scrimmed
                        correctly too, and rotator() in assets/sbv.js moves it
                        with the crossfade. A lagging attribute paints frame N
                        with frame N-1's scrim, which no screenshot reveals.
       THREE scrim      --scrim-base and --scrim-extra are composited as
       divs             separate layers, never summed into one alpha: they
                        were solved by painting one over the other in sRGB,
                        and sRGB compositing is not additive in alpha. The
                        third, .seq-scrim-floor, is the MEASURED FLOOR this
                        layout needs on top of them — see THE FLOOR in
                        assets/sbv.css for what it is and why the generated
                        pair alone does not cover a headline.
       inside .seq      the custom properties are declared on .seq[data-slug],
                        so the layers have to be its descendants to inherit
                        them.

     The chips are the reduced-motion (and no-JS) presentation, revealed by
     CSS. They are CAPPED at CHIP_CAP, with a generated '+N more' link for
     the rest. Printing all thirty-two put a 559px wall of pills in the hero
     at 390px — measured — which pushes the CTAs off the first screen and is
     a worse reduced-motion experience than the animation it stands in for.
     The remainder is stated rather than dropped, its count computed here
     (Ruling R20: a count in this markup is never typed), and the link goes
     to the page that lists every one of them.

     .hero-media and .seq-meta split the block in two on purpose. .hero-media
     is taken out of flow as the hero's background; .seq-meta stays IN flow,
     after it, so the caption and the chip wall add real height instead of
     overhanging a fixed box — and so the '+N more' link is tabbed after the
     hero's own CTAs rather than before them. */
  var CHIP_CAP = 11;
  function heroRotator(niches) {
    var frames = niches.filter(function (n) { return n.demo_path; });
    if (!frames.length) return '';
    var first = frames[0];
    var shot = function (n) { return '/assets/shots/rotator/' + esc(n.slug) + '.jpg'; };

    return '' +
      '<div class="hero-media">' +
        '<div class="seq" data-rotator data-slug="' + esc(first.slug) + '" role="img" ' +
             'aria-label="The ' + esc(first.name) + ' demo storefront.">' +
          '<img class="seq-layer is-on" src="' + shot(first) + '" width="1280" height="800" ' +
               'fetchpriority="high" decoding="async" alt="">' +
          '<img class="seq-layer" width="1280" height="800" decoding="async" alt="">' +
          '<div class="seq-scrim seq-scrim-base" aria-hidden="true"></div>' +
          '<div class="seq-scrim seq-scrim-extra" aria-hidden="true"></div>' +
          '<div class="seq-scrim seq-scrim-floor" aria-hidden="true"></div>' +
        '</div>' +
      '</div>' +
      '<div class="seq-meta">' +
        '<div class="seq-cap" data-rotator-cap aria-hidden="true">' +
          '<span class="seq-cap-layer is-on">' + esc(first.name) + '</span>' +
          '<span class="seq-cap-layer"></span>' +
        '</div>' +
        '<div class="seq-steps">' +
          frames.slice(0, CHIP_CAP).map(function (n, i) {
            return '<span class="seq-step' + (i === 0 ? ' is-current' : '') + '">' +
                   esc(n.name) + '</span>';
          }).join('') +
          (frames.length > CHIP_CAP
            ? '<a class="seq-step seq-step-more" href="/sites/">+' +
              (frames.length - CHIP_CAP) + ' more &rarr;</a>'
            : '') +
        '</div>' +
      '</div>';
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
  };

  function included(opts) {
    var o = opts || {};
    return '' +
      '<div class="incl">' +
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

  /* THE OFFER CARD — the price, what it buys, and the button, in the first
     screen beside the hero headline.

     ITS FIVE LINES ARE NOT TYPED HERE. They are INCLUDED.slice(0, OFFER_ROWS)
     — the same array, in the same order, that R.included() renders in full
     lower down the page and on /sites/. A hand-typed summary of a generated
     list is a copy that drifts the first time the real list changes, and the
     drift is silent because nothing compares the two. Taking a slice means the
     card cannot say something the full list does not.

     Only the bold TITLE of each row is used. The card is a summary sitting
     next to the headline; the sentence that qualifies each line is three
     sections further down, in the full list, where there is room for it.

     The price is written once, in PRICE, and rendered into both the heading
     and the button label from that one string. */
  var OFFER_ROWS = 5;
  var PRICE = '$99';

  function offerCard() {
    return '' +
      '<aside class="offer" aria-labelledby="offer-price">' +
        '<p class="offer-eyebrow">One price</p>' +
        '<h2 class="offer-price" id="offer-price">' + esc(PRICE) +
          ' once. <span>Live today.</span></h2>' +
        '<ul class="offer-list">' +
          INCLUDED.slice(0, OFFER_ROWS).map(function (row) {
            return '<li class="offer-item">' +
              '<span class="offer-ico" aria-hidden="true">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" ' +
                     'stroke-linecap="round" stroke-linejoin="round">' +
                  INCL_ICONS[row[0]] +
                '</svg></span>' +
              '<span class="offer-txt">' + esc(row[1]) + '</span>' +
            '</li>';
          }).join('') +
        '</ul>' +
        '<a class="btn btn-pri btn-block offer-go" href="/sites/">Get your site &mdash; ' +
          esc(PRICE) + '</a>' +
        '<p class="offer-fine">Pick your trade, claim your city, and it is live the same day. ' +
          'Everything it covers is in the <a class="link" href="/legal/terms.html">Terms</a>.</p>' +
      '</aside>';
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
    entry: entry,
    brandLine: brandLine,
    chips: chips,
    nicheSelect: nicheSelect,
    heroRotator: heroRotator,
    included: included,
    offerCard: offerCard,
    figures: figures,
    numWord: numWord,
    thesisOpen: thesisOpen,
    shot: shot,
    priceLine: priceLine,
    indexLabel: indexLabel
  };
}));
