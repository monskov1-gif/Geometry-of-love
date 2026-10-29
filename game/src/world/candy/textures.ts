// Surface textures of the candy world, ~1 texel per 1.5 cm, nearest filtering:
// stripe-and-heart wallpaper, polka walls, inlaid checker floors, candy grass,
// sprinkle sand, an alphabet frieze, the painted sky with a smiling sun, and the
// glitch slices of the later phases. Every texture is seeded, so it is the same
// in every session.
import * as THREE from 'three';
import { pixelate, rng, TX } from '../kit/location-kit';
import { CANDY, css, LOUD, PASTEL, RAINBOW } from './palette';
import { fillTest, inCircle, inDiamond, inHeart, inStar, inTriangle, pixelText, smiley } from './shapes';

const ICONS = [inHeart, inStar(), inCircle, inTriangle, inDiamond];

/** Diagonal candy stripes with tiny hearts and stars on them (tiles every 64 texels). */
export const stripeWall = (key: string, a: number, b: number, accents: number[]) =>
  TX(`stripe-${key}`, 64, 64, (ctx, w, h) => {
    const r = rng(key.length * 31 + a);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = Math.floor((x + y) / 8) % 2 ? css(a) : css(b);
        ctx.fillRect(x, y, 1, 1);
      }
    for (let i = 0; i < 10; i++) {
      const c = css(accents[i % accents.length]!);
      fillTest(ctx, Math.floor(r() * 56), Math.floor(r() * 56), 7, 7, c, ICONS[i % ICONS.length]!);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 18; i++) ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
  });

/** Polka dots of every colour on a pastel ground, with sparkles. */
export const polkaWall = (key: string, base: number) =>
  TX(`polka-${key}`, 64, 64, (ctx, w, h) => {
    const r = rng(key.length * 17 + base);
    ctx.fillStyle = css(base);
    ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 4; i++) {
        const x = i * 16 + (j % 2 ? 8 : 0);
        fillTest(ctx, x + 2, j * 16 + 3, 9, 9, css(LOUD[(i + j * 3) % LOUD.length]!), inCircle);
        if (x + 2 > 52) fillTest(ctx, x + 2 - 64, j * 16 + 3, 9, 9, css(LOUD[(i + j * 3) % LOUD.length]!), inCircle);
      }
    ctx.fillStyle = '#fff9fd';
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * h);
      ctx.fillRect(x, y, 1, 1);
      if (i % 3 === 0) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
  });

/** Checker floor: two pastel tiles with an inlaid icon in a loud colour, grout lines. */
export const checkerFloor = (key: string, a: number, b: number, inlays: number[]) =>
  TX(`checker-${key}`, 64, 64, (ctx, w, h) => {
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const x = i * 32;
        const y = j * 32;
        ctx.fillStyle = css((i + j) % 2 ? a : b);
        ctx.fillRect(x, y, 32, 32);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x + 2, y + 2, 28, 1);
        ctx.fillRect(x + 2, y + 2, 1, 28);
        fillTest(ctx, x + 10, y + 10, 12, 12, css(inlays[(i + j * 2) % inlays.length]!), ICONS[(i + j * 2 + key.length) % ICONS.length]!);
      }
    ctx.fillStyle = 'rgba(90,61,120,0.35)';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, 32, w, 1);
    ctx.fillRect(0, 0, 1, h);
    ctx.fillRect(32, 0, 1, h);
  });

/** Candy grass: two greens, tufts and tiny flowers of every colour. */
export const candyGrass = (key: string, dim = false) =>
  TX(`grass-${key}`, 64, 64, (ctx, w, h) => {
    const r = rng(key.length * 7 + 3);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = (Math.sin(x * 0.4) + Math.cos(y * 0.35 + x * 0.1)) * 0.5;
        ctx.fillStyle = n > 0.2 ? (dim ? '#7fae8c' : '#8ef08a') : dim ? '#6c9a7c' : '#6fdc78';
        ctx.fillRect(x, y, 1, 1);
      }
    ctx.fillStyle = dim ? '#4e7a5e' : '#3fbf5a';
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * h);
      ctx.fillRect(x, y, 1, 2);
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * (w - 3));
      const y = Math.floor(r() * (h - 3));
      ctx.fillStyle = css(LOUD[i % LOUD.length]!);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y + 1, 3, 1);
      ctx.fillRect(x + 1, y + 2, 1, 1);
      ctx.fillStyle = '#fff9fd';
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  });

