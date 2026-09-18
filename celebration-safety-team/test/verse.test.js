/* Verse of the Week — renderVerse() emits a fresh .verse-content element
   each call (so the CSS fade-in keyframe, defined in the stylesheet, has
   something new to animate) carrying the verse text and reference; actual
   motion/typography is a browser-only concern, checked in the manual pass. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

function stubFields(fields) {
  const blank = { value: '', textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, querySelectorAll: () => [], setAttribute(){}, removeAttribute(){} };
  ctx.document.getElementById = id => (id in fields) ? fields[id] : blank;
}

group('renderVerse() wraps the current week\'s verse in .verse-content');
T.S = { verses: [{ week: 1, reference: 'Psalm 91:1-2', text: 'He who dwells...', translation: 'WEB' }] };
T.adminOn = false;
const verseBox = { innerHTML: '' };
const manageBtn = { style: {} };
stubFields({ verseBox, manageVersesBtn: manageBtn });
// Force week 1 by stubbing currentVerseWeek indirectly is not exposed; instead
// seed all 52 weeks isn't necessary — just check whichever week resolves has
// the right structure when a verse row exists for it.
const week = ctx.currentVerseWeek ? ctx.currentVerseWeek() : 1;
T.S.verses = [{ week, reference: 'Psalm 91:1-2', text: 'He who dwells in the secret place...', translation: 'WEB' }];
ctx.renderVerse();
check('output is wrapped in a .verse-content element', verseBox.innerHTML.includes('class="verse-content"'), verseBox.innerHTML);
check('verse text is present inside .verse-text', verseBox.innerHTML.includes('verse-text') && verseBox.innerHTML.includes('He who dwells'), verseBox.innerHTML);
check('reference is present inside .verse-ref', verseBox.innerHTML.includes('verse-ref') && verseBox.innerHTML.includes('Psalm 91:1-2'), verseBox.innerHTML);

group('renderVerse() with no verse for the week still renders inside .verse-content');
T.S.verses = [];
ctx.renderVerse();
check('empty state is also wrapped', verseBox.innerHTML.includes('class="verse-content"'), verseBox.innerHTML);
check('empty state message shown', verseBox.innerHTML.includes('No verse set'), verseBox.innerHTML);

done();
