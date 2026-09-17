/* Failure paths for the Supabase-backed data layer. v1 swallowed localStorage
   failures in `catch (e) {}`, so the app kept showing data as if it had been
   saved; that principle now applies to network/RLS failures instead — see
   dbWrite()'s comment in index.html. These assert that a failure is loud
   (the #storageAlert banner) and never silently overwrites what was on
   screen with something the database doesn't actually have. */
const fs = require('fs'), vm = require('vm');
const { createFakeSupabase } = require('./fakeSupabase');
const { check, group, done } = require('./harness').runner();

const htmlPath = process.argv[2];
const js = fs.readFileSync(htmlPath, 'utf8').match(/<script>\n([\s\S]*)\n<\/script>/)[1];

/* A DOM stub that actually records what gets written to #storageAlert, since
   the whole point of these fixes is that something becomes visible. */
function build() {
  const alertEl = { innerHTML: '', style: { display: 'none' } };
  const generic = new Proxy({}, {
    get(t, k) {
      if (k === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
      if (k === 'style') return {};
      if (k === 'files') return [];
      if (['insertAdjacentHTML','appendChild','click','remove','addEventListener','focus','setAttribute','querySelector'].includes(k)) return () => {};
      if (k === 'querySelectorAll') return () => [];
      if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      return undefined;
    },
    set() { return true; }
  });
  const ctx = {
    console,
    document: {
      getElementById: id => (id === 'storageAlert' ? alertEl : generic),
      querySelectorAll: () => [],
      createElement: () => generic,
      body: generic,
      addEventListener: () => {}
    },
    window: { addEventListener(){}, removeEventListener(){}, print(){}, scrollTo(){} },
    Blob: function(){}, URL: { createObjectURL: () => '', revokeObjectURL(){} },
    FileReader: function(){}, setTimeout, Date, Math, JSON, Object, Array, String, Number, Set, isNaN, parseInt, Promise
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(js + `
;globalThis.__t = { get S(){return S}, set S(v){S=v},
  get sb(){return sb}, set sb(v){sb=v},
  get currentUser(){return currentUser}, set currentUser(v){currentUser=v},
  get currentProfile(){return currentProfile}, set currentProfile(v){currentProfile=v} };`, ctx);
  return { ctx, T: ctx.__t, alertEl };
}

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };

(async () => {

group('a healthy loadAllData() populates S and leaves the banner alone');
{
  const { ctx, T, alertEl } = build();
  T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
  T.sb = createFakeSupabase({
    cc_team: [{ id: 'tm1', first_name: 'A', last_name: 'B', phone: '', email: '', specialty: 'General / Trained Volunteer', team_role: 'Team Lead' }]
  });
  await ctx.loadAllData();
  check('team loaded', T.S.team.length === 1 && T.S.team[0].first === 'A', T.S.team);
  check('banner stays hidden', alertEl.style.display === 'none', alertEl.style.display);
}

group('a failed table fetch is reported loudly, and degrades to empty rather than stale');
{
  const { ctx, T, alertEl } = build();
  T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
  T.sb = createFakeSupabase({ cc_team: [{ id: 'tm1', first_name: 'A', last_name: 'B' }] });
  T.sb.__forceNextError('cc_team', { message: 'network unreachable' });
  await ctx.loadAllData();
  check('the failed table loads empty rather than throwing', Array.isArray(T.S.team) && T.S.team.length === 0, T.S.team);
  check('the banner is visible', alertEl.style.display === '', alertEl.style.display);
  check('the banner names what failed', /roster/i.test(alertEl.innerHTML), alertEl.innerHTML);
  check('the banner names the underlying error', /network unreachable/.test(alertEl.innerHTML), alertEl.innerHTML);
}

group('a failed write does not pretend to have succeeded');
{
  const { ctx, T, alertEl } = build();
  T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
  T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
  T.sb = createFakeSupabase({ cc_leaders: [] });
  T.sb.__forceNextError('cc_leaders', { message: 'permission denied for table cc_leaders' });

  const el = { value: '' };
  ctx.document.getElementById = id => {
    if (id === 'storageAlert') return alertEl;
    if (id === 'lName') return { value: 'Pastor Roger' };
    if (id === 'lTitle') return { value: 'Senior Pastor' };
    if (id === 'lNotes') return { value: '' };
    return el;
  };
  await ctx.saveLeader();
  check('the leader was NOT added locally', T.S.leaders.length === 0, T.S.leaders);
  check('the database was not touched either', T.sb._store.cc_leaders.length === 0, T.sb._store.cc_leaders);
  check('the banner explains the RLS failure', /permission denied/.test(alertEl.innerHTML), alertEl.innerHTML);
}

group('dbWrite never auto-clears the banner on a later, unrelated success');
{
  /* If dbWrite() cleared on every success, a second (successful) call
     running concurrently with a failing one could erase that failure's
     warning before the user ever saw it. dbWrite() deliberately never
     clears anything on success — only a fresh loadAllData() does, at the
     one point "everything is being re-read from scratch" is actually true. */
  const { ctx, T, alertEl } = build();
  T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
  T.sb = createFakeSupabase({ cc_leaders: [], cc_meetings: [{ id: 'mt1', meeting_date: '2026-01-01', meeting_time: null, title: 'x', notes: '' }] });
  T.sb.__forceNextError('cc_leaders', { message: 'boom' });

  await ctx.dbWrite(T.sb.from('cc_leaders').select('*'), 'Could not load leadership');
  check('the failure is visible', alertEl.style.display === '', alertEl.style.display);
  await ctx.dbWrite(T.sb.from('cc_meetings').select('*'), 'Could not load meetings');
  check('a later, unrelated success does not erase it', alertEl.style.display === '', alertEl.style.display);
}

group('loadAllData() clears a stale banner from a previous failed load');
{
  const { ctx, T, alertEl } = build();
  T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
  T.sb = createFakeSupabase({ cc_team: [] });
  T.sb.__forceNextError('cc_team', { message: 'first attempt fails' });
  await ctx.loadAllData();
  check('the first, failing load leaves the banner up', alertEl.style.display === '', alertEl.style.display);

  T.sb = createFakeSupabase({ cc_team: [{ id: 'tm1', first_name: 'A', last_name: 'B' }] });
  await ctx.loadAllData();
  check('a fresh successful load clears it', alertEl.style.display === 'none', alertEl.style.display);
  check('and the data is actually there this time', T.S.team.length === 1, T.S.team);
}

done();
})();
