/* Dashboard "Recent Incidents & BOLOs" card (replaces the old Service
   Coverage Rule card) — 2 most recent unrestricted incidents, active BOLOs,
   restricted incidents never included regardless of who's viewing, and an
   empty state when there's nothing on record. S.bolos may not exist at all
   (a page that hasn't loaded the BOLO feature's data yet) — treated as none. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function stubFields(fields) {
  const blank = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} };
  ctx.document.getElementById = id => (id in fields) ? fields[id] : blank;
}

const box = { innerHTML: '' };
stubFields({ dashIncidentsBolos: box });

group('nothing on record shows the empty state');
T.S = { incidents: [], settings: { sections: {}, academyModules: {} } };
ctx.renderDashIncidentsBolos();
check('empty-state message shown', box.innerHTML.includes('No incidents on record'), box.innerHTML);

group('a restricted incident never appears in the preview');
T.S.incidents = [{ id: 'i1', category: 'trespassing', date: '2026-09-10', restricted: true }];
ctx.renderDashIncidentsBolos();
check('still shows the empty state (the only incident is restricted)', box.innerHTML.includes('No incidents on record'), box.innerHTML);

group('shows only the 2 most recent (by date) unrestricted incidents, oldest-first input included');
T.S.incidents = [
  { id: 'i1', category: 'trespassing', date: '2026-09-01', restricted: false },  // oldest — must be excluded
  { id: 'i2', category: 'medical', date: '2026-09-05', restricted: false },
  { id: 'i3', category: 'child_related', date: '2026-09-10', restricted: true }, // most recent but restricted
  { id: 'i4', category: 'facility_hazard', date: '2026-09-12', restricted: false }
];
ctx.renderDashIncidentsBolos();
check('restricted incident (child_related) is absent', !box.innerHTML.includes('Child'), box.innerHTML);
check('the oldest unrestricted incident (i1, 2026-09-01) is excluded — only the 2 most recent show', !box.innerHTML.includes('2026-09-01'), box.innerHTML);
check('the two most recent unrestricted incidents (09-05, 09-12) both show', box.innerHTML.includes('2026-09-05') && box.innerHTML.includes('2026-09-12'), box.innerHTML);
check('exactly 2 incident rows rendered', (box.innerHTML.match(/border-bottom/g) || []).length === 2, box.innerHTML);

group('active BOLOs appear alongside incidents; resolved ones do not');
T.S.bolos = [
  { id: 'b1', subjectDescription: 'Male, red jacket, seen near foyer', status: 'Active', issuedAt: '2026-09-14T00:00:00Z' },
  { id: 'b2', subjectDescription: 'Resolved case', status: 'Resolved', issuedAt: '2026-09-01T00:00:00Z' }
];
ctx.renderDashIncidentsBolos();
check('the active BOLO is shown', box.innerHTML.includes('red jacket'), box.innerHTML);
check('the resolved BOLO is not shown', !box.innerHTML.includes('Resolved case'), box.innerHTML);
check('BOLO row is tagged', box.innerHTML.includes('>BOLO<'), box.innerHTML);

group('S.bolos missing entirely (BOLO feature not loaded) does not throw and shows incidents only');
delete T.S.bolos;
ctx.renderDashIncidentsBolos();
check('renders without throwing and still shows incidents', box.innerHTML.length > 0 && !box.innerHTML.includes('No incidents on record'), box.innerHTML);

done();
