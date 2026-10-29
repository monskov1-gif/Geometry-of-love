// Painted parallax backdrops for the canvas episodes. Each layer is drawn once
// into a wide offscreen strip (pixel-exact shapes, seeded), then blitted with
// its parallax factor every frame — cheap, crisp, and as motley as the 3D
// candy locations. Themes: the game corridor (candy), the reality room
// (muted, per the brief) and the code void.
import { rng } from '../world/kit/location-kit';
import { CANDY, css, LOUD, RAINBOW } from '../world/candy/palette';
import { fillTest, inCircle, inDiamond, inHeart, inStar, inTriangle, pixelText, smiley, sticker } from '../world/candy/shapes';

export type Ctx = CanvasRenderingContext2D;

interface Layer {
  canvas: HTMLCanvasElement;
  factor: number;
  y: number;
}

export interface Backdrop {
  /** Draws every layer for a camera at world x `camera` (px); `t` seconds for the floating bits. */
  draw(ctx: Ctx, camera: number, t: number): void;
  /** Foreground layer (in front of the characters). */
  front(ctx: Ctx, camera: number): void;
}

export const strip = (w: number, h: number, paint: (ctx: Ctx, w: number, h: number) => void): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  paint(ctx, c.width, h);
  return c;
};

const SHAPES = [inHeart, inStar(), inCircle, inTriangle, inDiamond];

const blit = (ctx: Ctx, l: Layer, camera: number) => ctx.drawImage(l.canvas, -Math.round(camera * l.factor), l.y);

/** Stickers scattered over a rectangle of a strip. */
export function stickers(ctx: Ctx, r: () => number, x0: number, y0: number, w: number, h: number, n: number, size = [6, 12]): void {
  for (let i = 0; i < n; i++) {
    const s = Math.round(size[0]! + r() * (size[1]! - size[0]!));
    const x = x0 + r() * (w - s);
    const y = y0 + r() * (h - s);
    const k = Math.floor(r() * 7);
    const c = css(LOUD[Math.floor(r() * LOUD.length)]!);
    if (k < 5) sticker(ctx, x, y, s, s, SHAPES[k]!, c, '#fff9fd', 1);
    else if (k === 5) {
      sticker(ctx, x, y, s, s, inCircle, css(CANDY.sunshine), '#fff9fd', 1);
      smiley(ctx, Math.round(x + s / 2), Math.round(y + s / 2), Math.max(3, Math.round(s / 2) - 1), '#30243b');
    } else {
      ctx.fillStyle = '#fff9fd';
      ctx.fillRect(Math.round(x), Math.round(y + s / 2), s, 1);
      ctx.fillRect(Math.round(x + s / 2), Math.round(y), 1, s);
    }
  }
}

/** A candy door with a frame of stripes, a round window and a shape sign. */
export function candyDoor(ctx: Ctx, x: number, ground: number, w: number, h: number, color: number, shape = 0): void {
  for (let y = 0; y < h + 4; y += 4) {
    ctx.fillStyle = (y / 4) % 2 ? '#fff9fd' : css(color);
    ctx.fillRect(x - 4, ground - h - 4 + y, 4, 4);
    ctx.fillRect(x + w, ground - h - 4 + y, 4, 4);
  }
  for (let xx = -4; xx < w + 4; xx += 4) {
    ctx.fillStyle = (xx / 4) % 2 ? '#fff9fd' : css(color);
    ctx.fillRect(x + xx, ground - h - 4, 4, 4);
  }
  ctx.fillStyle = css(color);
  ctx.fillRect(x, ground - h, w, h);
  ctx.fillStyle = 'rgba(48,36,59,0.25)';
  ctx.fillRect(x + w - 2, ground - h, 2, h);
  fillTest(ctx, x + w / 2 - 6, ground - h + 8, 12, 12, '#fff9fd', inCircle);
  fillTest(ctx, x + w / 2 - 4, ground - h + 10, 8, 8, css(CANDY.sky), inCircle);
  sticker(ctx, x + w / 2 - 6, ground - h / 2, 12, 12, SHAPES[shape % SHAPES.length]!, '#fff9fd', css(color), 1);
  fillTest(ctx, x + w - 7, ground - h / 2 + 2, 4, 4, css(CANDY.sunshine), inCircle);
}

