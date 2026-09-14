/* Storage failure paths. v1 swallowed every one of these in `catch (e) {}`,
   so the app kept showing data as if it had been saved. These assert that a
   failure is both visible and non-destructive. */
const fs = require('fs'), vm = require('vm');
const { runner } = require('./harness');
const { check, group, done } = runner();

const htmlPath = process.argv[2];
const js = fs.readFileSync(htmlPath, 'utf8').match(/<script>\n([\s\S]*)\n<\/script>/)[1];

/* A DOM stub that actually records what gets written to #storageAlert, since
   the whole point of these fixes is that something becomes visible. */
function build(storage) {
  const alertEl = { innerHTML: '', style: { display: 'none' } };
  const generic = new Proxy({}, {
    get(t, k) {
      if (k === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
      if (k === 'style') return {};
      if (k === 'files') return [];
      if (['insertAdjacentHTML','appendChild','click','remove','addEventListener','focus','setAttribute','querySelector'].includes(k)) return () => {};
      if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      return undefined;
    },
    set() { return true; }
  });
  const ctx = {
    console,
    localStorage: storage,
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
  get storageLocked(){return storageLocked}, get loadWarning(){return loadWarning} };`, ctx);
  return { ctx, T: ctx.__t, alertEl };
}

const GOOD = JSON.stringify({ schemaVersion: 2, pin: '2121', team: [{ id: 'tm1', first: 'A', last: 'B', phone: '', role: 'Team Lead' }],
  leaders: [], meetings: [], schedule: {}, progress: {}, activeId: 'guest', activity: [] });

(async () => {

group('healthy storage stays quiet');
{
  const { T, alertEl } = build({ _v: GOOD, getItem(){ return this._v; }, setItem(k, v){ this._v = v; }, removeItem(){ this._v = null; } });
  check('no warning raised', T.loadWarning === null, T.loadWarning);
  check('not locked', T.storageLocked === false);
  check('alert banner hidden', alertEl.style.display === 'none', alertEl.style.display);
  check('data actually loaded', T.S.team.length === 1, T.S.team.length);
}

group('unreadable saved data is reported, NOT overwritten');
{
  const store = { _v: '{ this is not json', getItem(){ return this._v; }, setItem(k, v){ this._v = v; }, removeItem(){ this._v = null; } };
  const { ctx, T, alertEl } = build(store);
  check('load did not throw and app still started', !!T.S);
  check('storageLocked is set', T.storageLocked === true, T.storageLocked);
  check('a warning was produced', /could not be read/i.test(T.loadWarning || ''), T.loadWarning);

  const wrote = ctx.save();
  check('save() refuses to run', wrote === false, wrote);
  check('the unreadable data is STILL THERE, untouched', store._v === '{ this is not json', store._v);
  check('the banner is now visible', alertEl.style.display === '', alertEl.style.display);
  check('the banner explains why', /Not saving/i.test(alertEl.innerHTML), alertEl.innerHTML.slice(0, 80));
  check('and offers a way out', /discardUnreadableData|Restore/i.test(alertEl.innerHTML));

  /* The confirm is an in-page dialog now, so the test drives it rather than
     stubbing past it — that way it exercises the real settle path. */
  const cancelled = ctx.discardUnreadableData();
  ctx.dialogCancel();
  await cancelled;
  check('CANCELLING the discard leaves the data alone', store._v === '{ this is not json' && T.storageLocked === true, store._v);

  const discarded = ctx.discardUnreadableData();
  ctx.dialogOk();
  await discarded;
  check('confirming clears the lock', T.storageLocked === false);
  check('and writing works again', store._v !== '{ this is not json' && (store._v || '').length > 2, (store._v || '').slice(0, 40));
}

group('a write that throws (quota full / blocked) is surfaced');
{
  const store = { _v: GOOD, getItem(){ return this._v; },
    setItem(){ const e = new Error('exceeded'); e.name = 'QuotaExceededError'; throw e; },
    removeItem(){ this._v = null; } };
  const { ctx, alertEl } = build(store);
  const wrote = ctx.save();
  check('save() reports failure rather than pretending', wrote === false, wrote);
  check('banner visible', alertEl.style.display === '', alertEl.style.display);
  check('banner says changes are not being saved', /NOT being saved/i.test(alertEl.innerHTML), alertEl.innerHTML.slice(0, 90));
  check('banner names the cause', /QuotaExceededError/.test(alertEl.innerHTML));
  check('banner points at Export Backup', /Export Backup/i.test(alertEl.innerHTML));
}

group('storage blocked entirely (private browsing / kiosk)');
{
  const store = { getItem(){ throw new Error('denied'); }, setItem(){ throw new Error('denied'); }, removeItem(){} };
  const { T, alertEl } = build(store);
  check('app still starts on defaults', !!T.S && Array.isArray(T.S.team), T.S && T.S.team);
  check('warning produced', /blocking local storage/i.test(T.loadWarning || ''), T.loadWarning);
  check('NOT marked locked — there is nothing to protect', T.storageLocked === false, T.storageLocked);
  check('banner shown at startup', alertEl.style.display === '', alertEl.style.display);
}

done();
})();
