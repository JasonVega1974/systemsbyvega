/* Dashboard "Next Team Meeting" card — the soonest meeting dated today or
   later, not the most recently logged one (S.meetings loads newest-first
   for the Team Meetings history log). */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} });
}

group('shows the soonest upcoming meeting, not the most recently logged one');
const e1 = els();
ctx.document.getElementById = e1;
T.S = { meetings: [
  { id: 'past', date: '2026-09-01', time: '18:00', title: 'Already happened', notes: '' },
  { id: 'far', date: '2026-11-01', time: '18:00', title: 'Far-off meeting', notes: '' },
  { id: 'soon', date: '2026-09-22', time: '19:00', title: 'Monthly team meeting', notes: '' }
] };
ctx.renderDashNextMeeting();
check('the soonest future meeting is shown', e1('dashNextMeeting').innerHTML.includes('Monthly team meeting'), e1('dashNextMeeting').innerHTML);
check('a later meeting is not shown', !e1('dashNextMeeting').innerHTML.includes('Far-off meeting'), e1('dashNextMeeting').innerHTML);
check('a past meeting is not shown', !e1('dashNextMeeting').innerHTML.includes('Already happened'), e1('dashNextMeeting').innerHTML);
check('the time is shown', e1('dashNextMeeting').innerHTML.includes('19:00'), e1('dashNextMeeting').innerHTML);

group('date is formatted as weekday, month, day — no year');
check('formatted date present', e1('dashNextMeeting').innerHTML.includes('Tuesday, September 22'), e1('dashNextMeeting').innerHTML);
check('no year printed', !e1('dashNextMeeting').innerHTML.includes('2026,') , e1('dashNextMeeting').innerHTML);

group('a meeting with no title still renders the date and time');
const e2 = els();
ctx.document.getElementById = e2;
T.S = { meetings: [{ id: 'notitle', date: '2026-09-25', time: '17:30', title: '', notes: '' }] };
ctx.renderDashNextMeeting();
check('date shown', e2('dashNextMeeting').innerHTML.includes('Friday, September 25'), e2('dashNextMeeting').innerHTML);
check('time shown', e2('dashNextMeeting').innerHTML.includes('17:30'), e2('dashNextMeeting').innerHTML);

group('no upcoming meeting shows an empty state with a link to Team Meetings');
const e3 = els();
ctx.document.getElementById = e3;
T.S = { meetings: [{ id: 'past2', date: '2026-01-01', time: '', title: 'Old one', notes: '' }] };
ctx.renderDashNextMeeting();
check('empty message shown', e3('dashNextMeeting').innerHTML.includes('No meeting scheduled'), e3('dashNextMeeting').innerHTML);
check('links to Team Meetings', e3('dashNextMeeting').innerHTML.includes("navTo('meetings')"), e3('dashNextMeeting').innerHTML);

group('no meetings at all also shows the empty state, without throwing');
const e4 = els();
ctx.document.getElementById = e4;
T.S = { meetings: [] };
ctx.renderDashNextMeeting();
check('empty message shown', e4('dashNextMeeting').innerHTML.includes('No meeting scheduled'), e4('dashNextMeeting').innerHTML);

done();
