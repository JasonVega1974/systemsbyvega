/* ============================================================================
   SYSTEMS BY VEGA — language layer
   ----------------------------------------------------------------------------
   Translations are keyed by the ENGLISH SOURCE TEXT, not by invented ids.

   That decision is the whole design. This page is hand-written prose, and half
   of what a visitor reads — every job line on all twenty-nine plates — arrives
   from the database at run time and cannot carry a key at all. Keying off the
   source text means:

     * no markup churn: not one data-i18n attribute had to be added to sixty
       nodes of copy, so translating the page could not break the page;
     * catalog copy translates by exactly the same mechanism as static copy,
       with nothing added to catalog-render.js and no second code path;
     * anything with no translation silently stays English, so a half-finished
       dictionary degrades to the original page rather than to blanks;
     * new copy needs a dictionary line and nothing else.

   The cost is that whitespace has to be normalised on lookup and that two
   identical English strings share one translation. Both are acceptable here.

   WHAT IS DELIBERATELY NOT TRANSLATED: anything inside [data-i18n-skip]. That
   is the footer's legal paragraph. A disclaimer that says something slightly
   different in Spanish than it does in English is a liability, not a feature —
   so it stays in one language and the page states which version governs.

   No framework, no fetch, no build step. The dictionaries are plain script
   files that assign into window.SBV_LANG.
   ========================================================================= */
(function () {
  'use strict';

  var DICTS = window.SBV_LANG || {};
  var STORE = 'sbv.lang';

  /* Original English is remembered per node, so switching back is a restore
     rather than a reverse-translation. Nodes the catalog repaint creates are
     English at birth, which is why capturing on first sight is correct. */
  var ORIG_TEXT = new WeakMap();
  var ORIG_ATTR = new WeakMap();

  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'label'];

  var current = 'en';

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function have(lang) { return lang === 'en' || !!DICTS[lang]; }

  /* ------------------------------------------------------------- walking */
  /* Rejecting a node in a TreeWalker filter skips that node alone; REJECT on
     an element skips the whole subtree, which is what [data-i18n-skip] needs. */
  function eachTextNode(fn) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (node.nodeType === 1) {
          var tag = node.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          if (node.hasAttribute('data-i18n-skip')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_SKIP;
        }
        /* Whitespace, bare numbers and lone punctuation have no translation
           and checking them on every pass is wasted work. */
        var t = norm(node.nodeValue);
        if (!t || !/[A-Za-z]/.test(t)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) fn(n);
  }

  function eachAttrEl(fn) {
    var sel = ATTRS.map(function (a) { return '[' + a + ']'; }).join(',');
    Array.prototype.forEach.call(document.body.querySelectorAll(sel), function (el) {
      if (el.closest('[data-i18n-skip]')) return;
      fn(el);
    });
  }

  /* ----------------------------------------------------------- translate */
  function put(node, en, translated) {
    /* Leading and trailing whitespace is layout — the source is indented prose
       — so only the words are swapped. */
    var lead = en.match(/^\s*/)[0];
    var tail = en.match(/\s*$/)[0];
    var next = lead + translated + tail;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function apply(lang) {
    lang = have(lang) ? lang : 'en';
    current = lang;
    var dict = lang === 'en' ? null : DICTS[lang];

    eachTextNode(function (node) {
      if (!ORIG_TEXT.has(node)) ORIG_TEXT.set(node, node.nodeValue);
      var en = ORIG_TEXT.get(node);
      if (!dict) { if (node.nodeValue !== en) node.nodeValue = en; return; }
      var hit = dict[norm(en)];
      if (hit) put(node, en, hit);
      else if (node.nodeValue !== en) node.nodeValue = en;   // no entry: fall back
    });

    eachAttrEl(function (el) {
      var saved = ORIG_ATTR.get(el);
      if (!saved) { saved = {}; ORIG_ATTR.set(el, saved); }
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        if (!(a in saved)) saved[a] = el.getAttribute(a);
        var en = saved[a];
        if (!dict) { el.setAttribute(a, en); return; }
        var hit = dict[norm(en)];
        el.setAttribute(a, hit || en);
      });
    });

    document.documentElement.setAttribute('lang', lang);

    /* The page has to say which version governs, because the legal paragraph
       above this line is still in English on purpose. */
    var note = document.getElementById('lang-governs');
    if (note) {
      if (dict && dict['__governs__']) {
        note.textContent = dict['__governs__'];
        note.hidden = false;
      } else {
        note.textContent = '';
        note.hidden = true;
      }
    }
  }

  function set(lang) {
    if (!have(lang)) lang = 'en';
    try { localStorage.setItem(STORE, lang); } catch (e) { /* private mode */ }
    /* The picker has to follow the language even when the language was not
       changed from the picker — ?lang=, a stored preference, or a call from
       the console all land here. */
    var pick = document.getElementById('lang-pick');
    if (pick && pick.value !== lang) pick.value = lang;
    apply(lang);
  }

  /* ---------------------------------------------------------------- boot */
  function preferred() {
    /* An explicit ?lang= wins, so a link can be shared in one language. */
    var q = (location.search.match(/[?&]lang=([a-z-]{2,5})/i) || [])[1];
    if (q && have(q.slice(0, 2).toLowerCase())) return q.slice(0, 2).toLowerCase();

    var saved;
    try { saved = localStorage.getItem(STORE); } catch (e) { saved = null; }
    if (saved && have(saved)) return saved;

    /* Only with no stored choice: follow the browser, and only into a language
       we actually have. Someone whose browser is set to Spanish is better
       served by Spanish than by a picker they have to notice. */
    var nav = (navigator.languages || [navigator.language || ''])[0] || '';
    var two = nav.slice(0, 2).toLowerCase();
    return have(two) ? two : 'en';
  }

  function boot() {
    var pick = document.getElementById('lang-pick');
    var lang = preferred();

    if (pick) {
      /* Never translate the picker's own options — a language is named in its
         own language, always. */
      pick.setAttribute('data-i18n-skip', '');
      pick.value = have(lang) ? lang : 'en';
      pick.addEventListener('change', function () { set(pick.value); });
    }

    apply(lang);
  }

  window.SBVi18n = {
    /* sbv.js calls this after every catalog repaint: the rows come back in
       English and have to be re-translated in place. */
    apply: function () { apply(current); },
    set: set,
    current: function () { return current; },
    has: have
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
