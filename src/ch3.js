/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * Chapter 3 — The Side Project. Friday night at home. Ship It Weekend closes at 01:00.
 * Find a real problem, spend AI credits wisely, build in the right order, ship.
 */
import * as THREE from 'three';

const FX = 80; // the apartment's x position (see main.js)
const V = (x, y, z) => new THREE.Vector3(FX + x, y, z);
const SHOTS = {
  far: { pos: V(1, 4, 11), look: V(0, 1.2, -1.5) },
  wide: { pos: V(0.6, 2.2, 5.6), look: V(-0.3, 1.05, -0.8) },
  you: { pos: V(-0.3, 1.4, 2.4), look: V(-0.7, 1.05, -0.2) },
  laptop: { pos: V(-2.2, 1.8, 1.4), look: V(0, 0.95, -0.25) },
  window: { pos: V(0.6, 1.9, 0.9), look: V(1.8, 2.2, -3.1) },
};

// ---------- Round 1: user interviews (who says it, and the order, changes each loop) ----------
function interviews(loop) {
  const lines = [
    'PRIYA  (bakery owner)  "Chasing customers who haven\'t paid eats my whole Friday. I\'d pay to never do that again."',
    'OMAR   (student)       "A cat-meme ranking app would be sick. Would I pay for it? lol no."',
    'LEO    (plumber)       "Half my invoices are late. I forget who I\'ve already reminded. Total mess."',
    'JO     (retired)       "My smart fridge should post on social media. Not sure why. Wouldn\'t pay."',
    'SAM    (designer)      "Chasing unpaid invoices is the worst part of freelancing. Take my money."',
  ];
  for (let i = 0; i < loop % lines.length; i++) lines.push(lines.shift()); // rotate each loop
  return lines;
}
const RESEARCH_QS = [
  { q: 'Which problem should you build for?', options: [
    { t: 'Chasing unpaid invoices: three people have it, and they would pay to fix it.', ok: true },
    { t: 'Cat-meme rankings: it sounds the most fun.' },
    { t: 'A fridge that posts online: nobody else is building it.' },
  ] },
  { q: 'What made that the right pick?', options: [
    { t: 'It hurts often, lots of people share it, and they would pay.', ok: true },
    { t: 'It has the coolest possible startup name.' },
    { t: 'ECHO would enjoy building it.' },
  ] },
];

// ---------- Round 2: what to spend tonight's AI credits on ----------
function features(loop) {
  return [
    { t: 'Invoice list: add and view invoices', cost: 25, need: true, plain: 'The core. Without invoices there is nothing to chase.' },
    { t: 'Automatic payment reminders by email', cost: 30, need: true, plain: 'The actual pain: chasing. This IS the product.' },
    { t: 'Simple login', cost: 15, need: true, plain: 'Each person should only see their own invoices.' },
    { t: '"Pay now" link inside each reminder', cost: 20, plain: 'Nice to have: people pay faster. Fine if it fits.' },
    { t: 'Animated 3D logo', cost: 40, fluff: true, plain: 'Looks cool. Fixes nothing tonight.' },
    { t: 'Dark mode', cost: 15, fluff: true, plain: 'Lovely. Not tonight.' },
    { t: 'AI chatbot that tells invoice jokes', cost: 35, fluff: true, plain: 'Nobody asked for this.' },
    ...(loop >= 1 ? [{ t: '"Powered by AI" badge on every page', cost: 10, fluff: true, plain: 'A sticker, not a feature.' }] : []),
  ];
}
const budgetFor = loop => [100, 90, 80][Math.min(loop, 2)]; // the credits shrink each loop

