/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * The story engine: title screen, chapter select, the time loop (fail → REBASE → retry),
 * shared puzzle types, scoring. Each chapter lives in its own file and is written as an
 * async script: every `await` is a beat (a line of dialogue, a camera move, a puzzle).
 */
import { tween, sleep, ease } from './anim.js';
import * as ui from './ui.js';
import ch1 from './ch1.js';
import ch2 from './ch2.js';

const CHAPTERS = [ch1, ch2];
const { say, sfx, esc } = ui;
const me = () => ui.settings.name || 'Stix'; // the player's name (default: Stix)
const ME = () => me().toUpperCase();

// A failed day. Thrown anywhere in a chapter, caught by the loop runner → REBASE.
class Fail extends Error {
  constructor(id) { super(id); this.id = id; }
}

// ---------- Dev Dex & fail endings, gathered from every chapter ----------
const DEX = {
  ai: { name: 'AI assistant', simple: 'A program that writes and explains code when you ask it.', real: 'AI now writes a big share of new code. Engineers review it.' },
  rebase: { name: 'Rebase', simple: 'Rewind to a save point and replay with what you now know.', real: 'In git, rebase replays your changes on top of a new starting point.' },
  ...Object.assign({}, ...CHAPTERS.map(ch => ch.dex)),
};
const ENDINGS = Object.assign({}, ...CHAPTERS.map(ch => Object.fromEntries(Object.entries(ch.endings).map(([id, e]) => [id, { ...e, ch }]))));

const fmtClock = ui.fmtClock;
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

