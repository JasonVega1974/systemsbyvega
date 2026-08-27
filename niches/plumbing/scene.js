/* plumbing/scene.js — the signature animation, extracted verbatim from the
   original's main script. base.js calls window.initScene(reduce) after first
   render; the block below closes over that parameter exactly as it closed over
   the outer-scope `reduce` before, so the reduced-motion path is unchanged. */
window.initScene = function (reduce) {
// ---------- gravity-accelerated drop physics (drip calculator) — north-star: dj-site-blue requestAnimationFrame physics ----------
(function(){
  var cv = document.getElementById('dropCanvas');
  if(!cv || reduce) return;                        // reduced-motion: static faucet only, no drops
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var GRAV = 0.17;                                 // gravity acceleration (px/frame^2)
  var drops = [], ripples = [], acc = 0;
  var spoutX = W*0.5, spoutY = 3, poolY = H - 8;
  function frame(){
    ctx.clearRect(0,0,W,H);
    var pg = ctx.createLinearGradient(0,poolY-5,0,H);
    pg.addColorStop(0,'rgba(46,111,242,0)'); pg.addColorStop(1,'rgba(46,111,242,.30)');
    ctx.fillStyle = pg; ctx.fillRect(0,poolY,W,H-poolY);
    var rate = window.__dripRate || 40;
    acc += rate/3600;                              // drops/min -> drops/frame at ~60fps
    while(acc >= 1){ drops.push({x:spoutX+(Math.random()-.5)*1.6, y:spoutY, vy:0.4, r:2.3+Math.random()*0.8}); acc -= 1; }
    for(var i=drops.length-1;i>=0;i--){
      var d = drops[i];
      d.vy += GRAV; d.y += d.vy;                    // gravity: real acceleration + momentum
      if(d.y >= poolY){ ripples.push({x:d.x,y:poolY,r:1,a:.5}); drops.splice(i,1); continue; }
      var stretch = Math.min(1.9, 1 + d.vy*0.06);  // drop elongates with speed
      var g = ctx.createRadialGradient(d.x-0.8, d.y-d.r, 0.4, d.x, d.y, d.r*1.5);
      g.addColorStop(0,'rgba(234,244,255,.95)'); g.addColorStop(.4,'rgba(127,176,255,.85)'); g.addColorStop(1,'rgba(27,63,143,.9)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r*stretch, 0, 0, Math.PI*2); ctx.fill();
    }
    for(var j=ripples.length-1;j>=0;j--){
      var rp = ripples[j]; rp.r += 0.7; rp.a -= 0.03;
      if(rp.a <= 0){ ripples.splice(j,1); continue; }
      ctx.strokeStyle = 'rgba(127,176,255,'+rp.a.toFixed(3)+')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rp.r, rp.r*0.4, 0, 0, Math.PI*2); ctx.stroke();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
};
