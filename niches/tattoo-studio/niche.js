/* tattoo-studio/niche.js — this niche's renderer and interactive logic.
   Shared utilities come from _template/base.js via SL; the aliases below keep
   every extracted call site unchanged. base.js owns the reduced-motion flag,
   the reveal observer, the content fetch/merge lifecycle, and calling
   window.renderContent(). val/setErr/showDone are NOT aliased — this niche
   defines its own with different signatures. */
(function () {
  'use strict';

  var SL = window.SL;
  var esc = SL.esc, num = SL.num, telHref = SL.telHref;
  var reduce = SL.reduce;
  var CONTENT = window.DEFAULT_CONTENT;

var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // year
  document.getElementById('yr').textContent = new Date().getFullYear();

  // nav solidify
  var nav = document.getElementById('nav');
  var onScroll = function(){ nav.classList.toggle('solid', window.scrollY > 30); };
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

  // reveal on scroll
  var revs = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
    revs.forEach(function(r){ io.observe(r); });
  } else { revs.forEach(function(r){ r.classList.add('in'); }); }

  // floating ink motes in the hero
  var motes = document.getElementById('motes');
  if(motes && !reduce){
    var n = window.innerWidth < 700 ? 8 : 16;
    for(var i=0;i<n;i++){
      var m = document.createElement('span');
      m.className = 'mote';
      var size = 2 + Math.random()*4;
      m.style.width = size + 'px';
      m.style.height = size + 'px';
      m.style.left = Math.random()*100 + '%';
      m.style.background = Math.random() < .6
        ? 'rgba(196,43,61,' + (0.25 + Math.random()*0.3) + ')'
        : 'rgba(237,228,211,' + (0.12 + Math.random()*0.18) + ')';
      var dur = 11 + Math.random()*14;
      m.style.animationDuration = dur + 's';
      m.style.animationDelay = (-Math.random()*dur) + 's';
      m.style.setProperty('--o', (0.25 + Math.random()*0.4).toFixed(2));
      m.style.setProperty('--sway', ((Math.random()*90) - 45).toFixed(0) + 'px');
      motes.appendChild(m);
    }
  }

  /* =====================================================
     CONTENT — everything the owner edits in one object.
     DEFAULT_CONTENT ships inline (renders immediately);
     content.json at the repo root — written by /admin/ —
     overrides it at runtime. Keep both shapes in sync.
     ===================================================== */
/* =====================================================
     SIGNATURE: filterable gallery + lightbox
     (tiles render from CONTENT.gallery; the lightbox works
     off whatever tiles are in the grid + the active filter)
     ===================================================== */
  var grid = document.getElementById('grid');
  var tiles = [];
  var pills = document.querySelectorAll('.pill');
  var currentFilter = 'all';

  var applyFilter = function(cat){
    currentFilter = cat;
    tiles.forEach(function(t){
      t.hidden = (cat !== 'all' && t.getAttribute('data-cat') !== cat);
    });
  };
  pills.forEach(function(p){
    p.addEventListener('click', function(){
      pills.forEach(function(q){ q.setAttribute('aria-pressed', q === p ? 'true' : 'false'); });
      applyFilter(p.getAttribute('data-filter'));
    });
  });

  // ---- lightbox ----
  var lb       = document.getElementById('lightbox');
  var lbStage  = document.getElementById('lbStage');
  var lbTitle  = document.getElementById('lbTitle');
  var lbTag    = document.getElementById('lbTag');
  var lbCount  = document.getElementById('lbCount');
  var lbClose  = document.getElementById('lbClose');
  var lbPrev   = document.getElementById('lbPrev');
  var lbNext   = document.getElementById('lbNext');
  var lbBack   = document.getElementById('lbBackdrop');
  var lbOpen   = false;
  var lbIndex  = 0;
  var lbSet    = [];       // tiles visible under the current filter
  var lastFocus = null;

  var lbRender = function(){
    var t = lbSet[lbIndex];
    var img = t.getAttribute('data-img');
    if(img){
      // real photo — show it on the stage
      lbStage.className = 'lb__stage';
      lbStage.innerHTML = '<img src="' + esc(img) + '" alt="' + esc(t.getAttribute('data-title')) + '">';
    } else {
      // reuse the tile's placeholder-art class on the big stage
      lbStage.className = 'lb__stage art ' + t.getAttribute('data-art');
      lbStage.innerHTML = '';
    }
    lbTitle.textContent = t.getAttribute('data-title'); // attribute entities are already decoded
    lbTag.textContent = t.getAttribute('data-tag');
    lbCount.textContent = (lbIndex + 1) + ' / ' + lbSet.length;
  };
  var openLb = function(tile){
    lbSet = tiles.filter(function(t){ return !t.hidden; });
    lbIndex = lbSet.indexOf(tile);
    if(lbIndex < 0) return;
    lastFocus = document.activeElement;
    lbRender();
    lb.hidden = false;
    lbOpen = true;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  };
  var closeLb = function(){
    lb.hidden = true;
    lbOpen = false;
    document.body.style.overflow = '';
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  };
  var stepLb = function(dir){
    lbIndex = (lbIndex + dir + lbSet.length) % lbSet.length;
    lbRender();
  };

  // delegated so re-rendered tiles keep working
  grid.addEventListener('click', function(e){
    var t = e.target.closest('.tile');
    if(t) openLb(t);
  });
  lbClose.addEventListener('click', closeLb);
  lbBack.addEventListener('click', closeLb);
  lbPrev.addEventListener('click', function(){ stepLb(-1); });
  lbNext.addEventListener('click', function(){ stepLb(1); });

  document.addEventListener('keydown', function(e){
    if(!lbOpen) return;
    if(e.key === 'Escape'){ closeLb(); }
    else if(e.key === 'ArrowLeft'){ stepLb(-1); }
    else if(e.key === 'ArrowRight'){ stepLb(1); }
    else if(e.key === 'Tab'){
      // keep focus cycling among the three lightbox controls
      var order = [lbClose, lbPrev, lbNext];
      var i = order.indexOf(document.activeElement);
      var next = e.shiftKey
        ? order[(i - 1 + order.length) % order.length]
        : order[(i + 1) % order.length];
      if(i === -1) next = lbClose;
      next.focus();
      e.preventDefault();
    }
  });

  /* =====================================================
     FLASH CLAIM → pre-fills the booking form
     ===================================================== */
  var flashField = document.getElementById('flashClaim');
  var flashInput = document.getElementById('b-flash');
  var flashClear = document.getElementById('flashClear');
  var styleSel   = document.getElementById('b-style');
  var budgetSel  = document.getElementById('b-budget');

  var claimFlash = function(name){
    if(!name) return;
    flashInput.value = name;
    flashField.classList.add('show');
    styleSel.value = 'Flash';
    budgetSel.value = 'Flash price (as listed)';
  };
  // delegated so re-rendered flash cards keep working
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-flash]');
    if(!a) return;
    // decode any entities baked into the attribute (e.g. &amp;)
    var tmp = document.createElement('textarea');
    tmp.innerHTML = a.getAttribute('data-flash');
    claimFlash(tmp.value);
    // let the default #book anchor jump happen; also record it in the URL
    try{ history.replaceState(null, '', '#book'); }catch(err){}
  });
  flashClear.addEventListener('click', function(){
    flashInput.value = '';
    flashField.classList.remove('show');
    if(styleSel.value === 'Flash') styleSel.value = 'Blackwork';
    if(budgetSel.value === 'Flash price (as listed)') budgetSel.value = '$300–$600';
  });

  /* =====================================================
     RENDER — paints every owner-editable region from the
     merged CONTENT object. Runs once with the defaults,
     again if content.json loads. Never hard-fails the page.
     ===================================================== */
  var SOCIAL_ICONS = {
    'Instagram': '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none"/>',
    'TikTok': '<path d="M9 12a4 4 0 1 0 4 4V4c.4 2.5 2.1 4.1 4.6 4.4"/>',
    'Facebook': '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    'X': '<path d="M4 4l16 16M20 4L4 20"/>',
    'YouTube': '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
    'Website': '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>'
  };
  var socSvg = function(platform){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + (SOCIAL_ICONS[platform] || SOCIAL_ICONS.Website) + '</svg>';
  };

  var renderStats = function(list){
    document.getElementById('proofRow').innerHTML = (list || []).map(function(s){
      return '<div class="proof"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('');
  };

  var renderGallery = function(list){
    grid.innerHTML = (list || []).map(function(g){
      var art = g.image
        ? '<img class="tile__art" src="' + esc(g.image) + '" alt="' + esc(g.title) + '" loading="lazy">'
        : '<span class="tile__art art ' + esc(g.art || 'a-rose') + '" aria-hidden="true"></span>';
      return '<button class="tile reveal in" data-cat="' + esc(g.cat || 'blackwork') + '"'
        + (g.image ? ' data-img="' + esc(g.image) + '"' : ' data-art="' + esc(g.art || 'a-rose') + '"')
        + ' data-title="' + esc(g.title) + '" data-tag="' + esc(g.tag || '') + '">'
        + art
        + '<span class="tile__cap"><b>' + esc(g.title) + '</b><span>' + esc(g.tag || '') + '</span></span>'
        + '</button>';
    }).join('');
    tiles = Array.prototype.slice.call(grid.querySelectorAll('.tile'));
    applyFilter(currentFilter);
  };

  var renderFlash = function(list){
    document.getElementById('flashGrid').innerHTML = (list || []).map(function(f){
      var claim = f.title + ' — ' + f.price;
      var art = f.image
        ? '<div class="flash-card__art" aria-hidden="true"><img src="' + esc(f.image) + '" alt="" loading="lazy"><span class="flash-card__price">' + esc(f.price) + '</span></div>'
        : '<div class="flash-card__art art ' + esc(f.art || 'a-heart') + '" aria-hidden="true"><span class="flash-card__price">' + esc(f.price) + '</span></div>';
      return '<div class="flash-card reveal in">' + art
        + '<div class="flash-card__body"><b>' + esc(f.title) + '</b><p>' + esc(f.desc || '') + '</p>'
        + '<a class="flash-card__claim" href="#book" data-flash="' + esc(claim) + '">Claim this flash</a></div></div>';
    }).join('');
  };

  var renderAbout = function(c){
    document.getElementById('bioText').textContent = c.bio || '';
    document.getElementById('chipRow').innerHTML = (c.chips || []).map(function(ch){
      return '<span class="chip">' + esc(ch.t) + '</span>';
    }).join('');
  };

  var renderSocial = function(list, brand){
    var pillsHtml = (list || []).map(function(s){
      return '<a class="social" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">'
        + socSvg(s.icon) + esc(s.label || s.icon) + '</a>';
    });
    pillsHtml.push('<a class="social" href="mailto:' + esc(brand.email) + '">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>'
      + esc(brand.email) + '</a>');
    document.getElementById('socialRow').innerHTML = pillsHtml.join('');
    var dm = document.getElementById('dmLink');
    if(dm && list && list.length && list[0].url) dm.href = list[0].url;
  };

  var renderBrand = function(b){
    var short = String(b.city || '').split(',')[0].trim();
    document.querySelectorAll('[data-edit="city"]').forEach(function(el){ el.textContent = b.city; });
    document.querySelectorAll('[data-edit="city-short"]').forEach(function(el){ el.textContent = short; });
    var fp = document.getElementById('footPhone');
    fp.href = telHref(b.phone); fp.textContent = b.phone;
    var fe = document.getElementById('footEmail');
    fe.href = 'mailto:' + b.email; fe.textContent = b.email;
    var alt = document.getElementById('bookAlt');
    alt.href = 'mailto:' + b.email; alt.textContent = 'or email ' + b.email;
  };

  var renderBooking = function(s){
    var open = !s || s.booksOpen !== false;
    var formEl = document.getElementById('bookForm');
    var closed = document.getElementById('bookClosed');
    var done = document.getElementById('bookDone');
    if(open){
      closed.hidden = true;
      if(done.hidden) formEl.hidden = false;
    } else {
      formEl.hidden = true;
      done.hidden = true;
      document.getElementById('closedMsg').textContent = (s && s.closedNote) || 'Books are closed right now — check back soon.';
      closed.hidden = false;
    }
  };

  var renderContent = function(c){
    renderBrand(c.brand || {});
    renderStats(c.stats);
    renderGallery(c.gallery);
    renderFlash(c.flash);
    renderAbout(c);
    renderSocial(c.social, c.brand || {});
    renderBooking(c.settings);
  };
  /* boot handed to base.js */
  // live override: content.json is what /admin/ edits. 404/offline = defaults stand.


  // deep-link support: ?flash=Thorned%20Heart pre-claims on load
  try{
    var param = new URLSearchParams(window.location.search).get('flash');
    if(param){
      claimFlash(param);
      document.getElementById('book').scrollIntoView();
    }
  }catch(err){}

  /* =====================================================
     BOOKING FORM — no backend
     Default: FormSubmit (zero signup). The FIRST real submission emails an
     activation link to LEAD.email; click it once and every request after
     that lands in the inbox. Swap the email below for the real one.
     ===================================================== */
  // Delivery inbox = CONTENT.brand.leadEmail (editable at /admin/ → Contact).
  // FormSubmit sends a ONE-TIME activation link to that address on the first
  // real submission — click it once and every request after that is delivered.
  var LEAD = {
    provider: 'formsubmit',
    get email(){ return (CONTENT.brand && CONTENT.brand.leadEmail) || DEFAULT_CONTENT.brand.leadEmail; }
  };

  var form = document.getElementById('bookForm');
  var msgEl = document.getElementById('bookMsg');
  var submitBtn = document.getElementById('bookSubmit');

  var setErr = function(input, on){
    var f = input.closest('.field');
    if(f) f.classList.toggle('invalid', !!on);
  };
  var say = function(text, cls){
    msgEl.textContent = text;
    msgEl.className = 'book__msg' + (cls ? ' ' + cls : '');
  };

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // honeypot — bots fill it, humans can't see it
    if(form.querySelector('input[name="_honey"]').value){ return; }

    var name      = document.getElementById('b-name');
    var email     = document.getElementById('b-email');
    var phone     = document.getElementById('b-phone');
    var placement = document.getElementById('b-placement');
    var idea      = document.getElementById('b-idea');
    var consent   = document.getElementById('b-consent');

    var bad = false;
    [name, email, placement, idea].forEach(function(el){
      var empty = !(el.value || '').trim();
      setErr(el, empty);
      if(empty) bad = true;
    });
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email.value||'').trim());
    if(!emailOk){ setErr(email, true); bad = true; }
    if(!consent.checked){
      say('Please confirm the age / ID / deposit line first.', 'err');
      return;
    }
    if(bad){
      say('A couple of required fields are missing — they’re marked in red.', 'err');
      return;
    }

    var payload = {
      _subject: 'Booking request — Static Rose Tattoo',
      name: name.value.trim(),
      email: email.value.trim(),
      phone: (phone.value||'').trim() || '(not given)',
      placement: placement.value.trim(),
      size: document.getElementById('b-size').value,
      style: styleSel.value,
      budget: budgetSel.value,
      claiming_flash: flashInput.value || 'No',
      idea: idea.value.trim()
    };

    submitBtn.disabled = true;
    say('Sending…');

    fetch('https://formsubmit.co/ajax/' + LEAD.email, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      if(!res.ok) throw new Error('bad status');
      return res.json();
    }).then(function(){
      form.hidden = true;
      var done = document.getElementById('bookDone');
      var dm = document.getElementById('doneMsg');
      dm.textContent = 'Got it, ' + payload.name.split(' ')[0] + '. Rae reads every request personally — expect an email at ' + payload.email + ' within 48 hours.'
        + (flashInput.value ? ' Your claim on “' + flashInput.value + '” is noted — it’s held until she replies.' : '');
      done.hidden = false;
      done.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'});
    }).catch(function(){
      submitBtn.disabled = false;
      say('That didn’t go through. Email ' + ((CONTENT.brand && CONTENT.brand.email) || 'the studio') + ' instead.', 'err');
    });
  });

  /* Desktop tel: guard — stops Windows' "Pick an app" dialog; shows a toast
     with the number instead. Phones are untouched. */
  var isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(!isMobile){
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="sms:"]');
      if(!a) return;
      e.preventDefault();
      var t = document.getElementById('telToast');
      if(!t){
        t = document.createElement('div');
        t.id = 'telToast';
        t.setAttribute('role','status');
        t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:9999;'
          + 'background:#141118;color:#ede4d3;padding:14px 22px;border-radius:2px;'
          + 'box-shadow:0 12px 40px rgba(0,0,0,.6);border:1px solid rgba(196,43,61,.4);'
          + 'font-family:\'Space Grotesk\',system-ui,sans-serif;font-size:15px;max-width:88vw;text-align:center;'
          + 'opacity:0;transition:opacity .25s ease;';
        document.body.appendChild(t);
      }
      t.innerHTML = 'Text the studio at <strong style="color:#e0475a;letter-spacing:.02em">' + esc((CONTENT.brand && CONTENT.brand.phone) || '') + '</strong> from your phone.';
      requestAnimationFrame(function(){ t.style.opacity = '1'; });
      clearTimeout(window.__telToastTimer);
      window.__telToastTimer = setTimeout(function(){ t.style.opacity = '0'; }, 4500);
    });
  }

  window.renderContent = renderContent;
})();
