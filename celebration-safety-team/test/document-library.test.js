/* Document Library (cc_documents) — a row is either a private upload
   (storagePath set) or a pre-populated public reference link (externalUrl
   set). Upload/download themselves go through Supabase Storage, which
   fakeSupabase does not model (same established gap as facility-map and
   incident-photo uploads elsewhere in this app) — the storage half of
   saveDocument()/deleteDocument() is exercised in the browser pass instead.
   What IS fully testable here: rendering, category filtering, and the
   external-link delete path, which never touches storage at all. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} });
}

(async () => {

group('documentCategoryLabel() maps every category key to its real label');
check('policy', ctx.documentCategoryLabel('policy') === 'Policy & Procedures');
check('forms', ctx.documentCategoryLabel('forms') === 'Forms & Templates');
check('legal', ctx.documentCategoryLabel('legal') === 'Legal & Compliance');
check('insurance', ctx.documentCategoryLabel('insurance') === 'Insurance');
check('training', ctx.documentCategoryLabel('training') === 'Training Materials');

group('documentRowToJs() carries an external link and an uploaded file distinctly');
const extRow = ctx.documentRowToJs({ id: 'doc1', title: 'CISA Bomb Threat Checklist', category: 'forms', description: null, storage_path: null, external_url: 'https://www.cisa.gov/x.pdf', uploaded_by: null, uploaded_by_name: 'Verified public source', uploaded_at: '2026-09-19T00:00:00Z' });
check('external doc has no storagePath', extRow.storagePath === '');
check('external doc\'s url is pre-set from external_url (no signing needed)', extRow.url === 'https://www.cisa.gov/x.pdf', extRow);
const upRow = ctx.documentRowToJs({ id: 'doc2', title: 'Policy Manual', category: 'policy', description: null, storage_path: 'policy/manual.pdf', external_url: null, uploaded_by: 'admin-1', uploaded_by_name: 'Admin', uploaded_at: '2026-09-19T00:00:00Z' });
check('uploaded doc carries its storage path', upRow.storagePath === 'policy/manual.pdf');
check('uploaded doc has no pre-set url (needs a signed URL from loadDocuments)', upRow.url === '', upRow);

group('renderDocuments(): shows every category, filters correctly, and gates Remove on admin');
T.currentProfile = MEMBER; T.adminOn = false;
T.S = { documents: [
  { id: 'd1', title: 'CISA Bomb Threat Checklist', category: 'forms', description: '', storagePath: '', externalUrl: 'https://cisa.gov/x.pdf', uploadedBy: null, uploadedByName: 'Verified public source', uploadedAt: '2026-09-19T00:00:00Z', url: 'https://cisa.gov/x.pdf' },
  { id: 'd2', title: 'Idaho Code § 16-1605', category: 'legal', description: 'Mandatory reporting statute.', storagePath: '', externalUrl: 'https://legislature.idaho.gov/x', uploadedBy: null, uploadedByName: 'Verified public source', uploadedAt: '2026-09-19T00:00:00Z', url: 'https://legislature.idaho.gov/x' },
  { id: 'd3', title: 'CCST Policy Manual', category: 'policy', description: '', storagePath: 'policy/manual.pdf', externalUrl: '', uploadedBy: 'admin-1', uploadedByName: 'Admin', uploadedAt: '2026-09-19T00:00:00Z', url: 'https://signed.example.com/manual.pdf' }
] };
const e1 = els();
ctx.document.getElementById = e1;
ctx.setDocCategoryFilter('all');
check('all 3 documents render', (e1('documentList').innerHTML.match(/class="card"/g) || []).length === 3, e1('documentList').innerHTML);
check('external links say "Open Source", uploads say "Download"', (e1('documentList').innerHTML.match(/Open Source/g) || []).length === 2 && e1('documentList').innerHTML.includes('Download'), e1('documentList').innerHTML);
check('external docs are labelled as such', (e1('documentList').innerHTML.match(/External link/g) || []).length === 2, e1('documentList').innerHTML);
check('no Remove button for a plain member', !e1('documentList').innerHTML.includes('Remove'), e1('documentList').innerHTML);

ctx.setDocCategoryFilter('legal');
check('filtering to Legal & Compliance shows only that one document', e1('documentList').innerHTML.includes('Idaho Code') && !e1('documentList').innerHTML.includes('CISA'), e1('documentList').innerHTML);

ctx.setDocCategoryFilter('training');
check('empty category shows the empty-note, not a blank list', e1('documentEmpty').style.display === '', e1('documentEmpty').style);

T.currentProfile = ADMIN; T.adminOn = true;
ctx.setDocCategoryFilter('all');
check('Remove is offered to admin', (e1('documentList').innerHTML.match(/Remove/g) || []).length === 3, e1('documentList').innerHTML);

group('deleteDocument(): an external-link document deletes without touching storage');
T.currentProfile = ADMIN; T.adminOn = true;
T.S.documents = [{ id: 'd1', title: 'CISA Bomb Threat Checklist', category: 'forms', description: '', storagePath: '', externalUrl: 'https://cisa.gov/x.pdf', uploadedBy: null, uploadedByName: 'Verified public source', uploadedAt: '2026-09-19T00:00:00Z', url: 'https://cisa.gov/x.pdf' }];
T.S.activity = [];
T.sb = createFakeSupabase({ cc_documents: [{ id: 'd1', title: 'CISA Bomb Threat Checklist' }] });
const delP = ctx.deleteDocument('d1');
ctx.dialogOk();
await delP;
check('gone from S', T.S.documents.length === 0, T.S.documents);
check('gone from the database', T.sb._store.cc_documents.length === 0, T.sb._store.cc_documents);

done();
})();