/** Rainbow half-arch (bands outward). */
export function rainbowArc(ctx: Ctx, cx: number, cy: number, R: number, band: number): void {
  RAINBOW.forEach((c, i) => {
    const r1 = R - i * band;
    const r0 = r1 - band;
    fillTest(ctx, cx - r1, cy - r1, r1 * 2, r1 * 2, css(c), (u, v) => v <= 0 && u * u + v * v <= 1 && (u * u + v * v) * r1 * r1 > r0 * r0);
  });
}

// ---------------------------------------------------------------- candy corridor

function candyCorridor(viewW: number, viewH: number, ground: number, length: number): { layers: Layer[]; fore: Layer } {
  const r = rng(5150);
  const wallF = 0.75;
  const wallW = length * wallF + viewW + 40;
  const wall = strip(wallW, ground, (ctx, w, h) => {
    // diagonal mint/lavender stripes with tiny icons
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x += 1) {
        if (((x + y) >> 3) % 2) continue;
        ctx.fillStyle = css(CANDY.lavender);
        ctx.fillRect(x, y, 1, 1);
      }
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = css(CANDY.mint);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < w / 12; i++) fillTest(ctx, r() * w, r() * h * 0.7, 4, 4, css(LOUD[i % LOUD.length]!), SHAPES[i % SHAPES.length]!);
    // ceiling: candy stripe crown and bunting
    for (let x = 0; x < w; x += 6) {
      ctx.fillStyle = (x / 6) % 2 ? css(CANDY.pink) : '#fff9fd';
      ctx.fillRect(x, 0, 6, 5);
    }
    for (let x = 0; x < w; x += 14) {
      const sag = Math.round(Math.sin(((x % 112) / 112) * Math.PI) * 8);
      ctx.fillStyle = '#fff9fd';
      ctx.fillRect(x, 8 + sag, 14, 1);
      fillTest(ctx, x + 2, 9 + sag, 10, 10, css(LOUD[(x / 14) % LOUD.length]!), (u, v) => Math.abs(u) <= (1 - v) / 2);
    }
    // wainscot band of polka dots and a rainbow skirting
    const wy = h - 34;
    ctx.fillStyle = css(CANDY.lilac);
    ctx.fillRect(0, wy, w, 34);
    for (let x = 0; x < w; x += 10) for (let k = 0; k < 3; k++) fillTest(ctx, x + (k % 2) * 5 + 1, wy + 3 + k * 10, 5, 5, css(LOUD[(x / 10 + k * 4) % LOUD.length]!), inCircle);
    ctx.fillStyle = css(CANDY.pink);
    ctx.fillRect(0, wy - 2, w, 2);
    RAINBOW.forEach((c, i) => {
      ctx.fillStyle = css(c);
      ctx.fillRect(0, h - 7 + i, w, 1);
    });
    // sections: doors under rainbow arches, lockers, notice boards, windows to the candy sky
    let x = 20;
    let k = 0;
    while (x < w - 60) {
      const kind = k % 4;
      if (kind === 0) {
        rainbowArc(ctx, x + 18, h - 78, 30, 3);
        candyDoor(ctx, x, h - 7, 36, 66, LOUD[(k * 5) % LOUD.length]!, k);
        x += 60;
      } else if (kind === 1) {
        for (let i = 0; i < 4; i++) {
          const c = LOUD[(k * 3 + i * 5) % LOUD.length]!;
          ctx.fillStyle = css(c);
          ctx.fillRect(x + i * 15, h - 79, 14, 72);
          ctx.fillStyle = '#fff9fd';
          for (let v = 0; v < 4; v++) ctx.fillRect(x + i * 15 + 3, h - 73 + v * 3, 8, 1);
          ctx.fillRect(x + i * 15 + 10, h - 46, 2, 6);
          stickers(ctx, r, x + i * 15 + 1, h - 60, 12, 40, 2, [5, 8]);
        }
        x += 75;
      } else if (kind === 2) {
        // window with sky, rainbow and a cloud
        ctx.fillStyle = css(CANDY.cobalt);
        ctx.fillRect(x - 3, h - 120, 66, 52);
        ctx.fillStyle = css(CANDY.sky);
        ctx.fillRect(x, h - 117, 60, 46);
        rainbowArc(ctx, x + 22, h - 72, 30, 3);
        fillTest(ctx, x + 36, h - 112, 18, 10, '#fff9fd', inCircle);
        fillTest(ctx, x + 42, h - 116, 12, 9, '#fff9fd', inCircle);
        ctx.fillStyle = css(CANDY.cobalt);
        ctx.fillRect(x + 29, h - 117, 2, 46);
        ctx.fillStyle = css(CANDY.grass);
        ctx.fillRect(x - 4, h - 70, 68, 6);
        for (let i = 0; i < 8; i++) fillTest(ctx, x + i * 8, h - 76, 6, 6, css(LOUD[(i * 3) % LOUD.length]!), inCircle);
        x += 80;
      } else {
        ctx.fillStyle = css(CANDY.tangerine);
        ctx.fillRect(x, h - 118, 52, 36);
        ctx.fillStyle = '#fff9fd';
        ctx.fillRect(x + 2, h - 116, 48, 32);
        stickers(ctx, r, x + 3, h - 115, 46, 30, 9, [6, 10]);
        // a smiling clock
        fillTest(ctx, x + 14, h - 72, 24, 24, css(CANDY.sunshine), inCircle);
        smiley(ctx, x + 26, h - 60, 9, '#30243b');
        x += 70;
      }
      stickers(ctx, r, x - 70, 22, 70, h - 140, 6);
      k++;
    }
  });
  const floorW = length + viewW + 40;
  const floorH = viewH - ground;
  const floor = strip(floorW, floorH, (ctx, w, h) => {
    for (let y = 0; y < h; y += 8)
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = ((x / 16 + y / 8) % 2) ? css(CANDY.lemon) : css(CANDY.babyPink);
        ctx.fillRect(x, y, 16, 8);
        if ((x / 16 + y / 8) % 3 === 0) fillTest(ctx, x + 5, y + 2, 5, 4, css(LOUD[(x / 16 + y) % LOUD.length]!), SHAPES[(x / 16) % SHAPES.length]!);
      }
    // rainbow runner
    RAINBOW.forEach((c, i) => {
      ctx.fillStyle = css(c);
      ctx.fillRect(0, 3 + i * 2, w, 2);
    });
    ctx.fillStyle = 'rgba(48,36,59,0.2)';
    ctx.fillRect(0, 0, w, 2);
    for (let i = 0; i < w / 6; i++) {
      ctx.fillStyle = css(LOUD[i % LOUD.length]!);
      ctx.fillRect(Math.floor(r() * w), 18 + Math.floor(r() * (h - 18)), 2, 1);
    }
  });
  const foreF = 1.25;
  const fore = strip(length * foreF + viewW + 80, 40, (ctx, w) => {
    for (let x = 30; x < w; x += 70 + Math.floor(r() * 90)) {
      const kind = Math.floor(r() * 4);
      const c = css(LOUD[Math.floor(r() * LOUD.length)]!);
      if (kind === 0) {
        // a little alphabet block
        ctx.fillStyle = c;
        ctx.fillRect(x, 22, 18, 18);
        ctx.fillStyle = '#fff9fd';
        ctx.fillRect(x + 2, 24, 14, 1);
        pixelText(ctx, 'АБВГДЕЖЗ'[Math.floor(r() * 8)]!, x + 9, 25, 11, '#fff9fd', { align: 'center' });
      } else if (kind === 1) {
        fillTest(ctx, x, 18, 22, 22, c, inCircle);
        fillTest(ctx, x + 4, 22, 6, 6, '#fff9fd', inCircle);
      } else if (kind === 2) {
        sticker(ctx, x, 20, 20, 18, inHeart, c, '#fff9fd', 1);
      } else {
        // a fallen crayon
        ctx.fillStyle = c;
        ctx.fillRect(x, 32, 34, 8);
        ctx.fillStyle = '#30243b';
        ctx.fillRect(x + 6, 32, 2, 8);
        ctx.fillRect(x + 26, 32, 2, 8);
        fillTest(ctx, x + 34, 32, 8, 8, c, (u, v) => u < 1 - Math.abs(v));
      }
    }
  });
  return {
    layers: [
      { canvas: wall, factor: wallF, y: 0 },
      { canvas: floor, factor: 1, y: ground },
    ],
    fore: { canvas: fore, factor: foreF, y: viewH - 40 },
  };
}

