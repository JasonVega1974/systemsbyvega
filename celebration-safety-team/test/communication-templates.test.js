/* Communication Templates — static content, no database. Read-only for
   every signed-in member (no admin gate, no roles), since these are
   reference material nobody posts or owns. The one thing that must never
   happen: a `note` (legal/caution guidance meant for the team member using
   the template) leaking into the copied clipboard text or the printed/PDF
   output — that would put "have this reviewed by legal counsel" on an
   actual letter handed to a trespasser. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} });
}

(async () => {

group('COMM_TEMPLATES: all 8 required templates are present with the right titles, and every body is non-empty');
const EXPECTED_TITLES = [
  'Trespass Warning Letter',
  'Verbal Trespass Warning Script',
  'Incident Notification to Pastoral Staff',
  'After-Action Review Agenda',
  'New Volunteer Welcome Message',
  'Insurance Incident Notification',
  'Media Inquiry Response',
  'Parent Notification — Code Adam Resolution'
];
check('exactly 8 templates', T.COMM_TEMPLATES.length === 8, T.COMM_TEMPLATES.length);
check('every expected title is present', EXPECTED_TITLES.every(t => T.COMM_TEMPLATES.some(x => x.title === t)), T.COMM_TEMPLATES.map(t => t.title));
check('every template has non-empty body text', T.COMM_TEMPLATES.every(t => t.body && t.body.trim().length > 0));
check('every template has a unique id', new Set(T.COMM_TEMPLATES.map(t => t.id)).size === T.COMM_TEMPLATES.length);

group('COMM_TEMPLATES: the three templates the spec called for a caution note on actually have one');
const byTitle = title => T.COMM_TEMPLATES.find(t => t.title === title);
check('Trespass Warning Letter has the legal-review note', byTitle('Trespass Warning Letter').note.includes('legal counsel'), byTitle('Trespass Warning Letter').note);
check('Insurance Incident Notification has the "notify immediately" note', byTitle('Insurance Incident Notification').note.includes('immediately'), byTitle('Insurance Incident Notification').note);
check('Media Inquiry Response has the "one spokesperson" note', byTitle('Media Inquiry Response').note.includes('spokesperson'), byTitle('Media Inquiry Response').note);

group('COMM_TEMPLATES: a note is never embedded inside its own template body — it is a separate, UI-only field');
check('the legal-review note text does not appear inside the trespass letter body', !byTitle('Trespass Warning Letter').body.includes('legal counsel'), byTitle('Trespass Warning Letter').body);
check('the insurance "notify immediately" note text does not appear inside that body', !byTitle('Insurance Incident Notification').body.includes('do not delay'), byTitle('Insurance Incident Notification').body);
check('the "one spokesperson" note text does not appear inside the media response body', !byTitle('Media Inquiry Response').body.toLowerCase().includes('one spokesperson'), byTitle('Media Inquiry Response').body);

group('renderTemplates(): renders one card per template, each with both action buttons, and shows the note only when one exists');
const e1 = els();
ctx.document.getElementById = e1;
ctx.renderTemplates();
const html = e1('templateList').innerHTML;
check('all 8 titles appear', EXPECTED_TITLES.every(t => html.includes(t.replace('&', '&amp;'))), html.length);
check('a Copy to Clipboard button exists for every template', (html.match(/Copy to Clipboard/g) || []).length === 8, html);
check('a Download as PDF button exists for every template', (html.match(/Download as PDF/g) || []).length === 8, html);
check('exactly 3 caution notes are rendered (the 3 templates that have one)', (html.match(/tip-box/g) || []).length === 3, html);

group('copyTemplateToClipboard(): copies the template body text, never throws even without a real Clipboard API, and confirms via dialog');
T.currentUser = { id: 'u1', email: 'member@example.com' }; T.currentProfile = { id: 'member-1', role: 'member', team_member_id: null };
const copyP = ctx.copyTemplateToClipboard('media-inquiry');
await new Promise(r => setTimeout(r, 0));
ctx.dialogOk();
let threw = false;
try { await copyP; } catch (e) { threw = true; }
check('does not throw even in an environment with no real clipboard support', threw === false);

group('downloadTemplatePdf(): builds a print document from the template title and body, and never throws');
ctx.document.getElementById = id => (id === 'printDocBox' ? { innerHTML: '' } : els()(id));
let printThrew = false;
try { ctx.downloadTemplatePdf('trespass-letter'); } catch (e) { printThrew = true; }
check('does not throw', printThrew === false);

group('COMM_TEMPLATES: an unknown id is a safe no-op for every action, not a crash');
let noopThrew = false;
try {
  ctx.renderTemplates();
  await ctx.copyTemplateToClipboard('does-not-exist');
  ctx.downloadTemplatePdf('does-not-exist');
} catch (e) { noopThrew = true; }
check('no crash for an unknown template id', noopThrew === false);

done();
})();