/** Pastel sand with rainbow sprinkles. */
export const sprinkleSand = (key: string) =>
  TX(`sand-${key}`, 64, 64, (ctx, w, h) => {
    const r = rng(key.length * 13 + 5);
    ctx.fillStyle = '#ffe2b8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = r() < 0.5 ? '#ffd29a' : '#fff0d6';
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = css(LOUD[i % LOUD.length]!);
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * h);
      if (r() < 0.5) ctx.fillRect(x, y, 2, 1);
      else ctx.fillRect(x, y, 1, 2);
    }
  });

/** A frieze of alphabet cards along the top of a wall (tiles along x). */
export const alphabetFrieze = () =>
  TX('alphabetFrieze', 128, 24, (ctx, w, h) => {
    ctx.fillStyle = css(CANDY.paper);
    ctx.fillRect(0, 0, w, h);
    const letters = 'АБВГДЕЖЗ';
    for (let i = 0; i < 8; i++) {
      const c = LOUD[(i * 3) % LOUD.length]!;
      ctx.fillStyle = css(c);
      ctx.fillRect(i * 16 + 1, 2, 14, 20);
      ctx.fillStyle = '#fff9fd';
      ctx.fillRect(i * 16 + 2, 3, 12, 14);
      pixelText(ctx, letters[i]!, i * 16 + 8, 3, 12, css(c), { align: 'center' });
      fillTest(ctx, i * 16 + 5, 18, 6, 4, '#fff9fd', ICONS[i % ICONS.length]!);
    }
    ctx.fillStyle = css(CANDY.grape);
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, h - 1, w, 1);
  });

/** A band of rainbow stripes (tiles along x) with a scalloped lace edge. */
export const rainbowBand = () =>
  TX('rainbowBand', 32, 28, (ctx, w) => {
    RAINBOW.forEach((c, i) => {
      ctx.fillStyle = css(c);
      ctx.fillRect(0, 2 + i * 3, w, 3);
    });
    ctx.fillStyle = '#fff9fd';
    ctx.fillRect(0, 0, w, 2);
    for (let x = 0; x < w; x += 4) fillTest(ctx, x, 23, 4, 4, '#fff9fd', inCircle);
    ctx.fillRect(0, 23, w, 2);
  });

export type SkyMood = 'day' | 'dim' | 'glitch';

