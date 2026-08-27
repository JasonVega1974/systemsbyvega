/* bin-cleaning/niche.js — this niche's renderer and interactive logic.
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

  /* =====================================================
     OWNER-EDITABLE CONTENT
     DEFAULT_CONTENT ships with the page and renders
     immediately. content.json (repo root, edited from
     /admin/) is fetched at runtime and merged over it.
     Keep content.json's shape in sync with this const.
     Written as strict JSON so tooling can verify the two
     stay byte-consistent.
     ===================================================== */
/* Zone centroids (index-matched to routeZones). The map GEOMETRY is now static SVG
     in the markup (renders JS-off); these only position the rAF spring highlight glow. */
  var ZONE_C = [
    { x: 320, y: 100 }, // 0 North Meridian
    { x: 126, y: 306 }, // 1 South Meridian
    { x: 114, y: 108 }, // 2 West Meridian & Ten Mile
    { x: 364, y: 306 }, // 3 East Meridian
    { x: 516, y: 104 }, // 4 Eagle & Star
    { x: 542, y: 306 }  // 5 Kuna & everywhere else
  ];
  function dayShort(day){
    var d = String(day||'');
    return /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/i.test(d) ? d.slice(0,3).toUpperCase() : '· · ·';
  }

  /* ---------- render ---------- */
  function renderContent(c){
    document.querySelectorAll('[data-brand]').forEach(function(el){ el.textContent = c.brand.name; });
    document.querySelectorAll('[data-city]').forEach(function(el){ el.textContent = c.brand.city; });
    var telLink = telHref(c.brand.phone);
    document.querySelectorAll('[data-phone]').forEach(function(el){ el.href = 'tel:' + telLink; el.textContent = c.brand.phone; });
    document.querySelectorAll('[data-phone-link]').forEach(function(el){ el.href = 'tel:' + telLink; el.textContent = 'Call or text ' + c.brand.phone; });
    document.querySelectorAll('.mobile-cta .call').forEach(function(el){ el.href = 'tel:' + telLink; });
    document.querySelectorAll('.mobile-cta .text').forEach(function(el){ el.href = 'sms:' + telLink + '?body=' + encodeURIComponent('Hi ' + c.brand.name + ', can you clean my bins?'); });

    // trust stats
    document.getElementById('trustStats').innerHTML = c.stats.map(function(s){
      return '<div class="tstat"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('');

    // how it works
    document.getElementById('howGrid').innerHTML = c.howItWorks.map(function(st){
      return '<div class="how-card"><h3>' + esc(st.title) + '</h3><p>' + esc(st.desc) + '</p></div>';
    }).join('');

    // plans
    document.getElementById('priceGrid').innerHTML = c.plans.map(function(p){
      var feats = (p.features || '').split('\n').filter(Boolean).map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('');
      return '<div class="pcard' + (p.best ? ' best' : '') + '">' +
        (p.best ? '<span class="pnote">' + esc(p.note || 'Most popular') + '</span>' : '') +
        '<h3>' + esc(p.name) + '</h3>' +
        '<div class="pnum">' + esc(p.price) + '<span> ' + esc(p.per) + '</span></div>' +
        '<ul>' + feats + '</ul></div>';
    }).join('');
    document.getElementById('pricingNote').textContent = c.pricingNote || '';

    // plan select in signup form
    var planSel = document.getElementById('qPlan');
    planSel.innerHTML = c.plans.map(function(p){
      return '<option value="' + esc(p.name) + '">' + esc(p.name) + ' (' + esc(p.price) + esc(p.per) + ')</option>';
    }).join('') + '<option value="Not sure yet">Not sure yet</option>';

    // route finder
    renderRoutes(c);
    document.getElementById('routeNote').textContent = c.routeNote || '';

    // why
    var icos = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 4 6 6.6 6 10a6 6 0 0 1-12 0c0-3.4 3-6 6-10z"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M6 20V9l6-5 6 5v11"/></svg>'
    ];
    document.getElementById('whyGrid').innerHTML = c.whyClean.map(function(w, i){
      return '<div class="wcard"><span class="w-ico">' + icos[i % icos.length] + '</span><h3>' + esc(w.title) + '</h3><p>' + esc(w.desc) + '</p></div>';
    }).join('');

    // service area
    document.getElementById('areaShort').textContent = c.serviceArea.short;
    document.getElementById('areaChips').innerHTML = (c.serviceArea.cities || []).map(function(city){
      return '<span class="achip">' + esc(city) + '</span>';
    }).join('');

    // owner
    document.getElementById('ownerEyebrow').textContent = c.owner.heading || 'Our story';
    document.getElementById('ownerName').textContent = c.owner.name;
    document.getElementById('ownerBio').textContent = c.owner.bio;
    var photoWrap = document.getElementById('ownerPhotoWrap');
    photoWrap.innerHTML = c.owner.photo ? '<img src="' + esc(c.owner.photo) + '" alt="' + esc(c.owner.name) + '">' : '';

    // testimonials
    document.getElementById('testGrid').innerHTML = c.testimonials.map(function(t){
      return '<div class="tcard"><p>' + esc(t.quote) + '</p><div class="tname">' + esc(t.name) + '</div></div>';
    }).join('');

    // faq
    document.getElementById('faqList').innerHTML = c.faq.map(function(f, i){
      return '<details class="qa"' + (i === 0 ? ' open' : '') + '><summary>' + esc(f.q) + '<span class="pm">+</span></summary><div class="ans">' + esc(f.a) + '</div></details>';
    }).join('');

    revealScan(document.body);
  }

  /* ---------- route finder: map + chips + detail panel ---------- */
  var activeZone = -1;
  function renderRoutes(c){
    var zones = c.routeZones || [];
    // Bind labels/days/aria onto the STATIC base map (geometry is fixed SVG in the markup).
    // Only the DATA (content.json.routeZones, admin-editable) is applied here.
    for(var i = 0; i < ZONE_C.length; i++){
      var path = document.querySelector('#routeMap .rz[data-zone="' + i + '"]');
      var tn = document.querySelector('#routeMap [data-zn="' + i + '"]');
      var td = document.querySelector('#routeMap [data-zd="' + i + '"]');
      var z = zones[i], vis = z ? '' : 'none';
      if(path){ path.style.display = vis; if(z) path.setAttribute('aria-label', z.label + ' — ' + z.day); }
      if(tn){ tn.style.display = vis; if(z) tn.textContent = z.label; }
      if(td){ td.style.display = vis; if(z) td.textContent = dayShort(z.day); }
    }

    document.getElementById('routeChips').innerHTML = zones.map(function(z, i){
      return '<button type="button" class="rchip" data-zone="' + i + '" aria-pressed="false">' + esc(z.label) + '</button>';
    }).join('');

    var wrap = document.getElementById('routes');
    if(!wrap._wired){
      wrap._wired = true;
      wrap.addEventListener('click', function(e){
        var el = e.target.closest('[data-zone]');
        if(el) activateZone(+el.getAttribute('data-zone'));
      });
      wrap.addEventListener('keydown', function(e){
        var el = e.target.closest('path[data-zone]');
        if(el && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')){
          e.preventDefault();
          activateZone(+el.getAttribute('data-zone'));
        }
      });
    }
    if(activeZone >= 0 && activeZone < zones.length) activateZone(activeZone);
  }

  /* physics-eased highlight: a damped spring (requestAnimationFrame) scales the glow at
     the active zone's centroid — momentum + overshoot + settle, like the north-star
     (dj-site-blue) rAF decay loop. Reduced-motion → snap to final state, no loop. */
  function springPulse(el, cx, cy){
    if(el._raf) cancelAnimationFrame(el._raf);
    el.setAttribute('cx', cx); el.setAttribute('cy', cy);
    el.setAttribute('opacity', '0.95');
    if(reduce){ el.setAttribute('r', '66'); return; }
    var r = 4, v = 0, target = 66, k = 0.14, damp = 0.6, last = performance.now();
    function step(now){
      var dt = Math.min(2.5, (now - last) / 16.67); last = now;
      v = (v + (target - r) * k) * damp;
      r += v * dt;
      el.setAttribute('r', r.toFixed(2));
      if(Math.abs(target - r) > 0.4 || Math.abs(v) > 0.25){ el._raf = requestAnimationFrame(step); }
      else { el.setAttribute('r', target); }
    }
    el._raf = requestAnimationFrame(step);
  }

  function activateZone(i){
    var zones = CONTENT.routeZones || [];
    var z = zones[i];
    if(!z) return;
    activeZone = i;
    document.querySelectorAll('#routes [data-zone]').forEach(function(el){
      var on = +el.getAttribute('data-zone') === i;
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var pulse = document.getElementById('rzPulse'), ctr = ZONE_C[i];
    if(pulse && ctr) springPulse(pulse, ctr.x, ctr.y);
    document.getElementById('routeDetail').innerHTML =
      '<p class="rd-zone">' + esc(z.label) + '</p>' +
      '<p class="rd-day">' + esc(z.day) + '</p>' +
      '<p class="rd-note">' + esc(z.note) + '</p>' +
      '<p class="rd-cta"><a class="btn-pri" href="#signup">Start my plan</a></p>';
  }

  /* ---------- reveal on scroll ---------- */
  var io = null;
  function revealScan(root){
    var nodes = (root || document).querySelectorAll('.reveal:not(.in)');
    if(reduce || !('IntersectionObserver' in window)){
      nodes.forEach(function(el){ el.classList.add('in'); });
      return;
    }
    if(!io){
      io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    }
    nodes.forEach(function(el){ io.observe(el); });
  }

  /* ---------- nav solidify ---------- */
  var nav = document.getElementById('nav');
  var onScroll = function(){ nav.classList.toggle('solid', window.scrollY > 24); };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- desktop sms:/tel: guard ---------- */
  var isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  function toast(msg){
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.remove('show'); }, 3200);
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href^="sms:"], a[href^="tel:"]');
    if(!a || isMobile) return;
    e.preventDefault();
    toast('Call or text ' + CONTENT.brand.phone);
  });

  /* ---------- lead form (FormSubmit) ---------- */
  var LEAD = { provider: 'formsubmit', email: '' };
  function applyRuntime(c){ LEAD.email = (c.brand||{}).leadEmail || LEAD.email; }
  applyRuntime(CONTENT);

  var form = document.getElementById('quoteForm');
  var status = document.getElementById('qfStatus');
  var success = document.getElementById('qfSuccess');
  var submitBtn = document.getElementById('qfSubmit');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var honey = form.querySelector('[name="_honey"]');
    if(honey && honey.value) return; // honeypot tripped, silently drop

    var name = document.getElementById('qName').value.trim();
    var phone = document.getElementById('qPhone').value.trim();
    if(!name || !phone){
      status.textContent = 'Please fill in your name and phone number.';
      status.classList.add('err');
      return;
    }
    status.textContent = ''; status.classList.remove('err');
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';

    var payload = {
      name: name, phone: phone,
      address: document.getElementById('qAddress').value.trim() || '(not given)',
      bins: document.getElementById('qBins').value,
      plan: document.getElementById('qPlan').value,
      notes: document.getElementById('qNotes').value.trim(),
      _subject: CONTENT.brand.name + ' — new signup from ' + name,
      _template: 'table', _captcha: 'false'
    };

    fetch('https://formsubmit.co/ajax/' + encodeURIComponent(LEAD.email), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json(); }).then(function(res){
      if(res && (res.success === 'true' || res.success === true)){
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      } else {
        throw new Error('formsubmit rejected');
      }
    }).catch(function(){
      status.innerHTML = 'Something didn\'t go through — text us directly at <strong>' + esc(CONTENT.brand.phone) + '</strong> instead.';
      status.classList.add('err');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign me up';
    });
  });

  /* ---------- boot ---------- */
  /* boot handed to base.js */

  window.renderContent = renderContent;
})();
