/* _template/base.js — utilities and the content lifecycle.
   Shared by every niche. Niche-specific rendering lives in niches/<slug>/niche.js,
   which must define window.renderContent(CONTENT). */
(function () {
  'use strict';

  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
  function telDigits(p) { return String(p || '').replace(/[^0-9+]/g, ''); }
  function telHref(p) { return 'tel:' + telDigits(p); }
  function smsHref(p, body) { return 'sms:' + telDigits(p) + '?&body=' + encodeURIComponent(body || ''); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  /* reveal-on-scroll. Under reduced motion everything is revealed at once. */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* Form POST. Returns a promise; the niche decides what to render on success. */
  function postForm(endpoint, payload) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; });
  }

  /* Consent gate (§9.3).
     Runs in the CAPTURE phase, ahead of the niche's own submit handler, so a
     checkbox the BUILD injected is enforced even though that niche's JS knows
     nothing about it.

     It does NOT stopPropagation: the niche handler still runs and sets its own
     message if it has one. We only supply wording when nobody else did, checked
     on the next tick — so the 8 sites that already gate keep their own copy and
     the injected sites get a sensible default. Enforcement is uniform; wording
     is not overridden. */
  function consentGate(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var box = form.querySelector('input[type="checkbox"][id$="consent"]');
    if (!box || box.checked) return;

    e.preventDefault();
    box.focus();

    var msg = form.querySelector('[id$="Msg"]');
    var before = msg ? msg.textContent : null;
    setTimeout(function () {
      if (!msg || msg.textContent !== before) return;   // the niche spoke first
      msg.textContent = 'Please tick the consent box so we can reply to you.';
      if (msg.className.indexOf('err') < 0) msg.className += ' err';
    }, 0);
  }
  document.addEventListener('submit', consentGate, true);

  /* The content lifecycle.
     DEFAULT_CONTENT is inlined by the build from content.json, so the two can
     never disagree. The fetch exists so an operator edit goes live without a
     rebuild; on failure the inlined copy already rendered. */
  /* content.json namespaces per-niche data under `niche` (SITELAB_TEMPLATE.md
     §4.3) so the canonical schema stays clean. But every niche renderer reads
     those keys FLAT — c.walkServices, c.systemMap, c.rundown — because they were
     written against the pre-consolidation shape. Nothing ever unpacked the
     namespace, so after the very first conversion every renderer that touched
     niche data threw on undefined. Hand the renderer a flattened view; the
     authored file keeps its namespace. Verified collision-free across all 17
     sites, and re-checked by qa-site.js on every run. */
  function SLflat(c) { return c && c.niche ? Object.assign({}, c, c.niche) : (c || {}); }

  /* Flatten the GLOBAL, once, before niche.js parses. Passing a flattened copy
     to renderContent(c) is not enough: every niche.js opens with
     `var CONTENT = window.DEFAULT_CONTENT;` and its interactive handlers — drip
     calculators, quoters, week builders — read that alias directly rather than
     the render parameter. Those paths would still see the nested shape.
     This is why base.js must be emitted BEFORE niche.js (see _template/index.html).
     content.json on disk keeps its namespace; only the runtime view is flat, so
     DEFAULT_CONTENT still matches the authored file byte for byte. */
  window.DEFAULT_CONTENT = SLflat(window.DEFAULT_CONTENT);

  function boot() {
    var CONTENT = SLflat(window.DEFAULT_CONTENT);
    window.CONTENT = CONTENT;
    if (typeof window.renderContent === 'function') window.renderContent(CONTENT);
    initReveal();
    if (typeof window.initScene === 'function') window.initScene(reduce);

    fetch('content.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        CONTENT = SLflat(Object.assign({}, window.DEFAULT_CONTENT, d));
        window.CONTENT = CONTENT;
        if (typeof window.renderContent === 'function') window.renderContent(CONTENT);
      })
      .catch(function () { /* offline or 404: the inlined defaults stand */ });
  }

  /* setErr and showDone are intentionally absent: every niche examined
     defines its own with a different signature. Sharing them would be a
     silent behaviour change, not a saving. */
  window.SL = { esc: esc, num: num, telHref: telHref, telDigits: telDigits,
                smsHref: smsHref, val: val, postForm: postForm, reduce: reduce };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
