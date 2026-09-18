/* News tab (cc_news) — admin-only post and remove, clean link cards with
   title/source-domain/summary/Read More, no scraping or embeds. */
const { loadApp, runner } = require('./harness');
const { createFakeSupabase } = require('./fakeSupabase');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const ADMIN = { id: 'admin-1', role: 'admin', team_member_id: null };
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const MEMBER = { id: 'member-1', role: 'member', team_member_id: null };

function stubFields(fields) {
  const blank = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} };
  ctx.document.getElementById = id => (id in fields) ? fields[id] : blank;
}

(async () => {

group('sourceDomain() extracts a clean hostname, stripping www.');
check('strips www. and path', ctx.sourceDomain('https://www.facebook.com/celebrationchurch/posts/123') === 'facebook.com');
check('handles a bare domain with no path', ctx.sourceDomain('https://thecelebration.church/news') === 'thecelebration.church');
check('falls back to the raw string for a malformed URL rather than throwing', ctx.sourceDomain('not a url') === 'not a url');

group('Admin can post a news item');
T.currentUser = ADMIN_USER; T.currentProfile = ADMIN; T.adminOn = true;
T.S = { team: [], leaders: [], meetings: [], schedule: {}, progress: {}, activity: [], incidents: [], incidentAudience: {}, incidentAcks: {}, verses: [], notes: [], facilityMaps: {}, settings: { sections: {}, academyModules: {} }, bolos: [], news: [] };
T.sb = createFakeSupabase({ cc_news: [] });
stubFields({
  newsTitle: { value: 'Fall Festival volunteer sign-up' },
  newsUrl: { value: 'https://www.facebook.com/celebrationchurch/posts/999' },
  newsSummary: { value: 'Sign up to help run a booth.' },
  newsPostedDate: { value: '2026-09-18' }
});
await ctx.saveNews();
check('the post is in S', T.S.news.length === 1 && T.S.news[0].title === 'Fall Festival volunteer sign-up', T.S.news);
check('posted_by is stamped from the acting admin', T.sb._store.cc_news[0].posted_by === 'admin-1', T.sb._store.cc_news);
check('posted_date is stored as entered (admin sets it, not necessarily today)', T.sb._store.cc_news[0].posted_date === '2026-09-18');

group('a title or URL is required');
T.S.news = [];
stubFields({ newsTitle: { value: '' }, newsUrl: { value: 'https://example.com' }, newsSummary: { value: '' }, newsPostedDate: { value: '2026-09-18' } });
const saveP = ctx.saveNews();
ctx.dialogOk();
await saveP;
check('nothing was posted with a blank title', T.S.news.length === 0, T.S.news);

group('rendering: a plain member sees Read More but not Remove or the post button');
T.S.news = [{ id: 'n1', title: 'Fall Festival', url: 'https://www.facebook.com/x', summary: 'Come join us.', postedDate: '2026-09-18' }];
const els = {};
ctx.document.getElementById = id => (els[id] = els[id] || { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} });
T.currentProfile = MEMBER; T.adminOn = false;
ctx.renderNews();
check('Read More link is present', els.newsList.innerHTML.includes('Read More'), els.newsList.innerHTML);
check('source domain is shown', els.newsList.innerHTML.includes('facebook.com'), els.newsList.innerHTML);
check('no Remove button for a plain member', !els.newsList.innerHTML.includes('Remove'), els.newsList.innerHTML);
check('addNewsBtn is hidden for a plain member', els.addNewsBtn.style.display === 'none');

group('rendering: admin sees the Remove button and the post button');
T.currentProfile = ADMIN; T.adminOn = true;
ctx.renderNews();
check('Remove button present for admin', els.newsList.innerHTML.includes('Remove'), els.newsList.innerHTML);
check('addNewsBtn visible for admin', els.addNewsBtn.style.display === '');

group('deleteNews() removes locally and from the database');
T.S.news = [{ id: 'n1', title: 'Fall Festival', url: 'https://x.com', summary: '', postedDate: '2026-09-18' }];
T.sb = createFakeSupabase({ cc_news: [{ id: 'n1', title: 'Fall Festival', url: 'https://x.com', summary: '', posted_date: '2026-09-18', posted_by: 'admin-1' }] });
const delP = ctx.deleteNews('n1');
ctx.dialogOk();
await delP;
check('gone from S', T.S.news.length === 0, T.S.news);
check('gone from the database', T.sb._store.cc_news.length === 0, T.sb._store.cc_news);

done();
})();
