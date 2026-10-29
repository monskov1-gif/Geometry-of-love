// Sprite sheets: renders any (character, frame) to a cached canvas. People
// (Dameo, Satsuki, Melody) use the real-proportion 32×80 figures; the living
// school supplies of the Sandbox keep their small 24×48 cartoon bodies.
// Rendering is deterministic, so a character looks identical in every scene,
// mini-game and after loading a save.
import { HUMAN_H, HUMAN_W, type Emotion, type Frame } from './humans';
import { drawPerson, PEOPLE, PERSON_H, PERSON_W } from './people';
import { drawCalculator, drawCompass, drawEraser, drawRuler } from './tools';

export { HUMAN_H as SPRITE_H, HUMAN_W as SPRITE_W, type Emotion, type Frame };

type Put = (x: number, y: number, c: string) => void;

interface SpriteDef {
  w: number;
  h: number;
  draw: (put: Put, f: Frame) => void;
}

const DRAWERS: Record<string, SpriteDef> = {
  ...Object.fromEntries(Object.entries(PEOPLE).map(([id, spec]) => [id, { w: PERSON_W, h: PERSON_H, draw: (put: Put, f: Frame) => drawPerson(put, spec, f) }])),
  calculator: { w: HUMAN_W, h: HUMAN_H, draw: drawCalculator },
  ruler: { w: HUMAN_W, h: HUMAN_H, draw: drawRuler },
  compass: { w: HUMAN_W, h: HUMAN_H, draw: drawCompass },
  'eraser-1': { w: HUMAN_W, h: HUMAN_H, draw: (put, f) => drawEraser(put, f, 1) },
  'eraser-2': { w: HUMAN_W, h: HUMAN_H, draw: (put, f) => drawEraser(put, f, 2) },
  'eraser-3': { w: HUMAN_W, h: HUMAN_H, draw: (put, f) => drawEraser(put, f, 3) },
};

export const spriteIds = Object.keys(DRAWERS);

/** Pixel size of a character's frames. */
export function spriteSize(id: string): { w: number; h: number } {
  const d = DRAWERS[id];
  return d ? { w: d.w, h: d.h } : { w: HUMAN_W, h: HUMAN_H };
}

const cache = new Map<string, HTMLCanvasElement>();

export function frameKey(id: string, f: Frame): string {
  return `${id}|${f.facing}|${f.emotion}|${f.walk}|${f.breath}|${f.mouthOpen ? 1 : 0}`;
}

/** Cached canvas for one frame. Throws for unknown ids (content validator checks ids). */
export function spriteFrame(id: string, f: Frame): HTMLCanvasElement {
  const key = frameKey(id, f);
  let c = cache.get(key);
  if (c) return c;
  const def = DRAWERS[id];
  if (!def) throw new Error(`No sprite for "${id}"`);
  c = document.createElement('canvas');
  c.width = def.w;
  c.height = def.h;
  const ctx = c.getContext('2d')!;
  const put: Put = (x, y, color) => {
    if (x < 0 || y < 0 || x >= def.w || y >= def.h) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  def.draw(put, f);
  outline(ctx, def.w, def.h, OUTLINE[id] ?? '#1b1a20');
  cache.set(key, c);
  return c;
}

const OUTLINE: Record<string, string> = { melody: '#2a1a26', satsuki: '#22201e' };

/** 1px outline around the silhouette so characters read on any background. */
function outline(ctx: CanvasRenderingContext2D, W: number, H: number, color: string): void {
  const img = ctx.getImageData(0, 0, W, H);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : img.data[(y * W + x) * 4 + 3]!);
  ctx.fillStyle = color;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ctx.fillRect(x, y, 1, 1);
}

/** Draws a frame into a pixel buffer callback (used by canvas episodes and tests). */
export function drawSprite(id: string, f: Frame, put: Put): void {
  const def = DRAWERS[id];
  if (!def) throw new Error(`No sprite for "${id}"`);
  def.draw(put, f);
}

export const EMOTIONS: Emotion[] = ['neutral', 'happy', 'sad', 'angry', 'scared', 'tired'];

/**
 * Scale2x (EPX) on RGBA pixels: doubles the size and rounds diagonal steps
 * without inventing colours, so a sprite keeps its palette and silhouette.
 */
function scale2x(src: ImageData): ImageData {
  const { width: w, height: h, data: s } = src;
  const out = new ImageData(w * 2, h * 2);
  const d = out.data;
  const at = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return (cy * w + cx) * 4;
  };
  const same = (a: number, b: number) => s[a] === s[b] && s[a + 1] === s[b + 1] && s[a + 2] === s[b + 2] && s[a + 3] === s[b + 3];
  const put = (x: number, y: number, from: number) => {
    const o = (y * w * 2 + x) * 4;
    d[o] = s[from]!;
    d[o + 1] = s[from + 1]!;
    d[o + 2] = s[from + 2]!;
    d[o + 3] = s[from + 3]!;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y);
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      put(x * 2, y * 2, same(C, A) && !same(C, D) && !same(A, B) ? A : P);
      put(x * 2 + 1, y * 2, same(A, B) && !same(A, C) && !same(B, D) ? B : P);
      put(x * 2, y * 2 + 1, same(D, C) && !same(D, B) && !same(C, A) ? C : P);
      put(x * 2 + 1, y * 2 + 1, same(B, D) && !same(B, A) && !same(D, C) ? D : P);
    }
  return out;
}

const hdCache = new Map<string, HTMLCanvasElement>();

/** Upscale used in 3D: Scale2x once for people (32×80 → 64×160), twice for the small cartoon bodies. */
export const hdScale = (id: string) => (spriteSize(id).h >= PERSON_H ? 2 : 4);

/** A frame upscaled with Scale2x: for 3D scenes, where a sprite covers many screen pixels. */
export function spriteFrameHD(id: string, f: Frame): HTMLCanvasElement {
  const key = frameKey(id, f);
  let c = hdCache.get(key);
  if (c) return c;
  const base = spriteFrame(id, f);
  let img = base.getContext('2d')!.getImageData(0, 0, base.width, base.height);
  for (let k = hdScale(id); k > 1; k /= 2) img = scale2x(img);
  c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  hdCache.set(key, c);
  return c;
}