// ---------------------------------------------------------------- reality room (muted) and code void

function mutedRoom(viewW: number, viewH: number, ground: number, length: number): { layers: Layer[]; fore: Layer | null } {
  const r = rng(77);
  const wall = strip(length * 0.8 + viewW + 40, ground, (ctx, w, h) => {
    ctx.fillStyle = '#3c4644';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) {
      ctx.fillStyle = 'rgba(169,171,159,0.08)';
      ctx.fillRect(x, 0, 1, h);
    }
    for (let x = 30; x < w; x += 110 + Math.floor(r() * 60)) {
      ctx.fillStyle = '#59463d';
      ctx.fillRect(x, h - 50, 44, 50);
      ctx.fillStyle = '#392b27';
      ctx.fillRect(x + 2, h - 40, 40, 1);
      ctx.fillRect(x + 2, h - 20, 40, 1);
      ctx.fillStyle = '#d8d3c9';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 6 + i * 12, h - 70 + Math.floor(r() * 10), 8, 6);
    }
    ctx.fillStyle = '#242322';
    ctx.fillRect(0, h - 6, w, 6);
  });
  const floor = strip(length + viewW + 40, viewH - ground, (ctx, w, h) => {
    for (let y = 0; y < h; y += 6) {
      ctx.fillStyle = y % 12 ? '#59463d' : '#4e3d35';
      ctx.fillRect(0, y, w, 6);
    }
  });
  return { layers: [{ canvas: wall, factor: 0.8, y: 0 }, { canvas: floor, factor: 1, y: ground }], fore: null };
}

