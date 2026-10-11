/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * The stickman: a 2D skeleton (joint angles) drawn with 3D black tubes.
 * Angles are in degrees: 0 = pointing down, 90 = forward, 180 = up, -90 = backward.
 */
import * as THREE from 'three';
import { tween, ease } from './anim.js';

const LEN = { thigh: 0.45, shin: 0.45, torso: 0.6, shoulder: 0.52, neck: 0.07, head: 0.13, upper: 0.33, fore: 0.3 };
const KEYS = ['lean', 'tilt', 'hipY', 'uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR'];

const stand = { lean: 0, tilt: 0, hipY: 0, uaL: -8, faL: -4, uaR: 10, faR: 6, thL: -5, shL: -3, thR: 6, shR: 3 };
const sitLegs = { hipY: -0.42, thL: 88, shL: 2, thR: 92, shR: -2 };
const sit = { ...stand, lean: 4, tilt: 6, uaL: 58, faL: 84, uaR: 62, faR: 86, ...sitLegs };
const panic = { ...stand, lean: -6, tilt: -10, uaL: 150, faL: 250, uaR: 140, faR: 240, thL: -10, shL: -6, thR: 10, shR: 6 };
const cheer = { ...stand, lean: -4, tilt: -14, uaL: 150, faL: 168, uaR: 165, faR: 182 };

export const POSES = {
  stand,
  sit,
  think: { ...sit, uaR: 25, faR: 165, tilt: -4 },
  panic,
  panicSit: { ...panic, ...sitLegs },
  cheer,
  cheerSit: { ...cheer, ...sitLegs },
  point: { ...stand, uaR: 85, faR: 88, tilt: -3 },
  cross: { ...stand, uaL: 20, faL: 100, uaR: 25, faR: 96 },
  cool: { ...stand, lean: -3, tilt: -6, uaL: -35, faL: 35, uaR: 100, faR: 215, thL: -14, shL: -10, thR: 14, shR: 10 },
  slump: { ...stand, lean: 22, tilt: 35, hipY: -0.04, uaL: 5, faL: 5, uaR: 8, faR: 8 },
  facepalm: { ...stand, lean: 8, tilt: 20, uaR: 110, faR: 228 },
};

const INK = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
const PAPER = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const BONE = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
const JOINT = new THREE.SphereGeometry(0.035, 10, 8);
const SCARF = new THREE.CylinderGeometry(0.032, 0.032, 1, 6);
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

const dir = deg => { const r = (deg * Math.PI) / 180; return [Math.sin(r), -Math.cos(r)]; };
const reach = (from, deg, len) => { const d = dir(deg); return [from[0] + d[0] * len, from[1] + d[1] * len]; };

// Stretch a unit cylinder from a to b.
function place(mesh, a, b, za = 0, zb = za) {
  tmp.set(b[0] - a[0], b[1] - a[1], zb - za);
  const len = tmp.length() || 1e-6;
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (za + zb) / 2);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(UP, tmp.divideScalar(len));
}

