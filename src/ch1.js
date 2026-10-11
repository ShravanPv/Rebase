/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * Chapter 1 — The Layoff. Production is down; fix it before the 17:00 "restructuring" meeting.
 */
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = {
  far: { pos: V(1.5, 5, 14), look: V(0, 1, -1.5) },
  wide: { pos: V(0.8, 2.4, 7.2), look: V(-0.3, 1, -0.8) },
  stix: { pos: V(-0.3, 1.4, 2.8), look: V(-0.55, 1.05, 0) },
  monitor: { pos: V(-2.1, 1.8, 1.9), look: V(0.15, 1.0, -0.1) },
  boss: { pos: V(-1.1, 1.5, 3.4), look: V(-1.6, 1.1, 0.3) },
};

// ---------- puzzle content (changes every loop) ----------
function makeLogs(loop) {
  const t0 = [12, 7, 15][loop % 3]; // the root cause moves each loop
  const L = (m, svc, lvl, msg, plain, kind = 'wrong') => ({
    m, kind, plain, err: lvl === 'ERROR',
    text: `09:${String(m).padStart(2, '0')}  ${svc.padEnd(9)}${lvl.padEnd(6)}${msg}`,
  });
  const lines = [
    L(1, 'web', 'INFO', 'server started', 'The website switched on. Normal.'),
    L(3, 'auth', 'INFO', 'login ok (x214)', '214 people logged in. Normal.'),
    L(t0 - 1, 'web', 'INFO', 'homepage served (x1,203)', 'People are visiting the site. Normal.'),
    L(t0, 'config', 'INFO', 'PAYMENT_TIMEOUT changed 5000ms -> 0ms (by deploy-bot)', 'A robot changed a payment setting from 5 seconds to ZERO seconds.', 'answer'),
    L(t0 + 1, 'payments', 'WARN', 'payment gave up after 0ms', 'A payment stopped waiting. Instantly.', 'near'),
    L(t0 + 3, 'payments', 'WARN', 'payment gave up after 0ms', 'Same thing again.'),
    L(t0 + 6, 'auth', 'INFO', 'login ok (x187)', 'Logins are still fine.'),
    L(t0 + 9, 'payments', 'ERROR', '300 payments failed', 'Payments are now failing a lot.'),
    L(t0 + 12, 'search', 'INFO', 'search index refreshed', 'Routine housekeeping. Normal.'),
    L(t0 + 15, 'email', 'WARN', 'queue slow (1.2s)', 'Email is a bit slow. Not checkout.'),
    L(t0 + 19, 'checkout', 'ERROR', '!!! 5,000 PAYMENTS FAILED - CHECKOUT DOWN !!!', 'The loudest alarm. But it is the RESULT, not the start.'),
    L(t0 + 21, 'web', 'ERROR', 'customers see "Something went wrong"', 'Customers notice. Still a symptom.'),
    L(t0 + 24, 'alerts', 'ERROR', 'paging on-call engineer', 'The alarm that woke everyone up.'),
  ];
  // Later loops add red herrings, so remembering the position isn't enough.
  if (loop >= 1) lines.push(L(t0 - 3, 'email', 'ERROR', 'newsletter template missing', 'Something broke, but it is email, not checkout.'));
  if (loop >= 2) lines.push(L(t0 + 4, 'cache', 'WARN', 'cache cleared (scheduled)', 'Routine cleanup that happens every day.'));
  return lines.sort((a, b) => a.m - b.m);
}

const BAD_LINES = [
  { text: '+ delete all orders older than today   # cleanup, saves disk space!', plain: 'Erase every past order. Nothing to do with the timeout, and it can\'t be undone.', verdict: '"Delete all orders older than today"? That\'s not a fix. That\'s a disaster.' },
  { text: '+ turn off fraud checks   # makes payments faster!', plain: 'Stop checking for stolen cards. Faster, yes. Also dangerous.', verdict: 'Turn off fraud checks? That just makes it faster for thieves.' },
  { text: '+ email customers their full card numbers as a receipt', plain: 'Send people\'s secret card numbers by email. A huge privacy leak.', verdict: 'Email full card numbers?! That\'s a privacy disaster.' },
];
function makeDiff(loop) {
  const bad = { ...BAD_LINES[loop % 3], kind: 'answer' };
  const good = [
    { text: '- set PAYMENT_TIMEOUT = 0 ms', plain: 'Remove the broken setting (zero seconds).' },
    { text: '+ set PAYMENT_TIMEOUT = 5000 ms', plain: 'Give payments 5 seconds to finish again. The real fix.' },
    { text: '+ retry the payments that failed this morning', plain: 'Try the failed payments again so customers get their orders.' },
    { text: '+ restart the payment service', plain: 'Turn the payment part off and on so it reads the new setting.' },
  ].map(l => ({ ...l, kind: 'wrong' }));
  good.splice([3, 1, 2][loop % 3], 0, bad); // the bad line moves each loop
  return { lines: [{ text: '  fix_checkout.txt', static: true }, ...good], verdict: bad.verdict };
}