function codeVoid(viewW: number, viewH: number, ground: number, length: number): { layers: Layer[]; fore: Layer | null } {
  const r = rng(99);
  const wall = strip(length * 0.6 + viewW + 40, ground, (ctx, w, h) => {
    ctx.fillStyle = '#080d0a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b3928';
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 1);
    for (let i = 0; i < w / 4; i++) {
      ctx.fillStyle = r() < 0.1 ? '#f04b67' : r() < 0.5 ? '#39ff88' : '#70b98a';
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 2 + Math.floor(r() * 3));
    }
  });
  const floor = strip(length + viewW + 40, viewH - ground, (ctx, w, h) => {
    ctx.fillStyle = '#101a14';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39ff88';
    ctx.fillRect(0, 0, w, 1);
    for (let x = 0; x < w; x += 20) ctx.fillRect(x, 0, 1, h);
  });
  return { layers: [{ canvas: wall, factor: 0.6, y: 0 }, { canvas: floor, factor: 1, y: ground }], fore: null };
}

const THEMES = { corridor: candyCorridor, room: mutedRoom, collapse: codeVoid };
export type WalkTheme = keyof typeof THEMES;

/** Floating hearts and stars over the candy theme (slow bob; still when reduce-motion is on). */
function floatingBits(viewW: number, r: () => number) {
  return Array.from({ length: 14 }, (_, i) => {
    const s = 5 + Math.floor(r() * 6);
    const img = strip(s + 2, s + 2, (ctx) => sticker(ctx, 1, 1, s, s, SHAPES[i % SHAPES.length]!, css(LOUD[i % LOUD.length]!), '#fff9fd', 1));
    return { x: r() * (viewW + 200), y: 26 + r() * 50, img, ph: r() * 6 };
  });
}

export function walkBackdrop(theme: WalkTheme, viewW: number, viewH: number, ground: number, length: number, reduceMotion: boolean): Backdrop {
  const { layers, fore } = THEMES[theme](viewW, viewH, ground, length);
  const bits = theme === 'corridor' ? floatingBits(viewW, rng(3)) : [];
  return {
    draw(ctx, camera, t) {
      for (const l of layers) blit(ctx, l, camera);
      for (const b of bits) {
        const x = ((b.x - camera * 0.4) % (viewW + 200) + viewW + 200) % (viewW + 200) - 100;
        const y = b.y + (reduceMotion ? 0 : Math.round(Math.sin(t * 1.2 + b.ph) * 3));
        ctx.drawImage(b.img, Math.round(x), y);
      }
    },
    front(ctx, camera) {
      if (fore) blit(ctx, fore, camera);
    },
  };
}

