/* BOLO system (cc_bolos) — issue/edit/resolve gated to Team Lead or Admin,
   view-only for members; "Create BOLO from this Report" pre-fills the
   subject description from an incident's subject fields and auto-links
   linked_incident_id; no delete path exists anywhere in the client. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };
const MEMBER_USER = { id: 'member-1', email: 'member@example.com' };

function stubFields(fields) {
  const blank = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} };
  ctx.document.getElementById = id => (id in fields) ? fields[id] : blank;
}

(async () => {

group('subjectSummaryFromIncident() joins only the subject fields that are actually filled in');
const inc = { subjectSex: 'Male', subjectApproxAge: '30s', subjectHeight: '', subjectWeight: '', subjectHairColor: 'brown', subjectClothing: 'red jacket', subjectMarks: '' };
const summary = ctx.subjectSummaryFromIncident(inc);
check('includes the fields that are set', summary.includes('Male') && summary.includes('brown hair') && summary.includes('wearing red jacket'), summary);
check('does not print empty labels for blank fields', !summary.includes('undefined') && !/,\s*,/.test(summary), summary);

group('Admin can issue a new BOLO — it lands in S.bolos and the database');
T.currentUser = ADMIN_USER; T.currentProfile = ADMIN; T.adminOn = true;
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {}, verses: [], notes: [], facilityMaps: {}, settings: { sections: {}, academyModules: {} }, bolos: [] };
T.sb = createFakeSupabase({ cc_bolos: [] });
/* The fake Supabase client has no notion of server-side column defaults
   (issued_at is `now()` in the real schema, applied by Postgres and
   returned to the client via .select().single() on a real round trip) — so
   stamp it here the way a real insert would, letting renderBolos()'s sort
   by issuedAt compare real values across more than one row. */
const realFrom = T.sb.from.bind(T.sb);
T.sb.from = table => {
  const q = realFrom(table);
  if (table === 'cc_bolos') {
    const realInsert = q.insert.bind(q);
    q.insert = row => realInsert(Object.assign({ issued_at: new Date().toISOString() }, row));
  }
  return q;
};
T.editingBoloId = null; T.boloLinkedIncidentId = null;
stubFields({ boloSubject: { value: 'Male, 30s, red jacket' }, boloStatus: { value: 'Active' }, boloNotes: { value: 'Seen near the foyer' } });
await ctx.saveBolo();
check('the BOLO is in S', T.S.bolos.length === 1 && T.S.bolos[0].subjectDescription === 'Male, 30s, red jacket', T.S.bolos);
check('issued_by / issued_by_name are stamped from the acting admin', T.sb._store.cc_bolos[0].issued_by === 'admin-1' && T.sb._store.cc_bolos[0].issued_by_name === 'admin@example.com', T.sb._store.cc_bolos);
check('status defaults to Active', T.S.bolos[0].status === 'Active');

group('creating a BOLO from an incident report auto-links linked_incident_id');
T.S.incidents = [{ id: 'inc-1', category: 'trespassing', date: '2026-09-10', subjectSex: 'Female', subjectApproxAge: '', subjectHeight: '', subjectWeight: '', subjectHairColor: '', subjectClothing: '', subjectMarks: '' }];
const linkNote = { style: {}, textContent: '' };
stubFields({ boloModalTitle: { textContent: '' }, boloSubject: { value: '' }, boloStatus: { value: '' }, boloNotes: { value: '' }, boloLinkedIncidentNote: linkNote });
ctx.openBoloModal(null, 'inc-1');
check('the linked-incident note is shown', linkNote.style.display === '' && linkNote.textContent.includes('inc-1') === false && linkNote.textContent.length > 0, linkNote.textContent);
stubFields({ boloSubject: { value: 'Female subject from incident' }, boloStatus: { value: 'Active' }, boloNotes: { value: '' } });
await ctx.saveBolo();
const linked = T.S.bolos.find(b => b.subjectDescription === 'Female subject from incident');
check('the saved BOLO carries the linked incident id', linked && linked.linkedIncidentId === 'inc-1', linked);
check('the database row carries it too', T.sb._store.cc_bolos.some(r => r.linked_incident_id === 'inc-1'), T.sb._store.cc_bolos);

group('resolveBolo() marks it Resolved and stamps resolved_at, without deleting it');
const activeBolo = T.S.bolos[0];
const boloDetailBox = { innerHTML: '' };
stubFields({ boloDetailBox });
const resolveP = ctx.resolveBolo(activeBolo.id);
ctx.dialogOk();
await resolveP;
check('status is Resolved in S', T.S.bolos.find(b => b.id === activeBolo.id).status === 'Resolved');
check('resolved_at is set in the database', !!T.sb._store.cc_bolos.find(r => r.id === activeBolo.id).resolved_at);
check('the row still exists — never deleted', T.sb._store.cc_bolos.length === 2, T.sb._store.cc_bolos);

group('canIssueBolo() gates on admin/team_lead, not plain member');
T.currentProfile = ADMIN; T.adminOn = true;
check('admin can issue', ctx.canIssueBolo() === true);
T.currentProfile = MEMBER; T.adminOn = false;
check('plain member cannot', ctx.canIssueBolo() === false);

group('renderBolos() hides "+ New BOLO" from a plain member');
const addBtn = { style: {} };
stubFields({ addBoloBtn: addBtn, boloEmpty: { style: {} }, boloList: { innerHTML: '' } });
ctx.renderBolos();
check('addBoloBtn is hidden for a plain member', addBtn.style.display === 'none');
T.currentProfile = ADMIN; T.adminOn = true;
ctx.renderBolos();
check('addBoloBtn is visible for admin', addBtn.style.display === '');

done();
})();
