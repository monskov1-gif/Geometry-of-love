// Pixel painter: integer-coordinate drawing on a low-resolution canvas.
// Gradients are made of a few palette colours with ordered (Bayer) dithering,
// so scenes keep a hand-made pixel-art look instead of smooth web gradients.

export const VIEW_W = 384;
export const VIEW_H = 216;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Ordered-dither threshold for a pixel (0..1). */
export const bayer = (x: number, y: number) => BAYER4[((y & 3) << 2) | (x & 3)]!;

/** Deterministic PRNG (mulberry32): the same seed always draws the same scene. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

type RGB = [number, number, number];

export function hex(c: string): RGB {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function toHex([r, g, b]: RGB): string {
  return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
}

/** Mix two colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export const shade = (c: string, t: number) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

export interface Pt {
  x: number;
  y: number;
}

export class Painter {
  readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly canvas: HTMLCanvasElement | OffscreenCanvas,
    readonly w = canvas.width,
    readonly h = canvas.height,
  ) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  px(x: number, y: number, color: string): void {
    this.rect(x, y, 1, 1, color);
  }

  /** Bresenham line, 1px, no anti-aliasing. */
  line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.ctx.fillStyle = color;
    for (let guard = 0; guard < 4000; guard++) {
      this.ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Scanline polygon fill on integer rows; `fill(x, y)` may return a colour per pixel (for dithering). */
  poly(points: Pt[], fill: string | ((x: number, y: number) => string | null)): void {
    if (points.length < 3) return;
    const ys = points.map((p) => p.y);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i]!;
        const b = points[(i + 1) % points.length]!;
        if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) xs.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k]!));
        const xb = Math.min(this.w, Math.round(xs[k + 1]!));
        if (xb <= xa) continue;
        if (typeof fill === 'string') this.rect(xa, y, xb - xa, 1, fill);
        else
          for (let x = xa; x < xb; x++) {
            const c = fill(x, y);
            if (c) this.px(x, y, c);
          }
      }
    }
  }

  /** Dithered blend between two colours; `t(x, y)` in 0..1 (0 = a). */
  dither(x: number, y: number, w: number, h: number, a: string, b: string, t: (x: number, y: number) => number): void {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) this.px(xx, yy, t(xx, yy) > bayer(xx, yy) ? b : a);
  }

  /** Vertical gradient through several colours, dithered between neighbours. */
  vgrad(x: number, y: number, w: number, h: number, colors: string[]): void {
    const n = colors.length - 1;
    for (let yy = 0; yy < h; yy++) {
      const f = (yy / Math.max(1, h - 1)) * n;
      const i = Math.min(n - 1, Math.floor(f));
      const t = f - i;
      for (let xx = 0; xx < w; xx++) {
        const X = x + xx;
        const Y = y + yy;
        this.px(X, Y, t > bayer(X, Y) ? colors[i + 1]! : colors[i]!);
      }
    }
  }

  /** Soft light/shadow pool: smooth falloff quantised to 6 levels, edges dithered. */
  pool(cx: number, cy: number, rx: number, ry: number, color: string, strength: number, mode: GlobalCompositeOperation = 'lighter'): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = color;
    const LEVELS = 6;
    const rows: { x: number; y: number }[][] = Array.from({ length: LEVELS + 1 }, () => []);
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(this.h - 1, cy + ry); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(this.w - 1, cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const f = 1 - (dx * dx + dy * dy);
        if (f <= 0) continue;
        const level = Math.min(LEVELS, Math.floor(f * f * LEVELS + bayer(x, y)));
        if (level > 0) rows[level]!.push({ x, y });
      }
    rows.forEach((pts, level) => {
      if (!level || !pts.length) return;
      ctx.globalAlpha = (strength * level) / LEVELS;
      for (const p of pts) ctx.fillRect(p.x, p.y, 1, 1);
    });
    ctx.restore();
  }

  /** Fills the whole canvas with a colour using a blend mode (ambient light / tint). */
  wash(color: string, alpha: number, mode: GlobalCompositeOperation): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
  }

  /** Translucent polygon (light shafts). */
  glowPoly(points: Pt[], color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    this.poly(points, (x, y) => (bayer(x, y) < 0.6 ? color : null));
    ctx.restore();
  }
}
