// Decor of the candy world: rainbow arches, smiling suns, clouds, bunting,
// sticker bombs, ring rugs, candy doors, lockers, cubbies with bins, kid
// tables and chairs, a smiling wall clock, filing cabinets and folder stacks.
import * as THREE from 'three';
import { roundedBox } from '../kit/location-kit';
import { cuteSticker, SMILE_TILE, WRONG_SMILE_TILE, wrongSticker } from './atlases';
import { withFrame } from './batch';
import { pick, type CandyKit } from './candy-kit';
import { CANDY, LOUD, PASTEL, RAINBOW } from './palette';

/** A rainbow arch standing on two clouds (front faces +z). */
export function rainbowArch(ck: CandyKit, x: number, z: number, R: number, bandW: number): void {
  RAINBOW.forEach((c, i) => {
    ck.gloss.add(new THREE.TorusGeometry(R - i * bandW, bandW * 0.55, 10, 40, Math.PI), c, x, 0, z, { sz: 0.6 });
  });
  const inner = R - RAINBOW.length * bandW;
  for (const side of [-1, 1]) cloud(ck, x + side * (inner + (R - inner) / 2), 0.15, z + 0.1, bandW * RAINBOW.length * 0.55);
}

/** A puffy cloud of spheres. */
export function cloud(ck: CandyKit, x: number, y: number, z: number, s: number, color: number = CANDY.paper): void {
  const parts: [number, number, number, number][] = [
    [0, 0, 0, 0.55],
    [-0.5, -0.1, 0.05, 0.4],
    [0.5, -0.08, 0.05, 0.42],
    [-0.2, 0.25, -0.05, 0.42],
    [0.25, 0.22, 0, 0.38],
    [0.85, -0.18, 0, 0.28],
    [-0.85, -0.2, 0, 0.26],
  ];
  for (const [dx, dy, dz, r] of parts) ck.vc.add(new THREE.SphereGeometry(r * s, 16, 12), color, x + dx * s, y + dy * s, z + dz * s, { sy: 0.85 });
}

/** A sun with a sticker smile and alternating candy rays, facing +z. */
export function sun(ck: CandyKit, x: number, y: number, z: number, R: number, { wrong = false } = {}): void {
  ck.gloss.add(new THREE.CylinderGeometry(R, R, R * 0.2, 32), CANDY.sunshine, x, y, z, { rx: Math.PI / 2 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ck.gloss.add(new THREE.ConeGeometry(R * 0.2, R * 0.45, 10), i % 2 ? CANDY.tangerine : CANDY.pink, x + Math.cos(a) * R * 1.25, y + Math.sin(a) * R * 1.25, z, { rz: a - Math.PI / 2 });
  }
  ck.stickers.add(new THREE.PlaneGeometry(R * 1.7, R * 1.7), 0xffffff, x, y, z + R * 0.11, { tile: wrong ? WRONG_SMILE_TILE : SMILE_TILE });
}

/** Bunting: a sagging string between two points with triangle flags in every colour. */
export function bunting(ck: CandyKit, a: [number, number, number], b: [number, number, number], n: number, sag = 0.3): void {
  const at = (t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
  ck.kit.tube([a, at(0.25), at(0.5), at(0.75), b], 0.008, ck.kit.M('buntingString', 0xfff9fd));
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const fw = (len / n) * 0.8;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const [x, y, z] = at(t);
    const tri = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-fw / 2, 0), new THREE.Vector2(fw / 2, 0), new THREE.Vector2(0, -fw * 1.2)]));
    ck.vc.add(tri, LOUD[i % LOUD.length]!, x, y, z, { ry: Math.atan2(-(b[2] - a[2]), b[0] - a[0]) });
    if (i % 3 === 0) ck.stickers.add(new THREE.PlaneGeometry(fw * 0.5, fw * 0.5), 0xffffff, x, y - fw * 0.38, z + 0.004, { tile: cuteSticker(ck.r), ry: Math.atan2(-(b[2] - a[2]), b[0] - a[0]) });
  }
}

/**
 * Stickers all over a wall rectangle at depth z (facing +z), overlapping and tilted,
 * each a hair in front of the previous one. `wrong` = share of slightly wrong ones.
 */
