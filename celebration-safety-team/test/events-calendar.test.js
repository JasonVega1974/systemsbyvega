/* Event & Webinar Calendar (cc_events) — a second view inside the News tab.
   Admin-curated, same shape as cc_news. event_date is nullable on purpose
   ("Self-paced" entries like the FEMA IS catalog never expire) — splitEvents()
   treats a null date as perpetually upcoming, never as past. Dates below are
   relative to "today" at test-run time (ctx.iso), not hardcoded. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return ctx.iso(d); }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return ctx.iso(d); }

function els() {
  const cache = {};
  return id => (cache[id] = cache[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){}, className: '' });
}

(async () => {

group('eventRowToJs(): maps every DB column, including a null event_date, to its JS field');
const dated = ctx.eventRowToJs({ id: 'e1', title: 'CISA Webinar', event_date: '2026-09-23', event_time: '1:30 PM ET', description: 'desc', url: 'https://cisa.gov/x', location: 'Online', category: 'webinar', posted_by: 'admin-1', posted_at: '2026-09-01T00:00:00Z' });
check('dated event carries its date', dated.eventDate === '2026-09-23', dated);
const undated = ctx.eventRowToJs({ id: 'e2', title: 'FEMA IS Courses', event_date: null, event_time: null, description: null, url: null, location: null, category: 'training', posted_by: null, posted_at: '2026-09-01T00:00:00Z' });
check('undated (self-paced) event has a null eventDate, not an empty string', undated.eventDate === null, undated);
check('null description/url/location default to empty strings', undated.description === '' && undated.url === '' && undated.location === '', undated);

group('splitEvents(): a self-paced (null-date) event always counts as upcoming, never past');
T.S = { events: [ctx.eventRowToJs({ id: 'e1', title: 'Self-paced', event_date: null, category: 'training' })] };
let { upcoming, past } = ctx.splitEvents();
check('the undated event is in upcoming', upcoming.length === 1 && upcoming[0].id === 'e1', upcoming);
check('past is empty', past.length === 0, past);

group('splitEvents(): a real past date goes to past, a real future date stays upcoming');
T.S = { events: [
  ctx.eventRowToJs({ id: 'past1', title: 'Old webinar', event_date: daysAgo(10), category: 'webinar' }),
  ctx.eventRowToJs({ id: 'future1', title: 'Upcoming webinar', event_date: daysAhead(10), category: 'webinar' })
] };
({ upcoming, past } = ctx.splitEvents());
check('the future event is upcoming', upcoming.some(e => e.id === 'future1'), upcoming);
check('the past event is in past', past.some(e => e.id === 'past1'), past);

group('splitEvents(): today itself counts as upcoming, not past');
T.S = { events: [ctx.eventRowToJs({ id: 'today1', title: 'Today', event_date: ctx.iso(new Date()), category: 'church' })] };
({ upcoming, past } = ctx.splitEvents());
check('today is upcoming', upcoming.some(e => e.id === 'today1'), upcoming);
check('today is not past', !past.some(e => e.id === 'today1'), past);

group('splitEvents(): upcoming sorts soonest-first, with undated entries pushed to the end');
T.S = { events: [
  ctx.eventRowToJs({ id: 'far', title: 'Far future', event_date: daysAhead(30), category: 'webinar' }),
  ctx.eventRowToJs({ id: 'undated', title: 'Self-paced', event_date: null, category: 'training' }),
  ctx.eventRowToJs({ id: 'near', title: 'Near future', event_date: daysAhead(5), category: 'webinar' })
] };
({ upcoming } = ctx.splitEvents());
check('near comes before far, and the undated entry is last', upcoming.map(e => e.id).join(',') === 'near,far,undated', upcoming.map(e => e.id));

group('splitEvents(): past sorts most-recently-past first');
T.S = { events: [
  ctx.eventRowToJs({ id: 'oldest', title: 'Oldest', event_date: daysAgo(60), category: 'webinar' }),
  ctx.eventRowToJs({ id: 'recent', title: 'Recent', event_date: daysAgo(2), category: 'webinar' })
] };
({ past } = ctx.splitEvents());
check('recent past event comes first', past.map(e => e.id).join(',') === 'recent,oldest', past.map(e => e.id));

group('setNewsView(): switches which list/buttons are visible and which admin button is shown');
const e1 = els();
ctx.document.getElementById = e1;
T.currentProfile = ADMIN; T.adminOn = true;
ctx.setNewsView('news');
check('news list shown, events list hidden', e1('newsListWrap').style.display === '' && e1('eventsListWrap').style.display === 'none');
check('Post News button shown, Add Event button hidden', e1('addNewsBtn').style.display === '' && e1('addEventBtn').style.display === 'none');
ctx.setNewsView('events');
check('events list shown, news list hidden', e1('eventsListWrap').style.display === '' && e1('newsListWrap').style.display === 'none');
check('Add Event button shown, Post News button hidden', e1('addEventBtn').style.display === '' && e1('addNewsBtn').style.display === 'none');

group('setNewsView(): a plain member never sees either admin "add" button, in either view');
T.currentProfile = MEMBER; T.adminOn = false;
ctx.setNewsView('news');
check('no Post News for a plain member', e1('addNewsBtn').style.display === 'none');
ctx.setNewsView('events');
check('no Add Event for a plain member', e1('addEventBtn').style.display === 'none');

group('renderEvents(): admin sees Edit/Remove on every event, a plain member sees neither');
T.S = { events: [ctx.eventRowToJs({ id: 'e1', title: 'Team webinar', event_date: daysAhead(3), category: 'webinar', url: 'https://example.com' })] };
T.currentProfile = MEMBER; T.adminOn = false;
const e2 = els();
ctx.document.getElementById = e2;
ctx.renderEvents();
check('no Edit/Remove for a plain member', !e2('eventsUpcomingList').innerHTML.includes('Edit') && !e2('eventsUpcomingList').innerHTML.includes('Remove'), e2('eventsUpcomingList').innerHTML);
check('the category badge and title render', e2('eventsUpcomingList').innerHTML.includes('Team webinar') && e2('eventsUpcomingList').innerHTML.includes('Webinar'), e2('eventsUpcomingList').innerHTML);
T.currentProfile = ADMIN; T.adminOn = true;
ctx.renderEvents();
check('Edit and Remove are offered to admin', e2('eventsUpcomingList').innerHTML.includes('Edit') && e2('eventsUpcomingList').innerHTML.includes('Remove'), e2('eventsUpcomingList').innerHTML);

group('renderEvents(): the empty-note shows only when there are no upcoming events, and the past-events button reflects the count');
T.S = { events: [] };
ctx.renderEvents();
check('empty-note shown', e2('eventsEmpty').style.display === '', e2('eventsEmpty').style);
check('the past-events toggle is hidden when there are no past events', e2('togglePastEventsBtn').style.display === 'none', e2('togglePastEventsBtn').style);
T.S = { events: [
  ctx.eventRowToJs({ id: 'p1', title: 'Past one', event_date: daysAgo(5), category: 'other' }),
  ctx.eventRowToJs({ id: 'p2', title: 'Past two', event_date: daysAgo(10), category: 'other' })
] };
ctx.renderEvents();
check('empty-note still shown — both events are past, so upcoming is still empty', e2('eventsEmpty').style.display === '', e2('eventsEmpty').style);
check('past events are collapsed by default (not rendered until toggled)', e2('eventsPastList').innerHTML === '', e2('eventsPastList').innerHTML);
check('the toggle button shows the past-event count', e2('togglePastEventsBtn').textContent.includes('2'), e2('togglePastEventsBtn').textContent);

group('togglePastEvents(): expands and collapses the past-events list');
ctx.togglePastEvents();
check('past events now rendered', e2('eventsPastList').innerHTML.includes('Past one') && e2('eventsPastList').innerHTML.includes('Past two'), e2('eventsPastList').innerHTML);
check('the list wrapper is shown', e2('eventsPastList').style.display === '');
ctx.togglePastEvents();
check('collapsing clears the rendered past list again', e2('eventsPastList').innerHTML === '', e2('eventsPastList').innerHTML);

group('saveEvent(): a new event is inserted under the current admin and appears in S.events');
T.S = { events: [], activity: [] };
T.currentProfile = ADMIN; T.adminOn = true;
T.sb = createFakeSupabase({ cc_events: [] });
const e3 = els();
e3('eventTitle').value = 'New Webinar';
e3('eventDate').value = daysAhead(7);
e3('eventTime').value = '2:00 PM';
e3('eventDescription').value = 'A description.';
e3('eventUrl').value = 'https://example.com/webinar';
e3('eventLocation').value = 'Online';
e3('eventCategory').value = 'webinar';
ctx.document.getElementById = e3;
await ctx.saveEvent();
check('the event is in S', T.S.events.length === 1 && T.S.events[0].title === 'New Webinar', T.S.events);
check('the database row carries the admin as posted_by', T.sb._store.cc_events[0].posted_by === 'admin-1', T.sb._store.cc_events[0]);
check('category is stored correctly', T.sb._store.cc_events[0].category === 'webinar', T.sb._store.cc_events[0]);

group('openEventModal() + saveEvent(): editing an existing event updates it in place rather than inserting a new row');
T.S = { events: [ctx.eventRowToJs({ id: 'e5', title: 'Old title', event_date: daysAhead(2), category: 'other', description: 'old', url: '', location: '' })], activity: [] };
T.sb = createFakeSupabase({ cc_events: [{ id: 'e5', title: 'Old title', event_date: daysAhead(2), category: 'other' }] });
const e3b = els();
ctx.document.getElementById = e3b;
ctx.openEventModal('e5');
check('the modal pre-fills the existing title', e3b('eventTitle').value === 'Old title', e3b('eventTitle').value);
e3b('eventTitle').value = 'Updated title';
e3b('eventCategory').value = 'training';
await ctx.saveEvent();
check('still exactly one event in S (updated, not duplicated)', T.S.events.length === 1 && T.S.events[0].title === 'Updated title', T.S.events);
check('still exactly one row in the database', T.sb._store.cc_events.length === 1 && T.sb._store.cc_events[0].title === 'Updated title', T.sb._store.cc_events);

group('saveEvent(): refuses to save with no title and writes nothing');
T.S = { events: [], activity: [] };
T.sb = createFakeSupabase({ cc_events: [] });
const e4 = els();
e4('eventTitle').value = '   ';
ctx.document.getElementById = e4;
const saveP = ctx.saveEvent();
await new Promise(r => setTimeout(r, 0));
ctx.dialogOk();
await saveP;
check('nothing added to S', T.S.events.length === 0, T.S.events);
check('nothing written to the database', T.sb._store.cc_events.length === 0, T.sb._store.cc_events);

group('deleteEvent(): removes locally and from the database after confirmation');
T.S = { events: [ctx.eventRowToJs({ id: 'e1', title: 'Remove me', event_date: daysAhead(1), category: 'other' })], activity: [] };
T.sb = createFakeSupabase({ cc_events: [{ id: 'e1' }] });
const delP = ctx.deleteEvent('e1');
ctx.dialogOk();
await delP;
check('gone from S', T.S.events.length === 0, T.S.events);
check('gone from the database', T.sb._store.cc_events.length === 0, T.sb._store.cc_events);

done();
})();
