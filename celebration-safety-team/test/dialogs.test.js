/* The in-page dialog engine. Native alert/confirm/prompt were replaced, so
   every destructive confirmation in the app now depends on these promises
   settling correctly. A dialog that never settles is a silently dead button. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();
const tick = () => new Promise(res => setTimeout(res, 0));

(async () => {

group('alert');
{
  const p = T.alertDialog('Title', 'Body text');
  ctx.dialogOk();
  check('resolves when acknowledged', (await p) === true);
}

group('confirm');
{
  let p = T.confirmDialog('Delete?', 'Are you sure');
  ctx.dialogOk();
  check('OK resolves true', (await p) === true);

  p = T.confirmDialog('Delete?', 'Are you sure');
  ctx.dialogCancel();
  check('Cancel resolves false — not undefined, not a hang', (await p) === false);
}

group('a dialog opening over an unsettled one must not strand it');
{
  const first = T.confirmDialog('First', 'one');
  const second = T.confirmDialog('Second', 'two');   // opens on top
  check('the stranded first promise resolves false rather than hanging', (await first) === false);
  ctx.dialogOk();
  check('the second still settles normally', (await second) === true);
}

group('Escape and backdrop settle the promise');
{
  const p = T.confirmDialog('Close me', 'body');
  ctx.dismissOverlay({ id: 'appDialog' });
  check('dismissOverlay settles rather than orphaning', (await p) === false);
}

group('real call sites are async and actually awaitable');
{
  T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
  T.S.team = [{ id: 'tmA', first: 'Ann', last: 'Lee', phone: '208-555-0100', spec: 'General / Trained Volunteer', role: 'Team Lead' }];
  T.sb = createFakeSupabase({ cc_team: [{ id: 'tmA', first_name: 'Ann', last_name: 'Lee', phone: '208-555-0100', email: '', specialty: 'General / Trained Volunteer', team_role: 'Team Lead' }] });
  T.currentProfile = { id: 'admin-1', role: 'admin', team_member_id: null };
  T.currentUser = { id: 'admin-1', email: 'admin@example.com' };

  const del = ctx.deleteMember('tmA');
  check('deleteMember returns a promise', typeof del.then === 'function');
  ctx.dialogCancel();
  await del;
  check('cancelling a delete keeps the member', T.S.team.length === 1, T.S.team.length);

  const del2 = ctx.deleteMember('tmA');
  ctx.dialogOk();
  await del2;
  check('confirming a delete removes them', T.S.team.length === 0, T.S.team.length);
  check('...and the database row is actually gone', T.sb._store.cc_team.length === 0, T.sb._store.cc_team);
}

group('a cancelled recertification changes nothing');
{
  T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
  T.currentProfile = { id: 'admin-1', role: 'admin', team_member_id: null };
  T.currentUser = { id: 'admin-1', email: 'admin@example.com' };
  /* adminResetEveryone() counts DISTINCT profile_ids in cc_training_records
     before it ever shows a dialog — at least one row must exist or it bails
     out early ("No training records to reset") and no gate opens at all. */
  T.sb = createFakeSupabase({ cc_training_records: [{ id: 'tr1', profile_id: 'admin-1', course_id: 'ss101', done_lessons: [], quiz_score: 5, quiz_total: 5, quiz_passed: true, cert_name: '' }] });
  ctx.getCS('ss101').quizPassed = true;
  ctx.getCS('ss101').quizScore = 5;
  T.adminOn = true;

  const r = ctx.adminResetEveryone();
  await tick();                          // let the profile-count fetch resolve first
  ctx.dialogCancel();                    // refuse at the first of two gates
  await r;
  check('certificate survives a cancelled reset', ctx.getCS('ss101').quizPassed === true);
}

group('the annual reset needs BOTH confirmations');
{
  const r = ctx.adminResetEveryone();
  await tick();
  ctx.dialogOk();                        // first gate
  await tick();
  ctx.dialogCancel();                    // refuse at the second
  await r;
  check('refusing the second gate still changes nothing', ctx.getCS('ss101').quizPassed === true);

  const r2 = ctx.adminResetEveryone();
  await tick();
  ctx.dialogOk();
  await tick();
  ctx.dialogOk();
  await r2;
  check('passing both gates does clear training', ctx.getCS('ss101').quizPassed === false);
  check('...and the database rows are actually gone', T.sb._store.cc_training_records.length === 0, T.sb._store.cc_training_records);
}

done();
})();
