/* Team/Leaders/Meetings CRUD against the fake Supabase client — the parts of
   the swap dialogs.test.js and storage.test.js don't already exercise
   (saveMember add+edit, deleteLeader, saveMeeting, deleteMeeting). Confirms
   both directions: the local S mirror AND the underlying "database" end up
   with the same shape the old localStorage version produced. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };

/* A field-value map the test sets per case; unknown ids fall back to a
   throwaway element so unrelated getElementById calls (modals, chip, etc.)
   don't throw. */
function stubFields(fields) {
  const blank = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} };
  ctx.document.getElementById = id => (id in fields) ? fields[id] : blank;
}

(async () => {

T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;

group('saveMember() adds a new team member');
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
T.sb = createFakeSupabase({ cc_team: [] });
stubFields({
  mFirst: { value: 'Dana' }, mLast: { value: 'Reed' }, mPhone: { value: '208-555-0199' },
  mEmail: { value: 'dana@example.com' }, mSpec: { value: 'Medical (Nurse / Doctor)' }, mRole: { value: 'Team Member' }
});
await ctx.saveMember();
check('the member is in S', T.S.team.length === 1 && T.S.team[0].first === 'Dana', T.S.team);
check('the row is in the database with DB-shaped columns', T.sb._store.cc_team.length === 1 && T.sb._store.cc_team[0].first_name === 'Dana' && T.sb._store.cc_team[0].specialty === 'Medical (Nurse / Doctor)', T.sb._store.cc_team);

group('saveMember() edits an existing one in place — no duplicate row');
const existingId = T.S.team[0].id;
T.editingMemberId = existingId;
stubFields({
  mFirst: { value: 'Dana' }, mLast: { value: 'Reed-Martinez' }, mPhone: { value: '208-555-0199' },
  mEmail: { value: 'dana@example.com' }, mSpec: { value: 'Medical (Nurse / Doctor)' }, mRole: { value: 'Team Lead' }
});
await ctx.saveMember();
check('still exactly one member, now updated', T.S.team.length === 1 && T.S.team[0].last === 'Reed-Martinez' && T.S.team[0].role === 'Team Lead', T.S.team);
check('the database row was updated, not duplicated', T.sb._store.cc_team.length === 1 && T.sb._store.cc_team[0].last_name === 'Reed-Martinez', T.sb._store.cc_team);

group('deleteLeader() removes locally and from the database');
T.S.leaders = [{ id: 'ld1', name: 'Pastor Roger', title: 'Senior Pastor', notes: '' }];
T.sb = createFakeSupabase({ cc_leaders: [{ id: 'ld1', name: 'Pastor Roger', title: 'Senior Pastor', notes: '' }] });
const delP = ctx.deleteLeader('ld1');
ctx.dialogOk();
await delP;
check('gone from S', T.S.leaders.length === 0, T.S.leaders);
check('gone from the database', T.sb._store.cc_leaders.length === 0, T.sb._store.cc_leaders);

group('saveMeeting() logs a new meeting, newest first');
T.S.meetings = [{ id: 'mt-old', date: '2026-01-01', time: '', title: 'Old meeting', notes: '' }];
T.sb = createFakeSupabase({ cc_meetings: [{ id: 'mt-old', meeting_date: '2026-01-01', meeting_time: null, title: 'Old meeting', notes: '' }] });
stubFields({ mtDate: { value: '2026-06-15' }, mtTime: { value: '18:00' }, mtTitle: { value: 'Quarterly drill review' }, mtNotes: { value: 'Went well.' } });
await ctx.saveMeeting();
check('two meetings now, newest first', T.S.meetings.length === 2 && T.S.meetings[0].title === 'Quarterly drill review', T.S.meetings);
check('the new one is in the database too', T.sb._store.cc_meetings.some(r => r.title === 'Quarterly drill review'), T.sb._store.cc_meetings);

group('deleteMeeting() removes locally and from the database');
const newMeetingId = T.S.meetings[0].id;
const delM = ctx.deleteMeeting(newMeetingId);
ctx.dialogOk();
await delM;
check('back down to one meeting in S', T.S.meetings.length === 1 && T.S.meetings[0].id === 'mt-old', T.S.meetings);
check('the database matches', T.sb._store.cc_meetings.length === 1 && T.sb._store.cc_meetings[0].id === 'mt-old', T.sb._store.cc_meetings);

group('a failed saveMember() does not add a phantom local row');
T.S.team = [];
T.sb = createFakeSupabase({ cc_team: [] });
T.sb.__forceNextError('cc_team', { message: 'permission denied' });
stubFields({
  mFirst: { value: 'Ghost' }, mLast: { value: 'Member' }, mPhone: { value: '' },
  mEmail: { value: '' }, mSpec: { value: 'General / Trained Volunteer' }, mRole: { value: 'Team Member' }
});
T.editingMemberId = null;
await ctx.saveMember();
check('S.team stays empty', T.S.team.length === 0, T.S.team);
check('nothing landed in the database', T.sb._store.cc_team.length === 0, T.sb._store.cc_team);

done();
})();