export function stickerBomb(ck: CandyKit, x0: number, x1: number, y0: number, y1: number, z: number, n: number, { wrong = 0, min = 0.14, max = 0.34, ry = 0, late = false, tint = 0xffffff } = {}): void {
  for (let i = 0; i < n; i++) {
    const s = min + ck.r() * (max - min);
    const tile = late || ck.r() < wrong ? wrongSticker(ck.r) : cuteSticker(ck.r);
    const x = x0 + ck.r() * (x1 - x0);
    const y = y0 + ck.r() * (y1 - y0);
    (late ? ck.lateStickers : ck.stickers).add(new THREE.PlaneGeometry(s, s), tint, x, y, z + 0.004 + (i % 40) * 0.0012, { tile, rz: (ck.r() - 0.5) * 0.9, ry });
  }
}

/** Stickers on a side wall at x (facing +x for dir 1, −x for dir −1). */
export function sideStickers(ck: CandyKit, x: number, z0: number, z1: number, y0: number, y1: number, dir: 1 | -1, n: number, wrong = 0): void {
  for (let i = 0; i < n; i++) {
    const s = 0.14 + ck.r() * 0.22;
    const tile = ck.r() < wrong ? wrongSticker(ck.r) : cuteSticker(ck.r);
    ck.stickers.add(new THREE.PlaneGeometry(s, s), 0xffffff, x + dir * (0.004 + (i % 30) * 0.0012), y0 + ck.r() * (y1 - y0), z0 + ck.r() * (z1 - z0), { tile, ry: (dir * Math.PI) / 2, rz: (ck.r() - 0.5) * 0.8 });
  }
}

/** A round rug of rainbow rings on the floor. */
export function ringRug(ck: CandyKit, x: number, z: number, R: number): void {
  const g = new THREE.RingGeometry(0.001, R, 48, 7);
  g.rotateX(-Math.PI / 2);
  ck.vc.add(g, (px, _py, pz) => [...RAINBOW].reverse()[Math.min(6, Math.floor((Math.hypot(px, pz) / R) * 7))]!, x, 0.006, z, { perFace: true });
}

/** A striped rectangular mat (rainbow bands along x). */
export function stripeMat(ck: CandyKit, x: number, z: number, w: number, d: number): void {
  const g = new THREE.PlaneGeometry(w, d, 14, 1);
  g.rotateX(-Math.PI / 2);
  ck.vc.add(g, (px) => RAINBOW[Math.floor(((px + w / 2) / w) * 14) % RAINBOW.length]!, x, 0.006, z, { perFace: true });
}

/** A candy door in the back wall plane (local frame: back at z = 0): frame stripes, round window, a shape sign. */
export function candyDoor(ck: CandyKit, x: number, z: number, w: number, h: number, color: number, { sticker = 1, ajar = false } = {}): void {
  ck.kit.withT(x, z, 0, () => {
    const frameCols = [CANDY.paper, color];
    ck.gloss.add(roundedBox(w + 0.24, 0.16, 0.12, 0.04, 2), (px) => frameCols[Math.floor((px + 2) / 0.12) % 2]!, 0, h + 0.08, 0.06, { perFace: true });
    for (const s of [-1, 1]) ck.gloss.add(roundedBox(0.12, h, 0.12, 0.04, 2), (_x, py) => frameCols[Math.floor((py + 5) / 0.12) % 2]!, s * (w / 2 + 0.06), h / 2, 0.06, { perFace: true });
    ck.gloss.add(roundedBox(w, h, 0.06, 0.03, 2), color, 0, h / 2, ajar ? 0.2 : 0.04, { ry: ajar ? -0.5 : 0 });
    ck.vc.add(new THREE.CylinderGeometry(w * 0.2, w * 0.2, 0.02, 24), CANDY.sky, 0, h * 0.72, ajar ? 0.25 : 0.08, { rx: Math.PI / 2 });
    ck.gloss.add(new THREE.TorusGeometry(w * 0.21, 0.025, 8, 24), CANDY.paper, 0, h * 0.72, ajar ? 0.25 : 0.085);
    ck.gloss.add(new THREE.SphereGeometry(0.045, 12, 10), CANDY.sunshine, w * 0.36, h * 0.47, ajar ? 0.2 : 0.1);
    ck.stickers.add(new THREE.PlaneGeometry(w * 0.45, w * 0.45), 0xffffff, 0, h * 0.4, ajar ? 0.25 : 0.075, { tile: sticker });
  });
}

