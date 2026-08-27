/* auto-body/niche.js — this niche's renderer and interactive logic.
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
    document.querySelectorAll('[data-city-inline]').forEach(function(el){ el.textContent = c.brand.city; });
    var telLink = telHref(c.brand.phone);
    document.querySelectorAll('[data-phone]').forEach(function(el){ el.href = 'tel:' + telLink; el.textContent = c.brand.phone; });
    document.querySelectorAll('[data-phone-link]').forEach(function(el){ el.href = 'tel:' + telLink; el.textContent = 'Call or text ' + c.brand.phone; });
    document.querySelectorAll('.mobile-cta .call').forEach(function(el){ el.href = 'tel:' + telLink; });
    document.querySelectorAll('.mobile-cta .text').forEach(function(el){ el.href = 'sms:' + telLink + '?body=' + encodeURIComponent('Hi ' + c.brand.name + ', can you take a look at some damage?'); });

    // trust stats
    document.getElementById('trustStats').innerHTML = c.stats.map(function(s){
      return '<div class="tstat"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('');

    // repair stages (signature)
    renderStages(c);
    document.getElementById('revealNote').textContent = c.revealNote || '';

    // services
    var icos = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 7l-8.5 8.5a2.1 2.1 0 1 0 3 3L17 10"/><path d="M9 5l4-2 6 6-2 4-8-8z"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 4 6 6.6 6 10a6 6 0 0 1-12 0c0-3.4 3-6 6-10z"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="6" rx="3"/><path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4-3h10l4 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 8h18"/></svg>'
    ];
    document.getElementById('svcGrid').innerHTML = c.services.map(function(s, i){
      return '<div class="svc"><span class="s-ico">' + icos[i % icos.length] + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p></div>';
    }).join('');

    // claims
    document.getElementById('claimsGrid').innerHTML = c.claims.map(function(st){
      return '<div class="ccard"><h3>' + esc(st.title) + '</h3><p>' + esc(st.desc) + '</p></div>';
    }).join('');
    document.getElementById('claimsNote').textContent = c.claimsNote || '';

    // process
    document.getElementById('procList').innerHTML = c.process.map(function(p, i){
      return '<div class="pstep"><span class="pn">' + (i + 1) + '</span><div><h3>' + esc(p.title) + '</h3><p>' + esc(p.desc) + '</p></div></div>';
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

  /* ---------- signature: Repair Reveal slider + stage strip ---------- */
  var pos = 50, activeStage = -1;

  function renderStages(c){
    var stages = c.repairStages || [];
    document.getElementById('stagesStrip').innerHTML = stages.map(function(s, i){
      return '<button type="button" class="stage" data-stage="' + i + '" aria-pressed="false"><span class="n">' + (i + 1) + '</span>' + esc(s.name) + '</button>';
    }).join('');
    updateStage(true);
  }

  /* Map slider position to repair progress: pos=100 shows all damage
     (start of the job, stage 1), pos=0 shows the finished car (last stage). */
  function stageForPos(){
    var stages = (CONTENT.repairStages || []);
    if(!stages.length) return -1;
    var progress = 100 - pos;
    return Math.min(stages.length - 1, Math.floor(progress / (100 / stages.length)));
  }
  function updateStage(force){
    var idx = stageForPos();
    if(idx === activeStage && !force) return;
    activeStage = idx;
    var stages = CONTENT.repairStages || [];
    document.querySelectorAll('#stagesStrip .stage').forEach(function(el, i){
      el.classList.toggle('on', i === idx);
      el.classList.toggle('done', i < idx);
      el.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
    });
    var blurb = document.getElementById('stageBlurb');
    blurb.textContent = (stages[idx] && stages[idx].blurb) || '';
  }

  var ba = document.getElementById('ba');
  var touched = false, dragging = false;
  function setPos(p){
    pos = Math.max(0, Math.min(100, p));
    ba.style.setProperty('--pos', pos + '%');
    ba.setAttribute('aria-valuenow', Math.round(pos));
    updateStage();
  }
  function xToPct(clientX){
    var r = ba.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }
  function markTouched(){ if(!touched){ touched = true; ba.classList.add('touched'); } }
  function start(e){ dragging = true; markTouched(); move(e); }
  function move(e){
    if(!dragging) return;
    var x = (e.touches ? e.touches[0].clientX : e.clientX);
    setPos(xToPct(x));
    if(e.cancelable) e.preventDefault();
  }
  function end(){ dragging = false; }

  ba.addEventListener('mousedown', start);
  window.addEventListener('mousemove', move, { passive: false });
  window.addEventListener('mouseup', end);
  ba.addEventListener('touchstart', start, { passive: false });
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
  ba.addEventListener('keydown', function(e){
    if(e.key === 'ArrowLeft'){ setPos(pos - 4); e.preventDefault(); markTouched(); }
    if(e.key === 'ArrowRight'){ setPos(pos + 4); e.preventDefault(); markTouched(); }
    if(e.key === 'Home'){ setPos(100); e.preventDefault(); markTouched(); }
    if(e.key === 'End'){ setPos(0); e.preventDefault(); markTouched(); }
  });

  /* stage pills jump the slider to the middle of that stage's band */
  document.getElementById('stagesStrip').addEventListener('click', function(e){
    var b = e.target.closest('[data-stage]');
    if(!b) return;
    markTouched();
    var stages = CONTENT.repairStages || [];
    var band = 100 / (stages.length || 1);
    var i = +b.getAttribute('data-stage');
    setPos(100 - (i * band + band / 2));
  });

  /* gentle auto-nudge on first view to signal it drags */
  if(!reduce && 'IntersectionObserver' in window){
    var ioNudge = new IntersectionObserver(function(en){
      en.forEach(function(x){
        if(x.isIntersecting && !touched){
          var seq = [68, 32, 50], k = 0;
          var t = setInterval(function(){
            if(touched){ clearInterval(t); return; }
            setPos(seq[k++]); if(k >= seq.length) clearInterval(t);
          }, 520);
          ioNudge.unobserve(ba);
        }
      });
    }, { threshold: .5 });
    ioNudge.observe(ba);
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
      vehicle: document.getElementById('qVehicle').value.trim() || '(not given)',
      damage: document.getElementById('qDamage').value.trim() || '(not described)',
      paying: document.getElementById('qPay').value,
      _subject: CONTENT.brand.name + ' — new estimate request from ' + name,
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
      submitBtn.textContent = 'Get my estimate';
    });
  });

  /* ---------- boot ---------- */
  /* boot handed to base.js */

  window.renderContent = renderContent;
})();
