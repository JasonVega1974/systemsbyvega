/* Loads the app's real inline <script> under a stub DOM so its functions can be
   exercised in node. The app is a single file with no module system, so the
   alternative would be duplicating logic into a test — which tests nothing. */
const fs = require('fs'), vm = require('vm');

function loadApp(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const js = html.match(/<script>\n([\s\S]*)\n<\/script>/)[1];

  const el = new Proxy({}, {
    get(t, k) {
      if (k === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
      if (k === 'style') return {};
      if (k === 'files') return [];
      if (['insertAdjacentHTML','appendChild','click','remove','addEventListener','focus'].includes(k)) return () => {};
      if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      return undefined;
    },
    set() { return true; }
  });

  const ctx = {
    console,
    localStorage: { _v: null, getItem(){ return this._v; }, setItem(k,v){ this._v = v; }, removeItem(){ this._v = null; } },
    document: { getElementById: () => el, querySelectorAll: () => [], createElement: () => el, body: el, addEventListener: () => {} },
    window: { addEventListener(){}, removeEventListener(){}, print(){}, scrollTo(){} },
    alert: () => {}, confirm: () => true, prompt: () => null,
    Blob: function(){}, URL: { createObjectURL: () => '', revokeObjectURL(){} },
    FileReader: function(){}, setTimeout, Date, Math, JSON, Object, Array, String, Number, Set, isNaN, parseInt
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
  COURSES, ONBOARD_ITEMS, SERVICES, MIN_SLOTS, MAX_SLOTS
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