/** A row of candy lockers (front faces +z, back at z). */
export function lockers(ck: CandyKit, x0: number, n: number, z: number, h = 1.8): void {
  for (let i = 0; i < n; i++) {
    const c = LOUD[(i * 5 + 2) % LOUD.length]!;
    const x = x0 + i * 0.46;
    ck.gloss.add(roundedBox(0.44, h, 0.45, 0.03, 2), c, x, h / 2, z + 0.23);
    for (let k = 0; k < 4; k++) ck.vc.add(roundedBox(0.24, 0.02, 0.01, 0.004, 1), CANDY.paper, x, h - 0.25 - k * 0.05, z + 0.457);
    ck.gloss.add(roundedBox(0.03, 0.14, 0.03, 0.01, 1), CANDY.paper, x + 0.14, h * 0.55, z + 0.47);
    ck.stickers.add(new THREE.PlaneGeometry(0.16, 0.16), 0xffffff, x - 0.06, h * 0.38 + (i % 3) * 0.1, z + 0.462, { tile: cuteSticker(ck.r), rz: (ck.r() - 0.5) * 0.6 });
  }
}

/** Open cubbies with coloured bins and toys peeking out. Returns the top y. */
export function cubbies(ck: CandyKit, x: number, z: number, cols: number, rows: number, cell = 0.42): number {
  const w = cols * cell;
  const h = rows * cell;
  const wood = CANDY.paper;
  ck.kit.withT(x, z, 0, () => {
    ck.vc.add(roundedBox(w + 0.04, h + 0.04, 0.02, 0.01, 1), CANDY.lilac, 0, h / 2 + 0.02, 0.01);
    for (let i = 0; i <= cols; i++) ck.gloss.add(roundedBox(0.03, h + 0.04, 0.38, 0.01, 1), wood, -w / 2 + i * cell, h / 2 + 0.02, 0.2);
    for (let j = 0; j <= rows; j++) ck.gloss.add(roundedBox(w + 0.04, 0.03, 0.38, 0.01, 1), wood, 0, j * cell + 0.02, 0.2);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = -w / 2 + (i + 0.5) * cell;
        const cy = j * cell + 0.035;
        const c = LOUD[(i * 3 + j * 5) % LOUD.length]!;
        ck.gloss.add(roundedBox(cell * 0.82, cell * 0.6, 0.32, 0.03, 2), c, cx, cy + cell * 0.3, 0.2);
        ck.stickers.add(new THREE.PlaneGeometry(cell * 0.32, cell * 0.32), 0xffffff, cx, cy + cell * 0.32, 0.363, { tile: cuteSticker(ck.r) });
        const k = (i + j * cols) % 4;
        if (k === 0) ck.gloss.add(new THREE.SphereGeometry(cell * 0.14, 14, 10), pick(ck.r, LOUD), cx - cell * 0.15, cy + cell * 0.62, 0.2);
        else if (k === 1) ck.gloss.add(new THREE.ConeGeometry(cell * 0.1, cell * 0.25, 12), pick(ck.r, LOUD), cx + cell * 0.1, cy + cell * 0.68, 0.18);
        else if (k === 2) ck.gloss.add(roundedBox(cell * 0.18, cell * 0.18, cell * 0.18, 0.02, 1), pick(ck.r, LOUD), cx, cy + cell * 0.66, 0.18, { ry: 0.4 });
      }
  });
  return h + 0.04;
}

