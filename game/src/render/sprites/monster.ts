// Melody in the last chase, drawn procedurally after the author's sprite sheet
// (materials/references/chase/melody-monster-sheet.jpg): she crawls on all
// fours, facing right; long pink hair sweeps back over her body; the blue and
// green ribbons and the red-triangle hairclip are still there; the face is
// pale with hollow black eyes and a gaping mouth, dark streaks running down;
// navy uniform, a red bow; long pale arms ending in clawed fingers.
// Shapes are implicit (ellipses, capsules, polygons) painted with three tones
// by their own edges, then outlined, so every frame of the crawl cycle and
// every head tilt is generated, never stretched.

export const MONSTER_W = 192;
export const MONSTER_H = 112;
export const MONSTER_FRAMES = 6;
const GROUND = 110;

type Test = (x: number, y: number) => boolean;
type Tones = [string, string, string]; // shadow, base, light

const P = {
  hair: ['#b8405e', '#ef6c82', '#ff9fb2'] as Tones,
  hairDeep: '#7a2340',
  skin: ['#c08a90', '#e8bcbc', '#f8dcd8'] as Tones,
  skinFar: ['#9a6a76', '#c99aa0', '#ddb4b6'] as Tones,
  navy: ['#1a1238', '#2c2058', '#3e3478'] as Tones,
  white: ['#c8c0c8', '#efe8ec', '#ffffff'] as Tones,
  red: '#e8305a',
  blue: ['#2a3ab8', '#3a5ae8', '#7a9aff'] as Tones,
  green: ['#2a9a48', '#3ad86a', '#9af0b0'] as Tones,
  hole: '#08040a',
  drip: '#3a0a18',
  claw: '#1a0a10',
  line: '#0a0608',
};

class Buf {
  readonly px: (string | null)[];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Array<string | null>(w * h).fill(null);
  }
  set(x: number, y: number, c: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }
  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x]!;
  }
}

const ellipse = (cx: number, cy: number, rx: number, ry: number): Test => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function capsule(ax: number, ay: number, bx: number, by: number, ra: number, rb = ra): Test {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const r = ra + (rb - ra) * t;
    return (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 <= r * r;
  };
}

function poly(pts: [number, number][]): Test {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]!;
      const [xj, yj] = pts[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

const any = (...tests: Test[]): Test => (x, y) => tests.some((t) => t(x, y));

/** Fills a shape with three tones: light on its upper-left edge, shadow on the lower-right. */
function paint(b: Buf, test: Test, t: Tones, box = { x0: 0, y0: 0, x1: b.w, y1: b.h }): void {
  for (let y = Math.max(0, box.y0); y < Math.min(b.h, box.y1); y++)
    for (let x = Math.max(0, box.x0); x < Math.min(b.w, box.x1); x++) {
      if (!test(x, y)) continue;
      b.set(x, y, !test(x + 2, y + 2) ? t[0] : !test(x - 1, y - 1) ? t[2] : t[1]);
    }
}

function flat(b: Buf, test: Test, c: string): void {
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (test(x, y)) b.set(x, y, c);
}

/** A curved strand of hair as a line of pixels. */
function strand(b: Buf, pts: [number, number][], c: string, inside?: Test): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    const n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n;
      const y = ay + ((by - ay) * k) / n;
      if (!inside || inside(Math.round(x), Math.round(y))) b.set(x, y, c);
    }
  }
}

/** Clawed hand pressed into the floor: palm, four long fingers bent down, dark nails. */
function hand(b: Buf, x: number, y: number, dir: number, tones: Tones, lift: number): void {
  const palm = ellipse(x, y - 3 - lift, 5, 3);
  paint(b, palm, tones);
  for (let i = 0; i < 4; i++) {
    const fx = x + dir * (3 + i * 2.2);
    const fy = y - 4 - lift + i * 0.6;
    const tip: [number, number] = [fx + dir * (5 + (i === 1 ? 2 : 0)), Math.min(GROUND, fy + 6 + lift)];
    paint(b, capsule(fx, fy, tip[0], tip[1], 1.2, 0.9), tones);
    b.set(tip[0] + dir, tip[1], P.claw);
    b.set(tip[0] + dir, tip[1] - 1, P.claw);
  }
  paint(b, capsule(x - dir * 2, y - 4 - lift, x - dir * 6, y - lift, 1.3), tones); // thumb
}

