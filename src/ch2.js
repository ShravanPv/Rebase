/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * Chapter 2 — The Interview. Laid off anyway, you interview at Glasshouse AI,
 * where candidates may use AI out loud — and are judged on HOW they use it.
 */
import * as THREE from 'three';

const OX = 40; // the meeting room's x position (see main.js)
const V = (x, y, z) => new THREE.Vector3(OX + x, y, z);
const SHOTS = {
  far: { pos: V(1, 4.2, 12), look: V(0, 1.2, -1.5) },
  wide: { pos: V(0.4, 2.3, 6.2), look: V(0, 1.05, -0.6) },
  you: { pos: V(-0.4, 1.4, 2.7), look: V(-1.5, 1.1, 0) },
  them: { pos: V(0.4, 1.4, 2.7), look: V(1.5, 1.1, 0) },
  two: { pos: V(0, 1.6, 3.4), look: V(0, 1.05, 0) },
  laptop: { pos: V(-2.7, 1.85, 1.7), look: V(-0.5, 0.95, 0) },
  board: { pos: V(0.1, 1.7, 1.8), look: V(0.1, 1.75, -3.4) },
  door: { pos: V(2.5, 1.6, 4.2), look: V(4.5, 1.1, 0.8) },
  shake: { pos: V(0.2, 1.45, 3.4), look: V(0, 1.15, 0.9) },
};

// ---------- Round 1: build a prompt (options reshuffle and get trickier each loop) ----------
function promptSlots(loop) {
  const slots = [
    { label: 'GOAL', options: [
      { t: 'Write a Python function that returns the emails that appear more than once in a list.', ok: true, plain: 'Says exactly what to build and what it should give back.' },
      { t: 'Write some code.', plain: 'Too vague. Code for what?' },
      { t: 'Make it good and fast and amazing.', plain: 'Feelings, not instructions.' },
    ] },
    { label: 'CONTEXT', options: [
      { t: 'The list comes from our signup form. Some people typed their email twice, with different capitals or extra spaces.', ok: true, plain: 'Explains the real situation, so the AI handles messy emails.' },
      { t: 'You are the best programmer in the world.', plain: 'Flattery. Tells the AI nothing about the problem.' },
      { t: 'It is Thursday.', plain: 'True, but useless.' },
    ] },
    { label: 'RULES', options: [
      { t: 'Treat "Ana@X.com " and "ana@x.com" as the same email. Return them sorted.', ok: true, plain: 'Clear rules the answer must follow.' },
      { t: 'No rules, surprise me.', plain: 'You will be surprised. Not in a good way.' },
      { t: 'Use as many lines as possible.', plain: 'Longer code is not better code.' },
    ] },
    { label: 'EXAMPLE', options: [
      { t: 'Input: ["a@x.com", "A@x.com ", "b@x.com"] → Output: ["a@x.com"]', ok: true, plain: 'Shows exactly what right looks like.' },
      { t: 'You know what I mean.', plain: 'It does not.' },
      { t: 'Example: see attached (nothing is attached).', plain: 'An example that does not exist.' },
    ] },
  ];
  // Later loops: a tempting buzzword option appears in every slot.
  if (loop >= 1) {
    const traps = ['Use AI to make an AI-powered email AI.', 'Act as a 10x senior staff engineer ninja.', 'Follow industry best practices.', 'Example: something good.'];
    slots.forEach((s, i) => s.options.push({ t: traps[i], plain: 'Sounds smart. Says nothing.' }));
  }
  return slots;
}
const BAD_OUTPUT = {
  GOAL: 'ECHO wrote a to-do list app. Nobody asked for a to-do list app.',
  CONTEXT: "ECHO's code thinks \"Ana@X.com\" and \"ana@x.com\" are different people. The duplicates sneak through.",
  RULES: 'ECHO returned the duplicates in random order, with spaces still attached.',
  EXAMPLE: 'ECHO guessed the output format. It guessed wrong.',
};

