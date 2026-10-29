// Pixel-exact rasterisers for canvas art: hearts, stars, circles, polygons and
// thresholded text, so stickers, wallpapers and mini-game backdrops stay crisp
// pixel art (no anti-aliased edges) at any size. Shared by the 3D candy
// textures and the canvas mini-games.

type Ctx = CanvasRenderingContext2D;

/** Fills every pixel of the box [x0, x0 + w) × [y0, y0 + h) whose centre passes `inside(u, v)` (u, v in −1…1). */
export function fillTest(ctx: Ctx, x0: number, y0: number, w: number, h: number, color: string, inside: (u: number, v: number) => boolean): void {
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = ((x + 0.5) / w) * 2 - 1;
      const v = ((y + 0.5) / h) * 2 - 1;
      if (inside(u, v)) ctx.fillRect(Math.round(x0) + x, Math.round(y0) + y, 1, 1);
    }
}

export const inCircle = (u: number, v: number) => u * u + v * v <= 1;

/** Classic heart curve, point up = false (lobes on top). */
export const inHeart = (u: number, v: number) => {
  const x = u * 1.25;
  const y = -v * 1.25 + 0.25;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
};

function inPoly(pts: [number, number][], u: number, v: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function starPoints(n = 5, inner = 0.45, rot = -Math.PI / 2): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : 1;
    const a = rot + (i * Math.PI) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 1.05 + 0.06]);
  }
  return pts;
}

export const inStar = (n = 5, inner = 0.45) => {
  const pts = starPoints(n, inner);
  return (u: number, v: number) => inPoly(pts, u, v);
};

export const inTriangle = (u: number, v: number) => inPoly([[0, -0.95], [0.95, 0.85], [-0.95, 0.85]], u, v);
export const inDiamond = (u: number, v: number) => Math.abs(u) + Math.abs(v) <= 1;

/** Shape with a die-cut sticker border: the outline colour one pixel wider all round. */
export function sticker(ctx: Ctx, x: number, y: number, w: number, h: number, inside: (u: number, v: number) => boolean, fill: string, edge: string, border = 2): void {
  fillTest(ctx, x - border, y - border, w + border * 2, h + border * 2, edge, inside);
  fillTest(ctx, x, y, w, h, fill, inside);
}

let scratch: HTMLCanvasElement | null = null;

/**
 * Pixel text: drawn large in a scratch canvas, then copied pixel by pixel with an
 * alpha threshold, so in-world signs and letters on toys have hard pixel edges.
 * (Art inside the picture — UI text is never drawn this way.)
 */
export function pixelText(ctx: Ctx, text: string, x: number, y: number, px: number, color: string, { align = 'left' as CanvasTextAlign, bold = true, font = 'sans-serif' } = {}): number {
  scratch ??= document.createElement('canvas');
  const s = scratch.getContext('2d', { willReadFrequently: true })!;
  s.font = `${bold ? 'bold ' : ''}${px}px ${font}`;
  const w = Math.ceil(s.measureText(text).width) + 2;
  const h = Math.ceil(px * 1.3) + 2;
  scratch.width = Math.max(1, w);
  scratch.height = Math.max(1, h);
  s.font = `${bold ? 'bold ' : ''}${px}px ${font}`;
  s.textBaseline = 'top';
  s.fillStyle = '#fff';
  s.fillText(text, 1, 1);
  const img = s.getImageData(0, 0, w, h).data;
  const ox = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.fillStyle = color;
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) if (img[(yy * w + xx) * 4 + 3]! > 110) ctx.fillRect(Math.round(ox) + xx, Math.round(y) + yy, 1, 1);
  return w;
}

/** A smiley (or a not-quite-right face): dot eyes, curved mouth. */
export function smiley(ctx: Ctx, cx: number, cy: number, r: number, ink: string, { wrong = false } = {}): void {
  ctx.fillStyle = ink;
  const e = Math.max(1, Math.round(r / 4));
  const ex = Math.round(r * 0.38);
  const ey = Math.round(r * 0.3);
  if (wrong) {
    // eyes too far apart and too wide open, one pupil drifting
    ctx.fillRect(cx - ex - e - 1, cy - ey - e, e * 2 + 1, e * 2 + 1);
    ctx.fillRect(cx + ex, cy - ey - e + 1, e * 2 + 1, e * 2 + 1);
  } else {
    ctx.fillRect(cx - ex - e, cy - ey - e, e, e * 2);
    ctx.fillRect(cx + ex, cy - ey - e, e, e * 2);
  }
  const mw = Math.round(r * 0.6);
  for (let x = -mw; x <= mw; x++) {
    const yy = Math.round(cy + r * 0.25 + Math.sqrt(Math.max(0, 1 - (x / mw) ** 2)) * r * 0.25 * (wrong ? 1.6 : 1));
    ctx.fillRect(cx + x, yy, 1, Math.max(1, Math.round(e * 0.7)));
  }
  if (wrong) for (let x = -mw + 1; x < mw; x += 2) ctx.fillRect(cx + x, Math.round(cy + r * 0.3), 1, Math.round(r * 0.25));
}
