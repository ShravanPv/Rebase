/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * Everything with words or buttons lives in HTML on top of the 3D canvas:
 * dialogue, choices, puzzle panels, QTE, HUD, full-screen cards, sound blips.
 */
const $ = id => document.getElementById(id);
const app = $('app');
const dlg = $('dialogue'), dlgName = $('dlg-name'), dlgText = $('dlg-text'), dlgNext = $('dlg-next');
const choicesEl = $('choices'), panel = $('panel'), qteEl = $('qte'), screenEl = $('screen');

export const wait = ms => new Promise(r => setTimeout(r, ms));
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- sound: tiny synth blips, no audio files ----------
let ac = null;
let muted = false;
try { muted = localStorage.getItem('rebase.muted') === '1'; } catch { /* storage blocked */ }

function tone(freq, seconds, type = 'square', vol = 0.04, slide = 0) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), now + seconds);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  o.connect(g).connect(ac.destination);
  o.start(now);
  o.stop(now + seconds);
}
export const sfx = {
  blip: () => tone(520 + Math.random() * 80, 0.03, 'square', 0.012),
  click: () => tone(900, 0.02, 'square', 0.02),
  alarm: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(880, 0.2, 'sawtooth', 0.035, -300), i * 280); },
  good: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.05), i * 90)),
  bad: () => tone(170, 0.35, 'sawtooth', 0.045, -80),
  hit: () => tone(90, 0.3, 'square', 0.06, -40),
  rewind: () => tone(1400, 1.2, 'sawtooth', 0.025, -1300),
};
function unlockAudio() {
  ac ??= new (window.AudioContext || window.webkitAudioContext)();
  ac.resume();
}
function setMuted(m) {
  muted = m;
  $('hud-mute').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  try { localStorage.setItem('rebase.muted', muted ? '1' : '0'); } catch { /* ignore */ }
}
$('hud-mute').onclick = e => { setMuted(!muted); e.currentTarget.blur(); }; // blur so Enter/Space don't re-toggle it
setMuted(muted);

// ---------- "advance": click, Enter or Space moves dialogue forward ----------
let advance = null;
function doAdvance() { const r = advance; advance = null; r?.(); }
const waitAdvance = () => new Promise(r => { advance = r; });
addEventListener('keydown', e => {
  if (e.repeat) return;
  if ((e.key === 'Enter' || e.key === ' ') && advance) { e.preventDefault(); doAdvance(); }
  if (e.key === 'm' || e.key === 'M') setMuted(!muted);
});
$('stage').addEventListener('pointerdown', doAdvance);
dlg.addEventListener('pointerdown', doAdvance);

// Things to tear down if a loop resets mid-puzzle.
const open = new Set();
export function closeAll() {
  for (const close of open) close();
  open.clear();
  advance = null;
  dlg.hidden = choicesEl.hidden = panel.hidden = qteEl.hidden = true;
}

// ---------- dialogue ----------
export async function say(name, text, teach = false) {
  choicesEl.hidden = true;
  dlg.hidden = false;
  dlg.classList.toggle('teach', teach);
  dlgName.textContent = name;
  dlgName.classList.toggle('teach', teach);
  dlgText.textContent = '';
  dlgNext.hidden = true;

  let skipped = false;
  const adv = waitAdvance();
  adv.then(() => { skipped = true; });
  for (let i = 1; i <= text.length && !skipped; i++) {
    dlgText.textContent = text.slice(0, i);
    if (i % 3 === 0 && text[i - 1] !== ' ') sfx.blip();
    await wait(16);
  }
  dlgText.textContent = text;
  dlgNext.hidden = false;
  await (skipped ? waitAdvance() : adv);
  sfx.click();
}
export const quiet = () => { dlg.hidden = true; };

