// Far background of «Выход», drawn once: candy wallpaper zones (gingham,
// stripes, polka dots, stars) climbing from mint at the floor through
// pink and lavender to plum, with lace edges between them, and the dark
// glass of the monitor at the very top. On top — a crowd of stickers:
// rainbows, star clouds, bunting, hearts, lollipops, candies, ice cream,
// alphabet cubes and smiling geometric shapes. Stickers have light edges,
// platforms have dark ones, so the way up always reads.
import { mix, rng, shade } from '../render/painter';
import type { Pal } from './exit-art';
import { CANDY, disc, FACE_TRI, HEART, ICECREAM, LETTERS, poly, px, shape, SPARKLE, STAR, sticker, type Ctx } from './exit-pixels';

type Pattern = (x: number, y: number) => string;

function zones(P: Pal): Pattern[] {
  const gingham = (a: string, b: string): Pattern => {
    const mid = mix(a, b, 0.5);
    return (x, y) => {
      const u = Math.floor(x / 8) % 2;
      const v = Math.floor(y / 8) % 2;
      return u && v ? b : u || v ? mid : a;
    };
  };
  const stripes = (a: string, b: string, w: number, diag: boolean): Pattern => (x, y) => (Math.floor((diag ? x + y : x) / w) % 2 ? b : a);
  const dots = (a: string, b: string, step: number): Pattern => (x, y) => {
    const row = Math.floor(y / step);
    const dx = ((x + (row % 2) * (step / 2)) % step) - step / 2;
    const dy = (y % step) - step / 2;
    return dx * dx + dy * dy <= 5 ? b : a;
  };
  return [
    gingham(shade(P.mint, 0.25), shade(P.mint, -0.08)),
    stripes(shade(P.lemon, 0.3), P.lemon, 6, false),
    dots(P.baby, shade(P.pink, 0.35), 14),
    gingham(shade(P.sky, 0.3), shade(P.sky, -0.05)),
    stripes(P.lavender, shade(P.lavender, -0.08), 10, true),
    dots(shade(P.lavender, -0.25), shade(P.lavender, -0.1), 12),
    stripes(P.plum, shade(P.plum, -0.15), 12, true),
  ];
}