/** A small kid table with a rounded coloured top and fat legs. Returns the top y. */
export function kidTable(ck: CandyKit, x: number, z: number, w: number, d: number, color: number): number {
  const h = 0.55;
  ck.gloss.add(roundedBox(w, 0.06, d, 0.03, 2), color, x, h, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ck.gloss.add(new THREE.CylinderGeometry(0.04, 0.05, h, 12), pick(ck.r, LOUD), x + sx * (w / 2 - 0.08), h / 2, z + sz * (d / 2 - 0.08));
  return h + 0.03;
}

/** A small kid chair with a heart-cut back colour. */
export function kidChair(ck: CandyKit, x: number, z: number, ry: number, color: number): void {
  ck.kit.withT(x, z, ry, () => {
    ck.gloss.add(roundedBox(0.36, 0.05, 0.34, 0.02, 2), color, 0, 0.32, 0.17);
    ck.gloss.add(roundedBox(0.36, 0.34, 0.04, 0.03, 2), color, 0, 0.52, 0.02);
    for (const sx of [-1, 1]) for (const sz of [0.04, 0.3]) ck.gloss.add(new THREE.CylinderGeometry(0.02, 0.025, 0.32, 10), CANDY.paper, sx * 0.14, 0.16, sz);
  });
}

/** A smiling wall clock with a rainbow rim (in the back-wall plane at z). */
export function smileClock(ck: CandyKit, x: number, y: number, z: number, R: number, { wrong = false } = {}): void {
  ck.gloss.add(new THREE.TorusGeometry(R, R * 0.12, 10, 36), (px, py) => RAINBOW[Math.floor(((Math.atan2(py, px) + Math.PI) / (Math.PI * 2)) * 14) % RAINBOW.length]!, x, y, z + R * 0.12, { perFace: true });
  ck.vc.add(new THREE.CylinderGeometry(R, R, 0.03, 32), CANDY.paper, x, y, z + 0.02, { rx: Math.PI / 2 });
  ck.stickers.add(new THREE.PlaneGeometry(R * 1.3, R * 1.3), 0xffffff, x, y, z + 0.04, { tile: wrong ? WRONG_SMILE_TILE : SMILE_TILE });
  // hands: the minute hand of the later phases points nowhere a clock can point
  ck.gloss.add(roundedBox(0.02, R * 0.75, 0.01, 0.004, 1), 0x30243b, x, y + R * 0.3, z + 0.05, { rz: wrong ? 2.6 : -0.6 });
  ck.gloss.add(roundedBox(0.03, R * 0.5, 0.01, 0.005, 1), CANDY.cherry, x, y + R * 0.18, z + 0.055, { rz: 1.2 });
}

/** A hanging mobile of shapes on threads from a ceiling point. Static (the shapes do not spin). */
export function mobile(ck: CandyKit, x: number, ceil: number, z: number, span: number): void {
  const rodY = ceil - 0.5;
  ck.vc.add(new THREE.CylinderGeometry(0.012, 0.012, span, 8), CANDY.paper, x, rodY, z, { rz: Math.PI / 2 });
  ck.vc.add(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), CANDY.paper, x, ceil - 0.25, z);
  for (let i = 0; i < 5; i++) {
    const sx = x - span / 2 + (i + 0.5) * (span / 5);
    const drop = 0.2 + ((i * 37) % 4) * 0.12;
    ck.vc.add(new THREE.CylinderGeometry(0.003, 0.003, drop, 4), CANDY.paper, sx, rodY - drop / 2, z);
    withFrame(sx, rodY - drop - 0.1, z, { ry: i * 0.5 }, () => {
      if (i % 2) ck.gloss.add(new THREE.OctahedronGeometry(0.1, 0), LOUD[i * 2]!, 0, 0, 0);
      else ck.gloss.add(new THREE.TorusGeometry(0.08, 0.03, 8, 18), LOUD[i * 2 + 1]!, 0, 0, 0);
    });
  }
}

/** A filing cabinet in faded pastel with labelled drawers (archive). */
export function cabinet(ck: CandyKit, x: number, z: number, color: number, drawers = 4, h = 1.4): void {
  ck.gloss.add(roundedBox(0.55, h, 0.6, 0.03, 2), color, x, h / 2, z + 0.3);
  for (let i = 0; i < drawers; i++) {
    const y = ((i + 0.5) * h) / drawers;
    ck.vc.add(roundedBox(0.48, h / drawers - 0.05, 0.02, 0.01, 1), PASTEL[(i + Math.round(x * 3)) % PASTEL.length]!, x, y, z + 0.605);
    ck.vc.add(roundedBox(0.16, 0.07, 0.01, 0.004, 1), CANDY.paper, x, y + 0.06, z + 0.618);
    ck.gloss.add(roundedBox(0.14, 0.025, 0.03, 0.01, 1), 0x8a7a9a, x, y - 0.04, z + 0.625);
  }
}

