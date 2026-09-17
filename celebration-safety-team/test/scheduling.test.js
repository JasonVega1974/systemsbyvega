/* Scheduling behaviour: no junk writes, duplicate detection, dynamic slots.
   setAssign()/addSlot() now write through a fake Supabase client (see
   fakeSupabase.js) instead of a local blob, so this also verifies the
   relational shape: cc_schedule_slots rows created per-service, pruned once
   a service is fully unassigned again. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function freshTeam() {
  T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
  T.S.team = [
    { id: 'tmA', first: 'Ann',  last: 'Lee',   phone: '', spec: 'General / Trained Volunteer', role: 'Team Lead' },
    { id: 'tmB', first: 'Ben',  last: 'Ortiz', phone: '', spec: 'General / Trained Volunteer', role: 'Team Member' },
    { id: 'tmC', first: 'Cy',   last: 'Nash',  phone: '', spec: 'General / Trained Volunteer', role: 'Team Member' }
  ];
  T.sb = createFakeSupabase({ cc_schedule_slots: [] });
  T.currentProfile = { id: 'admin-1', role: 'admin', team_member_id: null };
  T.currentUser = { id: 'admin-1', email: 'admin@example.com' };
}
function slotRows() { return T.sb._store.cc_schedule_slots; }

(async () => {

group('reading a day must never write one');
freshTeam();
for (let i = 0; i < 30; i++) ctx.getDay('2026-10-' + String((i % 28) + 1).padStart(2, '0'));
check('30 day reads wrote 0 records to S', Object.keys(T.S.schedule).length === 0, Object.keys(T.S.schedule).length);
check('30 day reads wrote 0 rows to the database', slotRows().length === 0, slotRows().length);
check('a read still returns a usable blank shape', ctx.getDay('2026-10-04').s0.members.length === T.MIN_SLOTS);
ctx.refreshDash();
check('a dashboard refresh wrote 0 records', Object.keys(T.S.schedule).length === 0 && slotRows().length === 0, [Object.keys(T.S.schedule).length, slotRows().length]);

group('real assignments persist, empty services are pruned');
await ctx.setAssign('2026-10-04', 's0', 'lead', 'tmA');
check('an actual assignment persists in S', Object.keys(T.S.schedule).length === 1, Object.keys(T.S.schedule));
check('the row actually landed in the database', slotRows().some(r => r.service_date === '2026-10-04' && r.slot_type === 'lead' && r.team_member_id === 'tmA'), slotRows());
await ctx.setAssign('2026-10-04', 's0', 'lead', '');
check('clearing the last assignment prunes the date locally', Object.keys(T.S.schedule).length === 0, Object.keys(T.S.schedule));
check('...and prunes the underlying rows too', slotRows().filter(r => r.service_date === '2026-10-04').length === 0, slotRows());

group('duplicate detection within one service');
freshTeam();
await ctx.setAssign('2026-10-04', 's0', 'lead', 'tmA');
await ctx.setAssign('2026-10-04', 's0', 0, 'tmA');          // the same person, twice
await ctx.setAssign('2026-10-04', 's0', 1, 'tmB');
let st = ctx.svcStatus(T.S.schedule['2026-10-04'].s0);
check('duplicate counted once', st.count === 2, st.count);
check('duplicate is reported, not just absorbed', st.dupes.join(',') === 'tmA', st.dupes);
check('coverage correctly NOT met at 2 unique', st.ok === false, st.ok);
check('the name is resolvable for the warning', ctx.memberName('tmA') === 'Ann Lee', ctx.memberName('tmA'));
await ctx.setAssign('2026-10-04', 's0', 0, 'tmC');
st = ctx.svcStatus(T.S.schedule['2026-10-04'].s0);
check('fixing it clears the warning and meets coverage', st.dupes.length === 0 && st.count === 3 && st.ok === true, st);

group('coverage rule: 3 people AND a Team Lead');
freshTeam();
await ctx.setAssign('2026-11-01', 's1', 0, 'tmA');
await ctx.setAssign('2026-11-01', 's1', 1, 'tmB');
await ctx.setAssign('2026-11-01', 's1', 2, 'tmC');
st = ctx.svcStatus(T.S.schedule['2026-11-01'].s1);
check('3 members but no one in the LEAD slot is NOT met', st.count === 3 && st.hasLead === false && st.ok === false, st);
await ctx.setAssign('2026-11-01', 's1', 'lead', 'tmA');
st = ctx.svcStatus(T.S.schedule['2026-11-01'].s1);
check('Ann as lead + Ben + Cy = 3 unique, met', st.count === 3 && st.ok === true, st);

group('positions beyond the v1 ceiling of five');
freshTeam();
await ctx.setAssign('2026-10-04', 's0', 'lead', 'tmA');
check('starts at MIN_SLOTS member positions', T.S.schedule['2026-10-04'].s0.members.length === T.MIN_SLOTS);
await ctx.addSlot('2026-10-04', 's0'); await ctx.addSlot('2026-10-04', 's0');
check('slots grow past 4', T.S.schedule['2026-10-04'].s0.members.length === T.MIN_SLOTS + 2, T.S.schedule['2026-10-04'].s0.members.length);
for (let i = 0; i < 30; i++) await ctx.addSlot('2026-10-04', 's0');
check('slot count is capped at MAX_SLOTS', T.S.schedule['2026-10-04'].s0.members.length === T.MAX_SLOTS, T.S.schedule['2026-10-04'].s0.members.length);
check('a full service can now hold 12 people', T.MAX_SLOTS + 1 === 12, T.MAX_SLOTS + 1);
check('the database has exactly one row per position, no more', slotRows().filter(r => r.service_date === '2026-10-04' && r.service_key === 's0').length === T.MAX_SLOTS + 1);

group('an explicit admin action MAY write; only reads must not');
freshTeam();
await ctx.addSlot('2027-03-07', 's2');
check('adding a position deliberately creates the day', !!T.S.schedule['2027-03-07'], Object.keys(T.S.schedule));
check('and the extra position survives', T.S.schedule['2027-03-07'].s2.members.length === T.MIN_SLOTS + 1, T.S.schedule['2027-03-07'].s2.members.length);
const before = Object.keys(T.S.schedule).length, beforeRows = slotRows().length;
for (let i = 0; i < 20; i++) { ctx.getDay('2027-05-' + String((i % 28) + 1).padStart(2, '0')); ctx.refreshDash(); }
check('20 more reads still wrote nothing', Object.keys(T.S.schedule).length === before && slotRows().length === beforeRows, [Object.keys(T.S.schedule).length, slotRows().length]);

group('a failed write does not lie about what happened');
freshTeam();
T.sb.__forceNextError('cc_schedule_slots', { message: 'network unreachable' });
await ctx.setAssign('2026-12-06', 's0', 'lead', 'tmA');
check('S.schedule stays empty when the insert fails', Object.keys(T.S.schedule).length === 0, Object.keys(T.S.schedule));

group('loadSchedule() reconstructs S.schedule from rows, grouped and ordered correctly');
freshTeam();
T.sb = createFakeSupabase({
  cc_schedule_slots: [
    { id: 'r1', service_date: '2026-12-06', service_key: 's0', slot_type: 'lead', slot_position: 0, team_member_id: 'tmA' },
    { id: 'r2', service_date: '2026-12-06', service_key: 's0', slot_type: 'member', slot_position: 1, team_member_id: 'tmC' },
    { id: 'r3', service_date: '2026-12-06', service_key: 's0', slot_type: 'member', slot_position: 0, team_member_id: 'tmB' }
  ]
});
await ctx.loadSchedule();
const day = T.S.schedule['2026-12-06'];
check('the lead slot resolved', day.s0.lead === 'tmA', day.s0.lead);
check('member rows land at their own slot_position, not insertion order', day.s0.members[0] === 'tmB' && day.s0.members[1] === 'tmC', day.s0.members);

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
})();
