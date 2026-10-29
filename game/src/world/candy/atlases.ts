// Texture atlases of the candy world: alphabet-block faces and die-cut stickers.
// Each atlas is one canvas (nearest filtering) so hundreds of blocks and
// stickers render with one material. Tiles are addressed by index
// (CandyBatch `tile`). Stickers include a few "slightly wrong" ones (an eye,
// a smiley with too many teeth, a cracked heart) for the later phases.
import { rng, TX } from '../kit/location-kit';
import { CANDY, css, LOUD, PASTEL } from './palette';
import { fillTest, inCircle, inDiamond, inHeart, inStar, inTriangle, pixelText, smiley, sticker } from './shapes';

export const BLOCK_COLS = 8;
export const BLOCK_ROWS = 6;
const BT = 16;
const GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789+−×÷=π?!';
/** Tiles 0…44 are glyphs, 45 ★, 46 ♥, 47 △. */
export const BLOCK_TILES = BLOCK_COLS * BLOCK_ROWS;

const shade = (hex: number, k: number) => {
  const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((hex & 255) * k)));
  return `rgb(${r},${g},${b})`;
};

export const blockAtlas = () =>
  TX('candyBlocks', BLOCK_COLS * BT, BLOCK_ROWS * BT, (ctx) => {
    for (let t = 0; t < BLOCK_TILES; t++) {
      const x = (t % BLOCK_COLS) * BT;
      const y = Math.floor(t / BLOCK_COLS) * BT;
      const c = LOUD[(t * 5) % LOUD.length]!;
      ctx.fillStyle = shade(c, 0.72);
      ctx.fillRect(x, y, BT, BT);
      ctx.fillStyle = css(c);
      ctx.fillRect(x + 1, y + 1, BT - 2, BT - 2);
      // embossed frame: light top-left, dark bottom-right
      ctx.fillStyle = shade(c, 1.25);
      ctx.fillRect(x + 2, y + 2, BT - 4, 1);
      ctx.fillRect(x + 2, y + 2, 1, BT - 4);
      ctx.fillStyle = shade(c, 0.8);
      ctx.fillRect(x + 2, y + BT - 3, BT - 4, 1);
      ctx.fillRect(x + BT - 3, y + 2, 1, BT - 4);
      const ink = t % 3 === 0 ? '#30243b' : '#fff9fd';
      if (t < GLYPHS.length) {
        pixelText(ctx, GLYPHS[t]!, x + BT / 2 + 1, y + 3, 10, 'rgba(48,36,59,0.55)', { align: 'center' });
        pixelText(ctx, GLYPHS[t]!, x + BT / 2, y + 2, 10, ink, { align: 'center' });
      } else {
        const test = t === 45 ? inStar() : t === 46 ? inHeart : inTriangle;
        fillTest(ctx, x + 3, y + 3, 10, 10, ink, test);
      }
    }
  });

/** Random block tile per face. */
export const blockFace = (seed: number) => {
  const r = rng(seed);
  const faces = Array.from({ length: 6 }, () => Math.floor(r() * BLOCK_TILES));
  return (f: number) => faces[f % 6]!;
};

// ---------------------------------------------------------------- stickers

export const STICKER_COLS = 8;
export const STICKER_ROWS = 8;
const ST = 32;

type Draw = (ctx: CanvasRenderingContext2D, x: number, y: number, c: string, c2: string) => void;
const W = '#fff9fd';
const INK = '#30243b';

