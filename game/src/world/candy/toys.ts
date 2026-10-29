// Glossy toys of the candy world, built from rounded and smooth primitives with
// crisp per-face colour bands: alphabet blocks, crayons, pencils, lollipops,
// balloons, beach balls, stacking rings, abacus, extruded stars and hearts,
// polyhedra. All go into the candy batches (one draw call per batch).
import * as THREE from 'three';
import { roundedBox } from '../kit/location-kit';
import { withFrame } from './batch';
import { blockFace } from './atlases';
import { pick, type CandyKit } from './candy-kit';
import { CANDY, LOUD, PASTEL, RAINBOW } from './palette';

const band = (list: readonly number[], v: number, w: number) => list[((Math.floor(v / w) % list.length) + list.length) % list.length]!;

/** An alphabet block standing on y (its bottom), size s, random letters on every face. */
export function block(ck: CandyKit, x: number, y: number, z: number, s: number, { ry = 0, rz = 0, seed = 1 } = {}): void {
  const g = roundedBox(s, s, s, s * 0.09, 2);
  ck.blocks.add(g, 0xffffff, x, y + s / 2, z, { ry, rz, tile: blockFace(seed), faces: 6 });
}

/** A pyramid of blocks; returns the top y. */
export function blockPile(ck: CandyKit, x: number, z: number, rows: number, s: number, seed: number): number {
  let y = 0;
  for (let row = 0; row < rows; row++) {
    const n = rows - row;
    for (let i = 0; i < n; i++) {
      const jitter = (ck.r() - 0.5) * 0.25;
      block(ck, x + (i - (n - 1) / 2) * s * 1.04, y, z + (ck.r() - 0.5) * s * 0.2, s * 0.98, { ry: jitter, seed: seed + row * 10 + i });
    }
    y += s * 0.98;
  }
  return y;
}

/** A giant crayon along local +y, with a paper wrapper and zig-zag bands. */
export function crayon(ck: CandyKit, x: number, y: number, z: number, len: number, r: number, color: number, rot: { rx?: number; ry?: number; rz?: number } = {}): void {
  withFrame(x, y, z, rot, () => {
    const body = len * 0.82;
    // coloured paper wrapper: thin paper rings near the ends, two black zig-zag bands
    const bandAt = (yy: number) => {
      const k = yy / body;
      if (Math.abs(k - 0.12) < 0.025 || Math.abs(k - 0.78) < 0.025) return CANDY.paper;
      if (Math.abs(k - 0.2) < 0.02 || Math.abs(k - 0.7) < 0.02) return 0x30243b;
      return color;
    };
    ck.gloss.add(new THREE.CylinderGeometry(r, r, body, 16, 24), (_x, yy) => bandAt(yy + body / 2), 0, body / 2, 0, { perFace: true });
    ck.gloss.add(new THREE.ConeGeometry(r * 0.98, len * 0.18, 16), color, 0, body + len * 0.09, 0);
  });
}

/** A giant hexagonal pencil: lacquer, wood cone, graphite, metal band, pink eraser. */
export function pencil(ck: CandyKit, x: number, y: number, z: number, len: number, r: number, color: number, rot: { rx?: number; ry?: number; rz?: number } = {}): void {
  withFrame(x, y, z, rot, () => {
    const body = len * 0.74;
    ck.gloss.add(new THREE.CylinderGeometry(r, r, body, 6, 1), color, 0, body / 2 + len * 0.1, 0);
    ck.gloss.add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, len * 0.06, 12), 0xd8d0e0, 0, len * 0.07, 0);
    ck.gloss.add(new THREE.CylinderGeometry(r, r * 0.95, len * 0.08, 12), CANDY.bubblegum, 0, len * 0.02, 0);
    ck.vc.add(new THREE.ConeGeometry(r, len * 0.16, 6), (_x, yy) => (yy > len * 0.04 ? 0x30243b : 0xf2c890), 0, body + len * 0.18, 0, { perFace: true });
  });
}

/** A lollipop: stick and a swirl disc facing the camera. */
export function lollipop(ck: CandyKit, x: number, z: number, h: number, R: number, seed: number): void {
  const cols = [pick(ck.r, LOUD), CANDY.paper, pick(ck.r, LOUD)];
  ck.vc.add(new THREE.CylinderGeometry(R * 0.07, R * 0.07, h, 8), CANDY.paper, x, h / 2, z);
  const disc = new THREE.CylinderGeometry(R, R, R * 0.28, 40, 1);
  ck.gloss.add(
    disc,
    (px, _py, pz) => {
      const rr = Math.hypot(px, pz) / R;
      const a = Math.atan2(pz, px) / (Math.PI * 2) + 0.5;
      return cols[Math.floor((a * 6 + rr * 2.2 + seed) * 1) % cols.length]!;
    },
    x,
    h + R * 0.9,
    z,
    { rx: Math.PI / 2, perFace: true },
  );
}

