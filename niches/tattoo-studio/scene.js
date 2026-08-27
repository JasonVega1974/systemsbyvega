/* tattoo-studio/scene.js — NO SIGNATURE ANIMATION.
   This site arrived without one: its only requestAnimationFrame is a toast
   fade. Per SITELAB_TEMPLATE.md §9.3 that is a Phase 3 gap, deliberately not
   filled during consolidation so the conversion diff stays reviewable.
   qa-site.js reports it every run until it is built.
   Contract when it is: check reduce FIRST, rAF, self-terminate, clear transform. */
window.initScene = function (reduce) {
  if (reduce) return;
  /* TODO (Phase 3): ink bleeding into the linework, settling to the finished piece */
};
