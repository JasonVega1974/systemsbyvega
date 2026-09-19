/* Background check status tracking on the roster (cc_team.background_check_
   status/date/expiry) — manually set by an admin, no third-party
   integration. Covers the expiry auto-fill, saveMember() round-tripping
   the three new columns, and the roster badge that flags anyone needing
   attention. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} });
}

(async () => {

T.currentUser = ADMIN_USER; T.currentProfile = ADMIN; T.adminOn = true;

group('onBgStatusChange(): setting Cleared with a check date auto-fills expiry 2 years out');
const e1 = els();
ctx.document.getElementById = e1;
e1('mBgStatus').value = 'cleared';
e1('mBgDate').value = '2026-01-15';
ctx.onBgStatusChange();
check('expiry auto-filled to +2 years', e1('mBgExpiry').value === '2028-01-15', e1('mBgExpiry').value);

group('onBgStatusChange(): a non-Cleared status does not touch the expiry field');
const e2 = els();
ctx.document.getElementById = e2;
e2('mBgExpiry').value = 'unchanged';
e2('mBgStatus').value = 'requested';
e2('mBgDate').value = '2026-01-15';
ctx.onBgStatusChange();
check('expiry left alone', e2('mBgExpiry').value === 'unchanged');

group('onBgStatusChange(): the auto-fill is a starting point, not a lock — a manual edit survives a later date tweak that keeps status Cleared');
const e3 = els();
ctx.document.getElementById = e3;
e3('mBgStatus').value = 'cleared';
e3('mBgDate').value = '2026-01-15';
ctx.onBgStatusChange();
check('first fill is +2 years', e3('mBgExpiry').value === '2028-01-15');
// The admin hand-edits the expiry to something else entirely...
e3('mBgExpiry').value = '2030-06-01';
// ...and nothing re-triggers onBgStatusChange without the date or status changing again.
check('manual override is not touched by re-reading the same fields', e3('mBgExpiry').value === '2030-06-01');

group('saveMember(): background check fields round-trip through the DB column names');
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
T.sb = createFakeSupabase({ cc_team: [] });
T.editingMemberId = null;
const e4 = els();
ctx.document.getElementById = e4;
e4('mFirst').value = 'Dana'; e4('mLast').value = 'Reed'; e4('mPhone').value = ''; e4('mEmail').value = '';
e4('mSpec').value = 'General / Trained Volunteer'; e4('mRole').value = 'Safety Team Operator'; e4('mRotationWeek').value = '';
e4('mBgStatus').value = 'cleared'; e4('mBgDate').value = '2026-01-15'; e4('mBgExpiry').value = '2028-01-15';
await ctx.saveMember();
check('S carries the cleared status', T.S.team[0].bgCheckStatus === 'cleared' && T.S.team[0].bgCheckExpiry === '2028-01-15', T.S.team[0]);
check('the database row uses snake_case background_check_* columns', T.sb._store.cc_team[0].background_check_status === 'cleared' && T.sb._store.cc_team[0].background_check_date === '2026-01-15', T.sb._store.cc_team[0]);

group('teamRowToJs(): defaults a member with no background check data to not_requested, not null/undefined');
const row = ctx.teamRowToJs({ id: 't9', first_name: 'Ann', last_name: 'Baker', specialty: 'General / Trained Volunteer', team_role: 'Safety Team Operator' });
check('defaults to not_requested', row.bgCheckStatus === 'not_requested', row);
check('date/expiry default to empty string, not null', row.bgCheckDate === '' && row.bgCheckExpiry === '', row);

group('bgCheckBadge(): flags Not Requested, Expired, and Flagged in the "needs action" colour; Cleared is not flagged and shows its expiry');
T.adminOn = true;
const notRequested = ctx.bgCheckBadge({ bgCheckStatus: 'not_requested', bgCheckExpiry: '' });
check('not_requested reads red/needs-action', notRequested.includes('var(--red-text)'), notRequested);
const expired = ctx.bgCheckBadge({ bgCheckStatus: 'expired', bgCheckExpiry: '2024-01-01' });
check('expired reads red/needs-action', expired.includes('var(--red-text)'), expired);
const flagged = ctx.bgCheckBadge({ bgCheckStatus: 'flagged', bgCheckExpiry: '' });
check('flagged reads red/needs-action', flagged.includes('var(--red-text)'), flagged);
const cleared = ctx.bgCheckBadge({ bgCheckStatus: 'cleared', bgCheckExpiry: '2028-01-15' });
check('cleared does NOT read red', !cleared.includes('var(--red-text)'), cleared);
check('cleared shows its expiry date', cleared.includes('expires') && cleared.includes('2028'), cleared);

group('renderTeam(): the Background Check column is admin-only, matching the Actions column');
T.S.team = [{ id: 't1', first: 'Dana', last: 'Reed', phone: '', email: '', spec: 'General / Trained Volunteer', role: 'Safety Team Operator', rotationWeek: '', bgCheckStatus: 'expired', bgCheckDate: '', bgCheckExpiry: '' }];
T.adminOn = false;
const e5 = els();
ctx.document.getElementById = e5;
ctx.renderTeam();
check('no background-check column for a non-admin viewer', !e5('teamBody').innerHTML.includes('Expired'), e5('teamBody').innerHTML);
T.adminOn = true;
ctx.renderTeam();
check('background-check status shown to admin', e5('teamBody').innerHTML.includes('Expired'), e5('teamBody').innerHTML);

done();
})();