export default {
  id: 'ch1',
  num: 1,
  title: 'The Layoff',
  day: 'MON',
  start: 540,  // 09:00
  end: 1020,   // 17:00
  rate: 1.5,   // in-game minutes per real second while acting
  ranks: [90, 150, 240, 360],
  winLine: '✓ merged to main',
  timeoutEnding: 'timeout',
  orbit: { x: 0, z: -1 },

  dex: {
    production: { name: 'Production', simple: 'The live app real customers are using right now.', real: '"Prod is down" are the scariest three words in software.' },
    log: { name: 'Log', simple: 'A diary the app writes: time, which part, what happened.', real: 'Reading logs is usually step one of debugging.' },
    root: { name: 'Root cause', simple: 'The first thing that went wrong, not the loudest.', real: 'Fix the cause, not the symptom, or it comes back.' },
    config: { name: 'Config', simple: 'Settings the app reads, like a thermostat dial.', real: 'One wrong setting can take down a whole website.' },
    diff: { name: 'Diff', simple: 'A before/after of a change. − removed, + added.', real: 'Reading diffs before merging is called code review.' },
    tests: { name: 'Tests', simple: 'Automatic checks that code does what we expect.', real: 'Passing tests ≠ safe. Tests only check what someone thought of.' },
    halluc: { name: 'AI hallucination', simple: 'When an AI states something wrong, confidently.', real: 'Always verify AI output, especially anything that deletes or sends data.' },
    deploy: { name: 'Deploy', simple: 'Sending a new version of the app live to customers.', real: 'Good teams deploy many times a day, carefully.' },
  },

  endings: {
    coffee: { title: 'Coffee Break', text: 'You went for coffee during a production outage. Your manager found you at the machine. Holding a muffin.', lesson: 'When production is down, it is all hands on deck.' },
    merge: { title: 'Blind Merge', text: "You merged ECHO's code without reading it. The tests passed. Production did not.", lesson: 'Passing tests is not the same as safe. Always read what the AI wrote.' },
    rage: { title: 'Rage Quit', text: "You flipped your desk. Then everyone else's. Very satisfying. Very fired.", lesson: 'Every engineer has felt this. The loop forgives you. HR does not.' },
    timeout: { title: '17:00', text: 'The clock hit 17:00. The "restructuring" meeting started. You were still staring at the screen.', lesson: 'Wrong guesses cost time. Slow is smooth, smooth is fast.' },
  },

  reset({ g, S, world }) {
    world.alarm(false);
    world.restore();
    S.stix.g.position.set(-0.95, 0, 0); S.stix.face(1); S.stix.setPose('sit'); S.stix.typing = true;
    S.boss.g.position.set(-7.5, 0, 0.55); S.boss.face(1); S.boss.setPose('stand');
    S.co.forEach(co => { co.setPose('sit'); co.typing = true; });
    g.cam.cut(SHOTS.far);
  },

  async play(c) {
    const { g, S, cam, world, ui, say, sfx, me, ME, run, day, timed, spend, dex, seen, clickPuzzle, Fail, tween, sleep, ease } = c;
    const L = run.loop;

    // ---------- intro ----------
    ui.letterbox(true);
    cam.cut(SHOTS.far);
    const dolly = cam.go(SHOTS.wide, 3.4);
    await ui.caption('MONDAY · 09:00', L ? `LOOP #${L + 1}` : 'CHAPTER 1 — THE LAYOFF', 2.8);
    await dolly;
    await cam.go(SHOTS.stix, 1.8);

    if (L === 0) {
      await say(ME(), 'New week. New tickets. Same coffee.');
      await say('ECHO', `Morning, ${me()}! I'm ECHO, your AI pair-programmer. I read code, write code, and... occasionally make things up.`, true);
      dex('ai');
    } else {
      S.stix.typing = false;
      S.stix.pose('think');
      await say(ME(), L === 1 ? "Wait... I've lived this morning before." : 'Again. Okay. I know how this goes.');
      await say('ECHO', `Déjà vu? My counter says loop #${L + 1}. I kept your notes: ${run.clues.size} clue${run.clues.size === 1 ? '' : 's'}.`);
      S.stix.pose('sit');
      S.stix.typing = true;
    }

    // ---------- 09:40: the alarm ----------
    ui.quiet();
    day.min = 580;
    world.alarm(true);
    ui.flash();
    sfx.alarm();
    cam.shake(0.3);
    S.stix.typing = false;
    S.stix.pose('panicSit', 0.5);
    S.co.forEach(co => { co.typing = false; co.pose('panicSit', 0.5); });
    await cam.go(SHOTS.monitor, 0.7, ease.outExpo);
    await say('SYSTEM', '[!] ALERT — CHECKOUT IS DOWN. Customers cannot pay.');

    cam.go(SHOTS.boss, 1.6);
    S.stix.pose('sit');
    await S.boss.walkTo(-2.1, 2.4);
    S.boss.pose('point');
    await say('MANAGER', `${me()}! Production is down. Fix it before 17:00. That's when the... 'restructuring' meeting starts.`);
    S.boss.pose('cross');
    if (!seen('production')) {
      await say('ECHO', "PRODUCTION = the live app real customers are using right now. If it's down, the shop's front door is jammed. Nobody can buy anything.", true);
      dex('production');
    }
    if (run.last === 'echo') await say('MANAGER', "And this time, don't just paste whatever the AI says.");
    ui.letterbox(false);

    const options = [];
    if (run.clues.has('timeout')) options.push({ id: 'direct', label: 'I already know the cause: the payment timeout is 0. Fix it myself.' });
    options.push(
      { id: 'logs', label: 'Read the logs myself' },
      { id: 'echo', label: 'Ask ECHO to fix it' },
      { id: 'coffee', label: 'Grab a coffee first' },
      { id: 'rage', label: "Flip the desk. I'm DONE." },
    );
    await cam.go(SHOTS.stix, 0.8);
    const pick = await timed(ui.choose(options));
    run.last = pick;

    if (pick === 'coffee') await coffee();
    if (pick === 'rage') await rage();
    if (pick === 'direct') {
      await say(ME(), "The payment timeout is set to zero, so every payment gives up instantly. That's a one-line fix.");
      await say('ECHO', "...You didn't even need me. Impressive.");
    } else {
      if (pick === 'logs') await logPuzzle();
      else spend(10);
      await echoFix();
    }
    await deploy();
    await victory(pick);

    // ---------- scenes ----------
    async function coffee() {
      await say(ME(), "Can't debug without caffeine. Back in five.");
      tween(0.6, k => { world.stixChair.position.x = -0.95 - k * 1.0; }, ease.outCubic);
      await S.stix.pose('stand', 0.4);
      cam.go(SHOTS.wide, 1.5);
      await S.stix.walkTo(-8, 1.8);
      S.boss.pose('facepalm');
      await say('MANAGER', `Is ${me()}... getting COFFEE?`);
      throw new Fail('coffee');
    }

    // Every engineer's fantasy. REBASE puts it all back afterwards.
    async function rage() {
      await say(ME(), "You know what? I'm DONE.");
      ui.quiet();
      ui.letterbox(true);
      g.timeScale = 0.3; // slow-mo desk flip
      S.stix.typing = false;
      tween(0.4, k => { world.stixChair.position.x = -0.95 - k * 0.9; }, ease.outCubic);
      await S.stix.pose('stand', 0.3);
      await S.stix.pose('cheer', 0.25);
      const broken = new Set(world.desks[0]);
      for (const p of broken) world.smash(p, V(-0.95, 0.4, 0.3), 1.3);
      ui.flash();
      sfx.hit();
      cam.shake(0.5);
      S.co.forEach(co => co.pose('panicSit', 0.4));
      await sleep(1.1);
      g.timeScale = 1;
      S.stix.pose('stand');
      await cam.go(SHOTS.wide, 1);
      ui.letterbox(false);
      if (!g.mem.endings.includes('rage')) {
        await say('ECHO', "RAGE MODE. Click anything to smash it (or mash SPACE). Don't worry. Nothing here is permanent... probably.", true);
      }
      ui.quiet();
      ui.allowSkip(false);
      const damage = await smashSpree(12, broken);
      ui.allowSkip(true);

      ui.letterbox(true);
      S.boss.pose('facepalm');
      await cam.go(SHOTS.boss, 1);
      await say('MANAGER', `...${me()}. That was $${damage.toLocaleString()} of company property.`);
      await say('MANAGER', 'HR. Now.');
      run.damage = damage;
      throw new Fail('rage');
    }

    // Click (or press Space) to launch things around the office for a few seconds.
    function smashSpree(seconds, broken) {
      return new Promise(resolve => {
        const canvas = document.getElementById('stage');
        const ray = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const total = () => [...broken].reduce((sum, p) => sum + p.cost, 0);
        let left = seconds;
        const show = () => ui.banner(`RAGE MODE · ${left}s · damage $${total().toLocaleString()}`);
        const hit = p => {
          world.smash(p, S.stix.g.position, 1);
          broken.add(p);
          sfx.hit();
          cam.shake(0.12);
          S.stix.pose(Math.random() < 0.5 ? 'point' : 'cheer', 0.15);
          show();
        };
        const onDown = e => {
          if (ui.isPaused()) return;
          const r = canvas.getBoundingClientRect();
          ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ndc, g.camera);
          const first = ray.intersectObjects(world.pieces.map(p => p.obj), true)[0];
          const p = first && world.pieceOf(first.object);
          if (p) hit(p);
        };
        const onKey = e => {
          if (e.key !== ' ' || ui.isPaused()) return;
          e.preventDefault();
          const pool = world.pieces.filter(p => !broken.has(p));
          if (pool.length) hit(pool[Math.floor(Math.random() * pool.length)]);
        };
        canvas.addEventListener('pointerdown', onDown);
        addEventListener('keydown', onKey);
        show();
        const timer = setInterval(() => {
          if (ui.isPaused()) return;
          left--;
          show();
          if (left > 0) return;
          clearInterval(timer);
          canvas.removeEventListener('pointerdown', onDown);
          removeEventListener('keydown', onKey);
          ui.banner(null);
          resolve(total());
        }, 1000);
      });
    }

    async function logPuzzle() {
      spend(15);
      await cam.go(SHOTS.monitor, 0.9);
      if (!seen('log')) {
        await say('ECHO', "That's a LOG: a diary the app writes. Each line says the time, which part of the app, and what happened.", true);
        await say('ECHO', 'INFO is normal. WARN is "hmm". ERROR means something broke. Warm-up: click the ERROR line.', true);
        dex('log');
        await clickPuzzle({
          head: 'warm-up · logs',
          task: 'Click the ERROR line.',
          lines: [
            { text: '08:58  web      INFO  server started', kind: 'wrong' },
            { text: '08:59  auth     INFO  login ok', kind: 'wrong' },
            { text: '09:00  coffee   ERROR machine out of beans', kind: 'answer', err: true },
            { text: '09:01  web      INFO  homepage served', kind: 'wrong' },
          ],
          onWrong: () => '<b>ECHO:</b> That one says INFO. Find the one that says ERROR.',
          solvedMsg: '<b>ECHO:</b> Exactly. (Also, we are out of beans.)',
        });
      }
      if (!seen('root')) {
        await say('ECHO', 'Now the real one. Careful: ERRORS are SYMPTOMS. The loudest line is rarely the cause.', true);
        await say('ECHO', 'Find where the checkout trouble STARTED. Look for the first thing that CHANGED before payments went wrong.', true);
        dex('root');
      } else {
        await say('ECHO', 'Logs are up. Find where the checkout trouble started.');
      }

      await timed(clickPuzzle({
        head: 'logs · production · today',
        task: 'Click the line where the CHECKOUT trouble started.',
        lines: makeLogs(run.loop),
        penalty: 20 + 10 * run.loop,
        onWrong: l => (l.err ? "<b>ECHO:</b> That's a symptom, not the start. Look <b>earlier</b>." : "<b>ECHO:</b> That one's normal. Look for something that <b>changed</b>."),
        nearMsg: "<b>ECHO:</b> Close! That's the first <i>symptom</i>. What <b>changed</b> right before it?",
        mercy: '<b>ECHO:</b> Hint: find the first "payment gave up" line, then look at the line just <b>before</b> it.',
        solvedMsg: '<b>ECHO:</b> Root cause found!',
      }));

      run.clues.add('timeout');
      ui.toast('CLUE · payment timeout was set to 0 ms');
      await say(ME(), 'There. A bot changed the payment timeout to ZERO. Every payment gives up instantly.');
      if (!seen('config')) {
        await say('ECHO', 'That setting is CONFIG: values the app reads, like a thermostat dial. Someone turned it to zero.', true);
        dex('config');
      }
    }

    async function echoFix() {
      await cam.go(SHOTS.monitor, 0.6);
      await say('ECHO', run.clues.has('timeout')
        ? 'Got it. I wrote a fix for the timeout. All 12 tests pass ✓. Merge it?'
        : 'On it! ...Done. I wrote a fix. All 12 tests pass ✓. Merge it?');
      if (!seen('diff')) {
        await say('ECHO', 'This is a DIFF: a before/after of a change. Lines with − are removed. Lines with + are added.', true);
        await say('ECHO', 'And TESTS are automatic checks. Passing tests means my checks passed. Not that the change is safe.', true);
        dex('diff');
        dex('tests');
      }
      const choice = await timed(ui.choose([
        { id: 'merge', label: 'Merge it now. Tests pass!' },
        { id: 'review', label: 'Review it line by line first' },
      ]));
      if (choice === 'merge') await blindMerge();

      if (!seen('halluc')) {
        await say('ECHO', "Reviewing me? Smart. I'm an AI. I can sound sure and still be wrong. That's called a HALLUCINATION.", true);
        dex('halluc');
      }
      const d = makeDiff(run.loop);
      await timed(clickPuzzle({
        head: 'fix_checkout · written by ECHO · tests 12/12 passed ✓',
        task: 'Click the line that should NOT be in this fix.',
        lines: d.lines,
        penalty: 20 + 10 * run.loop,
        strike: true,
        onWrong: () => '<b>ECHO:</b> That line is part of the real fix. Which one does something nobody asked for?',
        mercy: '<b>ECHO:</b> Hint: the problem was a <b>timeout</b>. Which line has nothing to do with timeouts?',
        solvedMsg: '<b>ECHO:</b> ...Yep. That line was me hallucinating. Removed.',
      }));
      await say(ME(), d.verdict);
    }

    async function blindMerge() {
      await say('ECHO', 'Merging... deploying... done! Tests 12/12 ✓');
      ui.letterbox(true);
      g.timeScale = 0.4;
      await sleep(0.3);
      ui.invert(true);
      sfx.hit();
      cam.shake(0.45);
      S.co.forEach(co => co.pose('panicSit', 0.45));
      S.stix.pose('panicSit', 0.45);
      await sleep(0.45);
      ui.invert(false);
      g.timeScale = 1;
      await say('SYSTEM', '[!] 48,213 ORDERS DELETED. Backup status: "coming soon".');
      S.boss.pose('facepalm');
      await say('MANAGER', `...${me()}. What did you just merge?`);
      run.clues.add('halluc');
      throw new Fail('merge');
    }

    async function deploy() {
      await cam.go(SHOTS.monitor, 0.6);
      if (!seen('deploy')) {
        await say('ECHO', 'Last step: DEPLOY. That means sending the fix live to customers. Time it right.', true);
        dex('deploy');
      }
      ui.letterbox(true);
      g.timeScale = 0.35; // slow-mo while you aim
      const zone = ui.settings.storyMode ? 0.35 : Math.max(0.1, 0.28 * 0.8 ** run.loop);
      while (!(await timed(ui.qte({ zone, label: 'DEPLOY' })))) {
        sfx.bad();
        cam.shake(0.15);
        spend(15);
      }
      g.timeScale = 1;
    }

    async function victory(how) {
      ui.quiet();
      world.alarm(false);
      ui.flash();
      sfx.good();
      S.co.forEach(co => co.pose('cheerSit', 0.4));

      // Hero moment: chair rolls back, you stand, shades on, camera orbits in slow-mo.
      g.timeScale = 0.6;
      const at = V(-0.95, 1.25, 0);
      const spin = tween(3.2, k => {
        const a = -0.1 + k * 1.2; // sweep in front of the player, away from the manager
        cam.pos.set(at.x + Math.sin(a) * 2.5, at.y + 0.1 - k * 0.25, at.z + Math.cos(a) * 2.5);
        cam.look.copy(at);
      });
      tween(0.6, k => { world.stixChair.position.x = -0.95 - k * 1.0; }, ease.outCubic);
      await S.stix.pose('stand', 0.6, ease.outCubic);
      S.stix.shades.visible = true;
      S.stix.showScarf(true);
      sfx.hit();
      cam.shake(0.06);
      await S.stix.pose('cool', 0.45);
      await spin;
      g.timeScale = 1;

      await cam.go(SHOTS.boss, 1);
      S.boss.pose('point');
      await say('MANAGER', how === 'direct' ? "Checkout's back. In record time." : "Checkout's back. And you didn't blindly trust the AI.");
      S.boss.pose('cross');
      await say('MANAGER', 'The 17:00 meeting? Cancelled. For you, anyway.');
      await say('ECHO', 'Loop closed. For now...');
    }
  },
};
