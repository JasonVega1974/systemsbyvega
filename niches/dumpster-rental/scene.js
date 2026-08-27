/* dumpster-rental/scene.js — the signature animation: a damped-spring bin drop.
   Contract (SITELAB_TEMPLATE.md §7): check reduced motion FIRST, use rAF,
   self-terminate, and remove the transform once settled. */
window.initScene = function (reduce) {
  if (reduce) return;                       // static scene already rendered
  var rig = document.querySelector('.bin-rig');
  if (!rig || typeof requestAnimationFrame !== 'function') return;

  var y = -34, v = 0;      // start above rest, zero velocity
  var k = 150, c = 15;     // stiffness + damping -> one gentle overshoot
  var last = null, settled = 0;

  function step(ts) {
    if (last === null) last = ts;
    var dt = Math.min(0.032, (ts - last) / 1000); last = ts;
    var a = -k * y - c * v;                 // Hooke + viscous damping
    v += a * dt; y += v * dt;
    rig.setAttribute('transform', 'translate(0 ' + y.toFixed(2) + ')');
    if (Math.abs(y) < 0.15 && Math.abs(v) < 0.15) settled++; else settled = 0;
    if (settled < 4) requestAnimationFrame(step);
    else rig.removeAttribute('transform');  // leave nothing in the compositor
  }
  requestAnimationFrame(step);
};
