/* The onboarding checklist is allowed to change; v1 records are not allowed to
   move underneath people. v1 stored completion as ARRAY INDICES, so migration
   must read the frozen historical order, never the live list. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

group('the frozen v1 order is intact');
const V1 = ['manual', 'meet-lead', 'walk-site', 'maps', 'directory', 'mod-ss101',
            'mod-ss102', 'mod-rest', 'procedures', 'numbers', 'shadow', 'signoff'];
const live = T.ONBOARD_ITEMS.map(i => i.id);
check('v1 order still has exactly 12 entries', T.ONBOARD_V1_ORDER.length === 12, T.ONBOARD_V1_ORDER.length);
check('v1 order is unchanged', T.ONBOARD_V1_ORDER.join(',') === V1.join(','), T.ONBOARD_V1_ORDER);
check('every v1 id still exists in the live list', V1.every(id => live.includes(id)),
      V1.filter(id => !live.includes(id)));
check('live list has since grown (a step was inserted)', live.length > 12, live.length);
check('ids are unique', new Set(live).size === live.length, live.length - new Set(live).size);

group('a v1 record survives a step being INSERTED mid-list');
/* This is the regression the frozen order exists to prevent. 'mod-med' was
   inserted at position 8, which in v1 meant 'procedures'. Migrating through the
   LIVE list would silently convert "reviewed the procedures" into "completed
   the medical module" — a false completion on a checklist that ends in
   "cleared for the schedule". */
const v1rec = {
  schemaVersion: 1, pin: '2121', trainee: 'Dana Reed',
  team: [], leaders: [], meetings: [], schedule: {}, activity: [], training: {},
  onboard: [0, 7, 8, 11]      // manual, mod-rest, procedures, signoff
};
const m = ctx.migrate(JSON.parse(JSON.stringify(v1rec)));
const got = m.progress.guest.onboard;
check('indices map through the FROZEN order, not the live one',
      got.join(',') === 'manual,mod-rest,procedures,signoff', got);
check('index 8 stayed "procedures"', got.includes('procedures'), got);
check('the inserted step was NOT falsely marked complete', !got.includes('mod-med'), got);

group('live-list mapping would have been wrong — proving the test has teeth');
const naive = v1rec.onboard.map(i => live[i]).filter(Boolean);
check('a naive live-list mapping really does corrupt index 8',
      naive.includes('mod-med') && !naive.includes('procedures'), naive);

group('per-person onboarding still isolates');
T.S = ctx.defaults();
T.S.team = [{ id: 'tmA', first: 'Ann', last: 'Lee', role: 'Team Member' },
            { id: 'tmB', first: 'Ben', last: 'Ortiz', role: 'Team Member' }];
T.S.activeId = 'tmA';
ctx.toggleOnboard('mod-med');
ctx.toggleOnboard('manual');
check('Ann has two steps', ctx.activeProgress().onboard.length === 2, ctx.activeProgress().onboard);
T.S.activeId = 'tmB';
check('Ben has none', ctx.activeProgress().onboard.length === 0, ctx.activeProgress().onboard);
T.S.activeId = 'tmA';
ctx.toggleOnboard('manual');
check('toggling off removes just that step', ctx.activeProgress().onboard.join(',') === 'mod-med', ctx.activeProgress().onboard);

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
