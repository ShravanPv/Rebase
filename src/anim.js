/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * Animation toolkit: easing curves, tweens, and the camera director.
 */
import * as THREE from 'three';

// Easing turns linear progress (0→1) into motion with character.
export const ease = {
  linear: t => t,
  inOutCubic: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outCubic: t => 1 - (1 - t) ** 3,
  outExpo: t => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  outBack: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, // overshoot, then settle
};

// A tween calls onUpdate(k) every frame with eased progress k, then resolves.
// Tweens run on *game* time, so slow-mo slows them too.
const tweens = new Set();

export function tween(seconds, onUpdate, easeFn = ease.inOutCubic) {
  return new Promise(resolve => {
    if (seconds <= 0) { onUpdate(1); resolve(); return; }
    tweens.add({ t: 0, seconds, onUpdate, easeFn, resolve });
  });
}

export function updateTweens(dt) {
  for (const tw of tweens) {
    tw.t = Math.min(tw.t + dt / tw.seconds, 1);
    tw.onUpdate(tw.easeFn(tw.t));
    if (tw.t >= 1) { tweens.delete(tw); tw.resolve(); }
  }
}

export const sleep = seconds => tween(seconds, () => {}, ease.linear);

// The camera director: cut or glide between shots, plus screen shake.
export function makeDirector(camera) {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let shake = 0;

  return {
    pos,
    look,
    cut(shot) { pos.copy(shot.pos); look.copy(shot.look); },
    go(shot, seconds, easeFn = ease.inOutCubic) {
      const p0 = pos.clone();
      const l0 = look.clone();
      return tween(seconds, k => {
        pos.lerpVectors(p0, shot.pos, k);
        look.lerpVectors(l0, shot.look, k);
      }, easeFn);
    },
    shake(amount) { shake = Math.max(shake, amount); },
    update(realDt) {
      camera.position.copy(pos);
      if (shake > 0.001) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        shake *= Math.pow(0.004, realDt); // fast decay
      }
      camera.lookAt(look);
    },
  };
}
