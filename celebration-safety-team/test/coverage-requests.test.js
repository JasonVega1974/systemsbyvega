/* Shift coverage requests (cc_coverage_requests) — request/pickup/assign/
   cancel. The resolve-by-covering paths (coverShift, confirmAssignCoverage)
   go through the cc_resolve_coverage_request() RPC, mocked here via
   sb.__mockRpc() to return what the real SECURITY DEFINER function would;
   the SQL function's own correctness is verified by reading the migration,
   not reimplemented in JS. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: 'tm-admin' };
const TEAM_LEAD = { id: 'lead-1', role: 'team_lead', team_member_id: 'tm-lead' };
const REQUESTER = { id: 'req-1', role: 'member', team_member_id: 'tm-requester' };
const COVERER = { id: 'cov-1', role: 'member', team_member_id: 'tm-coverer' };

function freshState(extra) {
  return Object.assign({
    team: [
      { id: 'tm-admin', first: 'Ada', last: 'Min' },
      { id: 'tm-lead', first: 'Lee', last: 'Ad' },
      { id: 'tm-requester', first: 'Req', last: 'Uester' },
      { id: 'tm-coverer', first: 'Cov', last: 'Erer' }
    ],
    leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {},
    verses: [], notes: [], facilityMaps: {}, settings: { sections: {}, academyModules: {} }, bolos: [], news: [], coverageRequests: []
  }, extra || {});
}
function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} });
}

(async () => {

group('serviceKeyLabel() maps the three service keys to their display times');
check('s0 -> 8:00 AM', ctx.serviceKeyLabel('s0') === '8:00 AM');
check('s1 -> 9:45 AM', ctx.serviceKeyLabel('s1') === '9:45 AM');
check('s2 -> 11:30 AM', ctx.serviceKeyLabel('s2') === '11:30 AM');
check('an unknown key falls back to itself rather than throwing', ctx.serviceKeyLabel('bogus') === 'bogus');

group('saveCoverageRequest() requires a service date');
T.S = freshState(); T.currentProfile = REQUESTER; T.currentUser = { id: 'req-1', email: 'req@example.com' };
T.sb = createFakeSupabase({ cc_coverage_requests: [] });
ctx.document.getElementById = els();
ctx.document.getElementById('coverageDate').value = '';
const saveP1 = ctx.saveCoverageRequest();
ctx.dialogOk();
await saveP1;
check('nothing was inserted with a blank date', T.sb._store.cc_coverage_requests.length === 0, T.sb._store.cc_coverage_requests);

group('saveCoverageRequest() inserts a request stamped from the acting member, defaults status to open server-side');
T.S = freshState();
T.sb = createFakeSupabase({ cc_coverage_requests: [] });
const els1 = els();
ctx.document.getElementById = els1;
els1('coverageDate').value = '2026-10-04';
els1('coverageServiceKey').value = 's1';
els1('coverageReason').value = 'Family conflict';
await ctx.saveCoverageRequest();
check('one request now in S', T.S.coverageRequests.length === 1, T.S.coverageRequests);
check('profile_id is stamped from the acting member', T.sb._store.cc_coverage_requests[0].profile_id === 'req-1');
check('profile_name is a snapshot, not just an id', T.sb._store.cc_coverage_requests[0].profile_name === 'Req Uester');
check('service_date and service_key stored as entered', T.sb._store.cc_coverage_requests[0].service_date === '2026-10-04' && T.sb._store.cc_coverage_requests[0].service_key === 's1');
check('reason stored', T.sb._store.cc_coverage_requests[0].reason === 'Family conflict');

group('openCoverageRequestsForOthers() excludes the viewer\'s own open request');
T.S = freshState({ coverageRequests: [
  { id: 'c1', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' },
  { id: 'c2', profileId: 'cov-1', profileName: 'Cov Erer', serviceDate: '2026-10-11', serviceKey: 's1', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-21T00:00:00Z' }
] });
T.currentProfile = REQUESTER;
check('sees only the other member\'s open request, not their own', ctx.openCoverageRequestsForOthers().length === 1 && ctx.openCoverageRequestsForOthers()[0].id === 'c2');
T.currentProfile = COVERER;
check('the other member sees the requester\'s open request', ctx.openCoverageRequestsForOthers().some(c => c.id === 'c1'));

group('notificationCount() counts open requests from OTHERS, never the viewer\'s own');
const openReq = { id: 'n1', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' };

T.S = freshState(); T.currentProfile = REQUESTER; T.adminOn = false;
const reqBaseline = ctx.notificationCount();
T.S.coverageRequests = [openReq];
check('the requester\'s own open request adds nothing to their own count', ctx.notificationCount() === reqBaseline, { baseline: reqBaseline, withRequest: ctx.notificationCount() });

T.S = freshState(); T.currentProfile = COVERER; T.adminOn = false;
const covBaseline = ctx.notificationCount();
T.S.coverageRequests = [openReq];
check('another member\'s count goes up by exactly 1 for the request that isn\'t theirs', ctx.notificationCount() === covBaseline + 1, { baseline: covBaseline, withRequest: ctx.notificationCount() });

group('coverShift() calls the RPC, applies the result locally, and never lets a plain member assign someone else');
T.S = freshState({ coverageRequests: [
  { id: 'c3', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
T.currentProfile = COVERER; T.currentUser = { id: 'cov-1', email: 'cov@example.com' };
T.sb = createFakeSupabase({ cc_schedule_slots: [] });
let rpcArgsSeen = null;
T.sb.__mockRpc('cc_resolve_coverage_request', (args) => { rpcArgsSeen = args; return { slot_updated: true, covered_by: 'cov-1', covered_by_name: 'Cov Erer' }; });
ctx.document.getElementById = els();
const coverP = ctx.coverShift('c3');
ctx.dialogOk();
await coverP;
check('the RPC was called with only the request id (self-cover, no assign target)', rpcArgsSeen && rpcArgsSeen.p_request_id === 'c3' && rpcArgsSeen.p_assign_team_member_id === undefined, rpcArgsSeen);
check('the request is now resolved locally', T.S.coverageRequests[0].status === 'resolved');
check('coveredByName reflects what the RPC returned', T.S.coverageRequests[0].coveredByName === 'Cov Erer');

group('coverShift() surfaces an RPC error without corrupting local state');
T.S = freshState({ coverageRequests: [
  { id: 'c4', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
T.currentProfile = COVERER;
T.sb = createFakeSupabase({});
T.sb.__mockRpc('cc_resolve_coverage_request', () => { throw new Error('This coverage request is no longer open'); });
ctx.document.getElementById = els();
const coverP2 = ctx.coverShift('c4');
ctx.dialogOk(); // resolves the "Cover this shift?" confirm
await new Promise(r => setTimeout(r, 0)); // let the RPC rejection reach the follow-up alertDialog
ctx.dialogOk(); // resolves the "Could not cover this shift" alert
await coverP2;
check('the request stays open locally — the RPC\'s rejection was not silently treated as success', T.S.coverageRequests[0].status === 'open');

group('confirmAssignCoverage() (Team Lead/Admin path) calls the RPC with the chosen team_member_id');
T.S = freshState({ coverageRequests: [
  { id: 'c5', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's2', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
T.currentProfile = TEAM_LEAD; T.adminOn = false;
T.sb = createFakeSupabase({});
let assignArgsSeen = null;
// slot_updated: true avoids the follow-up "needs a manual check" alertDialog, which is
// out of scope for this test (that message path is exercised on its own below).
T.sb.__mockRpc('cc_resolve_coverage_request', (args) => { assignArgsSeen = args; return { slot_updated: true, covered_by: 'cov-1', covered_by_name: 'Cov Erer' }; });
const elsAssign = els();
ctx.document.getElementById = elsAssign;
ctx.openAssignCoverageModal('c5');
check('the member dropdown is populated from the roster', elsAssign('assignCoverageMember').innerHTML.includes('Cov Erer'), elsAssign('assignCoverageMember').innerHTML);
elsAssign('assignCoverageMember').value = 'tm-coverer';
await ctx.confirmAssignCoverage();
check('the RPC received the chosen team_member_id, not a profile id', assignArgsSeen && assignArgsSeen.p_assign_team_member_id === 'tm-coverer', assignArgsSeen);
check('the request is resolved locally', T.S.coverageRequests[0].status === 'resolved');

group('coverShift() warns when the RPC could not find a matching schedule slot to swap');
T.S = freshState({ coverageRequests: [
  { id: 'c9', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
T.currentProfile = COVERER;
T.sb = createFakeSupabase({});
T.sb.__mockRpc('cc_resolve_coverage_request', () => ({ slot_updated: false, covered_by: 'cov-1', covered_by_name: 'Cov Erer' }));
ctx.document.getElementById = els();
const coverP3 = ctx.coverShift('c9');
ctx.dialogOk(); // "Cover this shift?" confirm
await new Promise(r => setTimeout(r, 0)); // let the RPC result reach the follow-up alertDialog
ctx.dialogOk(); // "Covered — schedule needs a manual check" alert
await coverP3;
check('the request still resolves even though the schedule slot was not found', T.S.coverageRequests[0].status === 'resolved');

group('cancelCoverageRequest() — the requester can cancel their own open request');
T.S = freshState({ coverageRequests: [
  { id: 'c6', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
T.currentProfile = REQUESTER;
T.sb = createFakeSupabase({ cc_coverage_requests: [{ id: 'c6', profile_id: 'req-1', status: 'open' }] });
ctx.document.getElementById = els();
const cancelP = ctx.cancelCoverageRequest('c6');
ctx.dialogOk();
await cancelP;
check('the request is cancelled locally', T.S.coverageRequests[0].status === 'cancelled');
check('the database reflects the cancellation', T.sb._store.cc_coverage_requests[0].status === 'cancelled');

group('rendering: an open request shows "I\'ll Cover This" to others but not to its own requester, and "Assign..." only to Team Lead/Admin');
T.S = freshState({ coverageRequests: [
  { id: 'c7', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: 'Out of town', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
const els2 = els();
ctx.document.getElementById = els2;

T.currentProfile = REQUESTER; T.adminOn = false;
ctx.renderCoverageRequestsList();
check('the requester does not see "I\'ll Cover This" on their own request', !els2('coverageRequestsList').innerHTML.includes("I'll Cover This"), els2('coverageRequestsList').innerHTML);
check('the requester sees Cancel on their own open request', els2('coverageRequestsList').innerHTML.includes('Cancel'));
check('a plain member does not see Assign…', !els2('coverageRequestsList').innerHTML.includes('Assign'));

T.currentProfile = COVERER; T.adminOn = false;
ctx.renderCoverageRequestsList();
check('another member sees "I\'ll Cover This"', els2('coverageRequestsList').innerHTML.includes("I'll Cover This"));
check('another plain member does not see Cancel (not theirs, not admin)', !els2('coverageRequestsList').innerHTML.includes('Cancel'));
check('another plain member does not see Assign…', !els2('coverageRequestsList').innerHTML.includes('Assign'));

T.currentProfile = TEAM_LEAD; T.adminOn = false;
ctx.renderCoverageRequestsList();
check('a Team Lead sees Assign…', els2('coverageRequestsList').innerHTML.includes('Assign'));
check('a Team Lead also sees "I\'ll Cover This" (they can self-cover too)', els2('coverageRequestsList').innerHTML.includes("I'll Cover This"));

T.currentProfile = ADMIN; T.adminOn = true;
ctx.renderCoverageRequestsList();
check('Admin sees Cancel on someone else\'s open request', els2('coverageRequestsList').innerHTML.includes('Cancel'));

group('rendering: a resolved request shows who covered it and no action buttons');
T.S = freshState({ coverageRequests: [
  { id: 'c8', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'resolved', coveredByProfileId: 'cov-1', coveredByName: 'Cov Erer', resolvedAt: '2026-09-22T00:00:00Z', createdAt: '2026-09-20T00:00:00Z' }
] });
T.currentProfile = COVERER; T.adminOn = false;
ctx.renderCoverageRequestsList();
check('shows who covered it', els2('coverageRequestsList').innerHTML.includes('Covered by Cov Erer'));
check('no "I\'ll Cover This" on an already-resolved request', !els2('coverageRequestsList').innerHTML.includes("I'll Cover This"));

group('Dashboard card: shows the 2 most recent open requests, and a fully-staffed message when there are none');
T.S = freshState({ coverageRequests: [
  { id: 'd1', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-18T00:00:00Z' },
  { id: 'd2', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-11', serviceKey: 's1', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-19T00:00:00Z' },
  { id: 'd3', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-18', serviceKey: 's2', reason: '', status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-20T00:00:00Z' }
] });
const els3 = els();
ctx.document.getElementById = els3;
ctx.renderDashCoverageRequests();
check('exactly 2 rows rendered (most recent first)', (els3('dashCoverageRequests').innerHTML.match(/Requested by/g) || []).length === 2, els3('dashCoverageRequests').innerHTML);
check('the most recently created request (d3) is included', els3('dashCoverageRequests').innerHTML.includes('November') || els3('dashCoverageRequests').innerHTML.includes('October 18'));

T.S.coverageRequests = [];
ctx.renderDashCoverageRequests();
check('a fully-staffed team shows the reassuring empty message', els3('dashCoverageRequests').innerHTML.includes('fully staffed'));

group('Dashboard card: a long reason is truncated rather than expanding the card');
T.S.coverageRequests = [
  { id: 'd4', profileId: 'req-1', profileName: 'Req Uester', serviceDate: '2026-10-04', serviceKey: 's0', reason: 'R'.repeat(80), status: 'open', coveredByProfileId: null, coveredByName: '', resolvedAt: null, createdAt: '2026-09-21T00:00:00Z' }
];
ctx.renderDashCoverageRequests();
check('reason is truncated with an ellipsis', els3('dashCoverageRequests').innerHTML.includes('…'), els3('dashCoverageRequests').innerHTML);

done();
})();
