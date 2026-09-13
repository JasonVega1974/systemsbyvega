/* Scheduling behaviour: no junk writes, duplicate detection, dynamic slots. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function freshTeam() {
  T.S = ctx.defaults();
  T.S.team = [
    { id: 'tmA', first: 'Ann',  last: 'Lee',   phone: '', spec: 'General / Trained Volunteer', role: 'Team Lead' },
    { id: 'tmB', first: 'Ben',  last: 'Ortiz', phone: '', spec: 'General / Trained Volunteer', role: 'Team Member' },
    { id: 'tmC', first: 'Cy',   last: 'Nash',  phone: '', spec: 'General / Trained Volunteer', role: 'Team Member' }
  ];
}

group('reading a day must never write one');
freshTeam();
for (let i = 0; i < 30; i++) ctx.getDay('2026-10-' + String((i % 28) + 1).padStart(2, '0'));
check('30 day reads wrote 0 records', Object.keys(T.S.schedule).length === 0, Object.keys(T.S.schedule).length);
check('a read still returns a usable blank shape', ctx.getDay('2026-10-04').s0.members.length === T.MIN_SLOTS);
ctx.refreshDash();
check('a dashboard refresh wrote 0 records', Object.keys(T.S.schedule).length === 0, Object.keys(T.S.schedule).length);

group('real assignments persist, empty days are pruned');
ctx.setAssign('2026-10-04', 's0', 'lead', 'tmA');
check('an actual assignment persists', Object.keys(T.S.schedule).length === 1, Object.keys(T.S.schedule));
ctx.setAssign('2026-10-04', 's0', 'lead', '');
check('clearing the last assignment prunes the day', Object.keys(T.S.schedule).length === 0, Object.keys(T.S.schedule));

group('duplicate detection within one service');
freshTeam();
ctx.setAssign('2026-10-04', 's0', 'lead', 'tmA');
ctx.setAssign('2026-10-04', 's0', 0, 'tmA');          // the same person, twice
ctx.setAssign('2026-10-04', 's0', 1, 'tmB');
let st = ctx.svcStatus(T.S.schedule['2026-10-04'].s0);
check('duplicate counted once', st.count === 2, st.count);
check('duplicate is reported, not just absorbed', st.dupes.join(',') === 'tmA', st.dupes);
check('coverage correctly NOT met at 2 unique', st.ok === false, st.ok);
check('the name is resolvable for the warning', ctx.memberName('tmA') === 'Ann Lee', ctx.memberName('tmA'));
ctx.setAssign('2026-10-04', 's0', 0, 'tmC');
st = ctx.svcStatus(T.S.schedule['2026-10-04'].s0);
check('fixing it clears the warning and meets coverage', st.dupes.length === 0 && st.count === 3 && st.ok === true, st);

group('coverage rule: 3 people AND a Team Lead');
freshTeam();
ctx.setAssign('2026-11-01', 's1', 0, 'tmA');
ctx.setAssign('2026-11-01', 's1', 1, 'tmB');
ctx.setAssign('2026-11-01', 's1', 2, 'tmC');
st = ctx.svcStatus(T.S.schedule['2026-11-01'].s1);
check('3 members but no one in the LEAD slot is NOT met', st.count === 3 && st.hasLead === false && st.ok === false, st);
ctx.setAssign('2026-11-01', 's1', 'lead', 'tmA');
st = ctx.svcStatus(T.S.schedule['2026-11-01'].s1);
check('Ann as lead + Ben + Cy = 3 unique, met', st.count === 3 && st.ok === true, st);

group('positions beyond the v1 ceiling of five');
freshTeam();
ctx.setAssign('2026-10-04', 's0', 'lead', 'tmA');
check('starts at MIN_SLOTS member positions', T.S.schedule['2026-10-04'].s0.members.length === T.MIN_SLOTS);
ctx.addSlot('2026-10-04', 's0'); ctx.addSlot('2026-10-04', 's0');
check('slots grow past 4', T.S.schedule['2026-10-04'].s0.members.length === T.MIN_SLOTS + 2, T.S.schedule['2026-10-04'].s0.members.length);
for (let i = 0; i < 30; i++) ctx.addSlot('2026-10-04', 's0');
check('slot count is capped at MAX_SLOTS', T.S.schedule['2026-10-04'].s0.members.length === T.MAX_SLOTS, T.S.schedule['2026-10-04'].s0.members.length);
check('a full service can now hold 12 people', T.MAX_SLOTS + 1 === 12, T.MAX_SLOTS + 1);

group('an explicit admin action MAY write; only reads must not');
freshTeam();
ctx.addSlot('2027-03-07', 's2');
check('adding a position deliberately creates the day', !!T.S.schedule['2027-03-07'], Object.keys(T.S.schedule));
check('and the extra position survives', T.S.schedule['2027-03-07'].s2.members.length === T.MIN_SLOTS + 1, T.S.schedule['2027-03-07'].s2.members.length);
const before = Object.keys(T.S.schedule).length;
for (let i = 0; i < 20; i++) { ctx.getDay('2027-05-' + String((i % 28) + 1).padStart(2, '0')); ctx.refreshDash(); }
check('20 more reads still wrote nothing', Object.keys(T.S.schedule).length === before, Object.keys(T.S.schedule).length);

group('migrate sweeps empty days left behind by v1 browsing');
const blank = () => ({ lead: '', members: ['', '', '', ''] });
const swept = ctx.migrate({
  schemaVersion: 1, team: [], leaders: [], meetings: [], activity: [],
  training: {}, onboard: [], trainee: '',
  schedule: {
    '2026-01-04': { s0: blank(), s1: blank(), s2: blank() },
    '2026-01-11': { s0: blank(), s1: blank(), s2: blank() },
    '2026-01-18': { s0: { lead: 'tm1', members: ['tm2', '', '', ''] }, s1: blank(), s2: blank() }
  }
});
check('two empty days swept, the real one kept', Object.keys(swept.schedule).join(',') === '2026-01-18', Object.keys(swept.schedule));
check('the surviving day keeps its assignments', swept.schedule['2026-01-18'].s0.lead === 'tm1');

group('Sunday navigation stays on Sundays across DST');
let d = ctx.nextSunday(new Date(2026, 8, 13));
check('nextSunday lands on a Sunday', d.getDay() === 0, d.toDateString());
let offDays = 0;
for (let i = 0; i < 60; i++) {
  d = new Date(d.getTime() + 7 * 864e5);
  if (d.getDay() !== 0) offDays++;
}
check('60 weeks forward, every one is still a Sunday (crosses both DST shifts)', offDays === 0, offDays);

done();