export class Stickman {
  constructor(scene, { x = 0, z = 0, facing = 1, pose = 'stand', scarf = false, tie = false } = {}) {
    this.g = new THREE.Group();
    this.g.position.set(x, 0, z);
    scene.add(this.g);
    this.face(facing);

    const mesh = geo => { const m = new THREE.Mesh(geo, INK); this.g.add(m); return m; };
    this.bones = Array.from({ length: 10 }, () => mesh(BONE));
    this.joints = Array.from({ length: 11 }, () => mesh(JOINT));

    this.head = new THREE.Group();
    this.head.add(new THREE.Mesh(new THREE.TorusGeometry(LEN.head, 0.03, 8, 32), INK));
    this.head.add(new THREE.Mesh(new THREE.CircleGeometry(LEN.head, 32), PAPER));
    this.shades = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.055, 0.05), INK);
    this.shades.position.set(0.055, 0.02, 0);
    this.shades.visible = false;
    this.head.add(this.shades);
    this.g.add(this.head);

    this.tie = tie ? mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03)) : null;

    // Scarf: a chain of points with simple verlet physics, so it trails and flutters.
    this.scarf = scarf ? Array.from({ length: 8 }, () => ({ x: 0, y: 0, px: 0, py: 0 })) : null;
    this.scarfBones = scarf ? Array.from({ length: 7 }, () => mesh(SCARF)) : [];
    this.scarfReady = false;

    this.base = { ...POSES[pose] };
    this.poseId = 0;
    this.t = Math.random() * 10;
    this.typing = false;
    this.walking = 0; // walking speed, 0 = standing still
  }

  face(dirX) {
    this.facing = dirX;
    this.g.rotation.y = dirX > 0 ? 0 : Math.PI;
  }

  // The scarf reads as a third arm in normal scenes, so it only appears for hero moments.
  showScarf(on) {
    for (const b of this.scarfBones) b.visible = on;
    this.scarfReady = false;
  }

  setPose(name) {
    this.poseId++;
    this.base = { ...POSES[name] };
  }

  // Blend from the current pose to a new one. Newer calls cancel older ones.
  pose(name, seconds = 0.4, easeFn = ease.outCubic) {
    const id = ++this.poseId;
    const from = { ...this.base };
    const to = POSES[name];
    return tween(seconds, k => {
      if (id !== this.poseId) return;
      for (const key of KEYS) this.base[key] = from[key] + (to[key] - from[key]) * k;
    }, easeFn);
  }

  async walkTo(x, speed = 1.4) {
    const x0 = this.g.position.x;
    const dist = Math.abs(x - x0);
    if (dist < 0.01) return;
    this.face(Math.sign(x - x0));
    this.setPose('stand');
    this.walking = speed;
    await tween(dist / speed, k => { this.g.position.x = x0 + (x - x0) * k; }, ease.linear);
    this.walking = 0;
  }

  update(dt) {
    this.t += dt;
    const p = { ...this.base };
    p.lean += Math.sin(this.t * 2) * 0.8; // breathing

    if (this.typing) { // subtle: fingers move, arms stay put
      p.faL += Math.sin(this.t * 14) * 2;
      p.faR += Math.sin(this.t * 14 + 1.7) * 2;
    }
    if (this.walking) {
      const w = this.t * 4.5 * this.walking;
      p.lean = 6;
      p.hipY = -0.03 * Math.abs(Math.cos(w));
      p.thL = 28 * Math.sin(w); p.thR = -p.thL;
      p.shL = p.thL - 20 - 20 * Math.sin(w + 1.6);
      p.shR = p.thR - 20 - 20 * Math.sin(w + 1.6 + Math.PI);
      p.uaL = -12 * Math.sin(w); p.faL = p.uaL + 15;
      p.uaR = 12 * Math.sin(w); p.faR = p.uaR + 15;
    }

    // Forward kinematics: walk out from the hip, joint by joint.
    const hip = [0, LEN.thigh + LEN.shin + p.hipY];
    const spine = 180 - p.lean;
    const neck = reach(hip, spine, LEN.torso);
    const shoulder = reach(hip, spine, LEN.shoulder);
    const headBase = reach(neck, spine - p.tilt, LEN.neck);
    const head = reach(neck, spine - p.tilt, LEN.neck + LEN.head);
    const elbowL = reach(shoulder, p.uaL, LEN.upper), handL = reach(elbowL, p.faL, LEN.fore);
    const elbowR = reach(shoulder, p.uaR, LEN.upper), handR = reach(elbowR, p.faR, LEN.fore);
    const kneeL = reach(hip, p.thL, LEN.thigh), footL = reach(kneeL, p.shL, LEN.shin);
    const kneeR = reach(hip, p.thR, LEN.thigh), footR = reach(kneeR, p.shR, LEN.shin);

    const zL = -0.05, zR = 0.05; // far limbs slightly behind near limbs
    const b = this.bones;
    place(b[0], hip, neck);
    place(b[1], neck, headBase);
    place(b[2], shoulder, elbowL, 0, zL); place(b[3], elbowL, handL, zL);
    place(b[4], shoulder, elbowR, 0, zR); place(b[5], elbowR, handR, zR);
    place(b[6], hip, kneeL, 0, zL); place(b[7], kneeL, footL, zL);
    place(b[8], hip, kneeR, 0, zR); place(b[9], kneeR, footR, zR);

    const joints = [[hip, 0], [shoulder, 0], [neck, 0], [elbowL, zL], [handL, zL], [elbowR, zR], [handR, zR], [kneeL, zL], [footL, zL], [kneeR, zR], [footR, zR]];
    joints.forEach(([j, z], i) => this.joints[i].position.set(j[0], j[1], z));
    this.head.position.set(head[0], head[1], 0);
    this.head.rotation.z = (-p.tilt * Math.PI) / 180;

    if (this.tie) {
      const t = reach(neck, spine, -0.14);
      this.tie.position.set(t[0] + 0.06, t[1], 0.05);
      this.tie.rotation.z = (-p.lean * Math.PI) / 180;
    }

    if (this.scarf) this.updateScarf(dt, neck);
  }

  updateScarf(dt, neck) {
    const s = this.scarf;
    const anchor = [neck[0] - 0.03, neck[1] - 0.03];
    if (!this.scarfReady) {
      s.forEach((q, i) => { q.x = q.px = anchor[0] - i * 0.075; q.y = q.py = anchor[1]; });
      this.scarfReady = true;
    }
    s[0].x = anchor[0]; s[0].y = anchor[1];
    const wind = -4 - Math.sin(this.t * 2.3) * 2 - this.walking * 12; // blows backward
    // Fixed 1/60s steps keep the cloth stable even when the frame rate drops.
    const steps = Math.min(6, Math.ceil(dt * 60));
    const d2 = (1 / 60) ** 2;
    for (let n = 0; n < steps; n++) {
      for (let i = 1; i < s.length; i++) {
        const q = s[i];
        const vx = (q.x - q.px) * 0.95, vy = (q.y - q.py) * 0.95;
        q.px = q.x; q.py = q.y;
        q.x += vx + (wind + Math.sin(this.t * 7 + i) * 3) * d2;
        q.y += vy - 7 * d2;
      }
      for (let k = 0; k < 4; k++) {
        for (let i = 1; i < s.length; i++) {
          const a = s[i - 1], q = s[i];
          const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
          q.x = a.x + (dx / d) * 0.075; q.y = a.y + (dy / d) * 0.075;
        }
      }
    }
    for (let i = 0; i < 7; i++) place(this.scarfBones[i], [s[i].x, s[i].y], [s[i + 1].x, s[i + 1].y], -0.08);
  }
}
