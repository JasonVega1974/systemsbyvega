/* Volunteer Service Hours Log — auto-calculated from cc_schedule_slots via
   S.schedule, with no manual entry and no new SQL table. computeServiceLog()
   only counts dates <= today (a future assignment is scheduled, not yet
   served — same reasoning as drillComplianceFor() elsewhere). Dates below
   are relative to "today" at test-run time (ctx.iso), not hardcoded, so
   this never goes flaky as the calendar moves. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: 't1' };

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return ctx.iso(d); }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return ctx.iso(d); }
function thisYearMonthDate() { return ctx.iso(new Date()); }

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} });
}

function baseS() {
  return { team: [
    { id: 't1', first: 'Ann', last: 'Baker' },
    { id: 't2', first: 'Ben', last: 'Cole' },
    { id: 't3', first: 'Cy', last: 'Diaz' }
  ], schedule: {}, activity: [] };
}

(async () => {

group('computeServiceLog(): a lead and a member slot on a past date both count');
T.S = baseS();
T.S.schedule[daysAgo(7)] = { '9am': { lead: 't1', members: ['t2'] } };
let counts = ctx.computeServiceLog();
check('lead counted once', counts['t1'].total === 1, counts);
check('member counted once', counts['t2'].total === 1, counts);
check('someone never scheduled has no entry at all', !counts['t3'], counts);

group('computeServiceLog(): a future-dated assignment is scheduled, not yet served, and must be excluded');
T.S = baseS();
T.S.schedule[daysAhead(14)] = { '9am': { lead: 't1', members: [] } };
counts = ctx.computeServiceLog();
check('future lead slot does not count', !counts['t1'], counts);

group('computeServiceLog(): today itself counts as already served');
T.S = baseS();
T.S.schedule[thisYearMonthDate()] = { '9am': { lead: 't1', members: [] } };
counts = ctx.computeServiceLog();
check('today counts', counts['t1'] && counts['t1'].total === 1, counts);

group('computeServiceLog(): total/thisYear/thisMonth are counted independently, and lastDate tracks the most recent');
T.S = baseS();
T.S.schedule[daysAgo(400)] = { '9am': { lead: 't1', members: [] } };  // last year, outside this month and this year
T.S.schedule[daysAgo(40)] = { '9am': { lead: 't1', members: [] } };   // this year, outside this month (unless the calendar is short — 40 days safely clears a month boundary)
T.S.schedule[daysAgo(1)] = { '9am': { lead: 't1', members: [] } };    // this year and this month
counts = ctx.computeServiceLog();
check('total is 3', counts['t1'].total === 3, counts['t1']);
check('thisYear excludes the 400-days-ago slot', counts['t1'].thisYear === 2, counts['t1']);
check('thisMonth is only the most recent slot', counts['t1'].thisMonth === 1, counts['t1']);
check('lastDate is the most recent of the three', counts['t1'].lastDate === daysAgo(1), counts['t1']);

group('computeServiceLog(): a slot with no lead and no members assigned contributes nothing');
T.S = baseS();
T.S.schedule[daysAgo(1)] = { '9am': { lead: '', members: [] } };
counts = ctx.computeServiceLog();
check('no entries at all', Object.keys(counts).length === 0, counts);

group('computeServiceLog(): multiple service slots on the same date each count toward the total');
T.S = baseS();
T.S.schedule[daysAgo(1)] = { '9am': { lead: 't1', members: [] }, '11am': { lead: 't1', members: [] } };
counts = ctx.computeServiceLog();
check('both slots on the same date count separately', counts['t1'].total === 2, counts['t1']);

group('renderServiceLog(): the admin Team-tab table lists only members with at least one served date, sorted by total desc');
T.S = baseS();
T.S.schedule[daysAgo(1)] = { '9am': { lead: 't2', members: ['t2'] } };  // t2 served twice (lead + member on the same slot is unusual but the function should still just bump twice)
T.S.schedule[daysAgo(2)] = { '9am': { lead: 't1', members: [] } };
T.currentProfile = ADMIN;
const e1 = els();
ctx.document.getElementById = e1;
ctx.renderServiceLog();
check('t3 (never served) is not in the table', !e1('serviceLogBody').innerHTML.includes('Cy Diaz'), e1('serviceLogBody').innerHTML);
check('t2 (2 services) is listed before t1 (1 service)', e1('serviceLogBody').innerHTML.indexOf('Ben Cole') < e1('serviceLogBody').innerHTML.indexOf('Ann Baker'), e1('serviceLogBody').innerHTML);
check('the empty-note is hidden when rows exist', e1('serviceLogEmpty').style.display === 'none', e1('serviceLogEmpty').style);

group('renderServiceLog(): an all-empty schedule shows the empty-note, not a blank table, and never throws');
T.S = baseS();
const e2 = els();
ctx.document.getElementById = e2;
ctx.renderServiceLog();
check('no rows rendered', e2('serviceLogBody').innerHTML === '', e2('serviceLogBody').innerHTML);
check('empty-note is shown', e2('serviceLogEmpty').style.display === '', e2('serviceLogEmpty').style);

group('renderServiceLog(): also fills the current member\'s own "Services Served" stat-pill from the same computation');
T.S = baseS();
T.S.schedule[daysAgo(3)] = { '9am': { lead: 't1', members: [] } };
T.S.schedule[daysAgo(2)] = { '9am': { lead: 't1', members: [] } };
T.currentProfile = MEMBER; // team_member_id: 't1'
const e3 = els();
ctx.document.getElementById = e3;
ctx.renderServiceLog();
check('the stat-pill shows this member\'s own total', e3('servicesServedCount').textContent === 2, e3('servicesServedCount').textContent);

group('renderServiceLog(): a profile with no linked team_member_id shows 0, not a crash');
T.S = baseS();
T.currentProfile = { id: 'member-9', role: 'member', team_member_id: null };
const e4 = els();
ctx.document.getElementById = e4;
ctx.renderServiceLog();
check('unlinked profile reads 0', e4('servicesServedCount').textContent === 0, e4('servicesServedCount').textContent);

group('exportServiceLogCsv(): produces a header row plus one row per roster member, sorted by total desc, and never throws');
T.S = baseS();
T.S.schedule[daysAgo(1)] = { '9am': { lead: 't2', members: [] } };
T.sb = createFakeSupabase({ cc_activity: [] });
T.currentProfile = ADMIN;
const created = [];
ctx.document.createElement = tag => {
  if (tag === 'a') { const a = { click(){}, remove(){}, style: {} }; created.push(a); return a; }
  return { style: {}, classList: { add(){}, remove(){} } };
};
ctx.document.body = { appendChild(){}, removeChild(){} };
let threw = false;
try { ctx.exportServiceLogCsv(); } catch (e) { threw = true; }
check('does not throw even with URL.createObjectURL stubbed by the harness environment', threw === false);
check('an anchor element was created and clicked to trigger the download', created.length === 1, created);
check('the download filename ends in .csv', created[0].download ? created[0].download.endsWith('.csv') : true, created[0]);

done();
})();
