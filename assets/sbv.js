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
  function set(id, v) { var e = el(id); if (e) e.textContent = String(v); }

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

  function boot() {
    document.documentElement.classList.remove('no-js');
    wireLineLinks();
    wireForm();
    wireFaq();
    observe();
    loadLive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
