// The opening logo, drawn as a pure function of time so any moment (and the
// final frame used by the title screen) can be rendered on its own:
//   1. the heart equation is typed (DOM text, see ui/logo-intro.ts);
//   2. graph paper and axes appear;
//   3. the curve is plotted point by point, then its points line up into
//      the dotted letters «GEOMETRY OF» along the x-axis;
//   4. a bloody palm slams in from the opposite side, slides down and leaves
//      «LOVE» written in blood underneath, with drips and a smear.
// Everything is original pixel drawing; no image files are used.
import { bayer, mix, Painter, rng, VIEW_H, VIEW_W } from './painter';

export const LOGO_W = VIEW_W;
export const LOGO_H = VIEW_H;

export const EQUATION = 'f(x, y) = (x² + y² − 1)³ − x²·y³ = 0';

/** Seconds from the start of the intro. */
export const T = {
  paper: 0,
  typeStart: 0.35,
  typeStep: 0.055,
  grid: 2.45,
  axes: 2.7,
  plot: 3.25,
  plotEnd: 4.25,
  morph: 4.45,
  morphEnd: 5.6,
  slamFrom: 5.8,
  slam: 5.95,
  slideFrom: 6.3,
  slideEnd: 8.0,
  done: 8.4,
  /** Last moment anything moves (drips): the title screen shows this frame. */
  final: 10,
} as const;

export const typedChars = (t: number) =>
  Math.max(0, Math.min([...EQUATION].length, Math.floor((t - T.typeStart) / T.typeStep) + 1));

/** Sound cues, in time order; `logo-intro` plays each once as time passes it. */
export const LOGO_CUES: { at: number; sound: string }[] = [
  ...[...EQUATION].flatMap((ch, i) => (ch === ' ' ? [] : [{ at: T.typeStart + i * T.typeStep, sound: 'typewriter' }])),
  { at: T.grid, sound: 'page' },
  { at: T.plot, sound: 'notify' },
  { at: T.morph, sound: 'sparkle' },
  { at: T.slam - 0.45, sound: 'hand' },
  { at: T.slam, sound: 'slam' },
  { at: T.slam + 0.04, sound: 'splat' },
  { at: T.slideEnd + 0.2, sound: 'heartbeat' },
];

const PAPER = '#f3efe6';
const GRID_MINOR = '#dde4ea';
const GRID_MAJOR = '#bccbd8';
const INK = '#2b2d42';
const RED = '#c41e2a';
const BLOOD = ['#5a0710', '#860e1a', '#b01724', '#d8343f'] as const;

export const ORIGIN = { x: 192, y: 92 };
const GRID = 8;

// ---------- 5×7 bitmap glyphs ------------------------------------------------
const GLYPHS: Record<string, string[]> = {
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Filled cells of a word in 5×7 glyphs, 1 empty column between letters. */
export function wordCells(word: string): { cx: number; cy: number }[] {
  const cells: { cx: number; cy: number }[] = [];
  [...word].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`[logo] no glyph for "${ch}"`);
    g.forEach((row, cy) => [...row].forEach((c, x) => c === '#' && cells.push({ cx: i * 6 + x, cy })));
  });
  return cells;
}

const wordWidth = (word: string) => [...word].length * 6 - 1;

// «GEOMETRY OF»: 4px cells, sitting on the x-axis.
const TOP_CELL = 4;
const TOP_X = ORIGIN.x - Math.floor((wordWidth('GEOMETRY OF') * TOP_CELL) / 2);
const TOP_Y = ORIGIN.y - 4 - 7 * TOP_CELL;

/** Target positions of the plotted points (the dotted letters), left to right. */
export const LETTER_DOTS = wordCells('GEOMETRY OF')
  .map(({ cx, cy }) => ({ x: TOP_X + cx * TOP_CELL, y: TOP_Y + cy * TOP_CELL }))
  .sort((a, b) => a.x - b.x || a.y - b.y);

/**
 * Points of (x² + y² − 1)³ − x²y³ = 0, one per letter dot, by angle. In polar
 * form (r² − 1)³ = r⁵·cos²θ·sin³θ has one root in (0, 2) for every θ.
 */
export function heartPoints(n: number, scale = 30): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const th = Math.PI / 2 - (i / n) * Math.PI * 2; // start at the top cusp, go clockwise
    const c = Math.cos(th);
    const s = Math.sin(th);
    const f = (r: number) => (r * r - 1) ** 3 - r ** 5 * c * c * s ** 3;
    let lo = 0;
    let hi = 2;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    pts.push({ x: ORIGIN.x + lo * c * scale, y: ORIGIN.y - lo * s * scale });
  }
  return pts;
}