export interface MonsterFrame {
  /** 0..MONSTER_FRAMES-1, crawl phase. */
  phase: number;
  /** Head tilt in radians (the head "does not belong to the body"). */
  tilt: number;
}

/** A lock of hair: a thick wavy band that thins toward its tip. */
function lockPath(b: Buf, x0: number, y0: number, len: number, drop: number, amp: number, phase: number, r0: number, tones: Tones): void {
  const steps = Math.ceil(len / 1.5);
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([x0 - t * len, y0 + t * drop + Math.sin(t * Math.PI * 1.6 + phase) * amp * t, Math.max(1.2, r0 * (1 - t * t * 0.75))]);
  }
  const test: Test = (x, y) => pts.some(([px, py, r]) => (x - px) ** 2 + (y - py) ** 2 <= r * r);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [px, py, r] of pts) {
    minX = Math.min(minX, px - r);
    maxX = Math.max(maxX, px + r);
    minY = Math.min(minY, py - r);
    maxY = Math.max(maxY, py + r);
  }
  paint(b, test, tones, { x0: Math.floor(minX) - 1, y0: Math.floor(minY) - 1, x1: Math.ceil(maxX) + 2, y1: Math.ceil(maxY) + 2 });
}

export function drawMonster(put: (x: number, y: number, c: string) => void, f: MonsterFrame): void {
  const b = new Buf(MONSTER_W, MONSTER_H);
  const ph = (f.phase / MONSTER_FRAMES) * Math.PI * 2;
  const bob = Math.round(Math.sin(ph * 2) * 1.5);

  // key points (facing right): a hunched body, the shoulders high, a big head low and forward
  const shoulder: [number, number] = [112, 50 + bob];
  const hip: [number, number] = [64, 64 + bob];
  const headC: [number, number] = [140, 46 + bob];

  // ---- 1. the long hair behind the body: many wavy locks from the crown back to the floor
  for (let k = 0; k < 12; k++) {
    const tones: Tones = k % 3 === 0 ? [P.hairDeep, P.hair[0], P.hair[1]] : P.hair;
    lockPath(b, headC[0] - 12 + (k % 3) * 2, headC[1] - 20 + k * 2.4, 66 + (k % 4) * 9, 20 + k * 3.2, 3 + (k % 3), ph + k * 0.9, 9.5 - (k % 3), tones);
  }

  // ---- 2. far arm (behind the body, darker)
  const farReach = Math.sin(ph + Math.PI) * 8;
  const farLift = Math.max(0, Math.cos(ph + Math.PI)) * 5;
  const fs: [number, number] = [shoulder[0] - 2, shoulder[1] + 4];
  const fe: [number, number] = [shoulder[0] + 4 + farReach * 0.3, shoulder[1] + 30 - farLift];
  const fh: [number, number] = [shoulder[0] + 10 + farReach, GROUND - 1];
  paint(b, any(capsule(fs[0], fs[1], fe[0], fe[1], 4, 3), capsule(fe[0], fe[1], fh[0], fh[1] - 4 - farLift, 3, 2.4)), P.skinFar);
  hand(b, fh[0], fh[1], 1, P.skinFar, farLift);

  // ---- 3. folded legs: thigh down to the knee on the floor, shin and shoe back
  const kneeX = 60 + Math.sin(ph) * 2;
  paint(b, capsule(hip[0] + 2, hip[1] + 6, kneeX, GROUND - 4, 6.5, 5), P.skinFar);
  paint(b, capsule(kneeX, GROUND - 4, 44, GROUND - 8, 4.5, 3.4), P.skin);
  paint(b, poly([[37, GROUND - 13], [45, GROUND - 12], [45, GROUND - 5], [36, GROUND - 6]]), P.navy);

  // ---- 4. torso: rounded hunched back in the blazer, the pleated skirt at the hips
  const back = any(ellipse(90, 56 + bob, 30, 16), ellipse(shoulder[0], shoulder[1] + 6, 14, 15));
  paint(b, back, P.navy);
  const skirt = ellipse(hip[0] + 2, hip[1] + 4, 16, 11);
  paint(b, skirt, P.navy);
  for (let x = hip[0] - 10; x < hip[0] + 14; x += 5) strand(b, [[x, hip[1] - 2], [x + 2, hip[1] + 13]], P.navy[0], skirt);
  // collar and the red bow, half hidden under the chin
  paint(b, poly([[shoulder[0] + 10, shoulder[1] - 4], [shoulder[0] + 20, shoulder[1] + 2], [shoulder[0] + 12, shoulder[1] + 12]]), P.white);
  for (const [dx, dy] of [
    [0, 0], [-2, -1], [-3, 0], [-2, 1], [2, -1], [3, 0], [2, 1], [0, 1], [-1, 3], [1, 3], [0, 4],
  ] as const)
    b.set(shoulder[0] + 15 + dx, shoulder[1] + 10 + dy, P.red);

  // ---- 5. near arm: puffed sleeve, a long pale arm reaching forward, claws in the floor
  const reach = Math.sin(ph) * 10;
  const lift = Math.max(0, Math.cos(ph)) * 7;
  const ns: [number, number] = [shoulder[0] + 4, shoulder[1] + 6];
  const ne: [number, number] = [shoulder[0] + 24 + reach * 0.4, shoulder[1] + 30 - lift];
  const nh: [number, number] = [shoulder[0] + 46 + reach, GROUND - 1];
  paint(b, ellipse(ns[0], ns[1] + 2, 9, 9), P.navy);
  flat(b, capsule(ns[0] + 2, ns[1] + 10, ns[0] + 9, ns[1] + 8, 1.5), P.white[1]);
  paint(b, any(capsule(ns[0] + 5, ns[1] + 9, ne[0], ne[1], 3.6, 3), capsule(ne[0], ne[1], nh[0] - 3, nh[1] - 4 - lift, 3, 2.4)), P.skin);
  hand(b, nh[0], nh[1], 1, P.skin, lift);

  // ---- 6. the head, big, drawn in its own frame so it can tilt away from the body
  const head = new Buf(76, 76);
  const hc = { x: 36, y: 36 };
  const face = any(ellipse(hc.x + 6, hc.y + 3, 18, 20), poly([[hc.x + 8, hc.y + 16], [hc.x + 22, hc.y + 10], [hc.x + 14, hc.y + 25]]));
  paint(head, face, P.skin);
  paint(head, ellipse(hc.x - 10, hc.y + 4, 3, 5), P.skin); // ear
  // hollow eyes (the far one narrower: three-quarter view), a gaping mouth, dark streaks
  flat(head, ellipse(hc.x + 8, hc.y + 1, 5.5, 7.5), P.hole);
  flat(head, ellipse(hc.x + 19, hc.y + 2, 3.8, 6.8), P.hole);
  flat(head, ellipse(hc.x + 14, hc.y + 16, 4.2, 8), P.hole);
  for (const [x, y0, len] of [
    [hc.x + 6, hc.y + 8, 11], [hc.x + 9, hc.y + 9, 7], [hc.x + 19, hc.y + 8, 6], [hc.x + 13, hc.y + 24, 7], [hc.x + 16, hc.y + 23, 4],
  ] as const)
    for (let k = 0; k < len; k++) head.set(x + (k > len / 2 ? 1 : 0), y0 + k, P.drip);
  // hair: a rounded crown, bangs down to the eyes, a lock past the ear
  const crown = any(ellipse(hc.x - 3, hc.y - 6, 20, 17), poly([[hc.x - 22, hc.y - 6], [hc.x - 16, hc.y + 28], [hc.x - 6, hc.y + 32], [hc.x - 6, hc.y + 2]]));
  const bangs = poly([
    [hc.x - 6, hc.y - 22], [hc.x + 18, hc.y - 15], [hc.x + 22, hc.y - 5], [hc.x + 19, hc.y - 7], [hc.x + 17, hc.y - 2],
    [hc.x + 14, hc.y - 8], [hc.x + 10, hc.y - 3], [hc.x + 7, hc.y - 9], [hc.x + 3, hc.y - 5],
  ]);
  const lock = poly([[hc.x - 6, hc.y - 6], [hc.x - 1, hc.y + 4], [hc.x - 1, hc.y + 30], [hc.x - 5, hc.y + 38], [hc.x - 10, hc.y + 24]]);
  const hairMask = any(crown, bangs, lock);
  for (let y = 0; y < head.h; y++)
    for (let x = 0; x < head.w; x++) {
      if (!hairMask(x, y)) continue;
      if (face(x, y) && !bangs(x, y) && !lock(x, y) && x > hc.x - 4) continue; // the face shows through
      head.set(x, y, !hairMask(x + 2, y + 2) ? P.hair[0] : !hairMask(x - 1, y - 1) ? P.hair[2] : P.hair[1]);
    }
  for (let i = 0; i < 7; i++) strand(head, [[hc.x - 18 + i * 4, hc.y - 20], [hc.x - 16 + i * 5, hc.y + 6 + i * 2]], P.hair[0], hairMask);
  strand(head, [[hc.x - 4, hc.y - 4], [hc.x - 3, hc.y + 32]], P.hair[2], lock);
  const bow = (x: number, y: number, t: Tones, s = 1) => {
    paint(head, poly([[x, y], [x - 10 * s, y - 7 * s], [x - 9 * s, y + 4 * s]]), t);
    paint(head, poly([[x, y], [x + 10 * s, y - 7 * s], [x + 9 * s, y + 4 * s]]), t);
    paint(head, ellipse(x, y, 2.8 * s, 2.8 * s), t);
  };
  bow(hc.x - 10, hc.y - 22, P.blue);
  bow(hc.x + 8, hc.y - 25, P.green, 0.85);
  for (const [dx, dy] of [
    [0, -3], [-1, -2], [1, -2], [-2, -1], [2, -1], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
  ] as const)
    head.set(hc.x + 14 + dx, hc.y - 12 + dy, '#e8303a');
  for (let a = 0; a < 8; a++) head.set(hc.x + 17 + Math.round(Math.cos((a / 8) * Math.PI * 2) * 2), hc.y - 9 + Math.round(Math.sin((a / 8) * Math.PI * 2) * 2), '#f0c830');
  // paste the head rotated around the neck by the tilt (inverse mapping, nearest)
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  const pivot = { x: hc.x - 8, y: hc.y + 20 };
  for (let y = -12; y < 88; y++)
    for (let x = -12; x < 88; x++) {
      const lx = x - pivot.x;
      const ly = y - pivot.y;
      const col = head.get(Math.round(c * lx + s * ly + pivot.x), Math.round(-s * lx + c * ly + pivot.y));
      if (col) b.set(headC[0] - hc.x + x, headC[1] - hc.y + y, col);
    }
  // a few locks falling over the near shoulder in front of the body
  for (let k = 0; k < 3; k++) lockPath(b, headC[0] - 20 + k * 3, headC[1] - 6 + k * 3, 32 + k * 5, 28 - k * 3, 3, ph + k, 6 - k * 0.8, P.hair);

  // ---- 7. outline the silhouette
  const out: [number, number][] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (b.get(x, y)) continue;
      if (b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1) || b.get(x, y + 1)) out.push([x, y]);
    }
  for (const [x, y] of out) b.set(x, y, P.line);
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const col = b.get(x, y);
      if (col) put(x, y, col);
    }
}

const cache = new Map<string, HTMLCanvasElement>();

/** Cached canvas for one monster frame (tilt is quantised to keep the cache small). */
export function monsterFrame(phase: number, tilt: number): HTMLCanvasElement {
  const q = Math.round(tilt * 10) / 10;
  const key = `${phase}|${q}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = MONSTER_W;
  c.height = MONSTER_H;
  const ctx = c.getContext('2d')!;
  drawMonster((x, y, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  }, { phase, tilt: q });
  cache.set(key, c);
  return c;
}
