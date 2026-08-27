/* dj/scene.js — the signature animation, extracted verbatim from the
   original's main script. base.js calls window.initScene(reduce) after first
   render; the block below closes over that parameter exactly as it closed over
   the outer-scope `reduce` before, so the reduced-motion path is unchanged. */
window.initScene = function (reduce) {
  /* $ lives in niche.js's closure; scene.js is a separate script and cannot
   see it, so the scene carries its own. */
const $=s=>document.querySelector(s);
const c=$('#sky'), ctx=c.getContext('2d');
    /* Palette from the active theme, read once. The gradient is built in JS,
       so without this all three themes would render a blue visualiser. */
    const _CS=getComputedStyle(document.documentElement);
    const TOK=n=>_CS.getPropertyValue(n).trim();
  /* reduce is initScene's parameter — base.js owns the media query */
  const TAU=Math.PI*2;
  const hash=n=>{ const s=Math.sin(n*12.9898)*43758.545; return s-Math.floor(s); };
  let W,H,DPR,parts=[],bars=0,raf,t0=performance.now();

  function size(){
    DPR=Math.min(devicePixelRatio||1,2);
    W=c.width=innerWidth*DPR; H=c.height=c.offsetHeight*DPR;
    bars=Math.max(26, Math.round((W/DPR)/7));    // dense + responsive
  }
  function seed(){
    parts=[]; const n=Math.round((W/DPR)/16);
    for(let i=0;i<n;i++) parts.push({
      x:Math.random()*W, y:Math.random()*H, r:(Math.random()*1.5+.4)*DPR,
      s:(Math.random()*.45+.12)*DPR, a:Math.random()*.55+.2, hue:Math.random()<.5?TOK('--accent-2'):TOK('--accent-3')
    });
  }
  // per-bar amplitude (0..~1.5). i: bar index, now: seconds, kick: beat envelope
  function amp(i, now, kick){
    const p=i/(bars-1), treble=p, h1=hash(i), h2=hash(i+97);
    const spd=2.2+treble*15, ph=h1*TAU;
    let a = 0.55*Math.abs(Math.sin(now*spd+ph))            // fast detail
          + 0.30*Math.abs(Math.sin(now*spd*0.5+h2*TAU))    // mid body
          + 0.25*(0.5+0.5*Math.sin(now*1.6+p*7));          // slow common swell
    a *= 0.70+0.30*(0.5+0.5*Math.sin(p*9-now*3.2));        // traveling sweep across
    a += kick*(1-treble)*0.95 + kick*0.12;                 // beat: bass slams hardest
    a *= 0.75+0.25*h2;                                     // per-bar variety
    const env=Math.pow(Math.sin(p*Math.PI),0.55);          // taper the edges
    return a*(0.30+0.70*env);
  }
  function bar(x,y,w,h,r){
    if(h<=0) return;
    if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); }
    else ctx.fillRect(x,y,w,h);
  }
  function frame(now){
    const baseY=H*0.89, maxUp=H*0.103, maxDown=H*0.038;
    const slot=W/bars, bw=Math.max(2*DPR, slot*0.56), r=bw*0.5;
    const bps=126/60, kick=Math.pow(1-((now*bps)%1),4);    // 126 BPM kick

    ctx.clearRect(0,0,W,H);

    // embers drifting up (behind)
    for(const pt of parts){
      pt.y-=pt.s; pt.x+=Math.sin(now+pt.y*0.01)*0.2*DPR;
      if(pt.y<-10){ pt.y=H+10; pt.x=Math.random()*W; }
      ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.r,0,TAU);
      ctx.fillStyle=pt.hue; ctx.globalAlpha=pt.a*(0.45+0.45*Math.sin(now*2+pt.x));
      ctx.fill();
    }
    ctx.globalAlpha=1;

    // precompute amplitudes once
    const A=new Array(bars);
    for(let i=0;i<bars;i++) A[i]=Math.min(amp(i,now,kick),1.5);

    const grad=ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0,TOK('--accent-alt')); grad.addColorStop(.5,TOK('--accent')); grad.addColorStop(1,TOK('--accent-2'));

    // reflection below the horizon (draw first, dim)
    ctx.globalAlpha=0.18; ctx.fillStyle=grad;
    for(let i=0;i<bars;i++){ const x=i*slot+(slot-bw)/2; bar(x, baseY+1, bw, A[i]*maxDown, r); }
    ctx.globalAlpha=1;

    // main bars
    ctx.fillStyle=grad;
    for(let i=0;i<bars;i++){ const x=i*slot+(slot-bw)/2; bar(x, baseY-A[i]*maxUp, bw, A[i]*maxUp, r); }

    // bright glowing tips
    ctx.fillStyle=TOK('--ink-bright'); ctx.globalAlpha=0.92;
    for(let i=0;i<bars;i++){
      const up=A[i]*maxUp; if(up<bw) continue;
      bar(i*slot+(slot-bw)/2, baseY-up, bw, Math.min(bw,3.4*DPR), r);
    }
    ctx.globalAlpha=1;

    // glowing horizon line
    ctx.strokeStyle=grad; ctx.lineWidth=2*DPR;
    ctx.shadowColor=TOK('--accent'); ctx.shadowBlur=16*DPR;
    ctx.beginPath(); ctx.moveTo(0,baseY); ctx.lineTo(W,baseY); ctx.stroke();
    ctx.shadowBlur=0;
  }
  function loop(){ frame((performance.now()-t0)/1000); raf=requestAnimationFrame(loop); }
  function start(){ size(); seed(); cancelAnimationFrame(raf); reduce?frame(2):loop(); }
  addEventListener('resize',()=>{ clearTimeout(window._rz); window._rz=setTimeout(start,150); });
  start();
};
