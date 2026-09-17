/* Academy progress writes — markDone/submitQuiz/retryQuiz/adminResetModule/
   adminResetPerson all go through persistTrainingPatch() now, which upserts
   the WHOLE cc_training_records row and only mutates the in-memory `cs`
   after the write is confirmed. quiz.test.js already covers the shuffle/
   scoring math; this covers the persistence integration those tests never
   touch. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
function fresh() {
  T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {} };
  T.sb = createFakeSupabase({ cc_training_records: [] });
  T.currentUser = ADMIN_USER; T.currentProfile = ADMIN;
}
function trainingRows() { return T.sb._store.cc_training_records; }

(async () => {

const SS101 = T.COURSES.find(c => c.id === 'ss101');

group('markDone() persists before it shows the lesson as complete');
fresh();
T.curCourse = SS101;
await ctx.markDone(0);
check('the lesson is marked done locally', ctx.getCS('ss101').doneLessons.includes(0), ctx.getCS('ss101').doneLessons);
check('the row landed in the database with the right shape', trainingRows().length === 1 && trainingRows()[0].done_lessons.includes(0) && trainingRows()[0].profile_id === 'admin-1', trainingRows());

group('markDone() does not mark a lesson done if the write fails');
fresh();
T.curCourse = SS101;
T.sb.__forceNextError('cc_training_records', { message: 'offline' });
await ctx.markDone(0);
check('the lesson is NOT marked done', !ctx.getCS('ss101').doneLessons.includes(0), ctx.getCS('ss101').doneLessons);
check('nothing was written', trainingRows().length === 0, trainingRows());

group('submitQuiz() scores, persists, and issues a certificate on a pass');
fresh();
T.curCourse = SS101;
SS101.lessons.forEach((_, i) => ctx.getCS('ss101').doneLessons.push(i));   // all lessons already "done" locally
ctx.buildQuizOrder(SS101);
const answers = {};
SS101.quiz.forEach((q, qi) => { answers[qi] = q.ans; });                  // answer every question correctly
T.quizAnswers = answers;
await ctx.submitQuiz();
const cs = ctx.getCS('ss101');
check('quizPassed is true', cs.quizPassed === true, cs);
check('a cert name was assigned from the logged-in identity', cs.certName === 'admin@example.com', cs.certName);
check('the passing result actually landed in the database', trainingRows()[0].quiz_passed === true, trainingRows());

group('retryQuiz() clears the certificate but keeps lesson progress, and persists both');
await ctx.retryQuiz();
check('quizPassed is cleared locally', ctx.getCS('ss101').quizPassed === false);
check('lesson progress survives', ctx.getCS('ss101').doneLessons.length === SS101.lessons.length, ctx.getCS('ss101').doneLessons);
check('the database reflects the cleared cert', trainingRows()[0].quiz_passed === false, trainingRows());
check('...but NOT the lessons — retryQuiz only patches quiz fields', trainingRows()[0].done_lessons.length === SS101.lessons.length, trainingRows());

group('adminResetModule() clears lessons AND the certificate, and persists it');
fresh();
T.curCourse = SS101;
T.adminOn = true;
const cs2 = ctx.getCS('ss101');
cs2.doneLessons = [0, 1, 2]; cs2.quizScore = 5; cs2.quizTotal = 5; cs2.quizPassed = true;
await ctx.persistTrainingPatch('ss101', cs2);   // seed the database to match, as a real prior submit would have
const p = ctx.adminResetModule();
await new Promise(res => setTimeout(res, 0));
ctx.dialogOk();
await p;
check('lessons cleared locally', ctx.getCS('ss101').doneLessons.length === 0);
check('certificate cleared locally', ctx.getCS('ss101').quizPassed === false);
check('the database matches — nothing left over from before the reset', trainingRows()[0].done_lessons.length === 0 && trainingRows()[0].quiz_passed === false, trainingRows());

group('adminResetPerson() only ever touches the signed-in admin’s own rows');
fresh();
T.sb = createFakeSupabase({
  cc_training_records: [
    { id: 'own', profile_id: 'admin-1', course_id: 'ss101', done_lessons: [0], quiz_score: 5, quiz_total: 5, quiz_passed: true, cert_name: 'Admin' },
    { id: 'someone-elses', profile_id: 'someone-else', course_id: 'ss101', done_lessons: [0], quiz_score: 5, quiz_total: 5, quiz_passed: true, cert_name: 'Other Person' }
  ]
});
const r = ctx.adminResetPerson();
await new Promise(res => setTimeout(res, 0));
ctx.dialogOk();
await r;
check('the admin’s own row is gone', !trainingRows().some(row => row.profile_id === 'admin-1'), trainingRows());
check('someone else’s row was left completely alone', trainingRows().some(row => row.profile_id === 'someone-else'), trainingRows());

done();
})();
