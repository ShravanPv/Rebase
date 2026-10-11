/*
 * REBASE — Rewrite history. Ship your future.
 * © 2026 ShraSquad Productions. All rights reserved.
 *
 * The office: white "paper" props with black ink outlines, built from simple shapes.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// Thick ink lines (plain WebGL lines are always 1px).
export const inkLine = new LineMaterial({ color: 0x000000, linewidth: 2.2 });

// Two-tone toon shading: lit faces white, shadow faces light grey.
const gradient = new THREE.DataTexture(new Uint8Array([150, 255]), 2, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
const paper = new THREE.MeshToonMaterial({
  color: 0xffffff, gradientMap: gradient,
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, // keep ink lines on top
});
const solid = new THREE.MeshBasicMaterial({ color: 0x000000 });
const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function ink(parent, geometry, x = 0, y = 0, z = 0, mat = paper) {
  const mesh = new THREE.Mesh(geometry, mat);
  const edges = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geometry, 25));
  mesh.add(new LineSegments2(edges, inkLine));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// A wall clock; call clock.userData.set(minutes) to move the hands.
function makeClock(parent, x, y, z, r = 0.32) {
  const clock = new THREE.Group();
  clock.position.set(x, y, z);
  parent.add(clock);
  clock.add(new THREE.Mesh(new THREE.CircleGeometry(r, 40), white));
  clock.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 8, 40), solid));
  for (let i = 0; i < 12; i++) {
    const tick = new THREE.Mesh(BOX(r * 0.06, r * 0.19, 0.01), solid);
    const a = (i / 12) * Math.PI * 2;
    tick.position.set(Math.sin(a) * r * 0.81, Math.cos(a) * r * 0.81, 0.01);
    tick.rotation.z = -a;
    clock.add(tick);
  }
  const hand = (len, w) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(BOX(w, len, 0.01), solid);
    m.position.set(0, len / 2, 0.02);
    pivot.add(m);
    clock.add(pivot);
    return pivot;
  };
  const hourHand = hand(r * 0.5, r * 0.11);
  const minuteHand = hand(r * 0.78, r * 0.06);
  clock.userData.set = minutes => {
    hourHand.rotation.z = -((minutes / 60) % 12) / 12 * Math.PI * 2;
    minuteHand.rotation.z = -((minutes % 60) / 60) * Math.PI * 2;
  };
  return clock;
}

function makeChair(parent, x, z, facing = 1) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = facing > 0 ? 0 : Math.PI;
  parent.add(chair);
  ink(chair, BOX(0.46, 0.06, 0.46), 0, 0.45, 0);
  ink(chair, BOX(0.06, 0.5, 0.46), -0.25, 0.75, 0);
  ink(chair, new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), 0, 0.23, 0);
  ink(chair, BOX(0.5, 0.04, 0.08), 0, 0.03, 0);
  ink(chair, BOX(0.08, 0.04, 0.5), 0, 0.03, 0);
  return chair;
}

export function buildOffice(scene) {
  const screens = [];
  const leds = [];
  const chairs = [];

  // Floor with a faint grid, and the back wall.
  // One big floor shared by every set (the office at x≈0, the interview room at x≈40).
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 60), paper);
  floor.rotation.x = -Math.PI / 2;
  floor.position.x = 20;
  scene.add(floor);
  const grid = new THREE.GridHelper(140, 140, 0x000000, 0x000000);
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  grid.position.set(20, 0.002, 0);
  scene.add(grid);
  ink(scene, BOX(26, 7, 0.2), 0, 3.5, -4.1);

  // Windows.
  for (const x of [-5.5, -3.2, 3.2, 5.5]) {
    ink(scene, BOX(1.6, 1.4, 0.06), x, 2.3, -3.98);
    ink(scene, BOX(0.05, 1.4, 0.1), x, 2.3, -3.95);
    ink(scene, BOX(1.6, 0.05, 0.1), x, 2.3, -3.95);
    ink(scene, BOX(1.8, 0.06, 0.2), x, 1.58, -3.92);
  }

  // Anything in `pieces` can be smashed in rage mode and is restored by REBASE.
  const pieces = [];
  const piece = (obj, cost) => {
    pieces.push({ obj, cost, pos0: obj.position.clone(), q0: obj.quaternion.clone(), v: new THREE.Vector3(), w: new THREE.Vector3(), live: false });
    return obj;
  };

  // Whiteboard with scribbles.
  const board = piece(new THREE.Group(), 200);
  board.position.set(-0.4, 2.2, -3.97);
  scene.add(board);
  ink(board, BOX(2.4, 1.2, 0.05));
  [[-0.5, 0.3, 0.9], [-0.2, 0.1, 1.4], [-0.35, -0.1, 1.1], [0.6, -0.35, 0.7]].forEach(([x, y, w]) => {
    const m = new THREE.Mesh(BOX(w, 0.03, 0.01), solid);
    m.position.set(x, y, 0.03);
    board.add(m);
  });

  // Wall clock, driven by the in-game day.
  const clock = piece(makeClock(scene, 1.6, 2.6, -3.96), 45);

  // Desks: top, legs, monitor (screen faces the sitter), keyboard, mug, chair.
  const desks = [];
  function desk(x, z) {
    const parts = [
      piece(ink(scene, BOX(1.3, 0.06, 0.75), x, 0.75, z), 400),
      ...[[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]].map(([dx, dz]) => piece(ink(scene, BOX(0.05, 0.72, 0.05), x + dx, 0.36, z + dz), 40)),
      piece(ink(scene, BOX(0.05, 0.1, 0.08), x + 0.18, 0.83, z), 30),
      piece(ink(scene, BOX(0.2, 0.02, 0.42), x - 0.25, 0.79, z), 120),
      piece(ink(scene, new THREE.CylinderGeometry(0.05, 0.045, 0.12, 12), x - 0.45, 0.84, z + 0.26), 15),
    ];

    // Monitor body + screen move together as one piece.
    const monitor = piece(new THREE.Group(), 900);
    monitor.position.set(x + 0.18, 1.08, z);
    scene.add(monitor);
    ink(monitor, BOX(0.04, 0.4, 0.62));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    screen.rotation.y = -Math.PI / 2;
    screen.position.set(-0.023, 0, 0);
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(BOX(0.12 + ((i * 37) % 5) * 0.06, 0.018, 0.001), solid);
      line.position.set(-0.17 + line.geometry.parameters.width / 2, 0.11 - i * 0.055, 0.002);
      screen.add(line);
    }
    monitor.add(screen);
    screens.push(screen);
    parts.push(monitor);

    const chair = piece(makeChair(scene, x - 0.95, z), 350);
    chairs.push(chair);
    desks.push(parts.map(o => pieces.find(p => p.obj === o)));
  }
  desk(0, 0);        // Stix
  desk(-3.4, -1.6);  // coworkers
  desk(3.2, -1.6);
  desk(0.4, -2.9);

  // Server rack with blinking lights.
  const rack = piece(new THREE.Group(), 25000);
  rack.position.set(6.6, 0, -2.9);
  scene.add(rack);
  ink(rack, BOX(0.8, 2.2, 0.7), 0, 1.1, 0);
  for (let r = 0; r < 10; r++) {
    ink(rack, BOX(0.7, 0.02, 0.02), 0, 0.25 + r * 0.19, 0.36);
    for (let c = 0; c < 3; c++) {
      const led = new THREE.Mesh(BOX(0.07, 0.05, 0.02), solid);
      led.position.set(-0.25 + c * 0.12, 0.33 + r * 0.19, 0.37);
      rack.add(led);
      leds.push(led);
    }
  }

  // Plants.
  for (const [x, z] of [[-6.4, -3.4], [2.2, -3.5]]) {
    const plant = piece(new THREE.Group(), 60);
    plant.position.set(x, 0, z);
    scene.add(plant);
    ink(plant, new THREE.CylinderGeometry(0.22, 0.17, 0.42, 12), 0, 0.21, 0);
    for (let i = 0; i < 5; i++) {
      const leaf = ink(plant, new THREE.SphereGeometry(0.16, 7, 5), Math.sin(i * 1.3) * 0.18, 0.62 + i * 0.12, Math.cos(i * 1.3) * 0.12);
      leaf.scale.set(0.7, 1.4, 0.7);
      leaf.rotation.z = Math.sin(i * 1.3) * 0.6;
    }
  }

  // Record every piece's home *after* everything is positioned.
  for (const p of pieces) { p.pos0.copy(p.obj.position); p.q0.copy(p.obj.quaternion); }

  const box = new THREE.Box3();
  const spin = new THREE.Quaternion();
  const euler = new THREE.Euler();

  // Launch a piece: away from `from`, upward, spinning.
  function smash(p, from, power = 1) {
    p.live = true;
    const dx = p.obj.position.x - from.x, dz = p.obj.position.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    p.v.set((dx / d) * 3 * power + (Math.random() - 0.5) * 2, (3 + Math.random() * 3) * power, (dz / d) * 2 * power + Math.random() * 1.5);
    p.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14).multiplyScalar(power);
  }

  let alarm = false;
  let ledTimer = 0;
  let rewindFrom = [];
  return {
    stixChair: chairs[0],
    chairs,
    pieces,
    desks,
    smash,
    // Find which smashable piece a clicked mesh belongs to.
    pieceOf(object) {
      for (let o = object; o; o = o.parent) {
        const p = pieces.find(q => q.obj === o);
        if (p) return p;
      }
      return null;
    },
    rewindStart() {
      rewindFrom = pieces.map(p => ({ p, pos: p.obj.position.clone(), q: p.obj.quaternion.clone() }));
      for (const p of pieces) p.live = false;
    },
    rewindTo(k) { // k: 0 → 1, flies everything back into place
      for (const { p, pos, q } of rewindFrom) {
        p.obj.position.lerpVectors(pos, p.pos0, k);
        p.obj.quaternion.slerpQuaternions(q, p.q0, k);
      }
    },
    restore() {
      for (const p of pieces) { p.live = false; p.obj.position.copy(p.pos0); p.obj.quaternion.copy(p.q0); }
    },
    alarm(on) { alarm = on; },
    setClock(minutes) { clock.userData.set(minutes); },
    update(dt, t) {
      ledTimer += dt;
      if (ledTimer > (alarm ? 0.05 : 0.18)) {
        ledTimer = 0;
        for (const led of leds) if (Math.random() < 0.3) led.material = led.material === solid ? white : solid;
      }
      const dark = alarm && Math.floor(t * 5) % 2 === 0;
      for (const s of screens) s.material.color.setHex(dark ? 0x000000 : 0xffffff);

      // ponytail: no object-vs-object collisions, just gravity + floor + back wall.
      for (const p of pieces) {
        if (!p.live) continue;
        const o = p.obj;
        p.v.y -= 9.8 * dt;
        o.position.addScaledVector(p.v, dt);
        spin.setFromEuler(euler.set(p.w.x * dt, p.w.y * dt, p.w.z * dt));
        o.quaternion.premultiply(spin);
        box.setFromObject(o);
        if (box.min.y < 0) { // bounce on the floor
          o.position.y -= box.min.y;
          p.v.y = Math.abs(p.v.y) * 0.35;
          p.v.x *= 0.7; p.v.z *= 0.7; p.w.multiplyScalar(0.6);
          if (p.v.lengthSq() < 0.05) p.live = false;
        }
        if (o.position.z < -3.8) { o.position.z = -3.8; p.v.z = Math.abs(p.v.z) * 0.4; }
      }
    },
  };
}

// ---------- Chapter 2 set: a glass meeting room at Glasshouse AI ----------
export function buildInterviewRoom(scene, ox) {
  // Back wall with tall windows and a city skyline fading into the fog.
  ink(scene, BOX(14, 7, 0.2), ox, 3.5, -3.6);
  for (const dx of [-4.5, -2.7, 2.7, 4.5]) {
    ink(scene, BOX(1.5, 2.4, 0.06), ox + dx, 2.0, -3.48);
    ink(scene, BOX(0.05, 2.4, 0.1), ox + dx, 2.0, -3.45);
  }
  [[-6, 3], [-4.6, 5], [-3.2, 2.2], [-1.6, 6], [0.4, 3.6], [2.2, 4.8], [3.8, 2.6], [5.6, 5.4]].forEach(([dx, h]) => {
    ink(scene, BOX(1.2, h, 1.2), ox + dx, h / 2, -16);
  });

  // Company sign, drawn onto a canvas texture.
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#000'; g.font = '900 96px ui-monospace, Menlo, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('GLASSHOUSE AI', c.width / 2, c.height / 2 + 4);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  sign.position.set(ox, 3.05, -3.48);
  scene.add(sign);

  // Whiteboard for the system-design round.
  ink(scene, BOX(2.2, 1.1, 0.05), ox + 0.1, 1.85, -3.47);

  // Glass side walls: thin mullions suggest panes.
  for (const side of [-1, 1]) {
    for (let z = -3.2; z <= 1.6; z += 1.2) ink(scene, BOX(0.04, 3, 0.04), ox + side * 5.2, 1.5, z);
    ink(scene, BOX(0.06, 0.06, 4.9), ox + side * 5.2, 3.0, -0.8);
  }

  // Meeting table with legs, laptop, water glasses.
  ink(scene, BOX(2.4, 0.06, 1.1), ox, 0.75, 0);
  for (const [dx, dz] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) ink(scene, BOX(0.05, 0.72, 0.05), ox + dx, 0.36, dz);
  ink(scene, BOX(0.3, 0.02, 0.42), ox - 0.6, 0.79, 0);                // laptop base
  const lid = ink(scene, BOX(0.02, 0.3, 0.42), ox - 0.46, 0.93, 0);   // laptop screen, tilted back
  lid.rotation.z = -0.25;
  for (const [dx, dz] of [[-0.4, 0.38], [0.5, 0.36]]) ink(scene, new THREE.CylinderGeometry(0.04, 0.035, 0.14, 12), ox + dx, 0.85, dz);
  ink(scene, BOX(0.3, 0.01, 0.4), ox + 0.6, 0.785, 0.05);              // interviewer's notes

  const chairs = { you: makeChair(scene, ox - 1.6, 0, 1), them: makeChair(scene, ox + 1.6, 0, -1) };

  // Plant + clock.
  ink(scene, new THREE.CylinderGeometry(0.22, 0.17, 0.42, 12), ox - 4.4, 0.21, -2.8);
  for (let i = 0; i < 5; i++) {
    const leaf = ink(scene, new THREE.SphereGeometry(0.16, 7, 5), ox - 4.4 + Math.sin(i * 1.3) * 0.18, 0.62 + i * 0.12, -2.8 + Math.cos(i * 1.3) * 0.12);
    leaf.scale.set(0.7, 1.4, 0.7);
  }
  const clock = makeClock(scene, ox + 2.0, 2.75, -3.48, 0.26);

  return { chairs, setClock: m => clock.userData.set(m) };
}

// ---------- Chapter 3 set: a small apartment at night ----------
export function buildApartment(scene, ox) {
  // Back wall with a night window (moon + a few far towers) and a poster.
  ink(scene, BOX(12, 7, 0.2), ox, 3.5, -3.2);
  ink(scene, BOX(2.2, 1.6, 0.06), ox + 1.8, 2.2, -3.08);
  ink(scene, BOX(0.05, 1.6, 0.1), ox + 1.8, 2.2, -3.05);
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 32), solid);
  moon.position.set(ox + 2.4, 2.65, -3.03);
  scene.add(moon);
  for (const [dx, h] of [[1.1, 0.5], [1.4, 0.8], [2.2, 0.6], [2.6, 0.4]]) {
    const t = new THREE.Mesh(BOX(0.22, h, 0.01), solid);
    t.position.set(ox + dx, 1.4 + h / 2, -3.03);
    scene.add(t);
  }
  const c = document.createElement('canvas');
  c.width = 512; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = '#000'; g.lineWidth = 16; g.strokeRect(8, 8, 496, 624);
  g.fillStyle = '#000'; g.font = '900 120px ui-monospace, Menlo, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SHIP', 256, 250); g.fillText('IT.', 256, 400);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  poster.position.set(ox - 1.2, 2.3, -3.08);
  scene.add(poster);

  // Desk, laptop, lamp, energy drinks, pizza box, chair.
  ink(scene, BOX(1.4, 0.06, 0.7), ox, 0.75, -0.2);
  for (const [dx, dz] of [[-0.65, -0.5], [0.65, -0.5], [-0.65, 0.1], [0.65, 0.1]]) ink(scene, BOX(0.05, 0.72, 0.05), ox + dx, 0.36, dz);
  ink(scene, BOX(0.3, 0.02, 0.4), ox - 0.15, 0.79, -0.2);
  const lid = ink(scene, BOX(0.02, 0.3, 0.4), ox, 0.93, -0.2);
  lid.rotation.z = -0.2;
  ink(scene, new THREE.CylinderGeometry(0.1, 0.12, 0.03, 16), ox + 0.5, 0.79, -0.4);   // lamp base
  ink(scene, BOX(0.02, 0.4, 0.02), ox + 0.5, 0.99, -0.4);
  const shade = ink(scene, new THREE.ConeGeometry(0.14, 0.16, 16, 1, true), ox + 0.42, 1.2, -0.4);
  shade.rotation.z = 0.5;
  for (const dx of [0.25, 0.33, 0.29]) ink(scene, new THREE.CylinderGeometry(0.03, 0.03, 0.11, 10), ox + dx, 0.84, dx === 0.29 ? 0.02 : -0.02);
  ink(scene, BOX(0.4, 0.04, 0.4), ox - 0.45, 0.8, -0.38);                               // pizza box
  const chair = makeChair(scene, ox - 0.95, -0.2, 1);

  // Bed and a bookshelf.
  ink(scene, BOX(2.0, 0.4, 1.2), ox - 3.6, 0.2, -2.2);
  ink(scene, BOX(0.5, 0.12, 0.8), ox - 4.3, 0.46, -2.2);
  ink(scene, BOX(1.0, 1.8, 0.35), ox + 4.0, 0.9, -2.9);
  for (let r = 0; r < 4; r++) ink(scene, BOX(0.95, 0.03, 0.33), ox + 4.0, 0.3 + r * 0.42, -2.9);

  const clock = makeClock(scene, ox - 0.1, 2.85, -3.08, 0.24);
  return { chair, setClock: m => clock.userData.set(m) };
}
