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
    set('lg-per-city', f.perCity);
    var t = el('thesis-open');
    if (t) t.textContent = R.thesisOpen(f.open);

    /* #catalog-root, NOT #catalog — the latter is the whole <section>, and
       overwriting it would take the heading, the lede and the legend with it. */
    var root = el('catalog-root');
    if (root) {
      root.innerHTML = R.catalog(state.families, state.niches, state.counts);
      wireLineLinks();
      observe();
      /* The repaint just destroyed every card, so anything that decorates a
         card has to be re-run: the active filter, the chip counts, and the
         translation — live rows arrive in English regardless of the language
         the visitor picked. Order matters; translate last so the counts are
         computed off the DOM before its words change. */
      applyFilter(true);
      translate();
    }
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
      .then(function (rows) { if (rows && rows.length) { state.niches = rows; paint(); } })
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
              (open ? '#2FBF6B' : '#F3922F') + '" opacity="' + (open ? '1' : '.5') + '"/>' +
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
    var armed = false, last = null;
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
      if (!armed || box.getAttribute('data-open') === '1') return;
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
    document.addEventListener('mouseout', function (e) {
      if (e.relatedTarget) return;
      if (e.clientY > 6) return;
      open();
    });

    box.addEventListener('click', function (e) {
      if (e.target === box) close();                        /* backdrop */
    });
    var no = el('exit-no'), x = el('exit-close'), go = el('exit-go');
    if (no) no.addEventListener('click', close);
    if (x)  x.addEventListener('click', close);
    if (go) go.addEventListener('click', close);            /* the href still runs */
  }

  function boot() {
    document.documentElement.classList.remove('no-js');
    wireLineLinks();
    wireForm();
    wireFaq();
    observe();

    /* Everything below decorates a catalog that is already in the HTML, so it
       runs before the network is touched and is correct whether or not the
       live overlay ever arrives. */
    wireFilters();
    applyFilter(true);
    heroBoard();
    wireRail();
    wireExit();

    loadLive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
