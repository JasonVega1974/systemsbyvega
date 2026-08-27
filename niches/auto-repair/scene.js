/* auto-repair/scene.js — the animation lives in niche.js.
   carTick — a damped spring (STIFF 210 / DAMP 22) lighting the bay zone for the selected symptom, with overshoot so the highlight pops then settles
   It is a helper the RENDERER calls, not a standalone scene, so extracting it
   would split a function from its callers (SITELAB_TEMPLATE.md 7.0, D-P).
   qa-site.js grades the animation wherever it lives. */
window.initScene = function (reduce) { /* see niche.js */ };
