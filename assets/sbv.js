/* ============================================================================
   SYSTEMS BY VEGA — runtime: live catalog overlay + demand registry client
   ----------------------------------------------------------------------------
   No framework, no SDK, no bundle. Talks to PostgREST with fetch, because
   pulling in supabase-js to make three HTTP calls would outweigh every other
   asset on this page combined.

   The catalog is ALREADY IN THE HTML when this file runs — tools/build-catalog.js
   pre-rendered it from the seed. So this script's job is not to draw the page;
   it is to correct the page once live rows and real waiting counts arrive, and
   to wire the form. If every fetch below fails, the visitor still gets a
   complete, readable, accurate catalog. That is the point.

   Markup is produced by SBVRender (assets/catalog-render.js) — the same module
   the build script uses, so the two paths cannot drift.
   ========================================================================= */
(function () {
  'use strict';

  var R    = window.SBVRender;
  var cfg  = window.SBV_CONFIG || {};
  var seed = window.SBV_SEED || { families: [], niches: [] };

  var state = {
    families: seed.families || [],
    niches:   seed.niches   || [],
    counts:   {}
  };

  function el(id) { return document.getElementById(id); }

  var REDUCED = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Ledger figures roll to their value rather than snapping to it. This matters
     more than it sounds: these three numbers change TWICE on a normal load —
     once from the pre-rendered seed and again when live rows land — and a
     figure that silently swaps is a figure nobody trusts they read correctly.
     Rolling makes the correction visible.

     Each node carries its own token so a second call cancels the first
     mid-flight instead of two loops fighting over the same text. */
  var rollToken = 0;
  function roll(node, to) {
    var from = parseInt(String(node.textContent).replace(/\D/g, ''), 10);
    if (isNaN(from)) from = 0;
    if (from === to || REDUCED || !window.requestAnimationFrame) {
      node.textContent = String(to);
      return;
    }
    var mine = ++rollToken;
    node.setAttribute('data-roll', String(mine));
    var t0 = null, dur = 620;
    requestAnimationFrame(function step(ts) {
      if (node.getAttribute('data-roll') !== String(mine)) return;   // superseded
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    });
  }

  function set(id, v) {
    var e = el(id);
    if (!e) return;
    if (/^\d+$/.test(String(v))) { roll(e, parseInt(v, 10)); return; }
    e.textContent = String(v);
  }

  function rest(path, opts) {
    if (!cfg.url || !cfg.key) return Promise.reject(new Error('unconfigured'));
    opts = opts || {};
    var headers = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key };
    if (opts.body) {
      headers['Content-Type'] = 'application/json';
      headers.Prefer = 'return=minimal';
    }
    return fetch(cfg.url + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }

  /* --------------------------------------------------------------- render */
  function paint() {
    if (!R) return;
    var f = R.figures(state.niches);
    set('lg-total', f.total);
    set('lg-open', f.open);
    set('lg-sites', f.sites);
    set('lg-per-city', f.perCity);
    var t = el('thesis-open');
    if (t) t.textContent = R.thesisOpen(f.open);

    /* #catalog-root, NOT #catalog — the latter is the whole <section>, and
       overwriting it would take the heading, the lede and the legend with it. */
    var root = el('catalog-root');
    if (root) {
      root.innerHTML = R.catalog(state.families, state.niches, state.counts, window.SBV_EXTRAS || {});
      wireLineLinks();
      observe();
      /* The repaint just destroyed every card, so anything that decorates a
         card has to be re-run: the active filter, the chip counts, and the
         translation — live rows arrive in English regardless of the language
         the visitor picked. Order matters; translate last so the counts are
         computed off the DOM before its words change. */
      applyFilter(true);
      enhanceCards();
      translate();
      /* The repaint just destroyed every [data-claimed] badge claim.js's
         loadCounts() wrote at boot; re-run it so a fourth real claim does
         not silently lose the catalog's scarcity signal. Guarded: claim.js
         (and therefore window.initClaim) only loads on /sites/. */
      if (window.initClaim && window.initClaim.loadCounts) window.initClaim.loadCounts();
    }
    /* THE LANDING PAGE'S .sgrid IS DELIBERATELY NOT REPAINTED HERE. It is
       build-time markup only, the same posture the hero photograph takes, and
       for a concrete reason rather than an omission: each of its cards leads
       with the DEMO BRAND NAME, which is not an sbv_niches column and never
       will be (see brandLine in catalog-render.js). Those names reach the
       build through SBV_EXTRAS, and `/` does not carry that payload — five
       kilobytes of which the landing grid would use only the brand half.
       Repainting from live rows without it would quietly replace thirty-two
       brand names with thirty-two trade names.

       Nothing is lost by leaving it: the grid shows a screenshot, a brand and
       a trade, and the live overlay carries status, price and waiting counts,
       none of which this card prints. The preview overlay needs nothing from
       here either — its ONE delegated listener on document matches
       .js-preview[data-slug] on whatever is in the DOM at click time. */

    var sel = el('f-niche');
    if (sel) {
      var keep = sel.value;
      sel.innerHTML = R.nicheSelect(state.niches);
      if (keep) sel.value = keep;
    }
  }

  /* ----------------------------------------------------------------- live */
  function loadLive() {
    if (!cfg.url || !cfg.key) return;

    rest('sbv_niches?select=*&is_listed=eq.true&order=sort.asc')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) { if (rows && rows.length) { state.niches = rows; paint(); paintPlatforms(); } })
      .catch(function () { /* the pre-rendered catalog stands */ });

    rest('rpc/sbv_demand_counts')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!rows) return;
        rows.forEach(function (r) { state.counts[r.niche_slug] = r; });
        paint();
      })
      .catch(function () { /* no counts shown; the registry section still reads */ });
  }

  /* ----------------------------------------------------------------- form */
  function wireLineLinks() {
    Array.prototype.forEach.call(document.querySelectorAll('.js-line'), function (a) {
      a.addEventListener('click', function () {
        var sel = el('f-niche');
        if (sel) { sel.value = a.getAttribute('data-niche') || ''; }
        onNicheChange();
      });
    });
  }

  function onNicheChange() {
    var sel = el('f-niche'), warn = el('f-open-warn');
    if (!sel || !warn) return;
    var opt = sel.options[sel.selectedIndex];
    var openUrl = opt && opt.getAttribute('data-open');
    if (openUrl) {
      var h = String(openUrl).replace(/^https?:\/\//, '');
      warn.innerHTML = 'That one is already open, so there is no line to join — ' +
        '<a class="link" href="' + R.esc(openUrl) + '">check your city on ' + R.esc(h) + ' &rarr;</a>';
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }
  }

  function nameOf(slug) {
    var n = state.niches.filter(function (x) { return x.slug === slug; })[0];
    return n ? n.name : slug;
  }

  function wireForm() {
    var form = el('lineForm');
    if (!form) return;
    var out = el('f-out'), btn = el('f-submit'), sel = el('f-niche');
    if (sel) sel.addEventListener('change', onNicheChange);

    function say(msg, isErr) {
      if (!out) return;
      out.className = 'note ' + (isErr ? 'note-err' : 'note-ok');
      out.innerHTML = msg;
      out.hidden = false;
      /* These strings are built here rather than living in the HTML, so they
         arrive in English after the page has already been translated. */
      translate();
    }
    function reset() { btn.disabled = false; btn.textContent = 'Get in line'; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (el('f-hp') && el('f-hp').value) return;          // honeypot

      var niche = (el('f-niche') || {}).value;
      var city  = ((el('f-city')  || {}).value || '').trim();
      var st    = (el('f-state')  || {}).value;
      var email = ((el('f-email') || {}).value || '').trim();
      var name  = ((el('f-name')  || {}).value || '').trim();

      if (!niche || !city || !st || !email) {
        say('Pick a business, then give a city, a state, and an email.', true);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Recording…';

      /* Posted to our own function rather than straight to PostgREST, because
         the confirmation email needs a key that must not exist in this file.
         The function still writes with the publishable key, so RLS remains the
         control on the table. */
      fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche_slug: niche,
          email: email,
          city: city,
          state: st,
          full_name: name || null,
          source: 'catalog',
          company_website: (el('f-hp') || {}).value || ''
        })
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, d: d || {} }; });
      }).then(function (out) {
        if (out.d.duplicate) {
          say(R.esc(out.d.message || 'You are already in line for that one in that city.'), false);
          reset();
          return;
        }
        if (out.d.ok) {
          form.style.display = 'none';
          var msg = 'You are in line for <b>' + R.esc(nameOf(niche)) + '</b> in ' +
                    R.esc(city) + ', ' + R.esc(st) + '. Nothing has been charged and there is ' +
                    'nothing to cancel. If it gets built, you get the first offer on your city ' +
                    'before it is listed publicly.';
          /* The row is what matters. If the confirmation did not go out, say so
             rather than letting someone wait for an email that is not coming. */
          if (out.d.emailed === false) {
            msg += '<br><br>The confirmation email did not send, but you are recorded. ' +
                   'No need to do anything.';
          }
          say(msg, false);
          return;
        }
        throw new Error(out.d.error || ('http ' + out.status));
      }).catch(function () {
        /* Telling someone they are on a list they are not on is worse than
           telling them it did not work. */
        say('That did not save, so you are <b>not</b> on the list. This is at our end, not ' +
            'yours — try again in a moment, or email info@kingdom-creatives.com and I will ' +
            'add you by hand.', true);
        reset();
      });
    });
  }

  /* ------------------------------------------------------------- trimmings */
  function wireFaq() {
    Array.prototype.forEach.call(document.querySelectorAll('.qa button'), function (b) {
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var open = b.parentElement.classList.toggle('open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  function observe() {
    /* Turn the animation on only once we are certain we can turn it off
       again. Everything is visible until this line runs. */
    if (!('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: .08 });
    Array.prototype.forEach.call(document.querySelectorAll('.reveal:not(.in)'), function (e) { io.observe(e); });
  }

  /* The closing band carries the page's one animated gradient. It is a
     transform/opacity keyframe on .cta-glow, which means a compositor layer
     that stays awake for as long as the declaration matches — and on a phone
     that is battery spent on a band below the fold.

     So the animation is bound to .is-lit and this toggles it from the band's
     own intersection. Deliberately NOT the .reveal observer: that one
     unobserves on first sight, because a reveal is a one-way trip. This one
     has to keep both directions for the life of the page, so it is its own
     observer and it never unobserves.

     threshold 0 with a 120px margin: start the drift just before the band
     edges into view so it is already moving when it arrives, and stop it as
     soon as the last pixel leaves. No REDUCED check here — the reduced-motion
     rule in sbv.css already answers this class with animation:none, and
     leaving the decision in CSS means a visitor who changes the system setting
     mid-session gets the new answer without a reload. */
  function wireGlow() {
    var band = document.querySelector('.cta-close');
    if (!band || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) band.classList.add('is-lit');
        else                  band.classList.remove('is-lit');
      });
    }, { threshold: 0, rootMargin: '120px 0px' }).observe(band);
  }

  /* ------------------------------------------------------------- language */
  /* i18n.js owns the dictionary and the walk; this is only the hook the
     repaint needs. Guarded because the page has to work if that file 404s. */
  function translate() {
    if (window.SBVi18n) window.SBVi18n.apply();
  }

  /* --------------------------------------------------------------- filter */
  /* Twenty-nine plates is a wall. Four chips turn it into four short boards.

     The filter is a single class name compared against the class the renderer
     already puts on every card — is-open / is-in-line / is-website-only — so
     nothing had to be added to catalog-render.js and the two paths cannot
     drift. State lives in this closure, not on the DOM, which is what lets it
     survive paint() wiping #catalog-root out from under it. */
  var filter = '';

  function applyFilter(quiet) {
    var root = el('catalog-root');
    var bar  = el('filterbar');
    if (!root) return;

    var cards = root.querySelectorAll('.entry.sheet');
    if (!cards.length) return;

    var shown = 0;
    Array.prototype.forEach.call(cards, function (card) {
      var on = !filter || card.classList.contains(filter);
      card.hidden = !on;
      card.classList.remove('re-pin');
      if (!on) return;
      if (!quiet && !REDUCED) {
        /* Staggered so the surviving plates get re-pinned in a sweep rather
           than all flinching at once. Capped, or a wide filter would ripple
           for a second and a half. */
        card.style.setProperty('--rp', Math.min(shown * 22, 260) + 'ms');
        card.classList.add('re-pin');
      }
      shown++;
    });

    /* A family heading with no plates under it reads as a loading failure. */
    Array.prototype.forEach.call(root.querySelectorAll('.family'), function (fam) {
      fam.hidden = !fam.querySelector('.entry.sheet:not([hidden])');
    });

    if (!quiet && !REDUCED) {
      setTimeout(function () {
        Array.prototype.forEach.call(cards, function (c) { c.classList.remove('re-pin'); });
      }, 560);
    }

    /* Chip counts, recomputed from the DOM rather than from state, so they
       cannot disagree with what is actually on the board. */
    if (bar) {
      Array.prototype.forEach.call(bar.querySelectorAll('[data-count]'), function (b) {
        var k = b.getAttribute('data-count');
        b.textContent = String(k ? root.querySelectorAll('.entry.sheet.' + k).length : cards.length);
      });
      Array.prototype.forEach.call(bar.querySelectorAll('.chip'), function (c) {
        c.setAttribute('aria-pressed', c.getAttribute('data-filter') === filter ? 'true' : 'false');
      });
      var n = el('fc-n'), t = el('fc-t');
      if (n) n.textContent = String(shown);
      if (t) t.textContent = String(cards.length);
      bar.hidden = false;      /* only now: the chips do nothing without JS */
    }

    var empty = el('filter-empty');
    if (empty) empty.hidden = shown > 0;
  }

  function wireFilters() {
    var bar = el('filterbar');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.chip') : null;
      if (!chip) return;
      var next = chip.getAttribute('data-filter') || '';
      if (next === filter) return;
      filter = next;
      applyFilter(false);
    });
  }

  /* ----------------------------------------------------------- hero board */
  /* One tile per listed business, in its family's paper colour, the open ones
     pinned in green. Built from state.niches — the same array the ledger bar
     counts — so the picture and the figures printed under it cannot disagree.

     Decorative and aria-hidden. It is generated rather than authored because
     twenty-nine hand-written rects would be a second place the catalog is
     written down, and that is exactly the drift this codebase avoids. */
  var PAPER = {
    'sale-resale':   '#FFCE3B',
    'haul-clear':    '#DCC29A',
    'curb-exterior': '#AEDCC4',
    'auto':          '#B4C9E2',
    'home-trade':    '#F2C6C0',
    'people-pets':   '#E6DFA8'
  };

  function heroBoard() {
    var host = el('hero-board');
    if (!host || !state.niches.length) return;
    if (window.matchMedia && window.matchMedia('(max-width: 979px)').matches) return;

    /* A fixed sequence, not Math.random: the board should look the same on
       every load and on every machine, or it is not a design. */
    var seed = 20250820;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

    var COLS = 10, CW = 122, CH = 128, TW = 74, TH = 56;
    var rows = Math.ceil(state.niches.length / COLS);
    var W = COLS * CW, H = rows * CH + 36;

    var parts = [];
    state.niches.forEach(function (n, i) {
      var c = i % COLS, r = Math.floor(i / COLS);
      /* Generous jitter on purpose. On a strict grid twenty-nine rectangles
         read as a UI pattern; off the grid they read as paper somebody pinned
         up one sheet at a time, which is the whole idea of the page. */
      var x = c * CW + 22 + (rnd() * 26 - 13);
      var y = r * CH + 26 + (rnd() * 22 - 11);
      var rot = (rnd() * 9 - 4.5).toFixed(2);
      var fill = PAPER[n.family] || '#DCC29A';
      var open = n.status === 'open';
      /* Paper, not grey: the family colour has to survive being laid over a
         near-black band, and under about a third opacity it does not. */
      var face = open ? '.62' : '.34';
      var line = open ? '.40' : '.20';

      parts.push(
        '<g transform="rotate(' + rot + ' ' + (x + TW / 2) + ' ' + y + ')">' +
          '<g class="board-tile" style="--d:' + (0.25 + i * 0.032).toFixed(3) + 's">' +
            '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + TW + '" height="' + TH +
              '" rx="3" fill="' + fill + '" opacity="' + face + '"/>' +
            '<rect x="' + (x + 9).toFixed(1) + '" y="' + (y + 15).toFixed(1) + '" width="' + (TW - 30) +
              '" height="3.5" rx="1.8" fill="#16130E" opacity="' + line + '"/>' +
            '<rect x="' + (x + 9).toFixed(1) + '" y="' + (y + 26).toFixed(1) + '" width="' + (TW - 19) +
              '" height="3.5" rx="1.8" fill="#16130E" opacity="' + (open ? '.28' : '.13') + '"/>' +
            '<rect x="' + (x + 9).toFixed(1) + '" y="' + (y + 37).toFixed(1) + '" width="' + (TW - 40) +
              '" height="3.5" rx="1.8" fill="#16130E" opacity="' + (open ? '.28' : '.13') + '"/>' +
            '<circle cx="' + (x + TW / 2).toFixed(1) + '" cy="' + (y + 2).toFixed(1) + '" r="3.6" fill="' +
              (open ? '#2FBF6B' : '#D9A962')   /* --con-amber; keep in step with sbv.css */ + '" opacity="' + (open ? '1' : '.5') + '"/>' +
          '</g>' +
        '</g>'
      );
    });

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" ' +
        'width="100%" height="100%" focusable="false" style="opacity:.5">' +
        parts.join('') +
      '</svg>';
  }

  /* ----------------------------------------------------------- scroll rail */
  function wireRail() {
    var fill = el('rail-fill');
    if (!fill) return;
    var queued = false;
    function paintRail() {
      queued = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.pageYOffset / h)) : 0;
      fill.style.setProperty('--p', p.toFixed(4));
    }
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || setTimeout)(paintRail);
    }, { passive: true });
    window.addEventListener('resize', paintRail, { passive: true });
    paintRail();
  }

  /* ------------------------------------------------------------- exit card */
  /* The rules that keep this from being the thing everybody hates:
       - desktop only; there is no honest mouse-leave signal on a touch screen
       - once per SESSION, not once per visit-ever, and never twice
       - armed only after twenty seconds, so it cannot fire on a bounce
       - only on an exit toward the tab bar, not on a mouse crossing any edge
       - Escape closes it, the backdrop closes it, and focus is returned
     It offers the thing that is already free on this page and says so. */
  function wireExit() {
    var box = el('exit');
    if (!box || !box.querySelector) return;
    if (!window.matchMedia || !window.matchMedia('(min-width: 821px)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    try { if (sessionStorage.getItem('sbv.exit')) return; } catch (e) { return; }

    var card = box.querySelector('.exit-card');
    /* `shown` is the once-per-PAGELOAD latch, and it is the fix for "it keeps
       popping up". sessionStorage is only read once, when wireExit runs, so it
       cannot stop a second open within the same pageload. close() puts
       data-open back to '0', which was the only other thing open() checked —
       so every later exit gesture reopened the card, including right after
       the visitor pressed "Keep browsing". */
    var armed = false, shown = false, last = null;
    setTimeout(function () { armed = true; }, 20000);

    function focusables() {
      return card.querySelectorAll('a[href],button:not([disabled])');
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) { close(); return; }
      if (e.key !== 'Tab' && e.keyCode !== 9) return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }

    function open() {
      if (shown || !armed || box.getAttribute('data-open') === '1') return;
      shown = true;
      document.removeEventListener('mouseout', onOut);
      try { sessionStorage.setItem('sbv.exit', '1'); } catch (e) { /* ignore */ }
      last = document.activeElement;
      box.hidden = false;
      void box.offsetHeight;                 /* so the transition has a start */
      box.setAttribute('data-open', '1');
      var f = focusables();
      if (f.length) f[f.length - 1].focus(); /* "Keep browsing", not the CTA */
      document.addEventListener('keydown', onKey);
    }

    function close() {
      if (box.getAttribute('data-open') !== '1') return;
      box.setAttribute('data-open', '0');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { box.hidden = true; }, 240);
      if (last && last.focus) last.focus();
    }

    /* relatedTarget null on a mouseout means the pointer left the document
       entirely; clientY near zero means it left upward, toward the tab bar. */
    function onOut(e) {
      if (e.relatedTarget) return;
      if (e.clientY > 6) return;
      open();
    }
    document.addEventListener('mouseout', onOut);

    box.addEventListener('click', function (e) {
      if (e.target === box) close();                        /* backdrop */
    });
    var no = el('exit-no'), x = el('exit-close'), go = el('exit-go');
    if (no) no.addEventListener('click', close);
    if (x)  x.addEventListener('click', close);
    if (go) go.addEventListener('click', close);            /* the href still runs */
  }

  /* ---------------------------------------------------------- plate modal */
  /* WHERE THE CONTENT COMES FROM, and why it matters.

     Every word in the modal is either read off the card that opened it, or
     chosen by that card's status from a fixed set of sentences that are
     already true elsewhere on this page. Nothing is authored per business.

     That is a deliberate constraint, not a shortcut. catalog-render.js already
     warns that any field the markup reads must exist on the rows sbv_niches
     returns, or it renders once and vanishes when the live overlay lands. A
     modal with its own per-niche prose would need twenty-nine new rows of copy
     in the database, and every sentence of it would be a fresh claim about a
     business. Deriving instead means the modal cannot drift from the card and
     cannot say anything the catalog does not already say.

     Display text comes from the DOM; urls and prices come from state, which is
     the same array that rendered the DOM. */

  var STATUS_COPY = {
    'is-open': {
      get:  'The site, the documents, the training, the tools. You operate under your own ' +
            'business name and keep what you collect.',
      terr: 'One operator per city. Your cities are written to the registry, and the ' +
            'availability checker reads that row before anyone else can pay for them.',
      fine: 'Not a franchise. No royalty, no franchise fee, and no control over how you operate.'
    },
    'is-in-line': {
      get:  'Nothing yet — this one is not built. What exists today is the line, and this ' +
            'is the honest answer rather than a date.',
      terr: 'One operator per city, once it exists. Getting in line records that you want ' +
            'this business in your city. It is not a reservation and it does not hold anything.',
      price:'No price yet. Nothing is charged and there is nothing to cancel.',
      fine: 'If it gets built, you get the first offer on your city before it is listed publicly.'
    },
    'is-website-only': {
      get:  'The site white-labelled to your business name, colours and contact details. ' +
            'Domain connected, lead form to your inbox, owner admin panel, setup guide.',
      terr: 'One operator per city. The business category and city you claim at checkout ' +
            'are written to the registry, and are yours for as long as your account is active.',
      price:'$99 one-time',
      fine: 'Licensed trades and chair-based work still need their own licence. A territory ' +
            'decides who else we sell to, not who is allowed to work in your town.'
    }
  };

  var modalCard = null;      /* the .entry.sheet the modal was opened from */
  var modalLast = null;      /* focus to restore on close */

  function txt(root, sel) {
    var e = root.querySelector(sel);
    return e ? e.textContent.trim() : '';
  }

  function row(key, val) {
    return '<div class="nm-row"><span class="nm-k">' + key + '</span>' +
           '<div class="nm-v">' + val + '</div></div>';
  }

  function statusOf(card) {
    if (card.classList.contains('is-open')) return 'is-open';
    if (card.classList.contains('is-in-line')) return 'is-in-line';
    return 'is-website-only';
  }

  function fillModal(card) {
    var slug = String(card.id || '').replace(/^n-/, '');
    var n    = state.niches.filter(function (x) { return x.slug === slug; })[0] || {};
    var st   = statusOf(card);
    var copy = STATUS_COPY[st];
    var fam  = state.families.filter(function (f) { return f.key === card.getAttribute('data-fam'); })[0] || {};
    var box  = el('nm-card');

    /* The family colour has exactly one definition on this page — the --fam
       custom property the renderer sets on .family, resolved from the :root
       palette. Rather than repeat it for the modal, read what the card
       actually computed to and hand the modal that.

       This used to copy --pa/--pb, the two stops of the notepad paper
       gradient. There is no paper now; --fam is what the card spends its
       family colour on (the dot in .card-meta) and what the modal spends it
       on (the rail down its left edge and the dot beside the family name). */
    var cs = getComputedStyle(card);
    box.style.setProperty('--fam', cs.getPropertyValue('--fam').trim() || 'var(--acc)');

    el('nm-code').textContent = txt(card, '.code');
    var tokSrc = card.querySelector('.tok');
    var tok = el('nm-tok');
    tok.className = tokSrc ? tokSrc.className : 'tok';
    tok.textContent = tokSrc ? tokSrc.textContent.trim() : '';

    el('nm-title').textContent = txt(card, 'h3');
    el('nm-fam').textContent   = fam.name || '';
    el('nm-note').textContent  = fam.note || '';

    var rows = row('The job', R.esc(txt(card, '.job')));

    var cav = txt(card, '.caveat');
    if (cav) rows += '<div class="nm-caveat">' + R.esc(cav) + '</div>';

    rows += row('What you get', copy.get);

    /* The feature chips. They were printed on the card until the board was
       rebuilt on clean cards, where at a 241px column they wrapped to four
       lines and were the largest single source of height variance in a row.
       They describe the demo ARTIFACT rather than the commercial state — see
       the note on extras in assets/catalog-render.js — which is why they come
       from SBV_EXTRAS and not from the row, and why the live overlay still
       has them after the database replaces state.niches. */
    var chips = R.chips(n.slug ? n : { slug: slug }, window.SBV_EXTRAS || {});
    if (chips.length) {
      rows += row('What this template ships with',
        '<span class="nm-chips">' + chips.map(function (c) {
          return '<span class="chip-sm">' + R.esc(c) + '</span>';
        }).join('') + '</span>');
    }
    rows += row('Territory', copy.terr);
    rows += row('Price', R.esc(copy.price || n.price_label || ''));

    /* Only ever shown above the floor the renderer already enforces, and in the
       renderer's own words, so the modal and the card cannot disagree. */
    var c = state.counts[slug];
    if (c && typeof c.waiting === 'number' && c.waiting > R.FLOOR) {
      rows += row('In line', '<b>' + c.waiting + '</b> in line');
    }

    el('nm-rows').innerHTML = rows;

    /* ------------------------------------------------------------ actions */
    var foot = '';
    if (st === 'is-open' && n.open_url) {
      var host = String(n.open_url).replace(/^https?:\/\//, '').replace(/\/$/, '');
      foot += '<a class="btn btn-pri" href="' + R.esc(n.open_url) + '">' +
              'Check it out on ' + R.esc(host) + '&nbsp;&rarr;</a>';
    } else if (st === 'is-in-line') {
      foot += '<button type="button" class="btn btn-pri" id="nm-line" data-niche="' +
              R.esc(slug) + '">Claim a spot</button>';
      if (n.website_offer && n.demo_path) {
        foot += '<a class="btn btn-ghost" href="' + R.esc(n.demo_path) + '">See the demo</a>';
      }
    } else if (n.demo_path) {
      foot += '<a class="btn btn-pri" href="' + R.esc(n.demo_path) + '">' +
              'See the demo&nbsp;&rarr;</a>';
    }
    el('nm-foot').innerHTML = foot + '<p class="nm-fine">' + copy.fine + '</p>';

    var line = el('nm-line');
    if (line) {
      line.addEventListener('click', function () {
        var sel = el('f-niche');
        if (sel) { sel.value = slug; onNicheChange(); }
        closeModal();
        var target = el('line');
        if (target) target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      });
    }

    /* The boilerplate above was just injected in English. If a translation is
       active it has to be applied to it before anyone sees it. */
    translate();
  }

  function nmFocusables() {
    return el('nm-card').querySelectorAll('a[href],button:not([disabled])');
  }

  function nmKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) { closeModal(); return; }
    if (e.key !== 'Tab' && e.keyCode !== 9) return;
    var f = nmFocusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openModal(card) {
    var box = el('nm'), inner = el('nm-card');
    if (!box || !inner || !R) return;

    modalCard = card;
    modalLast = document.activeElement;
    fillModal(card);

    box.hidden = false;
    void box.offsetHeight;
    box.setAttribute('data-open', '1');
    document.body.style.overflow = 'hidden';      /* the page must not scroll behind it */

    /* The plate is unpinned from the board and enlarged: the modal starts at
       the exact position and size of the card that was clicked, then travels to
       its own place. Measuring both rects and animating the difference is the
       only way to make the two feel like the same object. */
    if (!REDUCED && inner.animate) {
      var from = card.getBoundingClientRect();
      var to   = inner.getBoundingClientRect();
      var s    = Math.max(0.2, from.width / to.width);
      var dx   = (from.left + from.width / 2) - (to.left + to.width / 2);
      var dy   = (from.top + from.height / 2) - (to.top + to.height / 2);
      inner.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0.35 },
        { transform: 'translate(0,0) scale(1)', opacity: 1 }
      ], { duration: 360, easing: 'cubic-bezier(.2,.85,.3,1.03)' });
    }

    var f = nmFocusables();
    if (f.length) f[0].focus();
    document.addEventListener('keydown', nmKey);
  }

  function closeModal() {
    var box = el('nm'), inner = el('nm-card');
    if (!box || box.getAttribute('data-open') !== '1') return;

    /* Back to the plate it came from, if that plate is still on the board —
       a filter change while the modal was open can have removed it. */
    if (!REDUCED && inner.animate && modalCard && !modalCard.hidden) {
      var from = modalCard.getBoundingClientRect();
      var to   = inner.getBoundingClientRect();
      if (from.width) {
        var s  = Math.max(0.2, from.width / to.width);
        var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        inner.animate([
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0 }
        ], { duration: 240, easing: 'cubic-bezier(.4,0,.7,.3)' });
      }
    }

    box.setAttribute('data-open', '0');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', nmKey);
    setTimeout(function () { box.hidden = true; }, 240);
    if (modalLast && modalLast.focus) modalLast.focus();
    modalCard = null;
  }

  /* Promote every plate into something that opens. Done here rather than in
     catalog-render.js because with JavaScript off there is no modal to open,
     and a control that does nothing is worse than no control. The <h3> becomes
     a real button so the keyboard and a screen reader get a labelled target;
     the card surface handles the mouse. The existing text NODE is moved rather
     than re-created, so the language layer's record of its English original
     survives the promotion. */
  function enhanceCards() {
    var root = el('catalog-root');
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.entry.sheet'), function (card) {
      if (card.classList.contains('is-clickable')) return;
      var h3 = card.querySelector('h3');
      if (h3 && !h3.querySelector('.card-open')) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'card-open';
        while (h3.firstChild) b.appendChild(h3.firstChild);
        h3.appendChild(b);
      }
      card.classList.add('is-clickable');
    });
  }

  function wireModal() {
    var box = el('nm');
    if (!box) return;

    /* One delegated listener on the catalog, so the repaint cannot orphan it. */
    var root = el('catalog-root');
    if (root) {
      root.addEventListener('click', function (e) {
        if (!e.target.closest) return;
        /* Links and buttons keep their own behaviour — the guard used to
           check only `a`, so the claim CTA (a <button class="card-go
           claim-btn">, catalog-render.js's claimBtn()) fell through, this
           listener opened the niche-detail modal underneath it, and the
           click kept bubbling to claim.js's own document-level listener,
           which opened the claim modal on top — two dialogs from one click.

           The one interactive element this must NOT swallow is
           button.card-open — the h3 button enhanceCards() creates purely so
           keyboard and screen-reader users have a labelled target for THIS
           modal. It carries no click handler of its own; it depends entirely
           on bubbling to this listener. Excluding it the same as claim-btn
           would silently break the accessible way to open the modal (and
           mouse clicks that land on the card title), so it is named back in
           rather than folded into the blanket "a, button" exclusion. No
           other control inside a card was found that needs the same
           carve-out — the claim button is the only other in-card control
           with independent behaviour today. */
        var ctrl = e.target.closest('a, button');
        if (ctrl && !ctrl.classList.contains('card-open')) return;
        var card = e.target.closest('.entry.sheet');
        if (!card) return;
        e.preventDefault();
        openModal(card);
      });
    }

    box.addEventListener('click', function (e) { if (e.target === box) closeModal(); });
    var x = el('nm-close');
    if (x) x.addEventListener('click', closeModal);
  }

  /* ------------------------------------------------------------ gnav */
  /* The drawer is display:none until data-open, so nothing inside it is
     focusable while closed and no focus trap is needed for the closed
     state. Open traps, Esc closes, and focus returns to the burger —
     the same contract wireExit() already uses for the exit card. */
  function wireNav() {
    var burger = el('gnav-burger'), drawer = el('gnav-drawer');
    if (!burger || !drawer) return;

    function close() {
      drawer.removeAttribute('data-open');
      drawer.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey);
      burger.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      var f = drawer.querySelectorAll('a[href],button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    burger.addEventListener('click', function () {
      if (drawer.getAttribute('data-open') === '1') return close();
      drawer.hidden = false;
      drawer.setAttribute('data-open', '1');
      burger.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKey);
      var f = drawer.querySelector('a[href]');
      if (f) f.focus();
    });
    /* A resize past the breakpoint must not leave a hidden drawer open. */
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900 && drawer.getAttribute('data-open') === '1') close();
    });
  }

    /* ------------------------------------------------------- preview overlay */
  /* THE DEMO, SHOWN IN PLACE. Clicking any .js-preview[data-slug] opens that
     niche's live demo in a full-screen iframe under a slim bar. Escape closes,
     body scroll locks, Back closes, and /?preview=<slug> opens it on load.

     ONE DELEGATED LISTENER ON document, not a handler per trigger. The hero
     button is the only trigger today; the sites grid on / and the cards on
     /sites/ add many more, and those are REPAINTED by the live database
     overlay in loadLive(). A listener bound to the nodes themselves would be
     thrown away with the nodes it was bound to. Delegation survives that, and
     costs one listener no matter how many triggers ship later.

     THE SLUG IS NEVER TRUSTED AND NEVER CONCATENATED. ?preview= is whatever a
     stranger put in a link, and it ends up in an iframe src. So it is used as
     a LOOKUP KEY against the seed inlined by BUILD:SEED_SCRIPT and nothing
     else: the src that is actually set is the seed row's own demo_path. An
     unknown slug, a path traversal, a javascript: URL — none of them resolve
     to a row, so none of them reach the frame. hasOwnProperty guards the
     lookup so that "constructor" and friends are not rows either.

     THE MARKUP IS BUILT HERE, not shipped in index.html. With JavaScript off a
     deep link has to render a perfectly normal page, and the surest way to
     guarantee that is for the overlay to not exist until something opens it.

     ANALYTICS ARE ALREADY HANDLED: every demo page guards its Vercel tag on
     window.self !== window.top, so a demo viewed in this frame is not counted
     twice. Nothing here re-solves that, and the guard stays. */
  function wirePreview() {
    /* The seed IS the allow-list. Without it there is nothing to validate a
       slug against, so nothing may be opened — including by deep link. */
    var demos = {}, any = false;
    var rows = seed.niches || [];
    for (var r = 0; r < rows.length; r++) {
      if (rows[r] && rows[r].slug && rows[r].demo_path) { demos[rows[r].slug] = rows[r]; any = true; }
    }
    if (!any) return;

    var box = null, frame = null, tabLink = null, closeBtn = null, loadMsg = null;
    var lastFocus = null, openSlug = '', pushed = false, loadTimer = null;
    var scrollY = 0, priorStyle = null;

    function resolve(slug) {
      if (!slug || typeof slug !== 'string') return null;
      return Object.prototype.hasOwnProperty.call(demos, slug) ? demos[slug] : null;
    }

    /* Read ?preview= without URLSearchParams — one regex, and a malformed
       escape returns empty instead of throwing out of decodeURIComponent,
       which is exactly what /?preview=%E0%A4%A would otherwise do. */
    function fromQuery() {
      var m = /[?&]preview=([^&#]*)/.exec(location.search || '');
      if (!m) return '';
      try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return ''; }
    }

    /* ---------------------------------------------------------- scroll lock
       overflow:hidden on <body> is NOT enough on iOS Safari — the page keeps
       scrolling under a fixed overlay, and momentum from touch-scrolling the
       frame is handed to the document behind it. What does work there is
       taking the body out of flow at its current offset: position:fixed with
       top:-scrollY, restored to the same pixel on close. overscroll-behavior
       on .pv stops the chaining; this stops the page moving at all.

       Inline styles are saved and put back rather than cleared, so this cannot
       trample whatever else set them — closeModal() writes body.style.overflow
       for the niche modal. */
    function lockScroll() {
      var b = document.body;
      scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      priorStyle = {
        position: b.style.position, top: b.style.top, left: b.style.left,
        right: b.style.right, width: b.style.width, overflow: b.style.overflow
      };
      b.style.position = 'fixed';
      b.style.top = (-scrollY) + 'px';
      b.style.left = '0';
      b.style.right = '0';
      b.style.width = '100%';
      b.style.overflow = 'hidden';
    }
    function unlockScroll() {
      if (!priorStyle) return;
      var b = document.body;
      b.style.position = priorStyle.position;
      b.style.top      = priorStyle.top;
      b.style.left     = priorStyle.left;
      b.style.right    = priorStyle.right;
      b.style.width    = priorStyle.width;
      b.style.overflow = priorStyle.overflow;
      priorStyle = null;
      /* Instant, not smooth. html carries scroll-behavior:smooth, so the plain
         two-argument form animates the restore — the page visibly scrolls
         itself back up after the overlay closes, which reads as a bug. */
      try { window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' }); }
      catch (e) { window.scrollTo(0, scrollY); }
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) { e.preventDefault(); close(false); }
      /* Tab is deliberately NOT trapped here. The frame is a whole other
         document, and the half of the tabbing that happens inside it is
         invisible to this handler. The .pv-edge sentinels hold the boundary
         instead — they catch focus on its way out of either end. */
    }

    function onFrameLoad() {
      if (!box) return;
      box.setAttribute('data-loaded', '1');
      if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
      /* The demo is same-origin, so its keydowns never bubble out to us but we
         are allowed to listen inside it. Without this, Escape stops working
         the moment anyone clicks into the demo — the one moment they are most
         likely to reach for it. */
      try {
        var d = frame.contentDocument;
        if (d) d.addEventListener('keydown', onKey);
      } catch (e) {}
    }

    function build() {
      if (box) return;
      box = document.createElement('div');
      box.className = 'pv';
      box.id = 'pv';
      box.hidden = true;
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Live demo preview');
      box.innerHTML =
        '<span class="pv-edge" tabindex="0"></span>' +
        '<div class="pv-bar">' +
          '<p class="pv-note"><b>Demo</b> — built on Systems by Vega ' +
            '<span class="pv-dot">·</span> this site is for sale</p>' +
          '<div class="pv-acts">' +
            '<a class="pv-act" id="pv-tab" href="/sites/" target="_blank" rel="noopener" ' +
              'aria-label="Open this demo in a new tab">' +
              '<span class="pv-wide">Open in new tab</span> ↗</a>' +
            '<button type="button" class="pv-act" id="pv-close" aria-label="Close preview">' +
              '<span class="pv-wide">Close preview</span> ×</button>' +
          '</div>' +
        '</div>' +
        '<div class="pv-stage"><p class="pv-load">Loading the demo…</p></div>' +
        '<span class="pv-edge" tabindex="0"></span>';
      document.body.appendChild(box);

      tabLink  = box.querySelector('#pv-tab');
      closeBtn = box.querySelector('#pv-close');
      loadMsg  = box.querySelector('.pv-load');
      newFrame();

      closeBtn.addEventListener('click', function () { close(false); });

      /* Focus that walks off either end of the overlay lands on a sentinel and
         is bounced back inside, so it can never reach the page behind — the
         part a keydown trap cannot do once focus is inside the frame. */
      var edges = box.querySelectorAll('.pv-edge');
      edges[0].addEventListener('focus', function () { closeBtn.focus(); });
      edges[1].addEventListener('focus', function () { tabLink.focus(); });
    }

    /* A FRESH IFRAME EVERY TIME, and this is not fussiness. src='' re-requests
       the current page in some browsers and about:blank leaves a live browsing
       context behind; replacing the ELEMENT destroys the demo's document
       outright — scripts, timers, rotators, fetches and all. It also keeps the
       demo's own navigations out of the session history, because the first
       navigation of a brand-new browsing context replaces rather than pushes,
       so Back stays ours to handle. */
    function newFrame() {
      var stage = box.querySelector('.pv-stage');
      var next = document.createElement('iframe');
      next.className = 'pv-frame';
      next.id = 'pv-frame';
      next.setAttribute('title', 'Live demo');
      next.addEventListener('load', onFrameLoad);
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      stage.appendChild(next);
      frame = next;
    }

    function isOpen() { return !!box && box.getAttribute('data-open') === '1'; }

    function open(slug, viaHistory, trigger) {
      var row = resolve(slug);
      if (!row) return false;                 /* refused: not a slug we ship */
      build();
      if (isOpen() && openSlug === slug) return true;
      if (isOpen()) newFrame();               /* swapping demos: drop the old one first */

      openSlug = slug;
      lastFocus = trigger || document.activeElement;

      var label = row.name || slug;
      frame.setAttribute('title', label + ' — live demo');
      tabLink.setAttribute('href', row.demo_path);
      box.removeAttribute('data-loaded');
      loadMsg.textContent = 'Loading the ' + label + ' demo…';
      /* The seed row's own path. Not the query value, not a concatenation. */
      frame.setAttribute('src', row.demo_path);

      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = setTimeout(function () {
        if (box.getAttribute('data-loaded') === '1') return;
        loadMsg.textContent = 'This demo is taking longer than usual. Open it in a new '
          + 'tab, or close the preview — the bar above does both.';
      }, 8000);

      box.hidden = false;
      void box.offsetHeight;                  /* give the fade a frame to start from */
      box.setAttribute('data-open', '1');
      lockScroll();
      document.addEventListener('keydown', onKey);
      closeBtn.focus();

      /* Back closes the overlay instead of leaving the site. viaHistory means
         the browser already moved us here, so pushing again would stack a
         second entry on the same URL. */
      pushed = false;
      if (!viaHistory && window.history && history.pushState) {
        try {
          history.pushState({ sbvPreview: slug }, '',
            location.pathname + '?preview=' + encodeURIComponent(slug) + location.hash);
          pushed = true;
        } catch (e) {}
      }
      return true;
    }

    function close(viaHistory) {
      if (!isOpen()) return;
      box.setAttribute('data-open', '0');
      document.removeEventListener('keydown', onKey);
      if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }

      /* THE LINE THAT MATTERS. An overlay that only hides itself leaves a whole
         demo site running for the rest of the session — its timers, its own
         rotator, its fetches — invisible on screen and obvious in a profiler.
         The frame is destroyed, not hidden. */
      newFrame();
      box.removeAttribute('data-loaded');
      openSlug = '';

      /* preventScroll, and BEFORE the unlock. focus() scrolls its element into
         view, and doing that after the restore threw the visitor back to
         wherever the trigger happens to sit — measured: closing from 400px
         down the page landed at 0, because the hero button is at the top. */
      if (lastFocus && lastFocus.focus) {
        try { lastFocus.focus({ preventScroll: true }); } catch (e) { lastFocus.focus(); }
      }
      lastFocus = null;
      unlockScroll();
      setTimeout(function () { if (!isOpen()) box.hidden = true; }, 220);

      if (viaHistory) { pushed = false; return; }
      if (pushed) { pushed = false; history.back(); return; }
      /* Open from a URL we did not push (the deep-link path below normally
         converts that into a push). Strip the parameter in place so a reload
         does not re-open, without leaving a dead entry behind. */
      if (window.history && history.replaceState && /[?&]preview=/.test(location.search)) {
        try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      }
    }

    /* One listener, every trigger, now and later. */
    document.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      var t = e.target && e.target.closest ? e.target.closest('.js-preview[data-slug]') : null;
      if (!t) return;
      var slug = t.getAttribute('data-slug');
      /* No fallback, and none needed: every .js-preview on every page now
         ships a real slug in its markup. The hero's used to ship EMPTY and be
         filled in by rotator() from the frame on screen — R14 deleted the
         rotator, and R.heroDemoBtn() emits the slug at build time instead. */
      if (!resolve(slug)) return;   /* not ours — leave the element's own behaviour alone */
      e.preventDefault();
      open(slug, false, t);
    });

    /* Back/forward. Back out of an open preview closes it; Forward into one
       re-opens it, because the URL is the state and it has to mean the same
       thing whichever direction it was reached from. */
    window.addEventListener('popstate', function () {
      var slug = fromQuery();
      if (resolve(slug)) { open(slug, true, null); return; }
      close(true);
    });

    /* Deep link. A preview URL is often the FIRST entry in the history, and
       closing from there would have nowhere to go back to — so the bare page
       is written into that entry first and the preview pushed on top of it.
       Back then closes the overlay here exactly as it does everywhere else,
       instead of leaving the site. */
    var initial = fromQuery();
    if (resolve(initial)) {
      if (window.history && history.replaceState) {
        try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      }
      open(initial, false, null);
    }
  }

