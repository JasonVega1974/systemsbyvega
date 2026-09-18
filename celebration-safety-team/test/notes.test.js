/* Team Notes (cc_notes) — open posting for any authenticated member; Admin
   and Team Lead can edit or remove any note; a member can remove (never
   edit) only their own. RLS itself lives in sql/TEAM-NOTES-OPEN.sql; this
   exercises the client-side gating in renderNotes() that mirrors it. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };
const MEMBER_USER = { id: 'member-1', email: 'member@example.com' };
const OTHER_MEMBER = { id: 'member-2', role: 'member', team_member_id: null };
const TEAM_LEAD = { id: 'lead-1', role: 'team_lead', team_member_id: null };

function stubFields(fields) {
  const blank = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} };
  ctx.document.getElementById = id => (id in fields) ? fields[id] : blank;
}

(async () => {

group('a plain member can post a note (no more admin/team_lead gate)');
T.currentUser = MEMBER_USER; T.currentProfile = MEMBER; T.adminOn = false;
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {}, verses: [], notes: [], facilityMaps: {}, settings: { sections: {}, academyModules: {} } };
T.sb = createFakeSupabase({ cc_notes: [] });
stubFields({ noteTitle: { value: 'Heads up' }, noteBody: { value: 'Side door propped open again.' }, noteExpires: { value: '' } });
T.editingNoteId = null;
await ctx.saveNote();
check('the note is in S', T.S.notes.length === 1 && T.S.notes[0].title === 'Heads up', T.S.notes);
check('the row landed in the database under the member\'s own id', T.sb._store.cc_notes[0].posted_by === 'member-1', T.sb._store.cc_notes);

group('rendering: the poster (a plain member) sees Remove but not Edit on their own note');
const els = {};
ctx.document.getElementById = id => (els[id] = els[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} });
ctx.renderNotes();
check('Remove button is present', els.notesBox.innerHTML.includes('Remove'), els.notesBox.innerHTML);
check('Edit button is NOT present for a plain member on their own note', !els.notesBox.innerHTML.includes('>Edit<'), els.notesBox.innerHTML);

group('rendering: a different plain member sees neither button on someone else\'s note');
T.currentProfile = OTHER_MEMBER;
ctx.renderNotes();
check('no Remove for a note that is not theirs', !els.notesBox.innerHTML.includes('Remove'), els.notesBox.innerHTML);
check('no Edit either', !els.notesBox.innerHTML.includes('>Edit<'), els.notesBox.innerHTML);

group('rendering: a Team Lead sees both Edit and Remove on someone else\'s note');
T.currentProfile = TEAM_LEAD;
ctx.renderNotes();
check('Edit is present for a team lead on any note', els.notesBox.innerHTML.includes('>Edit<'), els.notesBox.innerHTML);
check('Remove is present too', els.notesBox.innerHTML.includes('Remove'), els.notesBox.innerHTML);

group('the "+ Post Note" button is shown to any signed-in profile, not just admin/team_lead');
T.currentProfile = MEMBER;
ctx.renderNotes();
check('addNoteBtn is visible for a plain member', els.addNoteBtn.style.display === '');

done();
})();