/** A balloon on a string from the ground (or from `anchorY`). */
export function balloon(ck: CandyKit, x: number, y: number, z: number, color: number, anchorY = 0): void {
  const g = new THREE.SphereGeometry(0.28, 18, 14);
  g.scale(1, 1.18, 1);
  ck.gloss.add(g, color, x, y, z);
  ck.gloss.add(new THREE.ConeGeometry(0.05, 0.07, 8), color, x, y - 0.35, z, { rx: Math.PI });
  ck.kit.tube(
    [
      [x, y - 0.38, z],
      [x + 0.06, (y + anchorY) / 2, z + 0.03],
      [x - 0.02, anchorY, z],
    ],
    0.006,
    ck.kit.M('balloonString', 0xfff9fd),
  );
}

/** A beach ball with six coloured gores. */
export function beachBall(ck: CandyKit, x: number, y: number, z: number, R: number, spin = 0): void {
  const cols = [CANDY.cherry, CANDY.paper, CANDY.blue, CANDY.sunshine, CANDY.paper, CANDY.grass];
  ck.gloss.add(
    new THREE.SphereGeometry(R, 24, 16),
    (px, py, pz) => (Math.abs(py) > R * 0.86 ? CANDY.paper : cols[Math.floor(((Math.atan2(pz, px) + Math.PI) / (Math.PI * 2)) * 6) % 6]!),
    x,
    y + R,
    z,
    { perFace: true, ry: spin, rz: 0.3 },
  );
}

/** A stacking-ring toy: base, pole, rainbow rings getting smaller, a ball on top. */
export function ringStack(ck: CandyKit, x: number, z: number, s: number): void {
  ck.gloss.add(new THREE.CylinderGeometry(0.32 * s, 0.36 * s, 0.1 * s, 24), CANDY.grape, x, 0.05 * s, z);
  ck.gloss.add(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.9 * s, 12), CANDY.paper, x, 0.5 * s, z);
  RAINBOW.slice(0, 6).forEach((c, i) => {
    const R = (0.28 - i * 0.03) * s;
    ck.gloss.add(new THREE.TorusGeometry(R, 0.07 * s, 12, 28), c, x, (0.17 + i * 0.13) * s, z, { rx: Math.PI / 2 });
  });
  ck.gloss.add(new THREE.SphereGeometry(0.11 * s, 16, 12), CANDY.pink, x, 1.0 * s, z);
}

/** An abacus with rainbow beads on a frame (front faces +z in the current frame). */
export function abacus(ck: CandyKit, x: number, y: number, z: number, w: number, h: number, seed: number): void {
  const rows = 6;
  const frame = CANDY.tangerine;
  ck.gloss.add(roundedBox(0.06, h, 0.08, 0.02, 2), frame, x - w / 2, y + h / 2, z);
  ck.gloss.add(roundedBox(0.06, h, 0.08, 0.02, 2), frame, x + w / 2, y + h / 2, z);
  ck.gloss.add(roundedBox(w + 0.1, 0.06, 0.08, 0.02, 2), frame, x, y + h, z);
  ck.gloss.add(roundedBox(w + 0.1, 0.06, 0.08, 0.02, 2), frame, x, y, z);
  for (let i = 0; i < rows; i++) {
    const yy = y + ((i + 1) * h) / (rows + 1);
    ck.vc.add(new THREE.CylinderGeometry(0.008, 0.008, w, 6), 0xd8d0e0, x, yy, z, { rz: Math.PI / 2 });
    const n = 10;
    const shift = ((seed * (i + 3)) % 5) * 0.035;
    for (let k = 0; k < n; k++) {
      const bx = x - w / 2 + 0.07 + k * 0.07 + (k >= 5 ? w - 0.77 - shift : 0);
      ck.gloss.add(new THREE.SphereGeometry(0.035, 12, 8), RAINBOW[i % RAINBOW.length]!, bx, yy, z, { sx: 0.8 });
    }
  }
}