/* ------------------------------------------------------------ platforms */
  /* /platforms/ AND the landing page — both carry #platforms-root, so both
     get hydrated here; a no-op on the four pages that do not, which return
     before touching the DOM (Ruling R3). (This comment said "/platforms/
     only" for a while and was wrong the whole time: index.html has always
     had the root too. It matters more now that the band is section 2.)

     The three open platforms, from the same rows the catalog reads. A price
     typed into this page would be a fourth place the number lives — the
     catalog, the seed, the database, and here — and the audit found what
     happens when prose keeps its own copy of a figure. Status is hydrated
     the same way, so the card cannot say "Open now" for a slug the seed no
     longer marks open. */
  var PLATFORM_STATUS_LABEL = { open: 'Open now', in_line: 'Waitlist', website_only: 'Website' };
  var PLATFORM_STATUS_CLASS = { open: 'open', in_line: 'wait', website_only: 'site' };
  function paintPlatforms() {
    var root = el('platforms-root');
    if (!root || !state.niches.length) return;
    /* Every card on the page, not just the ones currently open — the markup
       hard-coded class="tok open" on all three status pills, so a platform
       whose status changed away from open kept a green "Open now" pill with
       empty text (nothing here ever ran for it, because the old filter below
       only ever looked at open rows). Text AND class are both set from the
       row, the same way catalog-render.js's statusTok() does it for the
       catalog cards, so this cannot drift the same way the numbering just
       did. */
    Array.prototype.forEach.call(root.querySelectorAll('[data-slug]'), function (card) {
      var slug = card.getAttribute('data-slug');
      var n = state.niches.filter(function (x) { return x.slug === slug; })[0];
      if (!n) return;
      var price = card.querySelector('[data-price]');
      if (price) price.textContent = n.price_label || '';
      var status = card.querySelector('[data-status]');
      if (status) {
        status.className = 'tok ' + (PLATFORM_STATUS_CLASS[n.status] || 'site');
        status.textContent = PLATFORM_STATUS_LABEL[n.status] || n.status;
      }
    });

    /* The closing "What's next" band. Chips, not a hand-typed list — the ten
       in-line businesses are whatever the seed currently says they are, and
       this reads it the same way the homepage's #line select does. */
    var next = el('next-chips');
    if (next) {
      next.innerHTML = state.niches.filter(function (n) { return n.status === 'in_line'; })
        .map(function (n) {
          return '<a class="chip" href="/sites/#line" data-niche="' + n.slug + '">' + n.name + '</a>';
        }).join('');
    }
  }

  /* ----------------------------------------------------------------- work */
  /* /work/ only. A no-op everywhere else — #wk-grid does not exist on any
     other page, so paintWork() returns before the fetch, and wireWorkModal()
     returns before it touches the DOM. Ruling R3.

     The pattern is the one portfolio/assets/js/app.js already proved:
     fetch a JSON file, render cards, filter by category. It moves here and
     reads band tokens instead of that file's own stylesheet (Ruling R4);
     nothing else about the shape changed. The data itself lives in
     work/projects.json, not in this file — the roster can be edited without
     touching code, and this script cannot drift from it because it never
     copies a project's name or status into a string of its own. */
  var wkProjects = [];
  var wkFilter = '';
  var wkModalLast = null;

  function wkEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function wkInitials(name) {
    return String(name || '')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); }).join('');
  }

  /* A card with no url is not a broken link, it is a card that deliberately
     does not link. Rendering an <a href="null"> or an <a> with no href would
     be a worse answer than the honest one. */
  function wkGoLink(p) {
    if (!p.url) return p.note ? '<p class="wk-note">' + wkEsc(p.note) + '</p>' : '';
    var external = /^https?:\/\//.test(p.url);
    var attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a class="wk-go" href="' + wkEsc(p.url) + '"' + attrs + '>Open it ' +
           '<span aria-hidden="true">&rarr;</span></a>';
  }

  function wkShotHtml(p) {
    if (p.shot) {
      return '<div class="wk-shot"><img src="/assets/shots/work/' + wkEsc(p.shot) +
             '" width="1280" height="800" loading="lazy" alt="' +
             wkEsc(p.name + ' — screenshot') + '"></div>';
    }
    /* No screenshot: a typographic placard in the house colour, same device
       the homepage board uses for a platform that is not filled yet — never
       a broken <img>, and never silence where a shot would have been. */
    return '<div class="wk-shot wk-shot--placard"><b>' + wkEsc(wkInitials(p.name)) +
           '</b><span>' + wkEsc(p.status || '') + '</span></div>';
  }

  function wkCardHtml(p) {
    var pillClass = String(p.status).toLowerCase() === 'live' ? 'wk-pill--live' : 'wk-pill--offline';
    var tags = (p.tags || []).map(function (t) {
      return '<span class="wk-tag">' + wkEsc(t) + '</span>';
    }).join('');
    return '' +
      '<article class="wk-card reveal" data-id="' + wkEsc(p.id) + '" data-category="' + wkEsc(p.category || '') + '">' +
        wkShotHtml(p) +
        '<div class="wk-body">' +
          '<div class="wk-top">' +
            '<h3><button type="button" class="wk-open">' + wkEsc(p.name) + '</button></h3>' +
            '<span class="wk-pill ' + pillClass + '">' + wkEsc(p.status || '') + '</span>' +
          '</div>' +
          '<p class="wk-tagline">' + wkEsc(p.tagline || '') + '</p>' +
          (tags ? '<div class="wk-tags">' + tags + '</div>' : '') +
          wkGoLink(p) +
        '</div>' +
      '</article>';
  }

  function wkCategories(list) {
    var seen = [];
    list.forEach(function (p) {
      if (p.category && seen.indexOf(p.category) === -1) seen.push(p.category);
    });
    return seen;
  }

  function wkBuildFilters(list) {
    var bar = el('wk-filterbar'), chips = el('wk-chips');
    if (!bar || !chips) return;
    var cats = [''].concat(wkCategories(list));
    chips.innerHTML = cats.map(function (cat, idx) {
      var label = cat || 'All work';
      var n = cat ? list.filter(function (p) { return p.category === cat; }).length : list.length;
      return '<button type="button" class="chip" data-filter="' + wkEsc(cat) + '" ' +
             'aria-pressed="' + (idx === 0 ? 'true' : 'false') + '">' +
             '<span>' + wkEsc(label) + '</span><b class="chip-n">' + n + '</b></button>';
    }).join('');
    bar.hidden = false;
  }

  function wkApplyFilter() {
    var grid = el('wk-grid');
    if (!grid) return;
    var cards = grid.querySelectorAll('.wk-card');
    var shown = 0;
    Array.prototype.forEach.call(cards, function (c) {
      var on = !wkFilter || c.getAttribute('data-category') === wkFilter;
      c.hidden = !on;
      if (on) shown++;
    });
    var bar = el('wk-filterbar');
    if (bar) {
      Array.prototype.forEach.call(bar.querySelectorAll('.chip'), function (c) {
        c.setAttribute('aria-pressed', (c.getAttribute('data-filter') || '') === wkFilter ? 'true' : 'false');
      });
    }
    var count = el('wk-filter-count');
    if (count) count.textContent = shown + ' of ' + cards.length;
    var empty = el('wk-filter-empty');
    if (empty) empty.hidden = shown > 0;
  }

  function wkWireFilters() {
    var bar = el('wk-filterbar');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.chip') : null;
      if (!chip) return;
      wkFilter = chip.getAttribute('data-filter') || '';
      wkApplyFilter();
    });
  }

  /* -------------------------------------------------------- detail panel */
  /* Every word here is read off the project object that opened it — nothing
     authored per-card in this file, so the modal cannot say something the
     grid does not already say. Same constraint fillModal() follows above. */
  function wkFillModal(p) {
    var body = el('wk-modal-body');
    if (!body) return;
    var pillClass = String(p.status).toLowerCase() === 'live' ? 'wk-pill--live' : 'wk-pill--offline';
    var shot = p.shot
      ? '<img class="wk-modal-shot" src="/assets/shots/work/' + wkEsc(p.shot) + '" width="1280" height="800" ' +
        'alt="' + wkEsc(p.name + ' — screenshot') + '">'
      : '<div class="wk-modal-shot wk-modal-shot--placard">' + wkEsc(wkInitials(p.name)) + '</div>';
    var tags = (p.tags || []).map(function (t) {
      return '<span class="wk-tag">' + wkEsc(t) + '</span>';
    }).join('');
    var features = (p.features || []).length
      ? '<ul class="wk-modal-features">' + p.features.map(function (f) {
          return '<li>' + wkEsc(f) + '</li>';
        }).join('') + '</ul>'
      : '';
    var note = (!p.url && p.note)
      ? '<p class="wk-modal-note">' + wkEsc(p.note) + '</p>' : '';
    var foot = '';
    if (p.url) {
      var external = /^https?:\/\//.test(p.url);
      var attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      foot = '<a class="btn btn-pri" href="' + wkEsc(p.url) + '"' + attrs + '>Open it &rarr;</a>';
    }
    body.innerHTML =
      shot +
      '<div class="wk-top"><h3 id="wk-modal-title">' + wkEsc(p.name) + '</h3>' +
      '<span class="wk-pill ' + pillClass + '">' + wkEsc(p.status || '') + '</span></div>' +
      '<p class="wk-modal-tagline">' + wkEsc(p.tagline || '') + '</p>' +
      '<p class="wk-modal-desc">' + wkEsc(p.description || '') + '</p>' +
      note + features +
      (tags ? '<div class="wk-modal-tags">' + tags + '</div>' : '') +
      '<div class="wk-modal-foot">' + foot + '</div>';
  }

  function wkModalFocusables() {
    var box = el('wk-modal');
    return box ? box.querySelectorAll('a[href],button:not([disabled])') : [];
  }

  function wkModalKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) { wkCloseModal(); return; }
    if (e.key !== 'Tab' && e.keyCode !== 9) return;
    var f = wkModalFocusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function wkOpenModal(id) {
    var box = el('wk-modal');
    var p = wkProjects.filter(function (x) { return x.id === id; })[0];
    if (!box || !p) return;
    wkModalLast = document.activeElement;
    wkFillModal(p);
    box.hidden = false;
    void box.offsetHeight;
    box.setAttribute('data-open', '1');
    document.body.style.overflow = 'hidden';
    var f = wkModalFocusables();
    if (f.length) f[0].focus();
    document.addEventListener('keydown', wkModalKey);
  }

  function wkCloseModal() {
    var box = el('wk-modal');
    if (!box || box.getAttribute('data-open') !== '1') return;
    box.setAttribute('data-open', '0');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', wkModalKey);
    setTimeout(function () { box.hidden = true; }, 220);
    if (wkModalLast && wkModalLast.focus) wkModalLast.focus();
  }

  function wkWireModal() {
    var grid = el('wk-grid'), box = el('wk-modal');
    if (!grid || !box) return;
    grid.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      if (e.target.closest('a')) return;             // the "Open it" link keeps its own behaviour
      var card = e.target.closest('.wk-card');
      if (!card) return;
      e.preventDefault();
      wkOpenModal(card.getAttribute('data-id'));
    });
    box.addEventListener('click', function (e) { if (e.target === box) wkCloseModal(); });
    var x = el('wk-modal-close');
    if (x) x.addEventListener('click', wkCloseModal);
  }

  function paintWork() {
    var grid = el('wk-grid');
    if (!grid) return;                                // R3: not this page, do nothing
    fetch('/work/projects.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (list) {
        wkProjects = Array.isArray(list) ? list : [];
        grid.innerHTML = wkProjects.map(wkCardHtml).join('');
        wkBuildFilters(wkProjects);
        wkApplyFilter();
        observe();                                    // the grid just got .reveal cards to animate in
      })
      .catch(function () {
        grid.innerHTML = '<p class="wk-loading">Couldn’t load the roster. Try reloading the page.</p>';
      });
  }

  function boot() {
    document.documentElement.classList.remove('no-js');
    wireLineLinks();
    wireForm();
    wireFaq();
    wireNav();
    observe();
    wireGlow();

    /* Everything below decorates a catalog that is already in the HTML, so it
       runs before the network is touched and is correct whether or not the
       live overlay ever arrives. */
    wireFilters();
    applyFilter(true);
    enhanceCards();
    wireModal();
    heroBoard();
    wireRail();
    wireExit();
    paintPlatforms();
    wirePreview();

    /* /work/ only — no-op everywhere else (Ruling R3). */
    wkWireFilters();
    wkWireModal();
    paintWork();

    loadLive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
