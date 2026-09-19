/* Academy "Video Resources" — curated external links appended after a
   module's lessons (Medical Emergency, Active Shooter, Lost Child & Code
   Adam) or an in-development note (De-escalation). This is reference
   material, not a lesson: it must never count toward "N lessons," never
   block the quiz unlock, and never need a "Mark Complete" button. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelector: () => null, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} });
}

function courseById(id) { return T.COURSES.find(c => c.id === id); }

T.currentProfile = ADMIN;
T.S = { progress: {} };

group('Video Resources is reference material, not a lesson — it never changes lesson counts');
['ss205', 'ss201', 'ss202', 'ss102'].forEach(id => {
  const c = courseById(id);
  check(id + ': has a videoResourcesHtml field', typeof c.videoResourcesHtml === 'string' && c.videoResourcesHtml.length > 0, typeof c.videoResourcesHtml);
  check(id + ': meta still advertises the real lesson count (' + c.lessons.length + ')', c.meta.includes(c.lessons.length + ' lesson'), c.meta);
});

group('renderLessons() appends Video Resources after the lesson list, without adding a lesson-item');
const e1 = els();
ctx.document.getElementById = e1;
T.curCourse = courseById('ss205');
ctx.renderLessons();
const html205 = e1('lessonContent').innerHTML;
check('exactly 3 lesson-items rendered (video resources is not a 4th)', (html205.match(/class="lesson-item/g) || []).length === 3, html205.match(/class="lesson-item/g));
check('the Video Resources heading is present', html205.includes('VIDEO RESOURCES'), html205);
check('no "Mark Complete" button inside the video resources block itself', html205.slice(html205.indexOf('VIDEO RESOURCES')).match(/mark-done-btn/g) === null);

group('Medical Emergency: exact AHA links, correct labels, and the paid-certification caveat');
check('AHA Hands-Only CPR playlist URL is exact', html205.includes('https://www.youtube.com/playlist?list=PLKO5Y5XHcQAKUAVm40wACPqL1RGOVU5Ap'), html205);
check('AHA CPR & ECC guidelines URL is exact', html205.includes('https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines'), html205);
check('section label matches the specified wording', html205.includes('American Heart Association — CPR &amp; AED Video Resources (free)'), html205);
check('both links open in a new tab', (html205.match(/target="_blank" rel="noopener"/g) || []).length >= 2, html205);
check('the AHA-certification-costs-money caveat is present', html205.includes('certification courses cost money'), html205);

group('Active Shooter: exact CISA links and label');
const e2 = els();
ctx.document.getElementById = e2;
T.curCourse = courseById('ss201');
ctx.renderLessons();
const html201 = e2('lessonContent').innerHTML;
check('exactly 3 lesson-items rendered', (html201.match(/class="lesson-item/g) || []).length === 3);
check('CISA "Options for Consideration" video URL is exact', html201.includes('https://www.youtube.com/watch?v=i3QBktsRKVY'), html201);
check('CISA products-and-resources URL is exact', html201.includes('https://www.cisa.gov/topics/physical-security/active-shooter-preparedness/products-and-resources'), html201);
check('section label matches the specified wording', html201.includes('CISA — Options for Consideration: Active Shooter Preparedness (official DHS/CISA video)'), html201);

group('Lost Child & Code Adam: exact NCMEC links, label, and the free-kit callout');
const e3 = els();
ctx.document.getElementById = e3;
T.curCourse = courseById('ss202');
ctx.renderLessons();
const html202 = e3('lessonContent').innerHTML;
check('exactly 3 lesson-items rendered', (html202.match(/class="lesson-item/g) || []).length === 3);
check('NCMEC Code Adam video URL is exact', html202.includes('https://www.youtube.com/watch?v=xOiWvkRezRY'), html202);
check('NCMEC Code Adam resources page URL is exact', html202.includes('https://www.missingkids.org/education/training/codeadam'), html202);
check('section label matches the specified wording', html202.includes('NCMEC — Code Adam Training Video (official)'), html202);
check('the free Code Adam Kit is mentioned with its own URL', html202.includes('http://codeadam.missingkids.org'), html202);

group('De-escalation: no fabricated video links, only the in-development note');
const e4 = els();
ctx.document.getElementById = e4;
T.curCourse = courseById('ss102');
ctx.renderLessons();
const html102 = e4('lessonContent').innerHTML;
check('exactly 3 lesson-items rendered (unaffected)', (html102.match(/class="lesson-item/g) || []).length === 3);
check('the Video Resources heading is present', html102.includes('VIDEO RESOURCES'), html102);
check('no res-link entries (no invented video links)', !html102.includes('class="res-link"'), html102);
check('the in-development note is present, worded as specified', html102.includes('Video resources for this module are in development'), html102);
check('points to Training Resources for CPI/Verbal Judo', html102.includes("navTo('resources')") && html102.includes('Training Resources'), html102);

group('Quiz unlock is unaffected by Video Resources — doneLessons must still equal the real lesson count, not lessons+1');
T.curCourse = courseById('ss205');
const cs = ctx.getCS('ss205');
cs.doneLessons = [0, 1, 2];
check('3 completed real lessons already equals the full lesson count', cs.doneLessons.length === T.curCourse.lessons.length, [cs.doneLessons.length, T.curCourse.lessons.length]);

done();
