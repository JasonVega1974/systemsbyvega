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
const dlgTitleEl = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){}, focus(){}, blur(){} };
stubFields({
  newsTitle: { value: 'Fall Festival volunteer sign-up' },
  newsUrl: { value: 'https://www.facebook.com/celebrationchurch/posts/999' },
  newsSummary: { value: 'Sign up to help run a booth.' },
  newsPostedDate: { value: '2026-09-18' },
  dlgTitle: dlgTitleEl
});
// The fake Supabase client has no auth.getSession, so fetchOgPreview() fails
// closed and saveNews() surfaces the "link preview unavailable" alertDialog
// (see the next group's checks) — resolve it so this await doesn't hang.
// setTimeout(0), not an immediate dialogOk(), because fetchOgPreview()'s
// catch and the insert's own promise chain both need to run first (several
// microtask hops) before that alertDialog even opens.
const saveNewsP = ctx.saveNews();
await new Promise(r => setTimeout(r, 0));
ctx.dialogOk();
await saveNewsP;
check('the post is in S', T.S.news.length === 1 && T.S.news[0].title === 'Fall Festival volunteer sign-up', T.S.news);
check('posted_by is stamped from the acting admin', T.sb._store.cc_news[0].posted_by === 'admin-1', T.sb._store.cc_news);
check('posted_date is stored as entered (admin sets it, not necessarily today)', T.sb._store.cc_news[0].posted_date === '2026-09-18');

group('saveNews() tells the admin, in plain terms, when the preview fetch failed — not silent');
check('og_fetched_at was never set for a preview that could not even start', T.sb._store.cc_news[0].og_fetched_at == null, T.sb._store.cc_news[0]);
check('the failure alert was actually shown to the admin, not just logged to console', dlgTitleEl.textContent === 'Posted — link preview unavailable', dlgTitleEl.textContent);

group('the fake Supabase client has no auth.getSession, so fetchOgPreview() fails closed and the post still succeeds with a plain card');
check('og_fetched_at was never set — a preview fetch that cannot even start must not block posting', T.sb._store.cc_news[0].og_fetched_at == null, T.sb._store.cc_news[0]);
check('no og_* fields were fabricated', T.sb._store.cc_news[0].og_image_url == null && T.sb._store.cc_news[0].og_title == null && T.sb._store.cc_news[0].og_description == null);

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

group('rendering: a fetched preview with an og:image shows a thumbnail and a subtitle');
T.S.news = [{ id: 'n2', title: 'Community Update', url: 'https://example.com/post', summary: '', postedDate: '2026-09-18',
  ogImage: 'https://example.com/hero.jpg', ogTitle: 'Example Site', ogDescription: 'A real, fetched description.', ogFetchedAt: '2026-09-18T12:00:00Z' }];
ctx.renderNews();
check('an <img> thumbnail is rendered', els.newsList.innerHTML.includes('news-thumb"') && els.newsList.innerHTML.includes('https://example.com/hero.jpg'), els.newsList.innerHTML);
check('the subtitle prefers og:description over og:title', els.newsList.innerHTML.includes('A real, fetched description.') && !els.newsList.innerHTML.includes('>Example Site<'), els.newsList.innerHTML);
check('no placeholder div is rendered when an image exists', !els.newsList.innerHTML.includes('news-thumb-placeholder'), els.newsList.innerHTML);
check('a favicon for the source domain is included', els.newsList.innerHTML.includes('s2/favicons') && els.newsList.innerHTML.includes('example.com'), els.newsList.innerHTML);

group('rendering: a fetched preview with NO og:image falls back to a lettered placeholder, subtitle still shows');
T.S.news = [{ id: 'n3', title: 'No Image Post', url: 'https://thecelebration.church/news', summary: '', postedDate: '2026-09-18',
  ogImage: null, ogTitle: 'Church Homepage', ogDescription: null, ogFetchedAt: '2026-09-18T12:00:00Z' }];
ctx.renderNews();
check('a placeholder div is rendered instead of an <img>', els.newsList.innerHTML.includes('news-thumb-placeholder') && !els.newsList.innerHTML.includes('<img src="https://thecelebration.church'), els.newsList.innerHTML);
check('the placeholder shows the domain\'s first letter, uppercased', els.newsList.innerHTML.includes('>T<'), els.newsList.innerHTML);
check('the subtitle falls back to og:title when og:description is absent', els.newsList.innerHTML.includes('Church Homepage'), els.newsList.innerHTML);

group('rendering: a post whose preview fetch failed entirely (or predates this feature) renders exactly as a plain card — no thumbnail, no placeholder, no subtitle');
T.S.news = [{ id: 'n4', title: 'Old Post', url: 'https://example.org/x', summary: 'Plain summary text.', postedDate: '2026-09-18',
  ogImage: null, ogTitle: null, ogDescription: null, ogFetchedAt: null }];
ctx.renderNews();
check('no thumbnail class of any kind appears', !els.newsList.innerHTML.includes('news-thumb'), els.newsList.innerHTML);
check('no news-card-sub subtitle block appears', !els.newsList.innerHTML.includes('news-card-sub'), els.newsList.innerHTML);
check('the plain summary and Read More link still render', els.newsList.innerHTML.includes('Plain summary text.') && els.newsList.innerHTML.includes('Read More'), els.newsList.innerHTML);

group('rendering: "Retry Preview" appears for admin only on a post with no preview yet, never once one exists');
T.S.news = [
  { id: 'n5', title: 'Needs Retry', url: 'https://example.org/blocked', summary: '', postedDate: '2026-09-18', ogImage: null, ogTitle: null, ogDescription: null, ogFetchedAt: null },
  { id: 'n6', title: 'Already Has Preview', url: 'https://example.org/ok', summary: '', postedDate: '2026-09-18', ogImage: 'https://example.org/hero.jpg', ogTitle: 'OK', ogDescription: '', ogFetchedAt: '2026-09-18T12:00:00Z' }
];
T.adminOn = true; T.currentProfile = ADMIN;
ctx.renderNews();
check('Retry Preview is offered for the post with no preview', els.newsList.innerHTML.includes('Retry Preview'), els.newsList.innerHTML);
T.adminOn = false; T.currentProfile = MEMBER;
ctx.renderNews();
check('a plain member never sees Retry Preview, even on a preview-less post', !els.newsList.innerHTML.includes('Retry Preview'), els.newsList.innerHTML);

group('retryNewsPreview() saves a fetched preview onto the existing post via UPDATE, not a new row');
T.S.news = [{ id: 'n7', title: 'Needs Retry', url: 'https://example.org/blocked', summary: '', postedDate: '2026-09-18', ogImage: null, ogTitle: null, ogDescription: null, ogFetchedAt: null }];
T.currentProfile = ADMIN; T.adminOn = true;
T.sb = createFakeSupabase({ cc_news: [{ id: 'n7', title: 'Needs Retry', url: 'https://example.org/blocked' }] });
// Still no auth.getSession on the fake client, so this retry also fails
// closed — proving retryNewsPreview() reports that failure too, rather than
// only saveNews() knowing how. setTimeout(0) for the same reason as above.
const retryP = ctx.retryNewsPreview('n7');
await new Promise(r => setTimeout(r, 0));
ctx.dialogOk();
await retryP;
check('a failed retry leaves og_fetched_at unset — never a false "fixed"', T.S.news[0].ogFetchedAt == null);
check('a failed retry does not touch the database row at all', !('og_fetched_at' in T.sb._store.cc_news[0]), T.sb._store.cc_news[0]);

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
