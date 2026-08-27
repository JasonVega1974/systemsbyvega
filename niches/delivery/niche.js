/* delivery/niche.js — this niche's renderer and interactive logic.
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
/* ---------- render ---------- */
  function renderContent(c){
    document.querySelectorAll('[data-brand]').forEach(function(el){ el.textContent = c.brand.name; });
    document.querySelectorAll('[data-city]').forEach(function(el){ el.textContent = c.brand.city; });
    var telLink = telHref(c.brand.phone);
    document.querySelectorAll('[data-phone]').forEach(function(el){ el.href = 'tel:' + telLink; el.textContent = c.brand.phone; });
    document.querySelectorAll('[data-phone-link]').forEach(function(el){ el.href = 'tel:' + telLink; el.textContent = 'Call or text ' + c.brand.phone; });
    document.querySelectorAll('.mobile-cta .call').forEach(function(el){ el.href = 'tel:' + telLink; });
    document.querySelectorAll('.mobile-cta .text').forEach(function(el){ el.href = 'sms:' + telLink + '?body=' + encodeURIComponent('Hi ' + c.brand.name + ', I need a pickup'); });

    // trust stats
    document.getElementById('trustStats').innerHTML = c.stats.map(function(s){
      return '<div class="tstat"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('');

    // services
    var svcIcos = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="8" rx="1"/><path d="M7 10V6h10v4"/><circle cx="8" cy="20" r="1.4"/><circle cx="16" cy="20" r="1.4"/></svg>'
    ];
    document.getElementById('svcGrid').innerHTML = c.services.map(function(s, i){
      return '<div class="svc"><span class="s-ico">' + svcIcos[i % svcIcos.length] + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p></div>';
    }).join('');

    // quoter
    renderQuoter(c);

    // dispatch
    document.getElementById('dispatchGrid').innerHTML = c.dispatch.map(function(st){
      return '<div class="how-card"><h3>' + esc(st.title) + '</h3><p>' + esc(st.desc) + '</p></div>';
    }).join('');

    // business
    document.getElementById('bizGrid').innerHTML = c.business.map(function(b){
      return '<div class="biz"><h3>' + esc(b.title) + '</h3><p>' + esc(b.desc) + '</p></div>';
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

  /* ---------- zone-to-zone quoter ---------- */
  var sel = { pickup: 2, drop: 0, size: 1, speed: 1 };

  /* Zone centroids (index-matched to content.json.quoterZones). The map GEOMETRY is
     static SVG in the markup (renders JS-off); these only position the rAF route draw
     + endpoint glows. Short static default labels live in the SVG; wrapLabel() below
     re-flows the live content.json names over them at runtime. */
  var ZONE_C = [
    { x: 470, y: 175 }, // 0
    { x: 356, y: 140 }, // 1
    { x: 271, y: 235 }, // 2
    { x: 215, y: 110 }, // 3
    { x: 120, y: 215 }, // 4
    { x: 356, y: 350 }, // 5
    { x: 555, y: 325 }  // 6
  ];
  var mapMode = 'pickup';   // which endpoint the next map tap sets
  var routeKey = '';        // last drawn pickup-drop pair (animate only on change)

  function pillRow(elId, items, key, subFn){
    document.getElementById(elId).innerHTML = items.map(function(it, i){
      var on = sel[key] === i;
      return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-qk="' + key + '" data-qi="' + i + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        esc(it.label) + (subFn ? '<small>' + esc(subFn(it)) + '</small>' : '') + '</button>';
    }).join('');
  }

  function bands(c){
    return String((c.quoterSettings || {}).bands || '').split(',').map(function(b){ return num(b, 0); }).filter(function(n){ return n > 0; });
  }

  function renderQuoter(c){
    var zones = c.quoterZones || [], sizes = c.quoterSizes || [], speeds = c.quoterSpeeds || [];
    if(sel.pickup >= zones.length) sel.pickup = 0;
    if(sel.drop >= zones.length) sel.drop = 0;
    if(sel.size >= sizes.length) sel.size = 0;
    if(sel.speed >= speeds.length) sel.speed = 0;
    pillRow('pickupPills', zones, 'pickup');
    pillRow('dropPills', zones, 'drop');
    pillRow('sizePills', sizes, 'size', function(s){ return '×' + num(s.mult, 1); });
    pillRow('speedPills', speeds, 'speed', function(s){ return '×' + num(s.mult, 1); });
    document.getElementById('quoteNote').textContent = (c.quoterSettings || {}).note || '';

    var wrap = document.getElementById('quote');
    if(!wrap._wired){
      wrap._wired = true;
      wrap.addEventListener('click', function(e){
        var pill = e.target.closest('[data-qk]');
        if(pill){
          sel[pill.getAttribute('data-qk')] = +pill.getAttribute('data-qi');
          renderQuoter(CONTENT);
          return;
        }
        var zn = e.target.closest('[data-mapzone]');
        if(zn) tapMapZone(+zn.getAttribute('data-mapzone'));
      });
      wrap.addEventListener('keydown', function(e){
        var zn = e.target.closest('[data-mapzone]');
        if(zn && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')){
          e.preventDefault();
          tapMapZone(+zn.getAttribute('data-mapzone'));
        }
      });
    }
    syncMap(c);
    updateQuote(c);
  }

  /* Two-tap map selection: first tap sets pickup, next sets drop, then repeats.
     Sets the same sel.* state the pills use, so the quote + pills stay in lock-step. */
  function tapMapZone(i){
    var zones = CONTENT.quoterZones || [];
    if(i < 0 || i >= zones.length) return;
    if(mapMode === 'pickup'){ sel.pickup = i; mapMode = 'drop'; }
    else { sel.drop = i; mapMode = 'pickup'; }
    renderQuoter(CONTENT);
  }

  /* wrap a live zone label across up to two <tspan> lines centred on its centroid */
  function wrapLabel(el, label, cx){
    while(el.firstChild) el.removeChild(el.firstChild);
    var words = String(label || '').split(/\s+/).filter(Boolean), lines = [label || ''];
    if(words.length > 1 && String(label).length > 11){
      var best = 1, bestDiff = 1e9, joined = words.join(' ');
      for(var k = 1; k < words.length; k++){
        var a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
        var diff = Math.abs(a.length - b.length);
        if(diff < bestDiff){ bestDiff = diff; best = k; }
      }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
      void joined;
    }
    var y0 = parseFloat(el.getAttribute('y')) - (lines.length - 1) * 6.5;
    lines.forEach(function(ln, idx){
      var ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      ts.setAttribute('x', cx); ts.setAttribute('y', (y0 + idx * 13).toFixed(1));
      ts.textContent = ln;
      el.appendChild(ts);
    });
  }

  /* Bind live DATA onto the STATIC base map (geometry never moves): names, aria,
     show/hide + pickup/drop highlight classes. Then (re)draw the route. */
  function syncMap(c){
    var zones = c.quoterZones || [];
    for(var i = 0; i < ZONE_C.length; i++){
      var path = document.querySelector('#zoneMap .mp-zn[data-mapzone="' + i + '"]');
      var name = document.querySelector('#zoneMap [data-zn="' + i + '"]');
      var sub  = document.querySelector('#zoneMap [data-zs="' + i + '"]');
      var z = zones[i], has = !!z;
      if(path){
        path.style.display = has ? '' : 'none';
        path.classList.toggle('pickup', has && sel.pickup === i);
        path.classList.toggle('drop', has && sel.drop === i && sel.drop !== sel.pickup);
        var role = (sel.pickup === i ? ' (pickup)' : sel.drop === i ? ' (drop-off)' : '');
        if(z) path.setAttribute('aria-label', z.label + ' zone' + role);
        path.setAttribute('aria-pressed', (has && (sel.pickup === i || sel.drop === i)) ? 'true' : 'false');
      }
      if(name){ name.style.display = has ? '' : 'none'; if(z) wrapLabel(name, z.label, +name.getAttribute('x')); }
      if(sub){ sub.style.display = has ? '' : 'none'; }
    }
    var mode = document.getElementById('mapMode');
    if(mode){
      mode.innerHTML = mapMode === 'pickup'
        ? 'Tap a region to set your <b>pickup</b> zone'
        : 'Now tap your <b style="color:#6FE3FF">drop-off</b> zone';
    }
    drawRoute();
  }

  /* rAF physics: an eased dash-draw sweeps the route line pickup -> drop while a marker
     rides along it, and damped-spring glows bloom at both ends — the momentum/decay feel
     of the north-star (dj-site-blue) rAF loop. Reduced-motion snaps to the final state. */
  function springPulse(el, cx, cy, target){
    if(el._raf) cancelAnimationFrame(el._raf);
    el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('opacity', '0.95');
    if(reduce){ el.setAttribute('r', target); return; }
    var r = 3, v = 0, k = 0.15, damp = 0.62, last = performance.now();
    function step(now){
      var dt = Math.min(2.5, (now - last) / 16.67); last = now;
      v = (v + (target - r) * k) * damp; r += v * dt;
      /* The spring can overshoot below zero on the first frames (r starts at 3
         and v is unbounded), and <circle r="-0.16"> is an SVG error the browser
         logs and then ignores. Clamp the ATTRIBUTE, not r itself — the spring
         must keep its real value or the damping stops converging. */
      el.setAttribute('r', Math.max(0, r).toFixed(2));
      if(Math.abs(target - r) > 0.4 || Math.abs(v) > 0.25){ el._raf = requestAnimationFrame(step); }
      else { el.setAttribute('r', target); }
    }
    el._raf = requestAnimationFrame(step);
  }

  function drawRoute(){
    var route = document.getElementById('mpRoute'), veh = document.getElementById('mpVeh');
    var a = ZONE_C[sel.pickup], b = ZONE_C[sel.drop];
    if(!route || !a || !b) return;
    var pulseA = document.getElementById('mpPulseA'), pulseB = document.getElementById('mpPulseB');

    // same zone -> a tight loop marker, no line
    if(sel.pickup === sel.drop){
      route.setAttribute('opacity', '0'); if(veh) veh.setAttribute('opacity', '0');
      if(pulseA) springPulse(pulseA, a.x, a.y, 60);
      if(pulseB) pulseB.setAttribute('opacity', '0');
      routeKey = sel.pickup + '-' + sel.drop;
      return;
    }

    // gentle arced path (control point offset perpendicular to the A->B chord)
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx*dx + dy*dy) || 1;
    var off = Math.min(70, len * 0.22);
    var cx = mx - (dy / len) * off, cy = my - (dx / len) * -off;
    route.setAttribute('d', 'M' + a.x + ',' + a.y + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + b.x + ',' + b.y);

    if(pulseA) springPulse(pulseA, a.x, a.y, 54);
    if(pulseB) springPulse(pulseB, b.x, b.y, 48);

    var total = route.getTotalLength();
    var key = sel.pickup + '-' + sel.drop;
    route.setAttribute('opacity', '1');
    route.style.strokeDasharray = total;

    if(reduce || key === routeKey){
      route.style.strokeDashoffset = '0';
      if(veh){ var end = route.getPointAtLength(total); veh.setAttribute('cx', end.x); veh.setAttribute('cy', end.y); veh.setAttribute('opacity', reduce ? '1' : '0'); }
      routeKey = key;
      return;
    }
    routeKey = key;

    // eased draw-on with an ease-out decay curve + a marker riding the growing tip
    if(veh) veh.setAttribute('opacity', '1');
    var start = performance.now(), dur = 900;
    if(route._raf) cancelAnimationFrame(route._raf);
    function step(now){
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - t, 3); // cubic ease-out (decay)
      route.style.strokeDashoffset = (total * (1 - e)).toFixed(1);
      if(veh){ var p = route.getPointAtLength(total * e); veh.setAttribute('cx', p.x.toFixed(1)); veh.setAttribute('cy', p.y.toFixed(1)); }
      if(t < 1){ route._raf = requestAnimationFrame(step); }
    }
    route._raf = requestAnimationFrame(step);
  }

  function quoteParts(c){
    var zones = c.quoterZones || [], sizes = c.quoterSizes || [], speeds = c.quoterSpeeds || [];
    var z1 = zones[sel.pickup], z2 = zones[sel.drop], sz = sizes[sel.size], sp = speeds[sel.speed];
    if(!z1 || !z2 || !sz || !sp) return null;
    var bd = bands(c);
    if(!bd.length) bd = [15];
    var dist = Math.min(Math.abs(sel.pickup - sel.drop), bd.length - 1);
    var base = bd[dist];
    var minimum = num((c.quoterSettings || {}).minimum, 0);
    var total = Math.max(minimum, Math.round(base * num(sz.mult, 1) * num(sp.mult, 1)));
    return { z1: z1, z2: z2, sz: sz, sp: sp, dist: dist, base: base, minimum: minimum, total: total };
  }

  function updateQuote(c){
    var q = quoteParts(c);
    if(!q) return;
    var apart = q.dist === 0 ? 'same zone' : q.dist + (q.dist === 1 ? ' zone apart' : ' zones apart');
    document.getElementById('qBreakdown').innerHTML =
      '<div class="qp-line"><span>' + esc(q.z1.label) + ' → ' + esc(q.z2.label) + ' <span class="mono">(' + esc(apart) + ')</span></span><b>$' + q.base + '</b></div>' +
      '<div class="qp-line"><span>' + esc(q.sz.label) + '</span><b>×' + num(q.sz.mult, 1) + '</b></div>' +
      '<div class="qp-line"><span>' + esc(q.sp.label) + '</span><b>×' + num(q.sp.mult, 1) + '</b></div>';
    document.getElementById('qTotal').textContent = '$' + q.total;
    document.getElementById('qMin').textContent = q.minimum ? 'Every run has a $' + q.minimum + ' minimum. The quoted price is the full price.' : '';
    var summary = q.z1.label + ' → ' + q.z2.label + ' · ' + q.sz.label + ' · ' + q.sp.label + ' — $' + q.total;
    var smsA = document.getElementById('quoteSms');
    smsA.href = 'sms:' + telHref(c.brand.phone) + '?body=' + encodeURIComponent('Hi ' + c.brand.name + ', quote please: ' + summary);
    updateQuote._summary = summary;
  }

  document.getElementById('quoteBook').addEventListener('click', function(){
    var s = document.getElementById('qSummary');
    if(updateQuote._summary) s.value = updateQuote._summary;
    document.getElementById('book').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function(){ document.getElementById('qName').focus({ preventScroll: true }); }, reduce ? 0 : 450);
  });

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
      business: document.getElementById('qBiz').value.trim() || '(not given)',
      pickup: document.getElementById('qPickup').value.trim() || '(not given)',
      dropoff: document.getElementById('qDrop').value.trim() || '(not given)',
      when: document.getElementById('qWhen').value,
      summary: document.getElementById('qSummary').value.trim() || '(quoter not used)',
      notes: document.getElementById('qNotes').value.trim(),
      _subject: CONTENT.brand.name + ' — new pickup request from ' + name,
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
      submitBtn.textContent = 'Book my pickup';
    });
  });

  /* ---------- boot ---------- */
  /* boot handed to base.js */

  window.renderContent = renderContent;
})();
