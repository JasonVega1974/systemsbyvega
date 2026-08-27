/* dog-walking/scene.js — the signature animation, extracted verbatim from the
   original's main script. base.js calls window.initScene(reduce) after first
   render; the block below closes over that parameter exactly as it closed over
   the outer-scope `reduce` before, so the reduced-motion path is unchanged. */
window.initScene = function (reduce) {
/* Hero ambient scene — additive motion only; the SVG scene is fully static without this.
   north-star: dj-site-blue — a requestAnimationFrame loop with genuine physics decay curves
   (gravity + restitution on the ball, an energy-decaying spring burst on the tail). */
(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return; // reduced motion: scene keeps its static resting pose
  var g = function(id){ return document.getElementById(id); };
  var sun=g('scene-sunrays'), cA=g('scene-cloud-a'), cB=g('scene-cloud-b'),
      bird=g('pet-bird-1'), tail=g('scene-dog-tail'), ball=g('scene-ball'),
      gr1=g('scene-grass-1'), gr2=g('scene-grass-2');
  if(!ball && !tail && !sun) return;

  // ball physics: gravity integration with restitution (energy loss each bounce)
  var by=-260, bv=0, bx=0, bvx=54, G=1400, REST=0.74;
  var t0=performance.now(), last=t0, raf;

  function frame(now){
    var t=(now-t0)/1000, dt=Math.min(0.05,(now-last)/1000); last=now;

    if(sun)  sun.setAttribute('transform','rotate('+ (t*6) +' 860 150)');            // slow ray spin
    if(cA)   cA.setAttribute('transform','translate('+ (Math.sin(t*0.18)*26) +' '+ (Math.sin(t*0.5)*4) +')');   // eased drift
    if(cB)   cB.setAttribute('transform','translate('+ (Math.cos(t*0.13)*34) +' '+ (Math.sin(t*0.4+1)*5) +')');
    if(bird) bird.setAttribute('transform','translate('+ (Math.sin(t*0.5)*64) +' '+ (Math.sin(t*1.6)*10) +')');

    // tail: energy-decaying spring burst that re-excites every ~2.2s (physics decay curve)
    if(tail){ var burst=Math.exp(-((t%2.2))*1.5); var a=Math.sin(t*15)*18*burst + Math.sin(t*3)*2.5;
      tail.setAttribute('transform','rotate('+a+' 578 578)'); }

    // ball: integrate gravity, bounce with restitution, re-launch when it settles
    bv+=G*dt; by+=bv*dt; bx+=bvx*dt;
    if(by>0){ by=0; bv=-bv*REST; if(Math.abs(bv)<40) bv=-630; }
    if(bx>150||bx<-150) bvx=-bvx;
    if(ball) ball.setAttribute('transform','translate('+bx.toFixed(1)+' '+by.toFixed(1)+')');

    // grass: light damped sway about each tuft base
    var sway=Math.sin(t*1.3)*3 + Math.sin(t*2.7)*1.2;
    if(gr1) gr1.setAttribute('transform','rotate('+ sway.toFixed(2) +' 118 700)');
    if(gr2) gr2.setAttribute('transform','rotate('+ (-sway*0.8).toFixed(2) +' 1090 700)');

    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
})();
};
