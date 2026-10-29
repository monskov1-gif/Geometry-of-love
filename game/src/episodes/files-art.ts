// Pixel art for «Системные файлы» (chapter 13), in the code space palette of
// the brief: near-black, green rows and links, pink-red only for damage.
// A backdrop for the file graph (grid, folder silhouettes, falling digits,
// scraps of the candy world breaking through), file-type icons, and the
// characters' sprites as data URLs (shown at their own pixels, never resampled
// in colour or cropped).
import { spriteFrame, type Emotion } from '../render/sprites';
import { rng } from '../world/kit/location-kit';
import { LOUD, css } from '../world/candy/palette';
import { fillTest, inCircle, inHeart, inStar } from '../world/candy/shapes';
import { strip, type Ctx } from './backdrops';

const BLACK = '#080d0a';
const PANEL = '#101a14';
const GREEN = '#39ff88';
const MUTED = '#70b98a';
const GRID = '#1b3928';
const CORRUPT = '#f04b67';
const WARN = '#d7f36a';

const url = (c: HTMLCanvasElement) => c.toDataURL('image/png');

function folder(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y + 2, w, h - 2);
  ctx.fillRect(x, y, Math.round(w * 0.4), 3);
}

/** The backdrop of the graph: 440×200 px over x −60…160 of the 100×100 viewBox (wide boxes show more of it). */
export function filesBackdrop(): string {
  return url(
    strip(440, 200, (ctx, w, h) => {
      const r = rng(1313);
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = GRID;
      for (let x = 0; x < w; x += 10) ctx.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 10) ctx.fillRect(0, y, w, 1);
      // columns of falling digits, brighter at the head
      for (let c = 0; c < 56; c++) {
        const x = Math.floor(r() * (w / 4)) * 4;
        const len = 6 + Math.floor(r() * 18);
        const y0 = Math.floor(r() * h);
        for (let k = 0; k < len; k++) {
          ctx.fillStyle = k === len - 1 ? GREEN : k > len - 4 ? MUTED : GRID;
          ctx.fillRect(x, (y0 + k * 4) % h, 2, 3);
        }
      }
      // folder silhouettes of the whole program
      for (let i = 0; i < 40; i++) folder(ctx, Math.floor(r() * (w - 14)), Math.floor(r() * (h - 12)), 12, 9, '#132a1c');
      // scraps of the Sandbox breaking through the code: tiny candy shapes, half-erased
      const shapes = [inHeart, inStar(), inCircle];
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(r() * (w - 8));
        const y = Math.floor(r() * (h - 8));
        fillTest(ctx, x, y, 7, 7, css(LOUD[i % LOUD.length]!), shapes[i % 3]!);
        ctx.fillStyle = BLACK;
        for (let k = 0; k < 7; k += 2) ctx.fillRect(x, y + k, 7, 1);
      }
      // corruption specks
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = CORRUPT;
        ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 4), 1);
      }
    }),
  );
}

export type FileKind = 'system' | 'user' | 'damaged' | 'link';

/** A 12×10 file-type icon. */
export function fileIcon(kind: FileKind): string {
  return url(
    strip(12, 10, (ctx) => {
      if (kind === 'system') {
        folder(ctx, 0, 0, 12, 10, WARN);
        ctx.fillStyle = BLACK;
        ctx.fillRect(4, 4, 4, 4);
        ctx.fillStyle = WARN;
        ctx.fillRect(5, 5, 2, 2);
        return;
      }
      ctx.fillStyle = kind === 'damaged' ? CORRUPT : GREEN;
      ctx.fillRect(2, 0, 7, 10);
      ctx.fillRect(9, 3, 1, 7);
      ctx.fillStyle = PANEL;
      ctx.fillRect(3, 1, 5, 8);
      ctx.fillRect(9, 2, 1, 1);
      ctx.fillStyle = kind === 'damaged' ? CORRUPT : MUTED;
      for (let y = 3; y < 9; y += 2) ctx.fillRect(4, y, kind === 'damaged' ? 1 + (y % 3) : 4, 1);
      if (kind === 'link') {
        ctx.fillStyle = GREEN;
        ctx.fillRect(6, 6, 5, 1);
        ctx.fillRect(10, 5, 1, 3);
      }
      if (kind === 'damaged') {
        ctx.fillStyle = BLACK;
        ctx.fillRect(5, 0, 1, 4);
        ctx.fillRect(6, 4, 1, 3);
        ctx.fillRect(5, 7, 1, 3);
      }
    }),
  );
}

/** A character's front sprite frame as a data URL. */
export function spriteURL(id: string, emotion: Emotion = 'neutral', mouthOpen = false): string {
  return url(spriteFrame(id, { facing: 'front', emotion, walk: -1, breath: 0, mouthOpen }));
}
