// Sprite sheets: renders any (character, frame) to a cached 24×48 canvas.
// Rendering is deterministic, so a character looks identical in every scene,
// mini-game and after loading a save.
import { HUMANS, HUMAN_H, HUMAN_W, drawHuman, type Emotion, type Frame } from './humans';
import { drawCalculator, drawCompass, drawEraser, drawRuler } from './tools';

export { HUMAN_H as SPRITE_H, HUMAN_W as SPRITE_W, type Emotion, type Frame };

type Put = (x: number, y: number, c: string) => void;

const DRAWERS: Record<string, (put: Put, f: Frame) => void> = {
  ...Object.fromEntries(Object.entries(HUMANS).map(([id, spec]) => [id, (put: Put, f: Frame) => drawHuman(put, spec, f)])),
  calculator: drawCalculator,
  ruler: drawRuler,
  compass: drawCompass,
  'eraser-1': (put, f) => drawEraser(put, f, 1),
  'eraser-2': (put, f) => drawEraser(put, f, 2),
  'eraser-3': (put, f) => drawEraser(put, f, 3),
};

export const spriteIds = Object.keys(DRAWERS);

const cache = new Map<string, HTMLCanvasElement>();

export function frameKey(id: string, f: Frame): string {
  return `${id}|${f.facing}|${f.emotion}|${f.walk}|${f.breath}|${f.mouthOpen ? 1 : 0}`;
}

/** Cached canvas for one frame. Throws for unknown ids (content validator checks ids). */
export function spriteFrame(id: string, f: Frame): HTMLCanvasElement {
  const key = frameKey(id, f);
  let c = cache.get(key);
  if (c) return c;
  const draw = DRAWERS[id];
  if (!draw) throw new Error(`No sprite for "${id}"`);
  c = document.createElement('canvas');
  c.width = HUMAN_W;
  c.height = HUMAN_H;
  const ctx = c.getContext('2d')!;
  const put: Put = (x, y, color) => {
    if (x < 0 || y < 0 || x >= HUMAN_W || y >= HUMAN_H) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  draw(put, f);
  outline(ctx, OUTLINE[id] ?? '#1b1a20');
  cache.set(key, c);
  return c;
}

const OUTLINE: Record<string, string> = { melody: '#2a1a26', satsuki: '#22201e' };

/** 1px outline around the silhouette so characters read on any background. */
function outline(ctx: CanvasRenderingContext2D, color: string): void {
  const img = ctx.getImageData(0, 0, HUMAN_W, HUMAN_H);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= HUMAN_W || y >= HUMAN_H ? 0 : img.data[(y * HUMAN_W + x) * 4 + 3]!);
  ctx.fillStyle = color;
  for (let y = 0; y < HUMAN_H; y++)
    for (let x = 0; x < HUMAN_W; x++)
      if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ctx.fillRect(x, y, 1, 1);
}

/** Draws a frame into a pixel buffer callback (used by canvas episodes and tests). */
export function drawSprite(id: string, f: Frame, put: Put): void {
  const draw = DRAWERS[id];
  if (!draw) throw new Error(`No sprite for "${id}"`);
  draw(put, f);
}

export const EMOTIONS: Emotion[] = ['neutral', 'happy', 'sad', 'angry', 'scared', 'tired'];
