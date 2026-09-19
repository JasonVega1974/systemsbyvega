/* Drill Log & Compliance (cc_drills) — status is computed client-side from
   the most recent conducted_date per drill type against a fixed frequency
   table (fire=3mo, code_adam=6mo, active_shooter/severe_weather/medical=
   12mo), not stored. Dates below are relative to "today" at test-run time
   (monthsAgo/daysAgo), not hardcoded, so this never goes flaky as the
   calendar moves. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const LEAD = { id: 'lead-1', role: 'team_lead', team_member_id: null };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };

function monthsAgo(n) { const d = new Date(); d.setMonth(d.getMonth() - n); return ctx.iso(d); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return ctx.iso(d); }

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){}, selectedOptions: [] });
}

(async () => {

T.currentUser = ADMIN_USER; T.currentProfile = ADMIN; T.adminOn = true;
T.S = { team: [
  { id: 't1', first: 'Ann', last: 'Baker' },
  { id: 't2', first: 'Ben', last: 'Cole' }
], drills: [], activity: [] };

group('drillComplianceFor(): never logged reads as overdue, not "unknown"');
let c = ctx.drillComplianceFor('fire');
check('status is overdue', c.status === 'overdue', c);
check('last is null', c.last === null);
check('nextDue is null', c.nextDue === null);

group('drillComplianceFor(): well within the frequency window is on_track');
T.S.drills = [{ id: 'd1', drillType: 'fire', conductedDate: monthsAgo(1), durationMinutes: 15, locationNotes: '', participantIds: ['t1'], conductedBy: 'admin-1', conductedByName: 'Admin', createdAt: '' }];
c = ctx.drillComplianceFor('fire');
check('fire drilled 1 month ago (of 3) is on_track', c.status === 'on_track', c);

group('drillComplianceFor(): within 30 days of the next-due date is due_soon');
// Fire = 3 months. Conducted (3 months - 20 days) ago -> ~20 days until due.
const threeMonthsInDays = 90;
T.S.drills = [{ id: 'd2', drillType: 'fire', conductedDate: daysAgo(threeMonthsInDays - 20), durationMinutes: 15, locationNotes: '', participantIds: [], conductedBy: 'admin-1', conductedByName: 'Admin', createdAt: '' }];
c = ctx.drillComplianceFor('fire');
check('due_soon', c.status === 'due_soon', c);

group('drillComplianceFor(): past the next-due date is overdue');
T.S.drills = [{ id: 'd3', drillType: 'fire', conductedDate: monthsAgo(5), durationMinutes: 15, locationNotes: '', participantIds: [], conductedBy: 'admin-1', conductedByName: 'Admin', createdAt: '' }];
c = ctx.drillComplianceFor('fire');
check('overdue', c.status === 'overdue', c);

group('drillComplianceFor(): only the MOST RECENT drill of a type counts, not the oldest');
T.S.drills = [
  { id: 'd4', drillType: 'code_adam', conductedDate: monthsAgo(20), durationMinutes: 20, locationNotes: '', participantIds: [], conductedBy: 'admin-1', conductedByName: 'Admin', createdAt: '' },
  { id: 'd5', drillType: 'code_adam', conductedDate: monthsAgo(1), durationMinutes: 20, locationNotes: '', participantIds: [], conductedBy: 'admin-1', conductedByName: 'Admin', createdAt: '' }
];
c = ctx.drillComplianceFor('code_adam');
check('uses the recent one, not the 20-month-old one', c.last.id === 'd5' && c.status === 'on_track', c);

group('drillParticipantNames(): resolves cc_team ids to names, skips stale/unknown ids');
const names = ctx.drillParticipantNames(['t1', 't2', 'no-such-id']);
check('resolves both real ids and drops the unknown one', names.length === 2 && names.includes('Ann Baker') && names.includes('Ben Cole'), names);

group('canLogDrills(): admin and team lead can, a plain member cannot');
T.currentProfile = ADMIN; T.adminOn = true;
check('admin can', ctx.canLogDrills() === true);
T.currentProfile = LEAD; T.adminOn = false;
check('team lead can', ctx.canLogDrills() === true);
T.currentProfile = MEMBER; T.adminOn = false;
check('plain member cannot', ctx.canLogDrills() === false);

group('saveDrill() inserts with the DB column shape and updates S.drills');
T.currentProfile = ADMIN; T.adminOn = true;
T.S.drills = [];
T.sb = createFakeSupabase({ cc_drills: [] });
const e1 = els();
ctx.document.getElementById = e1;
e1('drillType').value = 'medical';
e1('drillDate').value = daysAgo(2);
e1('drillDuration').value = '20';
e1('drillConductedBy').value = 'Pastor Mike';
e1('drillNotes').value = 'Went well, evac time 4 minutes.';
e1('drillParticipants').selectedOptions = [{ value: 't1' }, { value: 't2' }];
await ctx.saveDrill();
check('drill is in S', T.S.drills.length === 1 && T.S.drills[0].drillType === 'medical', T.S.drills);
check('participant ids captured', T.S.drills[0].participantIds.length === 2, T.S.drills[0].participantIds);
check('the database row uses snake_case columns', T.sb._store.cc_drills[0].conducted_by_name === 'Pastor Mike' && T.sb._store.cc_drills[0].duration_minutes === 20, T.sb._store.cc_drills);

group('saveDrill() requires a date and a conducted-by name');
T.S.drills = [];
const e2 = els();
ctx.document.getElementById = e2;
e2('drillType').value = 'fire';
e2('drillDate').value = '';
e2('drillConductedBy').value = '';
e2('drillParticipants').selectedOptions = [];
const saveP = ctx.saveDrill();
await new Promise(r => setTimeout(r, 0));
ctx.dialogOk();
await saveP;
check('nothing was saved without a date/conductor', T.S.drills.length === 0, T.S.drills);

group('deleteDrill() removes locally and from the database');
T.S.drills = [{ id: 'd6', drillType: 'fire', conductedDate: daysAgo(1), durationMinutes: 10, locationNotes: '', participantIds: [], conductedBy: 'admin-1', conductedByName: 'Admin', createdAt: '' }];
T.sb = createFakeSupabase({ cc_drills: [{ id: 'd6', drill_type: 'fire', conducted_date: daysAgo(1), conducted_by_name: 'Admin' }] });
const delP = ctx.deleteDrill('d6');
ctx.dialogOk();
await delP;
check('gone from S', T.S.drills.length === 0, T.S.drills);
check('gone from the database', T.sb._store.cc_drills.length === 0, T.sb._store.cc_drills);

group('renderDrillLog(): compliance table has one row per drill type, and the Log button is gated on canLogDrills()');
T.S.drills = [];
T.currentProfile = MEMBER; T.adminOn = false;
const e3 = els();
ctx.document.getElementById = e3;
ctx.renderDrillLog();
check('one <tr> per of the 5 drill types', (e3('drillComplianceBody').innerHTML.match(/<tr>/g) || []).length === 5, e3('drillComplianceBody').innerHTML);
check('every type reads overdue with nothing logged', (e3('drillComplianceBody').innerHTML.match(/OVERDUE/g) || []).length === 5, e3('drillComplianceBody').innerHTML);
check('Log a Drill is hidden for a plain member', e3('logDrillBtn').style.display === 'none');

T.currentProfile = ADMIN; T.adminOn = true;
ctx.renderDrillLog();
check('Log a Drill is shown for admin', e3('logDrillBtn').style.display === '');

group('renderDrillCompliance(): dashboard indicator shows all 5 drill types');
const e4 = els();
ctx.document.getElementById = e4;
ctx.renderDrillCompliance();
check('all 5 drill labels appear in the dashboard row', ['Fire Drill', 'Code Adam', 'Active Shooter', 'Severe Weather', 'Medical Emergency'].every(l => e4('dashDrillCompliance').innerHTML.includes(l)), e4('dashDrillCompliance').innerHTML);

done();
})();