export default {
  id: 'ch3',
  num: 3,
  title: 'The Side Project',
  day: 'FRI',
  start: 1260, // 21:00
  end: 1500,   // 01:00
  rate: 1.5,
  ranks: [120, 200, 300, 450],
  winLine: '✓ shipped',
  timeoutEnding: 'deadline',

  dex: {
    research: { name: 'User research', simple: 'Asking real people about real problems before you build anything.', real: 'Most failed startups built something nobody needed.' },
    pmf: { name: 'Product-market fit', simple: 'When what you built is exactly what lots of people need, and will pay for.', real: 'The thing every startup is chasing.' },
    credits: { name: 'AI credits', simple: 'AI costs money every time you ask it something.', real: 'Teams budget AI usage like any other bill.' },
    mvp: { name: 'MVP', simple: 'Minimum viable product: the smallest thing that actually solves the problem.', real: 'Ship the MVP, learn, then add features.' },
    deps: { name: 'Dependency', simple: 'Something that has to exist first. You cannot ice a cake you have not baked.', real: 'Build order and package managers are all about dependencies.' },
  },

  endings: {
    catMeme: { title: 'Cat Meme Unicorn', text: 'You built the cat-meme ranking app. It is beautiful. It has zero users, including Omar.', lesson: 'Build what people need, not what sounds cool.' },
    nameGame: { title: 'The Name Game', text: 'ECHO suggested 500 names. Invoicify. Billr. Synergyly. All 100 credits gone. Nothing built.', lesson: 'Ship first, name later.' },
    burnout: { title: 'Burnout', text: 'Three energy drinks later you pushed to the wrong branch and fell asleep on the keyboard. Your submission reads "zzzzzzzzzzzz".', lesson: 'Rest is part of the work. Tired engineers ship bugs.' },
    deadline: { title: '01:00', text: 'Submissions closed. Your app works perfectly, on your laptop, where nobody can see it.', lesson: 'Done and shipped beats perfect and private.' },
  },

  reset({ g, S }) {
    g.flat.chair.position.x = FX - 0.95;
    S.stix.g.position.set(FX - 0.95, 0, -0.2); S.stix.face(1); S.stix.setPose('sit'); S.stix.typing = true;
    g.cam.cut(SHOTS.far);
  },

  async play(c) {
    const { g, S, cam, ui, say, sfx, me, ME, run, day, timed, spend, dex, seen, quizPuzzle, budgetPuzzle, orderPuzzle, Fail, tween, sleep, ease } = c;
    const L = run.loop;

    // ---------- intro ----------
    ui.letterbox(true);
    cam.cut(SHOTS.far);
    const dolly = cam.go(SHOTS.wide, 3.4);
    await ui.caption('FRIDAY · 21:00', L ? `LOOP #${L + 1}` : 'CHAPTER 3 — THE SIDE PROJECT', 2.8);
    await dolly;
    await cam.go(SHOTS.you, 1.6);
    if (L === 0) {
      await say(ME(), 'New job is great. But I want to build something of my own.');
      await say('ECHO', 'Ship It Weekend: submissions close at 01:00. Every company starts as a side project. So, what are we building?');
    } else {
      S.stix.typing = false;
      S.stix.pose('think');
      await say(ME(), L === 1 ? 'Friday night. Again. Pizza is still warm.' : `Loop ${L + 1}. I know this pizza by heart.`);
      await say('ECHO', `Notes kept: ${run.clues.size} clue${run.clues.size === 1 ? '' : 's'}. Credits tonight: ${budgetFor(L)}.`);
      S.stix.pose('sit');
      S.stix.typing = true;
    }
    ui.letterbox(false);

    // ---------- What to build ----------
    const start = [];
    if (run.clues.has('problem')) start.push({ id: 'known', label: 'I already know the problem: chasing unpaid invoices.' });
    start.push(
      { id: 'ask', label: 'Ask people what actually annoys them' },
      { id: 'cat', label: "Build a cat-meme ranking app. It's cool." },
      { id: 'names', label: 'First, have ECHO brainstorm 500 startup names' },
    );
    const what = await timed(ui.choose(start));
    if (what === 'cat') await catMeme();
    if (what === 'names') await nameGame();
    if (what === 'ask') await research();
    run.clues.add('problem');

    // ---------- Spend the credits ----------
    await cam.go(SHOTS.laptop, 0.9);
    if (!seen('credits')) {
      await say('ECHO', `We have ${budgetFor(L)} AI credits tonight. Every request to me costs credits. AI is not free.`, true);
      dex('credits');
    }
    if (!seen('mvp')) {
      await say('ECHO', 'So build the MVP: the smallest thing that actually solves the problem. Everything else can wait for Monday.', true);
      dex('mvp');
    }
    const plan = await timed(budgetPuzzle({
      head: `ship-it-weekend · plan · ${budgetFor(L)} credits`,
      task: 'Pick the features to build tonight, then lock the plan.',
      budget: budgetFor(L),
      items: features(L),
      submitLabel: 'Lock the plan ▸',
      penalty: 15 + 5 * L,
      onWrong: (kind, it) => kind === 'over' ? '<b>ECHO:</b> That costs more credits than we have.'
        : kind === 'missing' ? `<b>ECHO:</b> Without <b>${ui.esc(it.t.split(':')[0])}</b> the app doesn't solve the problem.`
        : `<b>ECHO:</b> <b>${ui.esc(it.t)}</b> can wait. MVP first.`,
      mercy: '<b>ECHO:</b> Hint: keep the three things the app cannot work without. Drop anything that is just for show.',
      solvedMsg: '<b>ECHO:</b> Lean plan. I like it.',
    }));
    const payLink = plan.some(it => it.t.startsWith('"Pay now"'));

    // ---------- Build in the right order ----------
    if (!seen('deps')) {
      await say('ECHO', 'Order matters. A DEPENDENCY is something that must exist first. You cannot ice a cake you have not baked.', true);
      dex('deps');
    }
    const steps = [
      { id: 'login', t: 'Login', deps: [], plain: 'Know who the user is.' },
      { id: 'invoices', t: 'Invoice list', deps: ['login'], plain: 'Invoices belong to a logged-in user.' },
      { id: 'reminders', t: 'Payment reminders', deps: ['invoices'], plain: 'You remind people about invoices, so invoices come first.' },
      ...(payLink ? [{ id: 'pay', t: '"Pay now" link', deps: ['reminders'], plain: 'The link lives inside a reminder.' }] : []),
    ];
    await timed(orderPuzzle({
      head: 'build order',
      task: 'Click the features in the order you should build them.',
      items: steps,
      penalty: 10 + 5 * L,
      onWrong: (it, blocker) => `<b>ECHO:</b> <b>${ui.esc(it.t)}</b> needs <b>${ui.esc(blocker.t)}</b> to exist first.`,
      mercy: '<b>ECHO:</b> Hint: start with who the user is, then what they own, then what happens to it.',
      solvedMsg: '<b>ECHO:</b> Built in order. Nothing is missing its foundations.',
    }));
    S.stix.typing = true;

    // ---------- 00:15: the wall ----------
    day.min = Math.max(day.min, 1455);
    await cam.go(SHOTS.window, 1.2);
    await say(ME(), "It's past midnight. My eyes are melting.");
    S.stix.typing = false;
    const rest = await timed(ui.choose([
      { id: 'walk', label: 'Take a ten-minute walk' },
      { id: 'push', label: 'Keep going, no break' },
      { id: 'energy', label: 'Down three energy drinks and push through' },
    ]));
    if (rest === 'energy') await burnout();
    if (rest === 'walk') {
      spend(10);
      await say(ME(), 'Okay. Fresh air. Brain rebooted.');
    }

    // ---------- Ship it ----------
    await cam.go(SHOTS.laptop, 0.8);
    await say('ECHO', 'Everything builds. Tests pass, and this time I checked them myself. Ship it.');
    ui.letterbox(true);
    g.timeScale = 0.35;
    const zone = ui.settings.storyMode ? 0.35 : Math.max(0.1, (rest === 'walk' ? 0.3 : 0.22) * 0.85 ** L);
    while (!(await timed(ui.qte({ zone, label: 'SHIP IT' })))) {
      sfx.bad();
      cam.shake(0.15);
      spend(10);
    }
    g.timeScale = 1;
    await victory();

    // ---------- scenes ----------
    async function research() {
      if (!seen('research')) {
        await say('ECHO', 'USER RESEARCH: ask real people about real problems before building. Listen for problems that keep coming up, and that people would pay to fix.', true);
        dex('research');
      }
      await cam.go(SHOTS.laptop, 0.8);
      const r = await timed(quizPuzzle({
        head: 'video calls · 5 friends · 21:15',
        code: interviews(L),
        questions: RESEARCH_QS,
        escape: 'Ignore them. Build the cat-meme app anyway.',
        penalty: 10 + 5 * L,
        wrongMsg: '<b>ECHO:</b> Read again. Who has the same problem? Who said they would pay?',
        rightMsg: '<b>ECHO:</b> Exactly.',
      }));
      if (r === 'escape') await catMeme();
      if (!seen('pmf')) {
        await say('ECHO', 'That is PRODUCT-MARKET FIT: building what lots of people need, and will pay for.', true);
        dex('pmf');
      }
    }

    async function catMeme() {
      ui.closePanel();
      await say(ME(), 'Cat memes. Ranked. By AI. This is going to be huge.');
      await cam.go(SHOTS.laptop, 0.8);
      ui.letterbox(true);
      await say('SYSTEM', 'Cat Meme Ranker is live! · Users: 0 · Users: 0 · Users: 0');
      await say('OMAR (text)', 'lol nice. not gonna use it tho');
      throw new Fail('catMeme');
    }

    async function nameGame() {
      await say('ECHO', 'Brainstorming! Invoicify. Billr. Payly. Synergyly. Dunnr. Owe-Me. Chaseo...');
      ui.letterbox(true);
      await cam.go(SHOTS.laptop, 0.6);
      await say('SYSTEM', '[!] AI credits remaining: 0');
      await say(ME(), '...We have a name. We have nothing else.');
      throw new Fail('nameGame');
    }

    async function burnout() {
      sfx.hit();
      cam.shake(0.25);
      await say(ME(), 'Glug. Glug. Glug. I CAN SEE SOUND.');
      ui.letterbox(true);
      g.timeScale = 0.5;
      S.stix.pose('slump', 1.2, ease.inOutCubic);
      await sleep(1.4);
      g.timeScale = 1;
      await say('SYSTEM', 'git push --force origin main · "zzzzzzzzzzzzzzzz"');
      throw new Fail('burnout');
    }

    async function victory() {
      ui.quiet();
      ui.flash();
      sfx.good();
      await say('SYSTEM', `Submitted at ${ui.fmtClock(day.min)}. · New signup: Priya's Bakery`);
      await say('SYSTEM', '[$] Priya just paid $9 for the first month.');
      ui.quiet();

      g.timeScale = 0.6;
      const at = V(-0.95, 1.25, -0.2);
      const spin = tween(3.2, k => {
        const a = -0.1 + k * 1.2;
        cam.pos.set(at.x + Math.sin(a) * 2.4, at.y + 0.1 - k * 0.2, at.z + Math.cos(a) * 2.4);
        cam.look.copy(at);
      });
      tween(0.6, k => { g.flat.chair.position.x = FX - 0.95 - k * 1.0; }, ease.outCubic);
      await S.stix.pose('stand', 0.6, ease.outCubic);
      S.stix.shades.visible = true;
      S.stix.showScarf(true);
      sfx.hit();
      cam.shake(0.06);
      await S.stix.pose('cheer', 0.45);
      await spin;
      g.timeScale = 1;
      await say(ME(), 'My first customer. I actually made something people pay for.');
      await say('ECHO', 'Every company starts with one customer. Oh, and an email just came in: "Loved your project. Pitch at Demo Day?"');
    }
  },
};