// ---------- Round 2: explain the code ECHO wrote ----------
const CODE = [
  'def find_duplicates(emails):',
  '    seen = set()',
  '    dupes = set()',
  '    for email in emails:',
  '        e = email.strip().lower()',
  '        if e in seen:',
  '            dupes.add(e)',
  '        seen.add(e)',
  '    return sorted(dupes)',
];
const QUESTIONS = [
  { q: 'What does "email.strip().lower()" do?', options: [
    { t: 'Tidies each email: removes extra spaces and makes it lowercase, so "Ana@X.com " matches "ana@x.com".', ok: true },
    { t: 'Deletes the email from the list.' },
    { t: 'Sends a welcome email.' },
  ] },
  { q: 'What is "seen" used for?', options: [
    { t: 'It remembers every email already checked, so a repeat can be spotted.', ok: true },
    { t: 'It stores the duplicates to email them later.' },
    { t: 'It counts how many people signed up.' },
  ] },
  { q: 'What does the function give back?', options: [
    { t: 'A sorted list of the emails that appear more than once.', ok: true },
    { t: 'The number of users.' },
    { t: 'The list with all duplicates deleted.' },
  ] },
];

// ---------- Round 3: system design for a million signups ----------
function designSlots(loop) {
  const slots = [
    { label: 'THE FRONT DOOR', hint: '1,000,000 people arrive at once. Who greets them?', options: [
      { t: 'Load balancer → many servers', ok: true, plain: 'A restaurant host seating guests across many tables.' },
      { t: 'One really big server', plain: 'One waiter for a whole stadium.', melt: 'The single server melts at ~5,000 users.' },
      { t: 'Ask people to come back tomorrow', plain: 'A great way to lose a million customers.', melt: 'Everyone leaves. Launch day over.' },
    ] },
    { label: 'THE SAME QUESTION, A MILLION TIMES', hint: 'Everyone loads the same signup page.', options: [
      { t: 'Cache the page', ok: true, plain: 'Keep the popular dish ready at the counter.' },
      { t: 'Ask the database every single time', plain: 'Running to the warehouse for every napkin.', melt: 'The database chokes at ~20,000 page loads.' },
      { t: 'Print the page and mail it', plain: 'Very retro. Very slow.', melt: 'The post office has questions.' },
    ] },
    { label: 'THE SLOW WORK', hint: 'Every new user gets a welcome email. Emails are slow.', options: [
      { t: 'Put emails in a queue', ok: true, plain: 'Take a ticket. We will call you. Nobody waits at the counter.' },
      { t: 'Send each email while the user waits', plain: 'Every signup stalls until the email leaves.', melt: 'Signups stall for 9 seconds each. People give up.' },
      { t: 'Skip emails entirely', plain: 'Nobody knows their account exists.', melt: 'Nobody can confirm their account.' },
    ] },
  ];
  if (loop >= 1) {
    slots[0].options.push({ t: 'Blockchain-based quantum router', plain: 'Buzzwords are not architecture.', melt: 'Nobody, including you, knows what this does.' });
    slots[2].options.push({ t: 'AI that writes emails faster', plain: 'Speeds up writing, not sending.', melt: 'The emails are beautifully written. And still stuck.' });
  }
  return slots;
}

