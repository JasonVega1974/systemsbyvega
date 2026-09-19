/* Guided onboarding tour — step content, navigation state, the
   hidden-section skip (a section an Admin turned off via Customize
   Visibility must never strand the tour or highlight nothing), and
   completion persistence. Real spotlight positioning (placeTourBox's
   pixel math) is a DOM-layout concern verified in the browser pass, not
   here — this file exercises the state machine around it. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null, tour_completed: null };

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || (() => {
    const classes = new Set();
    return { value: '', textContent: '', innerHTML: '', style: {},
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle(){}, contains: c => classes.has(c) },
      addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, scrollIntoView(){} };
  })());
}
// A visible nav item has real (non-zero) layout; a hidden one (an Admin
// turned its section off via Customize Visibility) reports offsetParent
// null, exactly like a real display:none element would.
function navItem(visible) {
  return {
    offsetParent: visible ? {} : null,
    getBoundingClientRect: () => (visible ? { width: 90, height: 40, top: 120, left: 10, right: 100, bottom: 160 } : { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
    scrollIntoView() {}, offsetWidth: 340, offsetHeight: 180, style: {}, className: ''
  };
}
function stubQuerySelector(hiddenSections) {
  hiddenSections = hiddenSections || [];
  ctx.document.querySelector = sel => {
    const m = sel.match(/data-section="([a-z]+)"/);
    const section = m ? m[1] : null;
    return navItem(!hiddenSections.includes(section));
  };
}

(async () => {

group('TOUR_STEPS covers the seven specified sections, in order');
const expectedSections = ['overview', 'notifications', 'academy', 'procedures', 'scheduling', 'incidents', 'team'];
check('exactly 7 steps', T.TOUR_STEPS.length === 7, T.TOUR_STEPS.length);
check('sections match the spec, in order', JSON.stringify(T.TOUR_STEPS.map(s => s.section)) === JSON.stringify(expectedSections), T.TOUR_STEPS.map(s => s.section));
check('every step has a non-empty title and body', T.TOUR_STEPS.every(s => s.t && s.h), T.TOUR_STEPS);

group('showTourStep() populates the overlay for a visible target');
T.currentProfile = ADMIN; T.adminOn = true;
stubQuerySelector([]);
ctx.document.getElementById = els();
ctx.showTourStep(0);
check('step index 0 shows the Dashboard title', ctx.document.getElementById('tourTitle').textContent === 'Dashboard');
check('step counter reads "1 / 7"', ctx.document.getElementById('tourStepNo').textContent === '1 / 7');
check('Previous is hidden on the first step', ctx.document.getElementById('tourBack').style.visibility === 'hidden');
check('Next reads "Next", not "Got it", before the last step', ctx.document.getElementById('tourNext').textContent === 'Next');
check('the overlay is open', ctx.document.getElementById('tourOverlay').classList.contains('open'));

ctx.showTourStep(6);
check('the last step shows "Got it" instead of "Next"', ctx.document.getElementById('tourNext').textContent === 'Got it');
check('Previous is visible past the first step', ctx.document.getElementById('tourBack').style.visibility === 'visible');
check('the last step\'s title is Team', ctx.document.getElementById('tourTitle').textContent === 'Team');

group('showTourStep() skips a section an Admin has hidden, in the direction already moving');
stubQuerySelector(['academy']); // step index 2
ctx.document.getElementById = els();
// Attempting to show the hidden Academy step (index 2) while moving forward
// should recurse to index 3 (Emergency Procedures), not show Academy at all.
ctx.showTourStep(2, 1);
check('forward navigation skips the hidden Academy step and lands on Emergency Procedures', ctx.document.getElementById('tourTitle').textContent === 'Emergency Procedures');

stubQuerySelector(['academy']);
ctx.document.getElementById = els();
// Same attempt, moving backward this time — should recurse to index 1 (Alerts).
ctx.showTourStep(2, -1);
check('backward navigation skips the hidden Academy step and lands on Alerts', ctx.document.getElementById('tourTitle').textContent === 'Alerts');

group('showTourStep() ends the tour instead of looping past either end');
stubQuerySelector([]);
ctx.document.getElementById = els();
let endedViaOutOfBounds = false;
const origEnd = ctx.endTour;
// endTour() persists to a DB this fake client doesn't have set up for this
// check — swap it out just to observe that it was called, not to run it.
ctx.endTour = async () => { endedViaOutOfBounds = true; };
ctx.showTourStep(7, 1);
check('stepping past the last index ends the tour rather than throwing', endedViaOutOfBounds);
ctx.endTour = origEnd;

group('endTour() marks tour_completed exactly once and never again for an already-completed profile');
T.currentProfile = { id: 'admin-1', role: 'admin', team_member_id: null, tour_completed: null };
T.sb = createFakeSupabase({ cc_profiles: [{ id: 'admin-1', tour_completed: null }] });
ctx.document.getElementById = els();
await ctx.endTour();
check('tour_completed is set locally', T.currentProfile.tour_completed === true);
check('tour_completed is persisted to the database', T.sb._store.cc_profiles[0].tour_completed === true, T.sb._store.cc_profiles[0]);

const writesBefore = T.sb._store.cc_profiles.length;
await ctx.endTour();
check('a second endTour() on an already-completed profile does not error or duplicate rows', T.sb._store.cc_profiles.length === writesBefore && T.sb._store.cc_profiles[0].tour_completed === true);

group('startTour() always begins at step 0, regardless of prior position');
stubQuerySelector([]);
ctx.document.getElementById = els();
ctx.showTourStep(4);
ctx.startTour();
check('startTour() resets to the Dashboard step', ctx.document.getElementById('tourTitle').textContent === 'Dashboard');

done();
})();