/** A leaning stack of folders and binders (archive). */
export function folderStack(ck: CandyKit, x: number, y: number, z: number, n: number): void {
  let yy = y;
  for (let i = 0; i < n; i++) {
    const t = 0.03 + ck.r() * 0.04;
    const c = [...PASTEL, ...LOUD][Math.floor(ck.r() * (PASTEL.length + LOUD.length))]!;
    ck.vc.add(roundedBox(0.36 + ck.r() * 0.08, t, 0.28, 0.008, 1), c, x + (ck.r() - 0.5) * 0.05, yy + t / 2, z, { ry: (ck.r() - 0.5) * 0.3 });
    if (ck.r() < 0.5) ck.vc.add(roundedBox(0.3, 0.004, 0.24, 0.002, 1), CANDY.paper, x, yy + t + 0.002, z);
    yy += t;
  }
}

/** A row of binders standing on a shelf (spines facing +z). */
export function binderRow(ck: CandyKit, x0: number, y: number, z: number, w: number, seed: number): void {
  let x = x0;
  let i = seed;
  while (x < x0 + w - 0.06) {
    const bw = 0.05 + ((i * 13) % 5) * 0.012;
    const bh = 0.28 + ((i * 7) % 4) * 0.025;
    const c = [...LOUD, ...PASTEL][(i * 5) % (LOUD.length + PASTEL.length)]!;
    const tilt = i % 9 === 0 ? 0.18 : 0;
    ck.vc.add(roundedBox(bw, bh, 0.26, 0.006, 1), c, x + bw / 2, y + bh / 2, z + 0.14, { rz: tilt });
    ck.vc.add(roundedBox(bw * 0.7, 0.05, 0.004, 0.002, 1), CANDY.paper, x + bw / 2, y + bh * 0.7, z + 0.272, { rz: tilt });
    x += bw + 0.004;
    i++;
  }
}

/** A giant daisy: stem, two leaves, a ring of petals facing the camera, a smiley centre. */
export function giantFlower(ck: CandyKit, x: number, z: number, h: number, petal: number, tilt = 0): void {
  withFrame(x, 0, z, { rz: tilt }, () => {
    ck.vc.add(new THREE.CylinderGeometry(0.025 * h, 0.03 * h, h, 8), 0x3fbf5a, 0, h / 2, 0);
    for (const s of [-1, 1]) ck.vc.add(new THREE.SphereGeometry(0.12 * h, 12, 8), 0x5ad86a, s * 0.1 * h, h * (0.35 + s * 0.05), 0, { sx: 1.2, sy: 0.35, sz: 0.5, rz: s * 0.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ck.gloss.add(new THREE.SphereGeometry(0.11 * h, 12, 8), petal, Math.cos(a) * 0.15 * h, h + Math.sin(a) * 0.15 * h, 0, { sx: 1.3, sy: 0.75, sz: 0.35, rz: a });
    }
    ck.gloss.add(new THREE.SphereGeometry(0.1 * h, 14, 10), CANDY.sunshine, 0, h, 0.03 * h, { sz: 0.5 });
    ck.stickers.add(new THREE.PlaneGeometry(0.17 * h, 0.17 * h), 0xffffff, 0, h, 0.085 * h, { tile: SMILE_TILE });
  });
}

/** A spotted mushroom stool. */
export function mushroom(ck: CandyKit, x: number, z: number, s: number, cap: number): void {
  ck.vc.add(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 0.4 * s, 14), CANDY.paper, x, 0.2 * s, z);
  const g = new THREE.SphereGeometry(0.34 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  ck.gloss.add(g, (px, py, pz) => (Math.sin(px * 30 / s) * Math.sin(pz * 30 / s) * Math.cos(py * 20 / s) > 0.55 ? CANDY.paper : cap), x, 0.36 * s, z, { perFace: true, sy: 0.8 });
}
