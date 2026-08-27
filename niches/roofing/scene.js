/* roofing/scene.js — the animation lives in niche.js.
   stepGlow — damped-spring glow across the roof self-check
   It is a helper the RENDERER calls, not a standalone scene, so extracting it
   would split a function from its callers (SITELAB_TEMPLATE.md 7.0, D-P).
   qa-site.js grades the animation wherever it lives. */
window.initScene = function (reduce) { /* see niche.js */ };