// =====================================================================
export async function play(g) {
  const { cam, cast: S, world } = g;

  // Memory that survives REBASE (per run) and forever (saved in g.mem).
  const run = { loop: 0, clues: new Set(), hints: 0, time: 0, last: null, fails: [] };
  const day = { min: 540, timing: false };
  let ch = ch1; // the chapter being played
  let doom, doomReject;

  // Day clock + run timer only tick while the player is acting (not while being taught).
  g.hooks.push(real => {
    if (day.timing) {
      run.time += real;
      day.min += real * ch.rate * (1 + 0.25 * run.loop); // later loops: the day runs faster
      if (ui.settings.storyMode) run.storyUsed = true;
      if (day.min >= ch.end) timeUp();
    }
    ui.hud(day, run, ch.day);
    world.setClock(day.min);
    g.room.setClock(day.min);
  });

  // Slow orbit behind the title screen.
  let orbit = false, orbitAngle = 0;
  g.hooks.push(real => {
    if (!orbit) return;
    orbitAngle += real * 0.07;
    cam.pos.set(Math.sin(orbitAngle) * 9, 3.4, Math.cos(orbitAngle) * 9 - 1);
    cam.look.set(0, 0.8, -1);
  });

  function timeUp() {
    if (ui.settings.storyMode) { day.min = ch.end - 1; return; } // story mode: the day never runs out
    day.min = ch.end;
    day.timing = false;
    doomReject?.(new Fail(ch.timeoutEnding));
  }
  // Run a player decision against the clock. Rejects if the day runs out first.
  async function timed(promise) {
    day.timing = true;
    try { return await Promise.race([promise, doom]); }
    finally { day.timing = false; }
  }
  function spend(minutes) {
    day.min += minutes;
    ui.toast(`−${minutes} min`);
    if (day.min >= ch.end) timeUp();
  }
  function dex(id) {
    if (g.mem.dex.includes(id)) return;
    g.mem.dex.push(id);
    g.save();
    ui.toast(`+ DEV DEX · ${DEX[id].name}`);
  }
  const seen = id => g.mem.dex.includes(id);

  // Adds an "Explain simply" button that reveals plain-English notes (counts as a hint).
  function hintButton(P) {
    const hint = document.createElement('button');
    hint.className = 'btn';
    hint.textContent = 'Explain simply (counts as a hint)';
    hint.onclick = () => { P.explain(); run.hints++; hint.disabled = true; sfx.click(); };
    P.foot.append(hint);
  }
  function wrongFx(el) {
    el.classList.remove('tried'); void el.offsetWidth; el.classList.add('tried');
    sfx.bad();
    cam.shake(0.08);
  }

  // ---------- puzzle type 1: click the right line (logs, diffs) ----------
  function clickPuzzle({ head, task, lines, penalty = 0, onWrong, nearMsg, mercy, solvedMsg, strike = false }) {
    return new Promise(resolve => {
      const P = ui.openPanel(head, task);
      let misses = 0, solved = false;
      for (const l of lines) {
        const el = document.createElement(l.static ? 'div' : 'button');
        el.className = `line${l.static ? ' static' : ''}${l.err ? ' err' : ''}`;
        el.innerHTML = `<span>${esc(l.text)}</span>${l.plain ? `<span class="plain">${esc(l.plain)}</span>` : ''}`;
        if (!l.static) el.onclick = () => {
          if (solved) return;
          if (l.kind === 'answer') {
            solved = true;
            el.classList.add('right');
            if (strike) el.classList.add('strike');
            sfx.good();
            P.status(solvedMsg);
            setTimeout(() => { ui.closePanel(); resolve(); }, 1100);
            return;
          }
          if (l.kind === 'near') { sfx.click(); P.status(nearMsg); return; }
          misses++;
          wrongFx(el);
          if (penalty) spend(penalty);
          P.status(misses >= 3 && mercy ? mercy : onWrong(l));
        };
        P.body.append(el);
      }
      if (lines.some(l => l.plain)) hintButton(P);
      P.status('&nbsp;');
    });
  }

  // ---------- puzzle type 2: pick one option per slot, then submit (prompts, designs) ----------
  function slotPuzzle({ head, task, slots, submitLabel, penalty = 0, onWrong, mercy, solvedMsg }) {
    return new Promise(resolve => {
      const P = ui.openPanel(head, task);
      const chosen = slots.map(() => null);
      let misses = 0, done = false;
      slots.forEach((slot, i) => {
        const box = document.createElement('div');
        box.className = 'slot';
        box.innerHTML = `<div class="slot-label">${i + 1}. ${esc(slot.label)}${slot.hint ? `<small>${esc(slot.hint)}</small>` : ''}</div>`;
        const opts = document.createElement('div');
        opts.className = 'opts';
        for (const opt of shuffle(slot.options)) {
          const b = document.createElement('button');
          b.className = 'opt';
          b.innerHTML = `<span>${esc(opt.t)}</span>${opt.plain ? `<span class="plain">${esc(opt.plain)}</span>` : ''}`;
          b.onclick = () => {
            if (done) return;
            chosen[i] = opt;
            opts.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', o === b));
            sfx.click();
            submit.disabled = chosen.includes(null);
          };
          opts.append(b);
        }
        box.append(opts);
        P.body.append(box);
      });
      const submit = document.createElement('button');
      submit.className = 'btn submit';
      submit.textContent = submitLabel;
      submit.disabled = true;
      submit.onclick = () => {
        if (done) return;
        const bad = chosen.findIndex(o => !o.ok);
        if (bad < 0) {
          done = true;
          sfx.good();
          P.status(solvedMsg);
          setTimeout(() => { ui.closePanel(); resolve(); }, 1300);
          return;
        }
        misses++;
        wrongFx(P.body.querySelectorAll('.slot')[bad]);
        if (penalty) spend(penalty);
        P.status(misses >= 3 && mercy ? mercy : onWrong(slots[bad], chosen[bad]));
      };
      P.foot.prepend(submit);
      if (slots.some(s => s.options.some(o => o.plain))) hintButton(P);
      P.status('&nbsp;');
    });
  }

  // ---------- puzzle type 3: answer questions about a piece of code ----------
  function quizPuzzle({ head, code, questions, escape, penalty = 0, wrongMsg }) {
    return new Promise(resolve => {
      let qi = 0;
      const P = ui.openPanel(head, '');
      const pre = document.createElement('pre');
      pre.className = 'code';
      pre.textContent = code.join('\n');
      const area = document.createElement('div');
      area.className = 'quiz-opts';
      P.body.append(pre, area);
      const task = document.getElementById('panel-task');
      const ask = () => {
        const q = questions[qi];
        task.textContent = `Question ${qi + 1} of ${questions.length}: ${q.q}`;
        area.innerHTML = '';
        const options = [...shuffle(q.options), { t: escape, escape: true }];
        options.forEach((opt, n) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.innerHTML = `<kbd>${String.fromCharCode(65 + n)}</kbd><span>${esc(opt.t)}</span>`;
          b.onclick = () => {
            if (opt.escape) { ui.closePanel(); resolve('escape'); return; }
            if (opt.ok) {
              b.classList.add('sel');
              sfx.good();
              P.status('<b>MORGAN:</b> Mm-hm. Correct.');
              qi++;
              setTimeout(() => (qi < questions.length ? ask() : (ui.closePanel(), resolve('done'))), 900);
              return;
            }
            wrongFx(b);
            if (penalty) spend(penalty);
            P.status(wrongMsg);
          };
          area.append(b);
        });
        P.status('&nbsp;');
      };
      ask();
    });
  }

  // Everything a chapter script needs.
  const c = {
    g, S, cam, world, ui, say, sfx, esc, me, ME, run, day,
    timed, spend, dex, seen, clickPuzzle, slotPuzzle, quizPuzzle, Fail, tween, sleep, ease,
  };

  // ---------- fail → REBASE → retry ----------
  async function failEnding(id) {
    const e = ENDINGS[id];
    run.fails.push(id);
    if (!g.mem.endings.includes(id)) { g.mem.endings.push(id); g.save(); }
    sfx.bad();
    await ui.card(`<div class="fail">
      <div class="kicker">MERGE CONFLICT</div>
      <h2>FAILED</h2>
      <div class="ending">ENDING · ${esc(e.title)}</div>
      <p>${esc(e.text)}</p>
      ${run.damage ? `<p>Damage: $${run.damage.toLocaleString()}</p>` : ''}
      <p class="lesson">${esc(e.lesson)}</p>
      <p><small>Fail endings found: ${g.mem.endings.length}/${Object.keys(ENDINGS).length}</small></p>
    </div>`, [['rebase', 'git rebase ↺']], { dark: true });
    run.damage = 0;
  }

  async function rebase() {
    ui.letterbox(true);
    ui.invert(true);
    sfx.rewind();
    cam.shake(0.25);
    const from = day.min;
    world.rewindStart(); // anything smashed flies back into place
    await tween(1.6, k => { day.min = from + (ch.start - from) * k; world.rewindTo(k); }, ease.inOutCubic);
    if (!seen('rebase')) dex('rebase');
    await ui.terminal([
      `$ git rebase --onto ${fmtClock(ch.start)}`,
      `REBASING... loop #${run.loop + 2}`,
      `✓ memory preserved (${run.clues.size} clue${run.clues.size === 1 ? '' : 's'})`,
    ]);
    ui.invert(false);
  }

  function resetDay() {
    day.min = ch.start;
    day.timing = false;
    g.timeScale = 1;
    S.stix.shades.visible = false;
    S.stix.showScarf(false);
    ch.reset(c);
  }

  async function runChapter() {
    ui.hudShow(true);
    ui.allowSkip(true);
    ui.allowPause(true);
    for (;;) {
      resetDay();
      doom = new Promise((_, reject) => { doomReject = reject; });
      doom.catch(() => {}); // handled through Promise.race
      try {
        await ch.play(c);
        return results();
      } catch (err) {
        if (!(err instanceof Fail)) throw err;
        day.timing = false;
        g.timeScale = 1;
        ui.closeAll();
        await failEnding(err.id);
        await rebase();
        run.loop++;
      }
    }
  }

  async function results() {
    ui.quiet();
    ui.letterbox(false);
    ui.allowSkip(false);
    ui.allowPause(false);
    if (!g.mem.cleared.includes(ch.id)) { g.mem.cleared.push(ch.id); g.save(); }
    const story = run.storyUsed || ui.settings.storyMode;
    const score = run.time + run.loop * 30 + run.hints * 20;
    const [s, a, b, cc] = ch.ranks;
    const rank = story ? '—' : score <= s ? 'S' : score <= a ? 'A' : score <= b ? 'B' : score <= cc ? 'C' : 'D';
    const best = g.mem.best[ch.id];
    const isBest = !story && (!best || score < best.score);
    if (isBest) { g.mem.best[ch.id] = { score, rank, time: run.time }; g.save(); }
    const trail = [...run.fails.map(() => '✗'), '✓'].join(' ');
    const share = `REBASE · Ch.${ch.num} ${ch.title} · ${me()}\n${story ? 'Story mode' : `⏱ ${ui.fmtRun(run.time)} · ↺ ${run.loop} · hints ${run.hints} · Rank ${rank}`}\n${trail}\nShraSquad Productions`;
    const next = CHAPTERS[CHAPTERS.indexOf(ch) + 1];

    const picked = ui.card(`<div class="results">
      <div class="kicker">CHAPTER ${ch.num} — ${esc(ch.title.toUpperCase())}</div>
      <h2>${esc(ch.winLine)}</h2>
      <table>
        <tr><td>⏱ Time</td><td>${ui.fmtRun(run.time)}</td></tr>
        <tr><td>↺ Loops reset</td><td>${run.loop}</td></tr>
        <tr><td>Hints used</td><td>${run.hints}</td></tr>
        <tr><td>Dev Dex</td><td>${g.mem.dex.length}/${Object.keys(DEX).length}</td></tr>
        <tr><td>Run</td><td>${trail}</td></tr>
      </table>
      <div class="rank">RANK <b>${rank}</b></div>
      <p>${story ? 'Story mode run (unranked)' : isBest ? 'NEW PERSONAL BEST' : `Best: ${best.rank} · ${ui.fmtRun(best.time)}`}</p>
      <button id="share" class="btn">Copy result to share</button>
      ${next ? '' : `<p class="soon">Chapter ${ch.num + 1} — coming soon</p>`}
    </div>`, [
      ...(next ? [['next', `Next: Chapter ${next.num} — ${esc(next.title)}`]] : []),
      ['again', 'Play again'],
      ['title', 'Title screen'],
    ]);
    const btn = document.getElementById('share');
    btn.onclick = async () => {
      try { await navigator.clipboard.writeText(share); btn.textContent = 'Copied ✓'; }
      catch {
        btn.textContent = 'Copy blocked. Text selected below: press Cmd/Ctrl+C.';
        const pre = document.createElement('pre');
        pre.className = 'share';
        pre.textContent = share;
        btn.after(pre);
        getSelection().selectAllChildren(pre);
      }
    };
    const choice = await picked;
    if (choice === 'next') { ch = next; return 'again'; }
    return choice;
  }

  // ---------- title, briefing, chapter select, git log ----------
  const titleHtml = () => `<div class="title">
    <div class="studio">SHRASQUAD PRODUCTIONS PRESENTS</div>
    <h1>REBASE</h1>
    <p class="tag">Rewrite history. Ship your future.</p>
    ${CHAPTERS.filter(x => g.mem.best[x.id]).map(x => `<p class="best">Ch.${x.num} best: Rank ${g.mem.best[x.id].rank} · ${ui.fmtRun(g.mem.best[x.id].time)}</p>`).join('')}
    <p class="copyright">© 2026 ShraSquad Productions. All rights reserved.</p>
  </div>`;

  const briefHtml = () => `<div class="brief">
    <div class="kicker">BRIEFING</div>
    <h2>You are ${esc(me())}.</h2>
    <p>A junior software engineer in 2026, the year AI writes half the code. Production breaks,
    layoffs loom, interviews wait, and your AI pair-programmer ECHO is helpful. Mostly.</p>
    <div class="rules">
      <div><b>↺ The loop</b>Each chapter is one day. Fail it and ECHO rewinds time: a REBASE. You keep every clue you found.</div>
      <div><b>⏱ The clock</b>The timer only runs while you act. Reading and learning is always free.</div>
      <div><b>✎ No coding needed</b>ECHO explains every tech word in plain English. Collect them all in the Dev Dex.</div>
      <div><b>⚡ Harder each retry</b>The day fights back. But every clue unlocks a shortcut. Smarter beats faster.</div>
      <div><b>☠ Bad days happen</b>Fail spectacularly. Every fail ending is collectible. Yes, you can flip the desk.</div>
    </div>
    <p class="controls">Click / Space: continue · 1–5: choose · S: skip scene · Esc: pause · M: sound</p>
  </div>`;

  const chapterHtml = () => `<div class="chapters">
    <h2>Choose a chapter</h2>
    ${CHAPTERS.map(x => `<p>Ch.${x.num} · ${esc(x.title)} ${g.mem.cleared.includes(x.id) ? '✓' : ''}</p>`).join('')}
    <p class="soon">Chapters 3–6 coming soon</p>
  </div>`;
  const unlocked = () => CHAPTERS.filter((x, i) => i === 0 || g.mem.cleared.includes(CHAPTERS[i - 1].id));

  const gitLogHtml = () => `<div class="gitlog">
    <h2>$ git log</h2>
    <h3>Dev Dex (${g.mem.dex.length}/${Object.keys(DEX).length})</h3>
    ${Object.entries(DEX).map(([id, d]) => g.mem.dex.includes(id)
      ? `<div class="entry"><b>${esc(d.name)}</b>${esc(d.simple)}<small>Real world: ${esc(d.real)}</small></div>`
      : '<div class="entry locked"><b>???</b>Not discovered yet.</div>').join('')}
    <h3>Fail endings (${g.mem.endings.length}/${Object.keys(ENDINGS).length})</h3>
    ${Object.entries(ENDINGS).map(([id, e]) => g.mem.endings.includes(id)
      ? `<div class="entry"><b>${esc(e.title)}</b>${esc(e.lesson)}<small>Chapter ${e.ch.num}</small></div>`
      : `<div class="entry locked"><b>???</b>Not found yet.<small>Chapter ${e.ch.num}</small></div>`).join('')}
  </div>`;

  // ---------- main flow ----------
  ch = ch1;
  resetDay();
  orbit = true;
  await ui.splash();
  for (;;) {
    orbit = true;
    ui.hudShow(false);
    ui.letterbox(false);
    ch = ch1;
    resetDay();
    orbit = true;
    const pick = await ui.card(titleHtml(), [['new', 'New run'], ['how', 'How to play'], ['settings', 'Settings'], ['log', '$ git log · Dev Dex &amp; endings']], { glass: true });
    if (pick === 'settings') { await ui.openSettings(); continue; }
    if (pick === 'log') { await ui.card(gitLogHtml(), [['back', 'Back']], { glass: true }); continue; }
    if (pick === 'new' && !ui.settings.name) await ui.askName();
    if (pick === 'how' || (pick === 'new' && !g.mem.briefed)) {
      g.mem.briefed = true;
      g.save();
      const go = await ui.card(briefHtml(), pick === 'new' ? [['go', 'Start']] : [['back', 'Back']], { glass: true });
      if (go === 'back') continue;
    }
    const open = unlocked();
    if (open.length > 1) {
      const id = await ui.card(chapterHtml(), [...open.map(x => [x.id, `Chapter ${x.num} — ${esc(x.title)}`]), ['back', 'Back']], { glass: true });
      if (id === 'back') continue;
      ch = CHAPTERS.find(x => x.id === id);
    }
    orbit = false;
    for (;;) {
      Object.assign(run, { loop: 0, clues: new Set(), hints: 0, time: 0, last: null, fails: [], storyUsed: false, damage: 0 });
      if ((await runChapter()) !== 'again') break;
    }
  }
}