export function buildSky(P: Pal, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;

  // wallpaper zones, bottom (index 0) to top; the top 7 % is glass
  const pats = zones(P);
  const glassH = Math.round(h * 0.07);
  const zoneH = (h - glassH) / pats.length;
  const zoneAt = (y: number) => Math.min(pats.length - 1, Math.floor((h - y) / zoneH));
  for (let y = glassH; y < h; y++) {
    const pat = pats[zoneAt(y)]!;
    let run = 0;
    let col = pat(0, y);
    for (let x = 1; x <= w; x++) {
      const next = x < w ? pat(x, y) : '';
      if (next !== col) {
        px(ctx, run, y, x - run, 1, col);
        run = x;
        col = next;
      }
    }
  }
  // glass with a soft gradient into it
  px(ctx, 0, 0, w, glassH, P.glass);
  for (let k = 0; k < 8; k++) px(ctx, 0, glassH + k * 3, w, 2, mix(P.glass, P.plum, k / 8));
  // lace edges between zones
  for (let z = 1; z < pats.length; z++) {
    const y = Math.round(h - z * zoneH);
    const below = pats[z - 1]!;
    for (let x = 0; x < w; x += 12) disc(ctx, x + 6, y, 5, below(x + 6, y + 6));
    for (let x = 0; x < w; x += 4) px(ctx, x, y + 3, 2, 1, P.paper);
    for (let x = 2; x < w; x += 12) px(ctx, x + 4, y - 3, 1, 1, P.paper);
  }

  const r = rng(20241104);
  const edge = P.paper;
  const visible = (y: number) => y > glassH + 30 && y < h - 4;
  const pick = () => P.candy[Math.floor(r() * P.candy.length)]!;

  // rainbows
  for (let y = h * 0.14; y < h; y += 220 + r() * 100) {
    const cx = r() * w;
    const R = 46 + r() * 36;
    [edge, ...P.rainbow, edge].forEach((col, k) => {
      const rr = R - k * 4 + 4;
      for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.6 / rr) for (let d = 0; d < (k === 0 || k === 7 ? 1 : 4); d++) px(ctx, cx + Math.cos(a) * (rr - d), y + Math.sin(a) * (rr - d), 1, 1, col);
    });
    for (const s of [-1, 1]) {
      const fx = cx + s * (R - 12);
      for (let k = 0; k < 4; k++) disc(ctx, fx + (k - 1.5) * 7, y + 2 - (k % 2) * 2, 6, edge);
    }
  }
  // bunting garlands
  for (let y = h * 0.12; y < h; y += 150 + r() * 80) {
    const x0 = r() * w * 0.5 - 40;
    const len = 140 + r() * 200;
    for (let x = 0; x < len; x++) px(ctx, x0 + x, y + Math.sin((x / len) * Math.PI) * 16, 1, 1, shade(P.plum, 0.2));
    for (let x = 6, k = 0; x < len - 6; x += 12, k++) {
      const yy = y + Math.sin((x / len) * Math.PI) * 16;
      poly(
        ctx,
        [
          [x0 + x - 5, yy],
          [x0 + x + 5, yy],
          [x0 + x, yy + 10],
        ],
        edge,
      );
      poly(
        ctx,
        [
          [x0 + x - 4, yy],
          [x0 + x + 4, yy],
          [x0 + x, yy + 8],
        ],
        P.candy[k % P.candy.length]!,
      );
    }
  }
  // star clouds
  for (let i = 0; i < h / 70; i++) {
    const x = r() * w;
    const y = r() * h;
    if (!visible(y)) continue;
    for (let k = 0; k < 4; k++) disc(ctx, x + k * 8, y - (k % 2 ? 4 : 0), 7, edge);
    for (let k = 0; k < 4; k++) disc(ctx, x + k * 8, y - (k % 2 ? 4 : 0) + 1, 5, shade(P.lavender, 0.5));
    sticker(ctx, STAR, x + 6, y - 18, { x: shade(P.lemon, -0.1), o: '#ffffff' }, edge, r() < 0.3 ? 2 : 1);
  }
  // a crowd of stickers
  const stickers = Math.round(h / 14);
  for (let i = 0; i < stickers; i++) {
    const x = r() * (w - 16);
    const y = r() * h;
    if (!visible(y)) continue;
    const col = pick();
    const big = r() < 0.25 ? 2 : 1;
    switch (Math.floor(r() * 9)) {
      case 0:
        sticker(ctx, HEART, x, y, { x: col, o: '#ffffff' }, edge, big);
        break;
      case 1:
        sticker(ctx, STAR, x, y, { x: col, o: '#ffffff' }, edge, big);
        break;
      case 2:
        px(ctx, x, y, 1, 16, edge);
        disc(ctx, x, y, 7, edge);
        disc(ctx, x, y, 6, col);
        disc(ctx, x, y, 4, P.paper);
        disc(ctx, x, y, 2, pick());
        break;
      case 3:
        sticker(ctx, CANDY, x, y, { x: col, o: P.paper }, edge, big);
        break;
      case 4:
        sticker(ctx, ICECREAM, x, y, { x: col, o: '#ffffff', c: shade(P.orange, 0.2) }, edge, big);
        break;
      case 5: {
        const s = 12 * big;
        px(ctx, x - 1, y - 1, s + 2, s + 2, edge);
        px(ctx, x, y, s, s, col);
        px(ctx, x, y, s, 1, shade(col, 0.5));
        sticker(ctx, LETTERS[i % LETTERS.length]!, x + 3 * big, y + 3 * big, { x: P.paper }, shade(col, -0.3), big);
        break;
      }
      case 6:
        sticker(ctx, FACE_TRI, x, y, { x: col, o: P.ink }, edge, big);
        break;
      case 7: {
        const R = 6 * big;
        disc(ctx, x, y, R + 1, edge);
        disc(ctx, x, y, R, col);
        px(ctx, x - 2 * big, y - big, big, big, P.ink);
        px(ctx, x + big, y - big, big, big, P.ink);
        px(ctx, x - big, y + 2 * big, 2 * big, 1, P.ink);
        break;
      }
      default:
        sticker(ctx, SPARKLE, x, y, { x: col, o: '#ffffff' }, edge);
    }
  }
  // geometric outlines (it is a geometry app)
  for (let i = 0; i < h / 120; i++) {
    const x = r() * w;
    const y = r() * h;
    if (!visible(y)) continue;
    drawOutline(ctx, shape(x, y, 10 + r() * 10, 3 + Math.floor(r() * 4), r() * Math.PI), edge);
  }
  return c;
}

function drawOutline(ctx: Ctx, pts: [number, number][], col: string): void {
  pts.forEach(([ax, ay], k) => {
    const [bx, by] = pts[(k + 1) % pts.length]!;
    const n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let s = 0; s <= n; s++) px(ctx, ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n, 1, 1, col);
  });
}
