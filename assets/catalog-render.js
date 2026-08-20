/* ============================================================================
   SYSTEMS BY VEGA — catalog renderer (shared)
   ----------------------------------------------------------------------------
   ONE renderer, used twice:
     * at build time by tools/build-catalog.js, which writes the finished markup
       straight into index.html, so the catalog is present in the HTML and the
       page is complete with JavaScript disabled or broken;
     * at run time by assets/sbv.js, to re-render when live rows and real
       waiting counts come back from the database.

   It lives in its own file specifically so those two paths cannot drift. The
   demo sites under /sites/ each carry an inline DEFAULT_CONTENT *and* a
   byte-identical content.json maintained by hand, and that duplication is how
   a corrected claim comes back. Not repeating it here.

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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function host(url) { return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }

  function priceMarkup(label) {
    return esc(label).replace(/^(\$[\d,]+)/, '<b>$1</b>');
  }

  function statusFoot(n, counts) {
    var c = (counts && counts[n.slug]) || {};
    var out = '';

    if (n.status === 'open') {
      out += '<span class="tag-open">Open now</span>';
      if (n.price_label) out += '<div class="price">' + priceMarkup(n.price_label) + '</div>';
      out += '<a class="link" href="' + esc(n.open_url) + '">Go to ' + esc(host(n.open_url)) + ' &rarr;</a>';
      return out;
    }

    if (n.status === 'in_line') {
      var right = (typeof c.waiting === 'number' && c.waiting > FLOOR)
        ? '<span class="count">' + c.waiting + ' <span class="dim">waiting</span></span>'
        : '';
      out += '<div class="status-row"><span class="status-line">In line</span>' + right + '</div>';
      out += '<a class="link js-line" href="#line" data-niche="' + esc(n.slug) + '">Get in line for your city &rarr;</a>';
      if (n.website_offer && n.demo_path) {
        out += '<a class="link" href="' + esc(n.demo_path) + '">See the site your customers would get &rarr;</a>';
      }
      return out;
    }

    out += '<div class="status-row"><span class="status-line">Website only</span>' +
           '<span class="count">$299 <span class="dim">/ $499</span></span></div>';
    if (n.demo_path) {
      out += '<a class="link" href="' + esc(n.demo_path) + '">See the site your customers would get &rarr;</a>';
    }
    return out;
  }

  function entry(n, famName, counts) {
    var cls = 'entry reveal';
    if (n.status === 'open') cls += ' is-open';
    if (n.status === 'website_only') cls += ' is-website';

    return '<article class="' + cls + '" style="--fam:var(--fam-' + esc(n.family) + ')" id="n-' + esc(n.slug) + '">' +
             '<div class="entry-top">' +
               '<span class="cat-no">' + esc(n.catalog_no) + '</span>' +
               '<span class="fam-tag">' + esc(famName) + '</span>' +
             '</div>' +
             '<h3>' + esc(n.name) + '</h3>' +
             '<p class="job">' + esc(n.job_line) + '</p>' +
             (n.caveat ? '<p class="caveat">' + esc(n.caveat) + '</p>' : '') +
             '<div class="entry-foot">' + statusFoot(n, counts) + '</div>' +
           '</article>';
  }

  function catalog(families, niches, counts) {
    return families.map(function (fam) {
      var rows = niches
        .filter(function (n) { return n.family === fam.key; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
      if (!rows.length) return '';

      return '<div class="family" style="--fam:var(--fam-' + esc(fam.key) + ')">' +
               '<div class="plate-head">' +
                 '<span class="plate-no">Plate ' + esc(fam.code) + '</span>' +
                 '<h2 class="plate-title">' + esc(fam.name) + '</h2>' +
               '</div>' +
               '<p class="plate-note">' + esc(fam.note) + '</p>' +
               '<div class="grid">' + rows.map(function (n) { return entry(n, fam.name, counts); }).join('') + '</div>' +
             '</div>';
    }).join('');
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
    nicheSelect: nicheSelect,
    figures: figures,
    numWord: numWord,
    thesisOpen: thesisOpen
  };
}));