const HEART = heartPoints(LETTER_DOTS.length);

// «LOVE»: 5px blood cells under the axis.
const LOVE_CELL = 5;
const LOVE_X = ORIGIN.x - Math.floor((wordWidth('LOVE') * LOVE_CELL) / 2);
const LOVE_Y = 114;
const LOVE_BOTTOM = LOVE_Y + 7 * LOVE_CELL;

// The palm: offscreen sprite, fingers up, thumb on the left.
const HAND_W = 144;
const HAND_H = 160;
const HAND_OX = 14; // sprite x of the palm's local origin
const HAND_X = ORIGIN.x - 66 - HAND_OX; // palm centred on the y-axis
const LAND_Y = 102;
const SLIDE = 150;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

/** Top edge of the palm sprite at time t (null before it arrives). */
export function handTop(t: number): number | null {
  if (t < T.slamFrom) return null;
  if (t < T.slam) return LAND_Y - 190 * (1 - ((t - T.slamFrom) / (T.slam - T.slamFrom)) ** 2);
  if (t < T.slideFrom) return LAND_Y;
  const p = clamp01((t - T.slideFrom) / (T.slideEnd - T.slideFrom));
  return LAND_Y + SLIDE * p ** 1.7;
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;
function makeCanvas(w: number, h: number): Canvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

interface Layers {
  paper: Canvas;
  grid: Canvas;
  love: Canvas;
  smear: Canvas;
  hand: Canvas;
  drips: { x: number; y: number; w: number; len: number; delay: number }[];
  specks: { x: number; y: number; s: number; c: string }[];
}
let layers: Layers | null = null;

function paperLayer(): Canvas {
  const c = makeCanvas(LOGO_W, LOGO_H);
  const pt = new Painter(c);
  const r = rng(11);
  pt.rect(0, 0, LOGO_W, LOGO_H, PAPER);
  for (let i = 0; i < 900; i++) pt.px(Math.floor(r() * LOGO_W), Math.floor(r() * LOGO_H), r() < 0.5 ? '#ebe6da' : '#f8f5ee');
  return c;
}

function gridLayer(): Canvas {
  const c = makeCanvas(LOGO_W, LOGO_H);
  const pt = new Painter(c);
  for (let x = ORIGIN.x % GRID; x < LOGO_W; x += GRID) pt.rect(x, 0, 1, LOGO_H, (x - ORIGIN.x) % (GRID * 4) === 0 ? GRID_MAJOR : GRID_MINOR);
  for (let y = ORIGIN.y % GRID; y < LOGO_H; y += GRID) {
    pt.ctx.fillStyle = (y - ORIGIN.y) % (GRID * 4) === 0 ? GRID_MAJOR : GRID_MINOR;
    pt.ctx.fillRect(0, y, LOGO_W, 1);
  }
  return c;
}

/** Blood letters with ragged edges and a wet highlight. */
function loveLayer(drips: Layers['drips']): Canvas {
  const c = makeCanvas(LOGO_W, LOGO_H);
  const pt = new Painter(c);
  const r = rng(77);
  const cells = wordCells('LOVE');
  const filled = new Set(cells.map(({ cx, cy }) => `${cx},${cy}`));
  for (const { cx, cy } of cells) {
    const x = LOVE_X + cx * LOVE_CELL;
    const y = LOVE_Y + cy * LOVE_CELL;
    pt.rect(x, y, LOVE_CELL, LOVE_CELL, BLOOD[2]);
    // Ragged outer edges: bumps outward, bites inward.
    const edge = (dx: number, dy: number) => !filled.has(`${cx + dx},${cy + dy}`);
    for (let i = 0; i < LOVE_CELL; i++) {
      if (edge(0, -1) && r() < 0.35) pt.px(x + i, y - 1, BLOOD[2]);
      if (edge(-1, 0) && r() < 0.3) pt.px(x - 1, y + i, BLOOD[1]);
      if (edge(1, 0) && r() < 0.3) pt.px(x + LOVE_CELL, y + i, BLOOD[1]);
    }
    if (edge(0, -1)) for (let i = 0; i < LOVE_CELL; i++) if (r() < 0.6) pt.px(x + i, y, BLOOD[3]);
    if (edge(0, 1)) {
      pt.rect(x, y + LOVE_CELL - 1, LOVE_CELL, 1, BLOOD[1]);
      if (r() < 0.55) drips.push({ x: x + 1 + Math.floor(r() * (LOVE_CELL - 2)), y: y + LOVE_CELL, w: r() < 0.4 ? 2 : 1, len: 4 + Math.floor(r() * r() * 34), delay: r() * 1.2 });
    }
    if (r() < 0.25) pt.px(x + 1 + Math.floor(r() * 3), y + 1 + Math.floor(r() * 3), '#ee6a72');
  }
  return c;
}

/** Smooth value noise in 0..1 on a grid of `cell` pixels. */
function valueNoise(seed: number, cell: number): (x: number, y: number) => number {
  const r = rng(seed);
  const table = Array.from({ length: 64 * 64 }, () => r());
  const at = (i: number, j: number) => table[(((j % 64) + 64) % 64) * 64 + (((i % 64) + 64) % 64)]!;
  const s = (v: number) => v * v * (3 - 2 * v);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = s(fx - i);
    const v = s(fy - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return top + (bottom - top) * v;
  };
}

/** Smear the palm leaves behind as it slides: ragged streaks that run dry. */
function smearLayer(): Canvas {
  const c = makeCanvas(LOGO_W, LOGO_H);
  const pt = new Painter(c);
  const r = rng(5);
  const x0 = HAND_X + HAND_OX + 6;
  const x1 = HAND_X + HAND_OX + 106;
  const wobble = valueNoise(8, 9);
  const streak = valueNoise(9, 3);
  const columns: { v: number; len: number }[] = [];
  for (let x = x0 - 6; x < x1 + 6; x++) {
    const prev = columns.at(-1) ?? { v: 0.7, len: 60 };
    columns.push({
      v: clamp01(prev.v * 0.7 + 0.15 + r() * 0.3 - (r() < 0.07 ? 0.45 : 0)),
      len: Math.max(12, prev.len * 0.6 + (20 + r() * 80) * 0.4 + (r() < 0.1 ? 30 : 0)),
    });
  }
  for (let y = LOVE_BOTTOM; y < LOGO_H; y++) {
    const dy = y - LOVE_BOTTOM;
    const left = x0 + (wobble(0, y) - 0.5) * 10 + dy * 0.04;
    const right = x1 + (wobble(40, y) - 0.5) * 10 - dy * 0.06;
    for (let x = x0 - 6; x < x1 + 6; x++) {
      if (x < left || x > right) continue;
      const col = columns[x - x0 + 6]!;
      const life = 1 - dy / col.len;
      if (life <= 0 || dy < Math.floor(wobble(x, 90) * 5)) continue;
      let v = col.v * (0.3 + 0.6 * life) * (0.75 + streak(x, y * 0.25) * 0.5);
      v += (bayer(x, y) - 0.5) * 0.3;
      const color = v > 0.85 ? BLOOD[1] : v > 0.62 ? BLOOD[2] : v > 0.4 ? '#c9545c' : v > 0.24 ? '#e3a7a7' : null;
      if (color) pt.px(x, y, color);
    }
  }
  return c;
}

function handLayer(): Canvas {
  const c = makeCanvas(HAND_W, HAND_H);
  const pt = new Painter(c);
  const o = HAND_OX;
  const fingers = [
    { x: 13, w: 24, top: 16 },
    { x: 41, w: 25, top: 0 },
    { x: 70, w: 24, top: 8 },
    { x: 98, w: 21, top: 28 },
  ];
  const inside = (x: number, y: number): boolean => {
    const lx = x - o;
    // palm with rounded lower corners
    if (lx >= 10 && lx < 120 && y >= 74 && y < HAND_H) {
      const cy = HAND_H - 18;
      if (y > cy) {
        const dx = lx < 28 ? 28 - lx : lx > 102 ? lx - 102 : 0;
        if (dx * dx + (y - cy) ** 2 > 18 * 18) return false;
      }
      return true;
    }
    for (const f of fingers) {
      const rr = f.w / 2;
      const cx = f.x + rr;
      if (lx >= f.x && lx < f.x + f.w && y >= f.top + rr && y < 80) return true;
      if ((lx - cx + 0.5) ** 2 + (y - f.top - rr) ** 2 <= rr * rr) return true;
    }
    // thumb: a slanted capsule from the palm's left side
    const ax = 14;
    const ay = 116;
    const bx = -6;
    const by = 74;
    const t = clamp01(((lx - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2));
    const dx = lx - (ax + (bx - ax) * t);
    const dy = y - (ay + (by - ay) * t);
    return dx * dx + dy * dy <= 11 * 11;
  };
  const coatNoise = valueNoise(31, 6);
  const fine = valueNoise(32, 2);
  const sparkle = rng(33);
  for (let y = 0; y < HAND_H; y++) {
    for (let x = 0; x < HAND_W; x++) {
      if (!inside(x, y)) continue;
      const border = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (border) {
        pt.px(x, y, '#2a0306');
        continue;
      }
      // Pale skin under a coat of blood; the coat is thickest on the palm.
      const lx = x - o;
      const shadow = !inside(x + 3, y) || !inside(x, y + 3);
      const light = !inside(x - 3, y) && inside(x + 3, y);
      const coat = (y > 74 ? 0.8 : 0.66) + (coatNoise(x, y) - 0.5) * 0.85 + (fine(x, y) - 0.5) * 0.2 + (bayer(x, y) - 0.5) * 0.12;
      let color = coat > 0.56 ? BLOOD[2] : coat > 0.47 ? '#b4424a' : coat > 0.4 ? '#cf8a80' : '#e6cbbb';
      if (coat > 0.56 && shadow) color = BLOOD[1];
      else if (coat > 0.56 && light) color = BLOOD[3];
      // palm creases (soft curves)
      const crease1 = Math.abs(y - (104 + ((lx - 62) / 46) ** 2 * -10 + (lx - 20) * 0.12)) < 0.8 && lx > 22 && lx < 108;
      const crease2 = Math.abs(y - (120 + ((lx - 76) / 40) ** 2 * -8)) < 0.8 && lx > 40 && lx < 114;
      const crease3 = Math.abs(lx - (36 + ((y - 110) / 40) ** 2 * 14)) < 0.8 && y > 96 && y < 150;
      if (crease1 || crease2 || crease3) color = BLOOD[0];
      // finger joints
      for (const f of fingers) if (lx > f.x + 3 && lx < f.x + f.w - 3 && (y === f.top + 24 || y === f.top + 46)) color = BLOOD[1];
      if (coat > 0.6 && sparkle() > 0.993) color = '#f07a80';
      pt.px(x, y, color);
    }
  }
  return c;
}

function buildLayers(): Layers {
  const drips: Layers['drips'] = [];
  const love = loveLayer(drips);
  const r = rng(404);
  const specks: Layers['specks'] = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = 62 + r() * r() * 70;
    specks.push({
      x: Math.round(ORIGIN.x + Math.cos(a) * d * 1.2),
      y: Math.round(LAND_Y + 70 + Math.sin(a) * d * 0.8),
      s: r() < 0.2 ? 2 : 1,
      c: r() < 0.5 ? BLOOD[1] : BLOOD[2],
    });
  }
  return { paper: paperLayer(), grid: gridLayer(), love, smear: smearLayer(), hand: handLayer(), drips, specks };
}

function axes(pt: Painter, t: number): void {
  const p = easeInOut(clamp01((t - T.axes) / 0.55));
  if (p <= 0) return;
  const { x: ox, y: oy } = ORIGIN;
  const hx = Math.round((LOGO_W / 2 - 10) * p);
  const hy = Math.round(84 * p);
  pt.rect(ox - hx, oy, hx * 2 + 1, 1, INK);
  pt.rect(ox, oy - hy, 1, hy + Math.round(110 * p), INK);
  for (let d = 32; d <= hx; d += 32) {
    pt.rect(ox + d, oy - 1, 1, 3, INK);
    pt.rect(ox - d, oy - 1, 1, 3, INK);
  }
  for (let d = 32; d <= hy; d += 32) pt.rect(ox - 1, oy - d, 3, 1, INK);
  for (let d = 32; d <= 110 * p; d += 32) pt.rect(ox - 1, oy + d, 3, 1, INK);
  if (p < 1) return;
  // arrowheads and axis names
  const ax = ox + hx;
  for (let i = 1; i <= 3; i++) {
    pt.rect(ax - i, oy - i, 1, 1, INK);
    pt.rect(ax - i, oy + i, 1, 1, INK);
    pt.rect(ox - i, oy - hy + i, 1, 1, INK);
    pt.rect(ox + i, oy - hy + i, 1, 1, INK);
  }
  const glyph = (rows: string[], x: number, y: number) =>
    rows.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && pt.px(x + i, y + j, INK)));
  glyph(['#.#', '.#.', '#.#'], ax - 4, oy + 4); // x
  glyph(['#.#', '#.#', '.##', '..#', '##.'], ox + 4, oy - hy + 1); // y
}

