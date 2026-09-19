/* Spanish-language toggle for Emergency Procedures — both languages live in
   the DOM at all times as .lang-en/.lang-es siblings inside every
   .proc-title/.proc-body (never re-rendered); the toggle just flips a CSS
   class on #sec-procedures. Persisted to localStorage as a display
   preference (not a database column) and defaults to English for everyone,
   not just admins. printProcedure()/printAllProcedures() must read only
   the active language, or a raw innerHTML grab would print both languages
   concatenated together — that's what procTitleText()/procBodyHtml() exist
   to prevent, so they're the focus of this file alongside the toggle
   itself. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function fakeClassEl() {
  const classes = new Set();
  return { classes, classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains: c => classes.has(c) } };
}
function fakeBtn() { return { className: '' }; }
function fakeCard(titleEn, titleEs, bodyEnHtml, bodyEsHtml) {
  const map = {
    '.proc-title .lang-en': { textContent: titleEn },
    '.proc-title .lang-es': { textContent: titleEs },
    '.proc-body > .lang-en': { innerHTML: bodyEnHtml },
    '.proc-body > .lang-es': { innerHTML: bodyEsHtml }
  };
  return { querySelector: sel => map[sel] || null };
}

(async () => {

group('setProcLang(): toggles the lang-es class on #sec-procedures and updates both button styles');
const secProcedures = fakeClassEl();
const enBtn = fakeBtn(), esBtn = fakeBtn();
const els = { 'sec-procedures': secProcedures, procLangEnBtn: enBtn, procLangEsBtn: esBtn };
ctx.document.getElementById = id => els[id];
ctx.localStorage.setItem('ccstProcLang', null);
ctx.setProcLang('es');
check('lang-es class is applied', secProcedures.classes.has('lang-es'));
check('the English button is de-emphasized', enBtn.className === 'btn btn-ghost', enBtn.className);
check('the Spanish button is emphasized', esBtn.className === 'btn btn-primary', esBtn.className);
check('the preference is persisted to localStorage', ctx.localStorage.getItem('ccstProcLang') === 'es');

ctx.setProcLang('en');
check('lang-es class is removed', !secProcedures.classes.has('lang-es'));
check('the English button is emphasized again', enBtn.className === 'btn btn-primary', enBtn.className);
check('the Spanish button is de-emphasized again', esBtn.className === 'btn btn-ghost', esBtn.className);

group('setProcLang(): an unrecognized value falls back to English, not a broken state');
ctx.setProcLang('fr');
check('falls back to English', !secProcedures.classes.has('lang-es'));

group('activeProcLang(): reads the class actually applied to #sec-procedures');
ctx.setProcLang('es');
check('reports es when the class is present', ctx.activeProcLang() === 'es');
ctx.setProcLang('en');
check('reports en when the class is absent', ctx.activeProcLang() === 'en');

group('initProcLang(): defaults to English when nothing is saved, and restores a saved preference');
ctx.localStorage.setItem('ccstProcLang', null);
ctx.initProcLang();
check('defaults to English with nothing saved', ctx.activeProcLang() === 'en');
ctx.localStorage.setItem('ccstProcLang', 'es');
ctx.initProcLang();
check('restores a previously saved Spanish preference', ctx.activeProcLang() === 'es');
ctx.setProcLang('en'); // leave state clean for the following groups

group('procTitleText()/procBodyHtml(): resolve to the currently active language, not always English');
const card = fakeCard('Fire & Evacuation', 'Incendio y Evacuación', '<p>English body</p>', '<p>Cuerpo en español</p>');
ctx.setProcLang('en');
check('English title when English is active', ctx.procTitleText(card) === 'Fire & Evacuation');
check('English body when English is active', ctx.procBodyHtml(card) === '<p>English body</p>');
ctx.setProcLang('es');
check('Spanish title when Spanish is active', ctx.procTitleText(card) === 'Incendio y Evacuación');
check('Spanish body when Spanish is active, never both languages concatenated', ctx.procBodyHtml(card) === '<p>Cuerpo en español</p>');
ctx.setProcLang('en'); // leave state clean

done();
})();
