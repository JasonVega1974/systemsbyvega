/* Loads the app's real inline <script> under a stub DOM so its functions can be
   exercised in node. The app is a single file with no module system, so the
   alternative would be duplicating logic into a test — which tests nothing. */
const fs = require('fs'), vm = require('vm');

function loadApp(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  /* The app has more than one <script> tag (a small pre-paint theme script in
     <head>, the vendor bundle, the app's own logic) — a naive first-<script>
     to last-</script> match would swallow everything in between, including
     raw HTML, as "JS". The app's own inline logic is always the LAST <script>
     block in the file, immediately after the vendor <script src=...> tag. */
  const lastOpen = html.lastIndexOf('<script>');
  const lastClose = html.lastIndexOf('</script>');
  const js = html.slice(lastOpen + '<script>'.length, lastClose);

  const el = new Proxy({}, {
    get(t, k) {
      if (k === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
      if (k === 'style') return {};
      if (k === 'files') return [];
      if (['insertAdjacentHTML','appendChild','click','remove','addEventListener',
           'removeEventListener','focus','blur','setAttribute','removeAttribute',
           'querySelector','scrollIntoView'].includes(k)) return () => {};
      if (k === 'querySelectorAll') return () => [];
      if (k === 'getAttribute' || k === 'hasAttribute') return () => null;
      if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      /* Real layout has no meaning in this stub DOM — width/height/all
         edges zero, same "there is nothing here" signal a genuinely
         display:none element's rect would give in a real browser. Callers
         that branch on a zero-sized rect (the guided tour's spotlight
         positioning) get the same "nothing to highlight" path a test can
         exercise without a real renderer. */
      if (k === 'getBoundingClientRect') return () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 });
      if (k === 'offsetParent') return null;
      return undefined;
    },
    set() { return true; }
  });

  /* No `serviceWorker` property — 'serviceWorker' in navigator reads false,
     so the app's registration branch is skipped entirely rather than needing
     a fake register() to satisfy. userAgent/platform/maxTouchPoints are
     plain desktop-Chrome-shaped defaults; iOS-detection tests (if any) can
     override ctx.navigator's fields directly on the returned ctx. */
  const navigatorStub = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 0, onLine: true, standalone: undefined };
  const ctx = {
    console,
    localStorage: { _v: null, getItem(){ return this._v; }, setItem(k,v){ this._v = v; }, removeItem(){ this._v = null; } },
    document: { getElementById: () => el, querySelector: () => el, querySelectorAll: () => [], createElement: () => el, body: el, documentElement: el, addEventListener: () => {} },
    window: { addEventListener(){}, removeEventListener(){}, print(){}, scrollTo(){}, matchMedia: () => ({ matches: false }), navigator: navigatorStub, innerWidth: 1024, innerHeight: 768 },
    navigator: navigatorStub,
    alert: () => {}, confirm: () => true, prompt: () => null,
    Blob: function(){}, URL: { createObjectURL: () => '', revokeObjectURL(){} },
    FileReader: function(){}, setTimeout, Date, Math, JSON, Object, Array, String, Number, Set, isNaN, parseInt,
    /* No real frame to wait for in a stub DOM — resolving on the next tick
       is close enough for anything that just needs "after this render". */
    requestAnimationFrame: cb => setTimeout(cb, 0)
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  /* `const COURSES` and `let S` are lexical bindings and never become
     properties of the VM context, so expose real accessors rather than
     letting a test mutate a detached copy and pass for the wrong reason. */
  vm.runInContext(js + `
;globalThis.__t = {
  get S() { return S; }, set S(v) { S = v; },
  get adminOn() { return adminOn; }, set adminOn(v) { adminOn = v; },
  get sb() { return sb; }, set sb(v) { sb = v; },
  get currentUser() { return currentUser; }, set currentUser(v) { currentUser = v; },
  get currentProfile() { return currentProfile; }, set currentProfile(v) { currentProfile = v; },
  get curCourse() { return curCourse; }, set curCourse(v) { curCourse = v; },
  get quizAnswers() { return quizAnswers; }, set quizAnswers(v) { quizAnswers = v; },
  get quizSubmitted() { return quizSubmitted; }, set quizSubmitted(v) { quizSubmitted = v; },
  get editingMemberId() { return editingMemberId; }, set editingMemberId(v) { editingMemberId = v; },
  COURSES, ONBOARD_ITEMS, SERVICES, MIN_SLOTS, MAX_SLOTS, PASS_THRESHOLD, TOUR_STEPS,
  COMM_TEMPLATES, EVENT_CATEGORIES,
  alertDialog, confirmDialog
};`, ctx);

  return { ctx, T: ctx.__t };
}

function runner() {
  let pass = 0, fail = 0;
  return {
    check(name, cond, detail) {
      if (cond) { pass++; console.log('  PASS  ' + name); }
      else { fail++; console.log('  FAIL  ' + name + (detail !== undefined ? '   got: ' + JSON.stringify(detail) : '')); }
    },
    group(name) { console.log('\n— ' + name + ' —'); },
    done() {
      console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED'));
      process.exit(fail === 0 ? 0 : 1);
    }
  };
}

module.exports = { loadApp, runner };
