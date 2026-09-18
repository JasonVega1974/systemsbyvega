/* Admin-controlled section/module visibility (cc_settings) — absence of a
   key means visible, a hidden section is skipped by showSection() and its
   nav-item hidden, and a hidden Academy module drops out of renderCourses(). */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };

function fakeClassEl() {
  const classes = new Set();
  return { classes, classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains: c => classes.has(c) } };
}

(async () => {

T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {}, verses: [], notes: [], facilityMaps: {}, settings: { sections: {}, academyModules: {} } };
T.sb = createFakeSupabase({ cc_settings: [] });

group('a section with no recorded setting is visible by default');
check('isSectionVisible defaults true for an unmentioned toggleable section', ctx.isSectionVisible('academy') === true);
check('isSectionVisible is always true for a non-toggleable section', ctx.isSectionVisible('overview') === true);

group('an explicit false hides a section');
T.S.settings.sections = { academy: false };
check('academy now reports hidden', ctx.isSectionVisible('academy') === false);
check('an unrelated section is unaffected', ctx.isSectionVisible('procedures') === true);

group('a hidden module is skipped by isModuleVisible, an unmentioned one is not');
T.S.settings.academyModules = { ss304: false };
check('ss304 hidden', ctx.isModuleVisible('ss304') === false);
check('a module with no recorded setting stays visible', ctx.isModuleVisible('ss101') === true);

group('renderCourses() drops a hidden module from the grid and its counts');
const collected = {};
ctx.document.getElementById = id => {
  if (!collected[id]) collected[id] = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} };
  return collected[id];
};
ctx.renderCourses();
check('ss304 (Pastoral Coverage) is not in the rendered grid', !collected.courseGrid.innerHTML.includes('ss304') && !collected.courseGrid.innerHTML.includes('Pastoral Coverage'), collected.courseGrid.innerHTML.length);
check('certTotal reflects only visible modules', Number(collected.certTotal.textContent) === T.COURSES.filter(c => c.id !== 'ss304').length);

group('showSection() redirects a hidden section to the dashboard');
const sections = { 'sec-overview': fakeClassEl(), 'sec-academy': fakeClassEl() };
const navItems = [Object.assign({ dataset: { section: 'overview' } }, fakeClassEl()), Object.assign({ dataset: { section: 'academy' } }, fakeClassEl())];
navItems.forEach(n => { n.setAttribute = () => {}; n.removeAttribute = () => {}; });
ctx.document.getElementById = id => sections[id] || collected[id] || Object.assign(fakeClassEl(), { style: {}, textContent: '', innerHTML: '', value: '', setAttribute(){}, removeAttribute(){} });
ctx.document.querySelectorAll = sel => (sel === '.section' ? Object.values(sections) : sel === '.nav-item' ? navItems : []);
ctx.showSection('academy');
check('a hidden section never gets marked active', !sections['sec-academy'].classes.has('active'), [...sections['sec-academy'].classes]);
check('showSection bounced to the dashboard instead', sections['sec-overview'].classes.has('active'), [...sections['sec-overview'].classes]);

done();
})();
