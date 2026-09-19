/* Prayer Request Board (cc_prayers) — any authenticated member posts; the
   poster or Admin can mark it answered or remove it; no editing the request
   text (remove + repost only, enforced at the DB column-grant level per
   sql/PRAYER-REQUESTS.sql, not just the UI). postedByName is a denormalized
   snapshot — see the header comment above PRAYER REQUEST BOARD in index.html
   for why cc_profiles can't be resolved cross-profile for this. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };
const MEMBER_USER = { id: 'member-1', email: 'member@example.com' };
const OTHER_MEMBER = { id: 'member-2', role: 'member', team_member_id: null };

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} });
}

function baseS(prayers) {
  return { prayers: prayers || [], activity: [] };
}

(async () => {

group('prayerRowToJs(): maps every DB column to its JS field');
const row = ctx.prayerRowToJs({ id: 'p1', profile_id: 'member-1', posted_by_name: 'Ann Baker', request_text: 'Pray for my family.', posted_at: '2026-09-10T00:00:00Z', answered: false, answered_at: null });
check('all fields present', row.id === 'p1' && row.profileId === 'member-1' && row.postedByName === 'Ann Baker' && row.requestText === 'Pray for my family.' && row.answered === false, row);

group('sortedPrayers(): active requests sort newest-first, then answered ones (also newest-first) sink to the bottom');
T.S = baseS([
  { id: 'p1', profileId: 'member-1', postedByName: 'Ann', requestText: 'Old active', postedAt: '2026-09-01T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p2', profileId: 'member-1', postedByName: 'Ben', requestText: 'Newer active', postedAt: '2026-09-10T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p3', profileId: 'member-1', postedByName: 'Cy', requestText: 'Newest answered', postedAt: '2026-09-12T00:00:00Z', answered: true, answeredAt: '2026-09-13T00:00:00Z' },
  { id: 'p4', profileId: 'member-1', postedByName: 'Di', requestText: 'Oldest answered', postedAt: '2026-09-05T00:00:00Z', answered: true, answeredAt: '2026-09-06T00:00:00Z' }
]);
const sorted = ctx.sortedPrayers();
check('active requests come first, newest-first (p2, then p1)', sorted[0].id === 'p2' && sorted[1].id === 'p1', sorted.map(p => p.id));
check('answered requests are last, also newest-first (p3, then p4)', sorted[2].id === 'p3' && sorted[3].id === 'p4', sorted.map(p => p.id));

group('renderDashPrayers(): shows only up to 3 active requests, newest-first, and never an answered one');
T.S = baseS([
  { id: 'p1', profileId: 'member-1', postedByName: 'Ann', requestText: 'Request one', postedAt: '2026-09-01T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p2', profileId: 'member-1', postedByName: 'Ben', requestText: 'Request two', postedAt: '2026-09-05T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p3', profileId: 'member-1', postedByName: 'Cy', requestText: 'Request three', postedAt: '2026-09-08T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p4', profileId: 'member-1', postedByName: 'Di', requestText: 'Request four — most recent', postedAt: '2026-09-12T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p5', profileId: 'member-1', postedByName: 'Ed', requestText: 'Already answered, must never show here', postedAt: '2026-09-13T00:00:00Z', answered: true, answeredAt: '2026-09-14T00:00:00Z' }
]);
const e1 = els();
ctx.document.getElementById = e1;
ctx.renderDashPrayers();
check('exactly 3 requests rendered', (e1('dashPrayersBox').innerHTML.match(/Request/g) || []).length === 3, e1('dashPrayersBox').innerHTML);
check('the most recent active request is included', e1('dashPrayersBox').innerHTML.includes('Request four'), e1('dashPrayersBox').innerHTML);
check('the oldest active request (of 4) is excluded', !e1('dashPrayersBox').innerHTML.includes('Request one'), e1('dashPrayersBox').innerHTML);
check('the answered request never appears on the dashboard preview', !e1('dashPrayersBox').innerHTML.includes('Already answered'), e1('dashPrayersBox').innerHTML);

group('renderDashPrayers(): an all-answered or empty board shows the empty state, not a blank card');
T.S = baseS([]);
ctx.renderDashPrayers();
check('empty message shown', e1('dashPrayersBox').innerHTML.includes('No active prayer requests.'), e1('dashPrayersBox').innerHTML);

group('renderAllPrayers(): answered requests show a checkmark and reduced opacity, active ones do not');
T.S = baseS([
  { id: 'p1', profileId: 'member-1', postedByName: 'Ann', requestText: 'Active request', postedAt: '2026-09-01T00:00:00Z', answered: false, answeredAt: null },
  { id: 'p2', profileId: 'member-1', postedByName: 'Ben', requestText: 'Answered request', postedAt: '2026-09-02T00:00:00Z', answered: true, answeredAt: '2026-09-03T00:00:00Z' }
]);
T.currentProfile = OTHER_MEMBER; T.adminOn = false;
const e2 = els();
ctx.document.getElementById = e2;
ctx.renderAllPrayers();
check('the checkmark appears exactly once, on the answered request', (e2('allPrayersBox').innerHTML.match(/✅/g) || []).length === 1, e2('allPrayersBox').innerHTML);
check('opacity:.6 is applied to the answered row only', e2('allPrayersBox').innerHTML.includes('opacity:.6'), e2('allPrayersBox').innerHTML);

group('renderAllPrayers(): "Mark Answered" and "Remove" are gated to the poster or an Admin — a different plain member sees neither');
check('no Mark Answered button for a non-poster, non-admin viewer', !e2('allPrayersBox').innerHTML.includes('Mark Answered'), e2('allPrayersBox').innerHTML);
check('no Remove button either', !e2('allPrayersBox').innerHTML.includes('Remove'), e2('allPrayersBox').innerHTML);

group('renderAllPrayers(): the poster sees both buttons on their own active request, but not on an already-answered one');
T.currentProfile = MEMBER; // profileId 'member-1' matches both requests above
ctx.renderAllPrayers();
check('Mark Answered is offered on the active request', e2('allPrayersBox').innerHTML.includes('Mark Answered'), e2('allPrayersBox').innerHTML);
check('exactly one Remove button per manageable row — both are the poster\'s own', (e2('allPrayersBox').innerHTML.match(/Remove/g) || []).length === 2, e2('allPrayersBox').innerHTML);

group('renderAllPrayers(): an Admin can manage everyone\'s requests, not just their own');
T.currentProfile = ADMIN; T.adminOn = true;
ctx.renderAllPrayers();
check('Admin sees Remove on a request posted by someone else', (e2('allPrayersBox').innerHTML.match(/Remove/g) || []).length === 2, e2('allPrayersBox').innerHTML);

group('renderAllPrayers(): an empty board shows its own empty message, distinct from the dashboard\'s');
T.S = baseS([]);
ctx.renderAllPrayers();
check('empty message shown', e2('allPrayersBox').innerHTML.includes('No prayer requests yet.'), e2('allPrayersBox').innerHTML);

group('savePrayer(): inserts under the poster\'s own profile id with a name snapshot, and prepends it locally');
T.S = baseS([]);
T.currentUser = MEMBER_USER; T.currentProfile = MEMBER;
T.sb = createFakeSupabase({ cc_prayers: [] });
const e3 = els();
e3('prayerText').value = 'Please pray for healing.';
ctx.document.getElementById = e3;
await ctx.savePrayer();
check('the request is in S', T.S.prayers.length === 1 && T.S.prayers[0].requestText === 'Please pray for healing.', T.S.prayers);
check('the database row is owned by the poster', T.sb._store.cc_prayers[0].profile_id === 'member-1', T.sb._store.cc_prayers);
check('a posted_by_name snapshot was written', !!T.sb._store.cc_prayers[0].posted_by_name, T.sb._store.cc_prayers[0]);

group('savePrayer(): refuses to post an empty request and writes nothing');
T.S = baseS([]);
T.sb = createFakeSupabase({ cc_prayers: [] });
e3('prayerText').value = '   ';
const saveP = ctx.savePrayer();
await new Promise(r => setTimeout(r, 0));
ctx.dialogOk();
await saveP;
check('nothing added to S', T.S.prayers.length === 0, T.S.prayers);
check('nothing written to the database', T.sb._store.cc_prayers.length === 0, T.sb._store.cc_prayers);

group('markPrayerAnswered(): flips answered locally and in the database, without touching the request text');
T.S = baseS([{ id: 'p1', profileId: 'member-1', postedByName: 'Ann', requestText: 'Original text', postedAt: '2026-09-01T00:00:00Z', answered: false, answeredAt: null }]);
T.sb = createFakeSupabase({ cc_prayers: [{ id: 'p1', request_text: 'Original text', answered: false, answered_at: null }] });
await ctx.markPrayerAnswered('p1');
check('answered is true locally', T.S.prayers[0].answered === true, T.S.prayers[0]);
check('answered_at is stamped locally', !!T.S.prayers[0].answeredAt, T.S.prayers[0]);
check('the database row is updated', T.sb._store.cc_prayers[0].answered === true && !!T.sb._store.cc_prayers[0].answered_at, T.sb._store.cc_prayers[0]);
check('the request text is untouched', T.sb._store.cc_prayers[0].request_text === 'Original text', T.sb._store.cc_prayers[0]);

group('deletePrayer(): removes locally and from the database after confirmation');
T.S = baseS([{ id: 'p1', profileId: 'member-1', postedByName: 'Ann', requestText: 'To be removed', postedAt: '2026-09-01T00:00:00Z', answered: false, answeredAt: null }]);
T.sb = createFakeSupabase({ cc_prayers: [{ id: 'p1' }] });
const delP = ctx.deletePrayer('p1');
ctx.dialogOk();
await delP;
check('gone from S', T.S.prayers.length === 0, T.S.prayers);
check('gone from the database', T.sb._store.cc_prayers.length === 0, T.sb._store.cc_prayers);

group('deletePrayer(): cancelling the confirmation leaves the request untouched');
T.S = baseS([{ id: 'p1', profileId: 'member-1', postedByName: 'Ann', requestText: 'Keep me', postedAt: '2026-09-01T00:00:00Z', answered: false, answeredAt: null }]);
T.sb = createFakeSupabase({ cc_prayers: [{ id: 'p1' }] });
const delP2 = ctx.deletePrayer('p1');
ctx.dialogCancel();
await delP2;
check('still in S', T.S.prayers.length === 1, T.S.prayers);
check('still in the database', T.sb._store.cc_prayers.length === 1, T.sb._store.cc_prayers);

done();
})();