const shapes: Draw[] = [
  (ctx, x, y, c) => sticker(ctx, x + 4, y + 5, 24, 22, inHeart, c, W),
  (ctx, x, y, c) => sticker(ctx, x + 3, y + 3, 26, 26, inStar(), c, W),
  (ctx, x, y, c) => {
    sticker(ctx, x + 4, y + 4, 24, 24, inCircle, c, W);
    smiley(ctx, x + 16, y + 16, 11, INK);
  },
  (ctx, x, y, c, c2) => {
    // flower: five petals round a centre
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      sticker(ctx, x + 11 + Math.cos(a) * 8, y + 11 + Math.sin(a) * 8, 10, 10, inCircle, c, W);
    }
    fillTest(ctx, x + 11, y + 11, 10, 10, c2, inCircle);
  },
  (ctx, x, y) => {
    // rainbow arc on a cloud
    const cols = ['#ff4f6d', '#ff9a3c', '#ffd93d', '#7ee05a', '#55c9f5', '#a66bff'];
    fillTest(ctx, x + 1, y + 3, 30, 30, W, (u, v) => v < 0.15 && u * u + v * v <= 1);
    cols.forEach((c, i) => {
      const r0 = 1 - (i + 1) * 0.13;
      const r1 = 1 - i * 0.13;
      fillTest(ctx, x + 3, y + 5, 26, 26, c, (u, v) => v < 0.1 && u * u + v * v <= r1 * r1 && u * u + v * v > r0 * r0);
    });
    fillTest(ctx, x + 2, y + 15, 12, 9, W, inCircle);
    fillTest(ctx, x + 18, y + 15, 12, 9, W, inCircle);
  },
  (ctx, x, y, c) => {
    // fluffy cloud with a face
    for (const [dx, dy, s] of [
      [2, 12, 12],
      [9, 6, 15],
      [18, 10, 12],
      [6, 14, 20],
    ] as const)
      sticker(ctx, x + dx, y + dy, s, s * 0.8, inCircle, c, W);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 12, y + 17, 2, 2);
    ctx.fillRect(x + 19, y + 17, 2, 2);
    ctx.fillRect(x + 15, y + 21, 3, 1);
  },
  (ctx, x, y, c, c2) => {
    // cat face
    fillTest(ctx, x + 4, y + 3, 9, 11, W, inTriangle);
    fillTest(ctx, x + 19, y + 3, 9, 11, W, inTriangle);
    sticker(ctx, x + 5, y + 8, 22, 19, inCircle, c, W);
    fillTest(ctx, x + 6, y + 5, 6, 7, c, inTriangle);
    fillTest(ctx, x + 20, y + 5, 6, 7, c, inTriangle);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 11, y + 15, 2, 3);
    ctx.fillRect(x + 19, y + 15, 2, 3);
    ctx.fillStyle = c2;
    ctx.fillRect(x + 15, y + 19, 2, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 14, y + 21, 1, 1);
    ctx.fillRect(x + 17, y + 21, 1, 1);
  },
  (ctx, x, y, c) => {
    sticker(ctx, x + 3, y + 6, 26, 20, (u, v) => Math.abs(u) < 0.95 && Math.abs(v) < 0.9, c, W);
    pixelText(ctx, 'A+', x + 16, y + 8, 14, W, { align: 'center' });
  },
  (ctx, x, y, c) => {
    sticker(ctx, x + 2, y + 6, 28, 20, inCircle, c, W);
    pixelText(ctx, '100', x + 16, y + 10, 10, W, { align: 'center' });
  },
  (ctx, x, y, c) => sticker(ctx, x + 5, y + 3, 22, 26, inDiamond, c, W),
  (ctx, x, y, c) => {
    // triangle with eyes (a geometry friend)
    sticker(ctx, x + 3, y + 4, 26, 24, inTriangle, c, W);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 12, y + 16, 2, 3);
    ctx.fillRect(x + 18, y + 16, 2, 3);
    ctx.fillRect(x + 14, y + 21, 4, 1);
  },
  (ctx, x, y, c, c2) => {
    // ice cream
    fillTest(ctx, x + 10, y + 15, 12, 15, '#e8a05a', (u, v) => Math.abs(u) < 1 - (v + 1) / 2);
    sticker(ctx, x + 7, y + 3, 18, 16, inCircle, c, W);
    fillTest(ctx, x + 10, y + 1, 10, 9, c2, inCircle);
    ctx.fillStyle = '#ff4f6d';
    ctx.fillRect(x + 15, y, 2, 2);
  },
  (ctx, x, y, c, c2) => {
    // wrapped candy
    fillTest(ctx, x + 1, y + 10, 9, 12, c2, inTriangle);
    fillTest(ctx, x + 22, y + 10, 9, 12, c2, inTriangle);
    sticker(ctx, x + 7, y + 9, 18, 14, inCircle, c, W);
    ctx.fillStyle = W;
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 10 + i * 4, y + 11, 1, 10);
  },
  (ctx, x, y, c) => {
    // crescent moon
    fillTest(ctx, x + 3, y + 3, 26, 26, W, inCircle);
    fillTest(ctx, x + 5, y + 5, 22, 22, c, (u, v) => inCircle(u, v) && (u - 0.45) ** 2 + (v + 0.2) ** 2 > 0.5);
  },
  (ctx, x, y, c) => {
    // lightning bolt
    sticker(ctx, x + 6, y + 2, 20, 28, (u, v) => (v < 0.1 && u > -0.6 + v * 0.4 && u < 0.5 + v * 0.4) || (v >= -0.1 && u > -0.4 + v * 0.4 && u < 0.6 + v * 0.4 && v < 1), c, W);
  },
  (ctx, x, y, c, c2) => {
    // mushroom
    fillTest(ctx, x + 11, y + 16, 10, 13, W, (u) => Math.abs(u) < 0.8);
    sticker(ctx, x + 3, y + 4, 26, 16, (u, v) => v < 0.7 && inCircle(u, v * 0.9), c, W);
    ctx.fillStyle = c2;
    ctx.fillRect(x + 9, y + 8, 3, 3);
    ctx.fillRect(x + 19, y + 7, 3, 3);
    ctx.fillRect(x + 14, y + 12, 3, 2);
  },
  (ctx, x, y, c) => {
    // music note
    fillTest(ctx, x + 6, y + 18, 10, 9, c, inCircle);
    ctx.fillStyle = c;
    ctx.fillRect(x + 14, y + 4, 2, 18);
    ctx.fillRect(x + 14, y + 4, 10, 3);
    ctx.fillRect(x + 22, y + 4, 2, 8);
  },
  (ctx, x, y, c) => {
    // π badge
    sticker(ctx, x + 4, y + 4, 24, 24, inCircle, c, W);
    pixelText(ctx, 'π', x + 16, y + 6, 16, W, { align: 'center', font: 'serif' });
  },
  (ctx, x, y, c) => {
    sticker(ctx, x + 2, y + 9, 28, 14, (u, v) => Math.abs(u) < 0.95 && Math.abs(v) < 0.8, c, W);
    pixelText(ctx, '^_^', x + 16, y + 10, 10, INK, { align: 'center' });
  },
  (ctx, x, y, c, c2) => {
    // butterfly
    fillTest(ctx, x + 2, y + 5, 14, 14, c, inCircle);
    fillTest(ctx, x + 16, y + 5, 14, 14, c, inCircle);
    fillTest(ctx, x + 5, y + 17, 10, 10, c2, inCircle);
    fillTest(ctx, x + 17, y + 17, 10, 10, c2, inCircle);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 15, y + 6, 2, 20);
  },
  (ctx, x, y, c) => {
    // cherries
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(x + 15, y + 3, 2, 10);
    ctx.fillRect(x + 10, y + 10, 6, 2);
    ctx.fillRect(x + 17, y + 10, 6, 2);
    sticker(ctx, x + 4, y + 14, 12, 12, inCircle, c, W, 1);
    sticker(ctx, x + 17, y + 14, 12, 12, inCircle, c, W, 1);
  },
  (ctx, x, y, c) => {
    // sparkle (four-point star)
    sticker(ctx, x + 4, y + 4, 24, 24, inStar(4, 0.28), c, W);
  },
];

