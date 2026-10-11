/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * Boot: renderer, scene, cast, and the game loop. The story runs in story.js.
 */
import * as THREE from 'three';
import { updateTweens, makeDirector } from './anim.js';
import { buildOffice, inkLine } from './world.js';
import { Stickman } from './stickman.js';
import { play } from './story.js';
import * as ui from './ui.js';

// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
scene.fog = new THREE.Fog(0xffffff, 10, 26); // far things fade into the paper

const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-3, 6, 5);
scene.add(sun);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep the same *horizontal* view on tall screens (phones) by widening the vertical FOV.
  const minAspect = 16 / 9;
  camera.fov = w / h >= minAspect ? 38
    : Math.min(80, (2 * Math.atan(Math.tan((38 * Math.PI) / 360) * (minAspect / (w / h))) * 180) / Math.PI);
  camera.updateProjectionMatrix();
  inkLine.resolution.set(w, h);
}
addEventListener('resize', resize);
resize();

// ---------- the set and the cast ----------
const world = buildOffice(scene);
const cast = {
  stix: new Stickman(scene, { x: -0.95, z: 0, pose: 'sit', scarf: true }),
  boss: new Stickman(scene, { x: -7.5, z: 0.55, pose: 'stand', tie: true }),
  co: [
    new Stickman(scene, { x: -4.35, z: -1.6, pose: 'sit' }),
    new Stickman(scene, { x: 2.25, z: -1.6, pose: 'sit' }),
    new Stickman(scene, { x: -0.55, z: -2.9, pose: 'sit' }),
  ],
};
const everyone = [cast.stix, cast.boss, ...cast.co];

// ---------- saved progress (Dev Dex, endings, best) ----------
const SAVE_KEY = 'rebase.save.v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}; } catch { /* first run or storage blocked */ }
const mem = { dex: saved.dex ?? [], endings: saved.endings ?? [], best: saved.best ?? null, briefed: saved.briefed ?? false };
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(mem)); } catch { /* ignore */ } };

// Everything the story needs, in one object.
const g = { camera, cam: makeDirector(camera), cast, world, mem, save, hooks: [], timeScale: 1 };
const shake = g.cam.shake;
g.cam.shake = amount => { if (!ui.settings.reduceMotion) shake(amount); };

// ---------- the game loop: update the world, then draw it, ~60 times a second ----------
let last = performance.now();
function frame(now) {
  const real = Math.min((now - last) / 1000, 0.1); // seconds since last frame (capped)
  last = now;
  const paused = ui.isPaused();
  // game time: frozen while paused, slower in slow-mo, 6x while skipping a scene
  const dt = paused ? 0 : real * g.timeScale * (ui.isFF() ? 6 : 1);

  updateTweens(dt);
  if (!paused) for (const hook of g.hooks) hook(real, dt);
  for (const s of everyone) s.update(dt);
  world.update(dt, now / 1000);
  g.cam.update(real);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

play(g).catch(err => {
  console.error(err);
  document.getElementById('screen').hidden = false;
  document.getElementById('screen').textContent = `Something broke: ${err.message}`;
});
