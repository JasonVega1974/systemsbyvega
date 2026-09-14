/* The in-page dialog engine. Native alert/confirm/prompt were replaced, so
   every destructive confirmation in the app now depends on these promises
   settling correctly. A dialog that never settles is a silently dead button. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

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

group('prompt');
{
  let p = T.promptDialog('PIN', 'Enter it', { inputValue: '' });
  ctx.dialogOk();
  check('returns the input value', (await p) === '', 'empty input returns empty string');

  p = T.promptDialog('PIN', 'Enter it');
  ctx.dialogCancel();
  const v = await p;
  check('Cancel returns null, distinguishable from an empty string', v === null, v);
}

group('prompt validation blocks OK until satisfied');
{
  const p = T.promptDialog('PIN', 'Four digits', {
    validate: v => /^\d{4}$/.test(v) ? null : 'The PIN must be exactly 4 digits.'
  });
  let settled = false;
  p.then(() => { settled = true; });

  ctx.dialogOk();                       // input is '' in the stub -> invalid
  await new Promise(r => setTimeout(r, 0));
  check('invalid input does NOT settle the promise', settled === false);

  ctx.dialogCancel();
  check('and cancel still works afterwards', (await p) === null);
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
  T.S = ctx.defaults();
  T.S.team = [{ id: 'tmA', first: 'Ann', last: 'Lee', phone: '208-555-0100', spec: 'General / Trained Volunteer', role: 'Team Lead' }];

  const del = ctx.deleteMember('tmA');
  check('deleteMember returns a promise', typeof del.then === 'function');
  ctx.dialogCancel();
  await del;
  check('cancelling a delete keeps the member', T.S.team.length === 1, T.S.team.length);

  const del2 = ctx.deleteMember('tmA');
  ctx.dialogOk();
  await del2;
  check('confirming a delete removes them', T.S.team.length === 0, T.S.team.length);
}

group('a cancelled recertification changes nothing');
{
  T.S = ctx.defaults();
  T.S.activeId = 'tmZ';
  ctx.getCS('ss101').quizPassed = true;
  ctx.getCS('ss101').quizScore = 5;
  T.adminOn = true;

  const r = ctx.adminResetEveryone();
  ctx.dialogCancel();                    // refuse at the first of two gates
  await r;
  check('certificate survives a cancelled reset', ctx.getCS('ss101').quizPassed === true);
}

group('the annual reset needs BOTH confirmations');
{
  const r = ctx.adminResetEveryone();
  ctx.dialogOk();                        // first gate
  await new Promise(res => setTimeout(res, 0));
  ctx.dialogCancel();                    // refuse at the second
  await r;
  check('refusing the second gate still changes nothing', ctx.getCS('ss101').quizPassed === true);

  const r2 = ctx.adminResetEveryone();
  ctx.dialogOk();
  await new Promise(res => setTimeout(res, 0));
  ctx.dialogOk();
  await r2;
  check('passing both gates does clear training', ctx.getCS('ss101').quizPassed === false);
}

done();
})();
