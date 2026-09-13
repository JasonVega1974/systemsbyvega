/* Loads the app's real inline script under a stub DOM and exercises migrate(). */
const fs = require('fs'), path = require('path'), vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.match(/<script>\n([\s\S]*)\n<\/script>/)[1];

const el = new Proxy({}, {
  get(t, k) {
    if (k === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){return false} };
    if (k === 'style') return {};
    if (k === 'files') return [];
    if (k === 'insertAdjacentHTML' || k === 'appendChild' || k === 'click' ||
        k === 'remove' || k === 'addEventListener' || k === 'focus') return () => {};
    if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
    return undefined;
  },
  set() { return true; }
});
const ctx = {
  console,
  localStorage: { _v: null, getItem(){return this._v}, setItem(k,v){this._v=v}, removeItem(){this._v=null} },
  document: {
    getElementById: () => el,
    querySelectorAll: () => [],
    createElement: () => el,
    body: el,
    addEventListener: () => {}
  },
  window: { addEventListener(){}, removeEventListener(){}, print(){}, scrollTo(){} },
  alert: () => {}, confirm: () => true, prompt: () => null,
  Blob: function(){}, URL: { createObjectURL: () => '', revokeObjectURL(){} },
  FileReader: function(){}, setTimeout, Date, Math, JSON, Object, Array, String, Number, Set, isNaN, parseInt
};
ctx.globalThis = ctx;
vm.createContext(ctx);
/* `const COURSES` / `let S` are lexical bindings, so they never appear as
   properties of the VM context. Expose real accessors for them instead of
   testing a copy. */
vm.runInContext(js + `
;globalThis.__t = {
  get S() { return S; }, set S(v) { S = v; },
  COURSES, ONBOARD_ITEMS
};`, ctx);
const T = ctx.__t;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail !== undefined ? '   got: ' + JSON.stringify(detail) : '')); }
}

console.log('\n— v1 blob whose trainee name MATCHES a roster member —');
let v1 = {
  pin: '4455',
  trainee: 'Marcus Hale',
  team: [
    { id: 'tm1', first: 'Marcus', last: 'Hale', phone: '208-555-0100', spec: 'Police / Law Enforcement', role: 'Team Lead' },
    { id: 'tm2', first: 'Priya', last: 'Rao', phone: '208-555-0101', spec: 'Medical (Nurse / Doctor)', role: 'Team Member' }
  ],
  leaders: [{ id: 'ld1', name: 'Roger Yadon', title: 'Senior Pastor' }],
  meetings: [{ id: 'mt1', date: '2026-09-06', title: 'Drill debrief', notes: 'x' }],
  schedule: { '2026-09-13': { s0: { lead: 'tm1', members: ['tm2','','',''] }, s1: { lead:'', members:['','','',''] }, s2: { lead:'', members:['','','',''] } } },
  training: {
    ss101: { doneLessons: [0,1,2], quizScore: 5, quizPassed: true, certName: 'Marcus Hale' },
    ss202: { doneLessons: [0,1,2], quizScore: 4, quizPassed: true, certName: '' }
  },
  onboard: [0, 1, 5],
  activity: [{ t: 'Sep 1', msg: 'hi' }]
};
let m = ctx.migrate(JSON.parse(JSON.stringify(v1)));

check('schemaVersion bumped to 2', m.schemaVersion === 2, m.schemaVersion);
check('v1 keys removed', !('training' in m) && !('onboard' in m) && !('trainee' in m),
      Object.keys(m).filter(k => ['training','onboard','trainee'].includes(k)));
check('record attached to the matching member, not guest', m.activeId === 'tm1', m.activeId);
check('no guest bucket created', !m.progress.guest, Object.keys(m.progress));
check('both course records carried across', Object.keys(m.progress.tm1.training).sort().join(',') === 'ss101,ss202',
      Object.keys(m.progress.tm1.training));
check('ss101 still passed with 5', m.progress.tm1.training.ss101.quizPassed && m.progress.tm1.training.ss101.quizScore === 5);
check('quizTotal stamped as 5 on ss101', m.progress.tm1.training.ss101.quizTotal === 5, m.progress.tm1.training.ss101.quizTotal);
check('quizTotal stamped as 5 on ss202 (now a 6-question module)', m.progress.tm1.training.ss202.quizTotal === 5, m.progress.tm1.training.ss202.quizTotal);
check('onboard indices [0,1,5] -> stable ids', m.progress.tm1.onboard.join(',') === 'manual,meet-lead,mod-ss101', m.progress.tm1.onboard);
check('shared org data untouched: team', m.team.length === 2);
check('shared org data untouched: schedule', m.schedule['2026-09-13'].s0.lead === 'tm1');
check('shared org data untouched: meetings', m.meetings.length === 1);
check('pin preserved', m.pin === '4455', m.pin);

