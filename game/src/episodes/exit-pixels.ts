// Tiny pixel-art toolkit for the «Выход» canvas: whole-pixel rectangles,
// string bitmaps (hearts, stars, letters), discs and filled polygons.
// Everything snaps to integer pixels so the art stays crisp.

export type Ctx = CanvasRenderingContext2D;

export function px(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Draws a string bitmap. Each character maps to a colour in `colors`
 * ('.' and ' ' are transparent). `scale` repeats every pixel.
 */
export function bitmap(ctx: Ctx, rows: readonly string[], x: number, y: number, colors: Record<string, string>, scale = 1): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = colors[row[i]!];
      if (c) px(ctx, ox + i * scale, oy + j * scale, scale, scale, c);
    }
  });
}

/** Filled pixel disc. */
export function disc(ctx: Ctx, cx: number, cy: number, r: number, c: string): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    px(ctx, x0 - half, y0 + dy, half * 2 + 1, 1, c);
  }
}

/** One-pixel ring. */
export function ring(ctx: Ctx, cx: number, cy: number, r: number, c: string, dashed = false): void {
  const steps = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < steps; i++) {
    if (dashed && i % 4 > 1) continue;
    const a = (i / steps) * Math.PI * 2;
    px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, c);
  }
}

/** Scanline fill of a polygon with whole-pixel spans. */
export function poly(ctx: Ctx, pts: readonly [number, number][], c: string): void {
  const ys = pts.map((p) => p[1]);
  const top = Math.floor(Math.min(...ys));
  const bottom = Math.ceil(Math.max(...ys));
  ctx.fillStyle = c;
  for (let y = top; y <= bottom; y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[(i + 1) % pts.length]!;
      if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) xs.push(x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.round(xs[k]!);
      const b = Math.round(xs[k + 1]!);
      if (b > a) ctx.fillRect(a, y, b - a, 1);
    }
  }
}

/** Regular polygon / star points around (cx, cy). */
export function shape(cx: number, cy: number, r: number, sides: number, angle: number, inner = 0): [number, number][] {
  const pts: [number, number][] = [];
  const n = inner > 0 ? sides * 2 : sides;
  for (let i = 0; i < n; i++) {
    const rr = inner > 0 && i % 2 === 1 ? inner : r;
    const a = angle + (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

export function canvas(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export const HEART = ['.xx.xx.', 'xoxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
export const HEART_S = ['x.x', 'xxx', '.x.'];
export const STAR = ['....x....', '....x....', '...xxx...', 'xxxxoxxxx', '.xxxxxxx.', '..xxxxx..', '..xxxxx..', '.xxx.xxx.', '.x.....x.'];
export const STAR_S = ['..x..', '.xxx.', 'xxxxx', '.xxx.', '.x.x.'];
export const SPARKLE = ['..x..', '..x..', 'xxoxx', '..x..', '..x..'];
export const SPARKLE_S = ['.x.', 'xox', '.x.'];
export const DIAMOND = ['..x..', '.xox.', 'xooox', '.xox.', '..x..'];

/** 1-px outline around every opaque pixel of a canvas (needs a 1-px free border). */
export function outline(c: HTMLCanvasElement, color: string): void {
  const ctx = c.getContext('2d')!;
  const { width: W, height: H } = c;
  const img = ctx.getImageData(0, 0, W, H);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : img.data[(y * W + x) * 4 + 3]!);
  ctx.fillStyle = color;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ctx.fillRect(x, y, 1, 1);
}

/** A bitmap as a sticker: a light border first, then the picture. */
export function sticker(ctx: Ctx, rows: readonly string[], x: number, y: number, colors: Record<string, string>, edge: string, scale = 1): void {
  const all = Object.fromEntries(Object.keys(colors).map((k) => [k, edge]));
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    bitmap(ctx, rows, x + dx, y + dy, all, scale);
  bitmap(ctx, rows, x, y, colors, scale);
}

export const FACE_TRI = ['....x....', '...xxx...', '...xxx...', '..xxxxx..', '..xoxox..', '.xxxxxxx.', '.xxxooxx.', 'xxxxxxxxx'];
export const CANDY = ['x.xxxx.x', 'xxxooxxx', 'xxxxxxxx', 'x.xxxx.x'];
export const ICECREAM = ['.xxxx.', 'xxoxxx', 'xxxxxx', '.cccc.', '.cccc.', '..cc..', '..cc..'];

/** 5×5 Cyrillic letters for the alphabet blocks. */
export const LETTERS: readonly (readonly string[])[] = [
  ['.xxx.', 'x...x', 'xxxxx', 'x...x', 'x...x'], // А
  ['xxxxx', 'x....', 'xxxx.', 'x...x', 'xxxx.'], // Б
  ['xxxx.', 'x...x', 'xxxx.', 'x...x', 'xxxx.'], // В
  ['xxxxx', 'x....', 'x....', 'x....', 'x....'], // Г
  ['.xxx.', '.x.x.', '.x.x.', 'xxxxx', 'x...x'], // Д
  ['xxxxx', 'x....', 'xxxx.', 'x....', 'xxxxx'], // Е
];