/** The painted sky behind the Sandbox: gradient, rainbow, clouds, a smiling sun, stars, hearts. */
export function skyBackdrop(mood: SkyMood): THREE.CanvasTexture {
  return TX(`candySky-${mood}`, 512, 192, (ctx, w, h) => {
    const r = rng(mood.length * 101);
    const top = mood === 'day' ? [120, 200, 255] : mood === 'dim' ? [110, 96, 150] : [40, 20, 60];
    const bottom = mood === 'day' ? [255, 196, 238] : mood === 'dim' ? [190, 160, 190] : [120, 30, 90];
    for (let y = 0; y < h; y++) {
      const k = y / h;
      ctx.fillStyle = `rgb(${top[0]! + (bottom[0]! - top[0]!) * k},${top[1]! + (bottom[1]! - top[1]!) * k},${top[2]! + (bottom[2]! - top[2]!) * k})`;
      ctx.fillRect(0, y, w, 1);
    }
    // stars and sparkles
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * h * 0.7);
      ctx.fillStyle = i % 4 === 0 ? css(LOUD[i % LOUD.length]!) : '#fff9fd';
      ctx.fillRect(x, y, 1, 1);
      if (i % 5 === 0) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    // two rainbows
    for (const [cx, cy, R, band] of [
      [150, 170, 120, 7],
      [400, 180, 80, 5],
    ] as const)
      RAINBOW.forEach((c, i) => {
        ctx.fillStyle = mood === 'glitch' && i % 2 ? '#39ff88' : css(c);
        for (let a = Math.PI; a <= Math.PI * 2; a += 0.004) {
          for (let k = 0; k < band; k++) {
            const rr = R - i * band - k;
            ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
          }
        }
      });
    // clouds with faces
    for (let i = 0; i < 9; i++) {
      const cx = 20 + i * 58 + r() * 20;
      const cy = 30 + r() * 80;
      const s = 14 + r() * 10;
      const tint = mood === 'day' ? '#fff9fd' : mood === 'dim' ? '#d8cce4' : '#5a3d78';
      for (let k = 0; k < 5; k++) fillTest(ctx, cx + (k - 2) * s * 0.55 - s / 2, cy - (k % 2) * s * 0.35 - s / 2, s, s * 0.8, tint, inCircle);
      if (i % 2 === 0) smiley(ctx, Math.round(cx), Math.round(cy), Math.round(s * 0.35), '#30243b', { wrong: mood !== 'day' && i % 4 === 0 });
    }
    // the sun: a smiling disc with candy rays
    const sx = 448;
    const sy = 42;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      ctx.fillStyle = k % 2 ? css(CANDY.tangerine) : css(CANDY.pink);
      for (let d = 26; d < 38; d++) for (let t = -2; t <= 2; t++) ctx.fillRect(Math.round(sx + Math.cos(a) * d - Math.sin(a) * t), Math.round(sy + Math.sin(a) * d + Math.cos(a) * t), 1, 1);
    }
    fillTest(ctx, sx - 24, sy - 24, 48, 48, mood === 'glitch' ? '#f04b67' : css(CANDY.sunshine), inCircle);
    fillTest(ctx, sx - 16, sy + 2, 8, 5, css(CANDY.bubblegum), inCircle);
    fillTest(ctx, sx + 8, sy + 2, 8, 5, css(CANDY.bubblegum), inCircle);
    smiley(ctx, sx, sy, 18, '#30243b', { wrong: mood !== 'day' });
    // floating hearts
    for (let i = 0; i < 14; i++) fillTest(ctx, Math.floor(r() * w), Math.floor(r() * h * 0.6), 7, 6, css(LOUD[(i * 5) % LOUD.length]!), inHeart);
    // distant candy hills
    for (let i = 0; i < 7; i++) {
      const cx = i * 80 + r() * 30;
      const R = 50 + r() * 30;
      const c = PASTEL[i % PASTEL.length]!;
      fillTest(ctx, cx - R, h - R * 0.55, R * 2, R * 1.1, mood === 'day' ? css(c) : mood === 'dim' ? '#9a8aa8' : '#2a1838', inCircle);
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = mood === 'day' ? css(LOUD[(i + s) % LOUD.length]!) : '#7a6a88';
        const x0 = Math.round(cx - R * 0.6 + s * R * 0.22);
        ctx.fillRect(x0, Math.round(h - R * 0.45 + Math.abs(s - 2.5) * 6), 3, 3);
      }
    }
    if (mood === 'glitch') {
      for (let i = 0; i < 14; i++) {
        const y = Math.floor(r() * h);
        const hh = 1 + Math.floor(r() * 5);
        const dx = Math.floor((r() - 0.5) * 40);
        ctx.drawImage(ctx.canvas, 0, y, w, hh, dx, y, w, hh);
      }
    }
    pixelate(ctx, w, h, 2);
  });
}

/** Horizontal glitch slices: RGB-shifted noise bars on transparent (for the later phases). */
export const glitchSlices = () =>
  TX('glitchSlices', 64, 64, (ctx, w, h) => {
    const r = rng(666);
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const y = Math.floor(r() * h);
      const x = Math.floor(r() * w * 0.6);
      const len = 6 + Math.floor(r() * 30);
      ctx.fillStyle = ['#39ff88', '#f04b67', '#55c9f5', '#ff6cc5', '#15131b'][i % 5]!;
      ctx.fillRect(x, y, len, 1 + Math.floor(r() * 3));
    }
  });

/** Tile index helper for textures that want a random icon. */
export const icon = (i: number) => ICONS[i % ICONS.length]!;
