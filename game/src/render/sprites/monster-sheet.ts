// Melody the monster (гл. 14–15), from the author's sprite sheet
// (materials/references/chase/melody-monster-sheet.jpg), carried over pixel by
// pixel by scripts/extract-monster.py: three big poses for her rise, the five
// crawl frames of the chase, and her crisp head cut out separately. The head is
// drawn over each crawl frame (their own heads are soft) and turns on its own:
// «голова поворачивается независимо от туловища» (синопсис).
import sheetUrl from '../../assets/characters/melody-monster/monster.png';
import sheetData from '../../assets/characters/melody-monster/monster.json';
import { loadImage } from '../../platform/assets';

export const CRAWL_FRAMES = ['crawl0', 'crawl1', 'crawl2', 'crawl3', 'crawl4'] as const;
export type MonsterPose = (typeof CRAWL_FRAMES)[number] | 'rise' | 'lunge' | 'reach';

/** Every pose is drawn bottom-right aligned on a canvas this size (room above for a turned head). */
export const MONSTER_W = 210;
export const MONSTER_H = 150;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const frames = sheetData.frames as Record<string, Rect>;
const heads = sheetData.heads as Record<string, { x: number; y: number }>;
const pivot = sheetData.headPivot;

let sheet: HTMLImageElement | null = null;
let loading: Promise<HTMLImageElement> | null = null;

/** Starts loading the sheet; failures are reported by loadImage (player + console). */
export function loadMonsterSheet(): Promise<HTMLImageElement> {
  loading ??= loadImage(sheetUrl).then((img) => (sheet = img));
  return loading;
}

function rect(name: string): Rect {
  const r = frames[name];
  if (!r) throw new Error(`[monster] no frame "${name}" in monster.json`);
  return r;
}

/**
 * Draws a pose with the head turned by `tilt` radians around the neck.
 * Returns false while the sheet is still loading (nothing drawn).
 */
export function drawMonster(ctx: CanvasRenderingContext2D, pose: MonsterPose, tilt: number): boolean {
  if (!sheet) return false;
  const f = rect(pose);
  const ox = MONSTER_W - 4 - f.w;
  const oy = MONSTER_H - f.h;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, f.x, f.y, f.w, f.h, ox, oy, f.w, f.h);
  const at = heads[pose];
  if (!at) return true; // the big rise poses keep their own head
  const h = rect('headpart');
  const hx = ox + at.x;
  const hy = oy + at.y;
  const px = Math.round(hx + pivot.x);
  const py = Math.round(hy + pivot.y);
  const drawHead = (angle: number) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.drawImage(sheet!, h.x, h.y, h.w, h.h, -pivot.x, -pivot.y, h.w, h.h);
    ctx.restore();
  };
  if (Math.abs(tilt) <= 0.02) {
    drawHead(0); // the crisp head over the frame's soft one
    return true;
  }
  // a turned head: cut the old one out (one face, one bow), draw it turned, and fill
  // the gap it leaves with the hair just behind it, row by row
  const before = ctx.getImageData(0, 0, MONSTER_W, MONSTER_H).data;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  drawHead(0);
  ctx.restore();
  const cut = ctx.getImageData(0, 0, MONSTER_W, MONSTER_H).data;
  drawHead(tilt);
  const img = ctx.getImageData(0, 0, MONSTER_W, MONSTER_H);
  const out = img.data;
  const x0 = Math.max(0, Math.floor(hx));
  const x1 = Math.min(MONSTER_W, Math.ceil(hx + h.w));
  for (let y = Math.max(0, Math.floor(hy)); y < Math.min(MONSTER_H, hy + h.h); y++) {
    let fill = -1; // offset of the last body pixel left of the gap
    for (let x = Math.max(0, x0 - 1); x < x1; x++) {
      const i = (y * MONSTER_W + x) * 4;
      const wasHead = before[i + 3]! > 0 && cut[i + 3] === 0;
      // the source is the body left in place (never the turned head), and never the bow's blue or green
      if (cut[i + 3]! > 0 && cut[i]! >= 120) fill = i;
      else if (wasHead && out[i + 3] === 0 && fill >= 0) {
        out[i] = cut[fill]!;
        out[i + 1] = cut[fill + 1]!;
        out[i + 2] = cut[fill + 2]!;
        out[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return true;
}
