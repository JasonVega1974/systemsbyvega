/* Quiz integrity. The raw answer keys are badly skewed toward option index 1
   (26 of 37 questions), which made three of seven modules passable by choosing
   the second option every time — 6/6 on Medical. Options are now shuffled per
   attempt. These tests prove the shuffle is a real permutation, that it breaks
   the positional strategy, and that scoring still works against the ORIGINAL
   indices so stored results stay meaningful. */
const { loadApp, runner } = require('./harness');
const { ctx, T } = loadApp(process.argv[2]);
const { check, group, done } = runner();

const MED = T.COURSES.find(c => c.id === 'ss205');

group('the underlying skew is real — this is what we are defending against');
{
  const dist = {};
  T.COURSES.forEach(c => c.quiz.forEach(q => { dist[q.ans] = (dist[q.ans] || 0) + 1; }));
  check('answer keys ARE skewed toward index 1', dist[1] > 20, dist);
  const passable = T.COURSES.filter(c =>
    c.quiz.filter(q => q.ans === 1).length >= ctx.passMark(c));
  check('unshuffled, several modules would fall to an always-B answer',
        passable.length >= 3, passable.map(c => c.id));
}

group('buildQuizOrder produces a true permutation');
{
  for (let trial = 0; trial < 200; trial++) {
    ctx.buildQuizOrder(MED);
    for (let qi = 0; qi < MED.quiz.length; qi++) {
      const order = ctx.optionOrder(qi, MED.quiz[qi]);
      const n = MED.quiz[qi].opts.length;
      if (order.length !== n || new Set(order).size !== n ||
          order.some(i => i < 0 || i >= n)) {
        check('trial ' + trial + ' q' + qi + ' is a valid permutation', false, order);
        trial = 1e9; break;
      }
    }
  }
  check('200 shuffles all produced valid permutations of every question', true);
}

group('the correct answer moves around');
{
  const seen = MED.quiz.map(() => new Set());
  for (let t = 0; t < 400; t++) {
    ctx.buildQuizOrder(MED);
    MED.quiz.forEach((q, qi) => {
      seen[qi].add(ctx.optionOrder(qi, q).indexOf(q.ans));   // display position
    });
  }
  const stuck = seen.map((s, i) => ({ q: i, positions: [...s].sort() })).filter(x => x.positions.length < 2);
  check('every question showed its correct answer in more than one position',
        stuck.length === 0, stuck);
  check('each question used all 4 display positions across 400 shuffles',
        seen.every(s => s.size === 4), seen.map(s => s.size));
}

group('the positional strategy collapses');
{
  /* Answer whatever sits in display slot 1 every time, across many attempts. */
  let passes = 0;
  const TRIALS = 2000;
  for (let t = 0; t < TRIALS; t++) {
    ctx.buildQuizOrder(MED);
    let correct = 0;
    MED.quiz.forEach((q, qi) => {
      const picked = ctx.optionOrder(qi, q)[1];    // the second option shown
      if (picked === q.ans) correct++;
    });
    if (correct >= ctx.passMark(MED)) passes++;
  }
  const rate = passes / TRIALS;
  check('always-picking-slot-1 no longer passes reliably (was 100%)', rate < 0.05,
        (rate * 100).toFixed(2) + '% of ' + TRIALS + ' attempts');
  /* 5 or 6 of 6 correct at p=0.25 each is about 0.46% — so anything under 5%
     is comfortably chance, and a regression back to a fixed order would be
     100% and fail loudly. */
}

group('scoring still uses ORIGINAL indices, so results stay comparable');
{
  ctx.buildQuizOrder(MED);
  MED.quiz.forEach((q, qi) => {
    const displayed = ctx.optionOrder(qi, q);
    const slotOfCorrect = displayed.indexOf(q.ans);
    check('q' + qi + ': the option rendered in the correct slot IS q.ans',
          displayed[slotOfCorrect] === q.ans);
  });
}

group('every module is still winnable by someone who knows the material');
{
  T.COURSES.forEach(c => {
    ctx.buildQuizOrder(c);
    let correct = 0;
    c.quiz.forEach((q, qi) => {
      /* Pick the right answer wherever the shuffle put it. */
      const displayed = ctx.optionOrder(qi, c.quiz[qi]);
      const chosen = displayed[displayed.indexOf(q.ans)];
      if (chosen === q.ans) correct++;
    });
    check(c.id + ': answering correctly scores full marks', correct === c.quiz.length,
          correct + '/' + c.quiz.length);
  });
}

done();