function dots(pt: Painter, t: number): void {
  const n = LETTER_DOTS.length;
  if (t < T.plot) return;
  const shown = t >= T.plotEnd ? n : Math.floor(((t - T.plot) / (T.plotEnd - T.plot)) * n);
  for (let i = 0; i < shown; i++) {
    const from = HEART[i]!;
    const to = LETTER_DOTS[i]!;
    const start = T.morph + (i / n) * (T.morphEnd - T.morph - 0.5);
    const p = easeInOut(clamp01((t - start) / 0.5));
    const lift = Math.sin(Math.PI * p) * 10;
    const x = Math.round(from.x + (to.x - from.x) * p);
    const y = Math.round(from.y + (to.y - from.y) * p - lift);
    pt.rect(x - (p > 0 ? 0 : 1), y - (p > 0 ? 0 : 1), 3, 3, mix(RED, INK, p));
  }
  if (t < T.plotEnd) {
    const head = HEART[Math.max(0, shown - 1)]!;
    pt.rect(head.x - 5, head.y, 11, 1, RED);
    pt.rect(head.x, head.y - 5, 1, 11, RED);
  }
}

/** Draws the logo at time t (seconds); t < 0 is the dark "press a key" state. */
export function drawLogo(pt: Painter, t: number): void {
  layers ??= buildLayers();
  const L = layers;
  const ctx = pt.ctx;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0c0b10';
  ctx.fillRect(0, 0, LOGO_W, LOGO_H);
  if (t < 0) {
    ctx.restore();
    return;
  }
  // Camera shake right after the slam.
  if (t >= T.slam && t < T.slam + 0.35) {
    const r = rng(Math.floor(t * 60));
    const k = 1 - (t - T.slam) / 0.35;
    ctx.translate(Math.round((r() - 0.5) * 8 * k), Math.round((r() - 0.5) * 6 * k));
  }
  ctx.globalAlpha = clamp01((t - T.paper) / 0.25);
  ctx.drawImage(L.paper, 0, 0);
  ctx.globalAlpha = clamp01((t - T.grid) / 0.4);
  if (ctx.globalAlpha > 0) ctx.drawImage(L.grid, 0, 0);
  ctx.globalAlpha = 1;
  axes(pt, t);
  dots(pt, t);

  const top = handTop(t);
  if (top !== null && t >= T.slam) {
    for (const s of L.specks) pt.rect(s.x, s.y, s.s, s.s, s.c);
    // Everything above the palm's top edge has been uncovered.
    const reveal = Math.max(0, Math.min(LOGO_H, Math.round(top) + 6));
    if (reveal > LAND_Y) {
      ctx.drawImage(L.smear, 0, 0, LOGO_W, reveal, 0, 0, LOGO_W, reveal);
      ctx.drawImage(L.love, 0, 0, LOGO_W, reveal, 0, 0, LOGO_W, reveal);
      for (const d of L.drips) {
        const uncovered = T.slideFrom + clamp01((d.y - 6 - LAND_Y) / SLIDE) ** (1 / 1.7) * (T.slideEnd - T.slideFrom);
        const since = t - uncovered - d.delay;
        if (since <= 0 || d.y > reveal) continue;
        const len = Math.round(d.len * (1 - Math.exp(-since / 1.1)));
        const visible = Math.min(len, reveal - d.y);
        if (visible <= 0) continue;
        pt.rect(d.x, d.y, d.w, visible, BLOOD[2]);
        if (visible === len && len > 3) {
          pt.rect(d.x - (d.w === 1 ? 1 : 0), d.y + len - 1, d.w + (d.w === 1 ? 2 : 1), 2, BLOOD[1]);
          pt.px(d.x, d.y + len - 2, BLOOD[3]);
        }
      }
    }
  }
  if (top !== null && top < LOGO_H) {
    const x = HAND_X + (t < T.slam ? Math.round(220 * (1 - ((t - T.slamFrom) / (T.slam - T.slamFrom)) ** 2)) : 0);
    if (t < T.slam) {
      // motion trail while it falls in
      ctx.globalAlpha = 0.35;
      ctx.drawImage(L.hand, x + 24, Math.round(top) - 22);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(L.hand, x, Math.round(top));
  }
  if (t >= T.slam && t < T.slam + 0.07) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = BLOOD[2];
    ctx.fillRect(-8, -8, LOGO_W + 16, LOGO_H + 16);
  }
  ctx.restore();
}
