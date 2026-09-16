/* The onboarding checklist content itself, plus per-person isolation — now
   keyed to the real logged-in profile (cc_onboarding_steps.profile_id)
   instead of a freely-picked roster id. The v1 index-migration tests that
   used to live here retired with migrate() itself when localStorage did. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

(async () => {

group('per-person onboarding still isolates, now keyed to the real login');
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [] };
T.sb = createFakeSupabase({ cc_onboarding_steps: [] });
T.currentUser = { id: 'ann', email: 'ann@example.com' };
T.currentProfile = { id: 'ann', role: 'member', team_member_id: null };
await ctx.toggleOnboard('mod-med');
await ctx.toggleOnboard('manual');
check('Ann has two steps', ctx.activeProgress().onboard.length === 2, ctx.activeProgress().onboard);
check('both rows actually landed in the database, tagged to Ann', T.sb._store.cc_onboarding_steps.filter(r => r.profile_id === 'ann').length === 2, T.sb._store.cc_onboarding_steps);

T.currentUser = { id: 'ben', email: 'ben@example.com' };
T.currentProfile = { id: 'ben', role: 'member', team_member_id: null };
check('Ben has none — a fresh local bucket, not Ann\'s', ctx.activeProgress().onboard.length === 0, ctx.activeProgress().onboard);

T.currentUser = { id: 'ann', email: 'ann@example.com' };
T.currentProfile = { id: 'ann', role: 'member', team_member_id: null };
await ctx.toggleOnboard('manual');
check('toggling off removes just that step', ctx.activeProgress().onboard.join(',') === 'mod-med', ctx.activeProgress().onboard);
check('...and deletes just that one row from the database', T.sb._store.cc_onboarding_steps.map(r => r.step_id).join(',') === 'mod-med', T.sb._store.cc_onboarding_steps);

group('a failed toggle does not lie about what happened');
T.sb.__forceNextError('cc_onboarding_steps', { message: 'boom' });
await ctx.toggleOnboard('walk-site');
check('the local list is unchanged', ctx.activeProgress().onboard.join(',') === 'mod-med', ctx.activeProgress().onboard);

group('the new module is wired in correctly');
const med = T.COURSES.find(c => c.id === 'ss205');
check('ss205 exists', !!med);
check('it has 3 lessons', med.lessons.length === 3, med.lessons.length);
check('it has 6 questions', ctx.quizTotal(med) === 6, ctx.quizTotal(med));
check('pass mark is 5/6', ctx.passMark(med) === 5, ctx.passMark(med));
check('every answer key indexes a real option', med.quiz.every(q => q.opts[q.ans] !== undefined));
check('no answer key is out of range', med.quiz.every(q => q.ans >= 0 && q.ans < q.opts.length));
check('Academy is ordered by likelihood — Medical is second',
      T.COURSES[1].id === 'ss205', T.COURSES.map(c => c.id));
check('there are 7 modules', T.COURSES.length === 7, T.COURSES.length);

group('every module still has a usable quiz');
T.COURSES.forEach(c => {
  check(c.id + ': pass mark is reachable and not trivial',
        ctx.passMark(c) > 0 && ctx.passMark(c) <= ctx.quizTotal(c),
        { pass: ctx.passMark(c), total: ctx.quizTotal(c) });
});

done();
})();