// ---------- choices (keys 1–9 or click) ----------
export function choose(options) {
  quiet();
  return new Promise(resolve => {
    choicesEl.innerHTML = '';
    choicesEl.hidden = false;
    const close = () => { removeEventListener('keydown', onKey); choicesEl.hidden = true; open.delete(close); };
    const pick = id => { close(); sfx.click(); resolve(id); };
    const onKey = e => { const n = Number(e.key); if (n >= 1 && n <= options.length) pick(options[n - 1].id); };
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<kbd>${i + 1}</kbd>${esc(o.label)}`;
      b.onclick = () => pick(o.id);
      choicesEl.append(b);
    });
    addEventListener('keydown', onKey);
    open.add(close);
  });
}

// ---------- puzzle panel ----------
export function openPanel(head, task) {
  quiet();
  panel.hidden = false;
  panel.classList.remove('explain');
  $('panel-head').textContent = head;
  $('panel-task').textContent = task;
  const body = $('panel-body');
  body.innerHTML = '';
  const foot = $('panel-foot');
  foot.innerHTML = '<span id="panel-status"></span>';
  return {
    body,
    foot,
    status: html => { $('panel-status').innerHTML = html; },
    explain: () => panel.classList.add('explain'),
  };
}
export const closePanel = () => { panel.hidden = true; };

// ---------- quick-time event ----------
export function qte({ zone = 0.25, label = 'DEPLOY' } = {}) {
  return new Promise(resolve => {
    const center = 0.3 + Math.random() * 0.5;
    qteEl.hidden = false;
    qteEl.className = '';
    qteEl.innerHTML = `<div class="qte-label">${label} — press SPACE or tap when the needle is inside the box</div>
      <div class="qte-bar"><div class="qte-zone" style="left:${(center - zone / 2) * 100}%;width:${zone * 100}%"></div><div class="qte-needle"></div></div>`;
    const needle = qteEl.querySelector('.qte-needle');
    const t0 = performance.now();
    let p = 0, raf = 0, done = false;
    const tick = now => {
      p = (1 - Math.cos(((now - t0) / 1000) * 2.6)) / 2; // ping-pong 0→1→0
      needle.style.left = `${p * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = () => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('pointerdown', onTap); open.delete(stop); };
    const finish = ok => {
      if (done) return;
      done = true;
      stop();
      qteEl.classList.add(ok ? 'ok' : 'miss');
      setTimeout(() => { qteEl.hidden = true; resolve(ok); }, 450);
    };
    const onKey = e => { if (e.key === ' ') { e.preventDefault(); finish(Math.abs(p - center) <= zone / 2); } };
    const onTap = () => finish(Math.abs(p - center) <= zone / 2);
    addEventListener('keydown', onKey);
    setTimeout(() => addEventListener('pointerdown', onTap), 150); // ignore the click that opened it
    open.add(stop);
  });
}

// ---------- small effects ----------
export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  $('toasts').append(t);
  setTimeout(() => t.remove(), 3100);
}
export function flash() {
  const f = $('flash');
  f.classList.remove('on');
  void f.offsetWidth; // restart the CSS animation
  f.classList.add('on');
}
export function banner(text) {
  const b = $('banner');
  b.hidden = !text;
  if (text) b.textContent = text;
}
export const letterbox = on => app.classList.toggle('letterbox', on);
export async function caption(big, small, seconds = 2.5) {
  const c = $('caption');
  c.innerHTML = `<div class="big">${esc(big)}</div>${small ? `<div class="small"><span>${esc(small)}</span></div>` : ''}`;
  c.classList.add('on');
  await wait(seconds * 1000);
  c.classList.remove('on');
}

// ---------- HUD ----------
export const fmtRun = s => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60), cs = Math.floor((s * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
export const fmtClock = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
export const hudShow = on => { $('hud').hidden = !on; };
export function hud(day, run) {
  $('hud-day').textContent = `MON ${fmtClock(day.min)}`;
  $('hud-loop').textContent = `LOOP ${run.loop + 1}`;
  const r = $('hud-run');
  r.textContent = `⏱ ${fmtRun(run.time)}`;
  r.classList.toggle('live', day.timing);
}

// ---------- full-screen cards ----------
export async function splash() {
  screenEl.hidden = false;
  screenEl.className = 'dark';
  screenEl.innerHTML = `<div class="splash">
    <div class="s1">SHRASQUAD</div><div class="s2">PRODUCTIONS</div>
    <div class="s3">presents</div><div class="s4">click or press any key</div></div>`;
  await new Promise(resolve => {
    const go = () => { removeEventListener('keydown', go); screenEl.removeEventListener('pointerdown', go); resolve(); };
    addEventListener('keydown', go);
    screenEl.addEventListener('pointerdown', go);
  });
  unlockAudio();
  sfx.good();
  screenEl.hidden = true;
}

// Show a card with buttons; resolves with the chosen button id.
export function card(html, buttons, { dark = false, glass = false } = {}) {
  return new Promise(resolve => {
    screenEl.hidden = false;
    screenEl.className = `${dark ? 'dark' : ''} ${glass ? 'glass' : ''}`;
    screenEl.innerHTML = `<div class="card">${html}<div class="menu"></div></div>`;
    const menu = screenEl.querySelector('.menu');
    buttons.forEach(([id, label], i) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.innerHTML = label;
      b.onclick = () => { sfx.click(); screenEl.hidden = true; resolve(id); };
      menu.append(b);
      if (i === 0) setTimeout(() => b.focus({ preventScroll: true }), 60);
    });
  });
}

export async function terminal(lines) {
  screenEl.hidden = false;
  screenEl.className = 'dark';
  screenEl.innerHTML = '<pre class="term"></pre>';
  const pre = screenEl.firstChild;
  for (const line of lines) {
    for (const ch of line) {
      pre.textContent += ch;
      if (ch !== ' ') sfx.blip();
      await wait(22);
    }
    pre.textContent += '\n';
    await wait(260);
  }
  await wait(700);
  screenEl.hidden = true;
}