export default {
  id: 'ch2',
  num: 2,
  title: 'The Interview',
  day: 'THU',
  start: 600,  // 10:00
  end: 660,    // 11:00
  rate: 0.3,
  ranks: [150, 240, 360, 540],
  winLine: '✓ offer signed',
  timeoutEnding: 'interviewTimeout',
  orbit: { x: OX, z: -0.5 },

  dex: {
    prompt: { name: 'Prompt', simple: 'The instructions you give an AI. Vague order, weird meal.', real: 'Goal + context + rules + an example gets far better AI answers.' },
    function: { name: 'Function', simple: 'A reusable recipe: give it ingredients (inputs), get a dish back (output).', real: 'Most code is functions calling other functions.' },
    ownership: { name: 'Code ownership', simple: 'If you ship it, you own it. Even if an AI wrote it.', real: 'Interviewers now ask candidates to explain AI-written code line by line.' },
    sysdesign: { name: 'System design', simple: 'Deciding which parts handle the traffic, like planning a restaurant for its busiest night.', real: 'A standard interview round for engineers.' },
    loadbalancer: { name: 'Load balancer', simple: 'A host who spreads guests across many tables (servers).', real: 'Every big website sits behind one.' },
    cache: { name: 'Cache', simple: 'Keeping popular things ready nearby instead of fetching them every time.', real: 'Caches make most of the web feel fast.' },
    queue: { name: 'Queue', simple: 'A ticket line: take a number, the work gets done in the background.', real: 'Emails, payments and uploads usually go through queues.' },
  },

  endings: {
    copyPaste: { title: 'Copy-Paste Candidate', text: '"No idea what it does. ECHO wrote it." Honest. Also the end of the interview.', lesson: 'If AI writes it, you still own it. Understand every line you ship.' },
    earpiece: { title: 'Secret Earpiece', text: 'ECHO whispered every answer through your earbud. Morgan heard every word. So did the recording.', lesson: 'Using AI is fine. Hiding it is not. Be open about your tools.' },
    buzzword: { title: 'Buzzword Bingo', text: '"An AI-native, blockchain-enabled, 10x synergy engineer." Morgan wrote one word in the notes: no.', lesson: 'Specifics beat buzzwords. Say what you actually did.' },
    interviewTimeout: { title: '11:00', text: "Morgan's next candidate knocks on the glass. You never finished the whiteboard.", lesson: 'Interviews are timed too. Decide, then move.' },
  },

  reset({ g, S }) {
    const { chairs } = g.room;
    chairs.you.position.x = OX - 1.6;
    S.stix.g.position.set(OX - 7, 0, 0); S.stix.face(1); S.stix.setPose('stand'); S.stix.typing = false;
    S.morgan.g.position.set(OX + 1.6, 0, 0); S.morgan.face(-1); S.morgan.setPose('sit'); S.morgan.typing = false;
    g.cam.cut(SHOTS.far);
  },

  async play(c) {
    const { g, S, cam, ui, say, sfx, me, ME, run, day, timed, spend, dex, seen, slotPuzzle, quizPuzzle, Fail, tween, sleep, ease } = c;
    const L = run.loop;
    const M = 'MORGAN';

    // ---------- intro ----------
    ui.letterbox(true);
    cam.cut(SHOTS.far);
    const dolly = cam.go(SHOTS.wide, 3.4);
    await ui.caption('THURSDAY · 10:00', L ? `LOOP #${L + 1}` : 'CHAPTER 2 — THE INTERVIEW', 2.8);
    await dolly;

    const walkIn = S.stix.walkTo(OX - 1.6, 1.6);
    if (L === 0) {
      await say(ME(), 'Fixed the outage. Got laid off anyway. "Budget reasons."');
      await say('ECHO', 'Silver lining: I found you an interview. Glasshouse AI. They let candidates use AI... and watch HOW they use it.');
    } else {
      await say(ME(), L === 1 ? 'This hallway again. Same interview. Same Morgan.' : 'Interview, take ' + (L + 1) + '.');
      await say('ECHO', `Loop #${L + 1}. Notes kept: ${run.clues.size} clue${run.clues.size === 1 ? '' : 's'}.`);
    }
    await walkIn;
    await S.stix.pose('sit', 0.5);
    await cam.go(SHOTS.them, 1.2);
    S.morgan.pose('talkSit');
    await say(M, `Hi ${me()}, I'm Morgan. Three rounds today: a prompt, some code, a design. You can use your AI assistant. Out loud.`);
    if (run.last === 'earpiece') await say(M, 'Oh, and no earbuds today, please. We had a candidate... recently.');
    S.morgan.pose('sit');
    ui.letterbox(false);

    // ---------- Round 1: prompt ----------
    await say(M, 'Round one. Our signup list has duplicate emails. Get your AI to write a function that finds them.');
    if (!seen('prompt')) {
      await say('ECHO', 'A PROMPT is the instructions you give an AI. Vague order, weird meal. Give me a goal, context, rules and an example, and I will nail it.', true);
      dex('prompt');
    }
    await cam.go(SHOTS.laptop, 0.9);
    let reused = false;
    if (run.clues.has('prompt')) {
      reused = (await timed(ui.choose([
        { id: 'reuse', label: 'Use the prompt that worked last time' },
        { id: 'build', label: 'Build it again from scratch' },
      ]))) === 'reuse';
    }
    if (!reused) {
      await timed(slotPuzzle({
        head: 'prompt.txt · to: ECHO',
        task: 'Build a prompt: pick one line for each part, then send it.',
        slots: promptSlots(L),
        submitLabel: 'Send to ECHO ▸',
        penalty: 4 + 2 * L,
        onWrong: slot => `<b>ECHO's output:</b> ${BAD_OUTPUT[slot.label]} <br><b>ECHO:</b> Something in <b>${slot.label}</b> confused me.`,
        mercy: '<b>ECHO:</b> Hint: pick the lines that are <b>specific</b>. Flattery and vibes do not help me.',
        solvedMsg: '<b>ECHO:</b> Crystal clear. Writing it now...',
      }));
    }
    run.clues.add('prompt');
    S.stix.typing = true;
    await say('ECHO', 'Done. Nine lines. I even handled the capital letters.');
    S.stix.typing = false;

    // ---------- Round 2: explain the code ----------
    await cam.go(SHOTS.them, 0.8);
    S.morgan.pose('talkSit');
    await say(M, 'Nice. Now, ECHO wrote this. Walk me through it.');
    S.morgan.pose('sit');
    if (!seen('function')) {
      await say('ECHO', 'This is a FUNCTION: a reusable recipe. Ingredients go in (a list of emails), a dish comes out (the duplicates).', true);
      dex('function');
    }
    const picks = [0, 1, 2].filter(i => i !== L % 3).slice(0, 2); // two of three questions, rotating each loop
    const answered = await timed(quizPuzzle({
      head: 'find_duplicates.py · written by ECHO',
      code: CODE,
      questions: picks.map(i => QUESTIONS[i]),
      escape: 'No idea. ECHO wrote it.',
      penalty: 4 + 2 * L,
      wrongMsg: "<b>MORGAN:</b> Hm. Are you sure? <b>ECHO</b> (quietly): read that line again, slowly.",
    }));
    if (answered === 'escape') await copyPaste();
    if (!seen('ownership')) {
      await say('ECHO', "Good. Here's the rule: if you ship it, you OWN it. Even if I wrote it.", true);
      dex('ownership');
    }

    // ---------- Break: Morgan steps out ----------
    await cam.go(SHOTS.two, 0.8);
    await say(M, "Great. I'll grab our design lead. Back in two minutes.");
    S.morgan.pose('stand', 0.4);
    cam.go(SHOTS.door, 1.4);
    await S.morgan.walkTo(OX + 6.5, 1.8);
    const brk = await timed(ui.choose([
      { id: 'practice', label: 'Sketch some ideas on the whiteboard' },
      { id: 'notes', label: "Peek at Morgan's notes on the table" },
      { id: 'earpiece', label: 'Slip in an earbud so ECHO can whisper answers' },
    ]));
    run.last = brk;
    if (brk === 'notes') {
      spend(3);
      await say(ME(), 'Morgan\'s notes: "Good prompt. Watch round 3: do they know what a QUEUE is?"');
      run.clues.add('designHint');
      ui.toast('CLUE · Morgan cares about queues');
    } else if (brk === 'practice') {
      await say(ME(), 'Okay. A million users. Where does it break first?');
    } else {
      await say('ECHO', '(whispering) Testing, testing... can you hear me?');
    }

    cam.go(SHOTS.two, 1.4);
    S.morgan.face(-1);
    await S.morgan.walkTo(OX + 1.6, 1.8);
    S.morgan.face(-1);
    await S.morgan.pose('sit', 0.5);
    if (brk === 'earpiece') await earpiece();

    // ---------- Round 3: system design ----------
    await say(M, 'Round three. Design our signup system. One million people sign up on launch day.');
    if (!seen('sysdesign')) {
      await say('ECHO', 'SYSTEM DESIGN = deciding which parts handle the traffic. Think of a restaurant on its busiest night: the door, the kitchen, the slow orders.', true);
      dex('sysdesign');
    }
    if (run.clues.has('designHint')) await say('ECHO', '(You read the notes. Morgan cares about queues.)');
    await cam.go(SHOTS.board, 0.9);
    let drew = false;
    if (run.clues.has('design')) {
      drew = (await timed(ui.choose([
        { id: 'draw', label: 'Draw the design that held up last time' },
        { id: 'build', label: 'Work it out again' },
      ]))) === 'draw';
    }
    if (!drew) {
      await timed(slotPuzzle({
        head: 'whiteboard · signup system · launch day: 1,000,000 users',
        task: 'Pick one piece for each part of the system, then run the launch-day test.',
        slots: designSlots(L),
        submitLabel: 'Run launch day ▸',
        penalty: 5 + 2 * L,
        onWrong: (slot, opt) => `<b>LAUNCH DAY:</b> ✗ ${opt.melt ?? 'It breaks.'} <br><b>MORGAN:</b> Where would you change <b>${slot.label.toLowerCase()}</b>?`,
        mercy: '<b>ECHO:</b> Hint: think restaurant. A <b>host</b> at the door, food <b>ready at the counter</b>, and <b>tickets</b> for slow orders.',
        solvedMsg: '<b>LAUNCH DAY:</b> ✓ 1,000,000 signups. Nothing melted.',
      }));
    }
    run.clues.add('design');
    for (const id of ['loadbalancer', 'cache', 'queue']) dex(id);
    await cam.go(SHOTS.them, 0.8);
    S.morgan.pose('nodSit');
    await say(M, drew ? 'You drew that like you had seen it before.' : 'Load balancer, cache, queue. Solid.');

    // ---------- Final question ----------
    S.morgan.pose('talkSit');
    await say(M, 'Last question. Why should we hire you?');
    S.morgan.pose('sit');
    const opts = [
      { id: 'honest', label: 'I use AI to go faster, and I check its work. Today I caught its mistakes and I can explain every line.' },
      { id: 'buzz', label: "I'm an AI-native, blockchain-enabled, 10x synergy engineer." },
    ];
    if (L >= 1) opts.push({ id: 'ego', label: "Honestly? I don't need AI. I'm better than it." });
    if (L % 2) opts.reverse(); // the honest answer isn't always first
    const why = await timed(ui.choose(opts));
    if (why !== 'honest') await buzzword(why);
    await victory();

    // ---------- scenes ----------
    async function copyPaste() {
      ui.closePanel();
      await cam.go(SHOTS.them, 0.6);
      await say(ME(), 'No idea what it does. ECHO wrote it.');
      S.morgan.pose('nodSit');
      await say(M, '...Right. Thanks for coming in.');
      throw new Fail('copyPaste');
    }

    async function earpiece() {
      await cam.go(SHOTS.them, 0.6);
      await say('ECHO', '(whispering, much too loudly) OKAY SO FOR ROUND THREE SAY "LOAD BALANCER"');
      ui.letterbox(true);
      g.timeScale = 0.4;
      cam.shake(0.2);
      S.morgan.pose('point', 0.4);
      await sleep(0.6);
      g.timeScale = 1;
      await say(M, 'Is that... an earbud?');
      throw new Fail('earpiece');
    }

    async function buzzword(kind) {
      await say(ME(), kind === 'ego' ? "I don't need AI. I'm better than it." : 'An AI-native, blockchain-enabled, 10x synergy engineer.');
      S.morgan.pose('nodSit');
      await say(M, kind === 'ego' ? 'Interesting. Our whole team uses AI every day.' : '...Could you say that in normal words?');
      await say(M, "We'll be in touch.");
      throw new Fail('buzzword');
    }

    async function victory() {
      ui.quiet();
      ui.flash();
      sfx.good();
      await say(M, 'Honestly? That was the best answer today.');
      // Both stand for a handshake; hero moment with a slow orbit.
      ui.letterbox(true);
      tween(0.6, k => { g.room.chairs.you.position.x = OX - 1.6 - k * 0.9; }, ease.outCubic);
      S.morgan.pose('stand', 0.5);
      await S.stix.pose('stand', 0.5);
      // Cut to the two of you in front of the table (the flash hides the jump).
      ui.flash();
      S.stix.g.position.set(OX - 0.5, 0, 0.9); S.stix.face(1);
      S.morgan.g.position.set(OX + 0.5, 0, 0.9); S.morgan.face(-1);
      cam.cut(SHOTS.shake);
      S.stix.pose('handshake', 0.3);
      await S.morgan.pose('handshake', 0.3);
      await say(M, `Welcome to Glasshouse, ${me()}.`);
      ui.quiet();

      g.timeScale = 0.6;
      const at = V(-0.5, 1.25, 0.9);
      const spin = tween(3, k => {
        const a = -0.6 + k * 1.2;
        cam.pos.set(at.x + Math.sin(a) * 2.6, at.y + 0.1, at.z + Math.cos(a) * 2.6);
        cam.look.copy(at);
      });
      await sleep(0.4);
      S.stix.shades.visible = true;
      S.stix.showScarf(true);
      sfx.hit();
      cam.shake(0.06);
      await S.stix.pose('cool', 0.45);
      await spin;
      g.timeScale = 1;
      await say('ECHO', "Loop closed. Funny... I feel like I've seen this company's future before.");
    }
  },
};