function starShape(R: number, inner = 0.48, n = 5): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) {
    const r = i % 2 ? R * inner : R;
    const a = Math.PI / 2 + (i * Math.PI) / n;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function heartShape(R: number): THREE.Shape {
  const s = new THREE.Shape();
  const k = R / 1.1;
  s.moveTo(0, -1.0 * k);
  s.bezierCurveTo(-0.2 * k, -0.7 * k, -1.1 * k, -0.25 * k, -1.05 * k, 0.3 * k);
  s.bezierCurveTo(-1.0 * k, 0.95 * k, -0.25 * k, 1.05 * k, 0, 0.55 * k);
  s.bezierCurveTo(0.25 * k, 1.05 * k, 1.0 * k, 0.95 * k, 1.05 * k, 0.3 * k);
  s.bezierCurveTo(1.1 * k, -0.25 * k, 0.2 * k, -0.7 * k, 0, -1.0 * k);
  return s;
}

const extrudeCache = new Map<string, THREE.BufferGeometry>();
function puffy(kind: 'star' | 'heart', R: number): THREE.BufferGeometry {
  const key = `${kind}|${R}`;
  let g = extrudeCache.get(key);
  if (!g) {
    g = new THREE.ExtrudeGeometry(kind === 'star' ? starShape(R) : heartShape(R), {
      depth: R * 0.25,
      bevelEnabled: true,
      bevelThickness: R * 0.14,
      bevelSize: R * 0.1,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.translate(0, 0, -R * 0.125);
    g.computeVertexNormals();
    extrudeCache.set(key, g);
  }
  return g.clone();
}

/** A puffy glossy star or heart (centred at x, y, z, facing +z). Returns the geometry (static). */
export function puffyShape(ck: CandyKit, kind: 'star' | 'heart', x: number, y: number, z: number, R: number, color: number, rot: { rx?: number; ry?: number; rz?: number } = {}): void {
  ck.gloss.add(puffy(kind, R), color, x, y, z, rot);
}

/** Shared geometry for instanced floaters. */
export const puffyGeometry = (kind: 'star' | 'heart', R: number) => puffy(kind, R);

/** A glossy geometric solid (the math-app toys): cube with stripes, cone, cylinder, polyhedra, torus. */
export function solid(ck: CandyKit, kind: number, x: number, y: number, z: number, s: number, color: number, rot: { rx?: number; ry?: number; rz?: number } = {}): void {
  const alt = PASTEL[(kind + 2) % PASTEL.length]!;
  switch (kind % 7) {
    case 0:
      ck.gloss.add(new THREE.IcosahedronGeometry(s * 0.55, 0), color, x, y, z, rot);
      break;
    case 1:
      ck.gloss.add(new THREE.OctahedronGeometry(s * 0.6, 0), (_x, yy) => (yy > 0 ? color : alt), x, y, z, { ...rot, perFace: true });
      break;
    case 2:
      ck.gloss.add(new THREE.ConeGeometry(s * 0.45, s, 24, 6), (_x, yy) => band([color, CANDY.paper], yy + s, s * 0.2), x, y, z, { ...rot, perFace: true });
      break;
    case 3:
      ck.gloss.add(new THREE.TorusGeometry(s * 0.38, s * 0.16, 14, 32), (px, py) => band([color, alt, CANDY.paper], Math.atan2(py, px) + 4, 0.35), x, y, z, { ...rot, perFace: true });
      break;
    case 4:
      ck.gloss.add(new THREE.DodecahedronGeometry(s * 0.55, 0), color, x, y, z, rot);
      break;
    case 5:
      ck.gloss.add(new THREE.CylinderGeometry(s * 0.35, s * 0.35, s * 0.8, 24, 4), (_x, yy) => band([color, alt], yy + s, s * 0.2), x, y, z, { ...rot, perFace: true });
      break;
    default:
      ck.gloss.add(new THREE.TetrahedronGeometry(s * 0.6, 0), color, x, y, z, rot);
  }
}

/** A box of giant crayons sticking out at different heights. */
export function crayonBox(ck: CandyKit, x: number, z: number, s: number, ry = 0): void {
  ck.kit.withT(x, z, ry, () => {
    ck.vc.add(roundedBox(0.9 * s, 0.6 * s, 0.3 * s, 0.03, 2), (_x, yy) => (yy > 0.12 * s ? CANDY.sunshine : CANDY.grass), 0, 0.3 * s, 0, { perFace: true });
    LOUD.slice(0, 8).forEach((c, i) => crayon(ck, (-0.36 + i * 0.1) * s, 0.2 * s, 0, (0.75 + ((i * 37) % 5) * 0.08) * s, 0.045 * s, c));
  });
}