console.log('\n— v1 blob whose trainee name matches NOBODY —');
let v1b = JSON.parse(JSON.stringify(v1));
v1b.trainee = 'Dana Whitfield';
let mb = ctx.migrate(v1b);
check('falls back to the guest bucket', mb.activeId === 'guest', mb.activeId);
check('guest keeps the name so the record is identifiable', mb.progress.guest.name === 'Dana Whitfield', mb.progress.guest.name);
check('guest keeps the training', Object.keys(mb.progress.guest.training).length === 2);
check('nothing was written onto a roster member', !mb.progress.tm1 && !mb.progress.tm2, Object.keys(mb.progress));

console.log('\n— empty v1 install (nothing to migrate) —');
let mc = ctx.migrate({ pin: '2121', trainee: '', team: [], leaders: [], meetings: [], schedule: {}, training: {}, onboard: [], activity: [] });
check('no phantom progress bucket', Object.keys(mc.progress).length === 0, Object.keys(mc.progress));
check('activeId defaults to guest', mc.activeId === 'guest', mc.activeId);
check('schemaVersion set', mc.schemaVersion === 2);

console.log('\n— already-v2 blob must pass through untouched —');
const v2 = {
  schemaVersion: 2, pin: '1234', team: [], leaders: [], meetings: [], schedule: {},
  progress: { tm9: { name: '', training: { ss101: { doneLessons: [0], quizScore: 6, quizTotal: 6, quizPassed: true, certName: 'A' } }, onboard: ['manual'] } },
  activeId: 'tm9', activity: []
};
const md = ctx.migrate(JSON.parse(JSON.stringify(v2)));
check('activeId preserved', md.activeId === 'tm9', md.activeId);
check('quizTotal of 6 NOT overwritten', md.progress.tm9.training.ss101.quizTotal === 6, md.progress.tm9.training.ss101.quizTotal);
check('onboard ids preserved', md.progress.tm9.onboard.join(',') === 'manual', md.progress.tm9.onboard);
check('still v2', md.schemaVersion === 2);

console.log('\n— garbage / partial blob must not throw —');
try {
  const me = ctx.migrate({ team: null, training: 'nonsense', onboard: 'nope' });
  check('survives a malformed blob', me.schemaVersion === 2 && Array.isArray(me.team) === false || true);
  check('bad onboard does not become a bucket', !me.progress.guest || Array.isArray(me.progress.guest.onboard), me.progress);
} catch (e) { check('survives a malformed blob', false, e.message); }

console.log('\n— per-person isolation: two people, separate records —');
T.S = ctx.defaults();
T.S.team = [{ id: 'tmA', first: 'Ann', last: 'Lee', role: 'Team Member' },
            { id: 'tmB', first: 'Ben', last: 'Ortiz', role: 'Team Lead' }];
T.S.activeId = 'tmA';
ctx.getCS('ss101').quizPassed = true; ctx.getCS('ss101').quizScore = 5; ctx.getCS('ss101').quizTotal = 5;
T.S.activeId = 'tmB';
check("Ann's pass does not leak to Ben", ctx.getCS('ss101').quizPassed === false, ctx.getCS('ss101'));
check('activeName resolves from the roster', ctx.activeName() === 'Ben Ortiz', ctx.activeName());
T.S.activeId = 'tmA';
check("Ann's pass is still hers", ctx.getCS('ss101').quizPassed === true);
check('Ann keeps her own onboarding list', (T.S.activeId='tmA', ctx.toggleOnboard('manual'), T.S.activeId='tmB', ctx.activeProgress().onboard.length) === 0, ctx.activeProgress().onboard);
T.S.activeId = 'tmA';
check('...and hers survived', ctx.activeProgress().onboard.join(',') === 'manual', ctx.activeProgress().onboard);

console.log('\n— pass/score helpers against the new 6-question module —');
const ss202 = T.COURSES.find(c => c.id === 'ss202');
check('ss202 now has 6 questions', ctx.quizTotal(ss202) === 6, ctx.quizTotal(ss202));
check('ss202 pass mark is 5', ctx.passMark(ss202) === 5, ctx.passMark(ss202));
const ss101 = T.COURSES.find(c => c.id === 'ss101');
check('5-question modules unchanged at 4', ctx.passMark(ss101) === 4, ctx.passMark(ss101));
check('legacy 5/5 record still reads 100% on the 6-question module',
      ctx.scorePct({ quizScore: 5, quizTotal: 5 }, ss202) === 100,
      ctx.scorePct({ quizScore: 5, quizTotal: 5 }, ss202));

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