/** Slightly wrong stickers (eye, tooth smile, cracked heart, X eyes). Indices from WRONG_FIRST. */
const wrong: Draw[] = [
  (ctx, x, y) => {
    sticker(ctx, x + 2, y + 8, 28, 16, (u, v) => Math.abs(v) < 1 - u * u, W, '#30243b', 1);
    fillTest(ctx, x + 11, y + 10, 10, 12, '#ff4f6d', inCircle);
    fillTest(ctx, x + 14, y + 13, 4, 6, INK, inCircle);
  },
  (ctx, x, y, c) => {
    sticker(ctx, x + 4, y + 4, 24, 24, inCircle, c, W);
    smiley(ctx, x + 16, y + 16, 11, INK, { wrong: true });
  },
  (ctx, x, y) => {
    sticker(ctx, x + 4, y + 5, 24, 22, inHeart, '#ff6cc5', W);
    ctx.fillStyle = INK;
    for (let i = 0; i < 9; i++) ctx.fillRect(x + 15 + (i % 2 ? 1 : -1), y + 9 + i * 2, 2, 2);
  },
  (ctx, x, y, c) => {
    sticker(ctx, x + 4, y + 4, 24, 24, inCircle, c, W);
    ctx.fillStyle = INK;
    for (const ex of [10, 19])
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + ex + i, y + 10 + i, 1, 1);
        ctx.fillRect(x + ex + 3 - i, y + 10 + i, 1, 1);
      }
    ctx.fillRect(x + 11, y + 21, 10, 1);
  },
];

export const STICKER_KINDS = shapes.length;
export const WRONG_FIRST = STICKER_COLS * STICKER_ROWS - wrong.length * 2;
/** A yellow smiley (suns, clocks) and its wrong twin. */
export const SMILE_TILE = 2;
export const WRONG_SMILE_TILE = WRONG_FIRST + 1;

export const stickerAtlas = () =>
  TX('candyStickers', STICKER_COLS * ST, STICKER_ROWS * ST, (ctx) => {
    const r = rng(41);
    for (let t = 0; t < STICKER_COLS * STICKER_ROWS; t++) {
      const x = (t % STICKER_COLS) * ST;
      const y = Math.floor(t / STICKER_COLS) * ST;
      const c = t === SMILE_TILE || t === WRONG_SMILE_TILE ? css(CANDY.sunshine) : css(LOUD[(t * 7 + Math.floor(r() * 3)) % LOUD.length]!);
      const c2 = css(PASTEL[t % PASTEL.length]!);
      if (t >= WRONG_FIRST) wrong[(t - WRONG_FIRST) % wrong.length]!(ctx, x, y, c, c2);
      else shapes[t % shapes.length]!(ctx, x, y, c, c2);
    }
  });

/** A random cute sticker tile (never a wrong one). */
export const cuteSticker = (r: () => number) => Math.floor(r() * WRONG_FIRST);
/** A random wrong sticker tile. */
export const wrongSticker = (r: () => number) => WRONG_FIRST + Math.floor(r() * (STICKER_COLS * STICKER_ROWS - WRONG_FIRST));
