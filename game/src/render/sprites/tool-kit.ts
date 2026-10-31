// Shared pixel helpers for the Sandbox tool characters (tools.ts and friends):
// filled shapes with an ink edge, legs with a walk cycle, a small face kit.
import type { Emotion, Frame } from './humans';

export type Put = (x: number, y: number, c: string) => void;

export const INK = '#22202a';
export const MOUTH = '#6b2a3c';

export function rect(put: Put, x: number, y: number, w: number, h: number, c: string): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
}

export function dots(put: Put, pts: [number, number][], c: string, dx = 0, dy = 0): void {
  for (const [x, y] of pts) put(x + dx, y + dy, c);
}

/** One row of a shape: inclusive [x0, x1] segments. */
export type Row = [number, number][];

/**
 * A filled shape from rows (starting at y0) with a 1px ink edge wherever the
 * shape meets the outside. `fill` may vary per pixel (shading, stripes).
 */
export function blob(put: Put, y0: number, rows: Row[], fill: string | ((x: number, y: number) => string), ink = INK): void {
  const inside = (x: number, y: number) => {
    const r = rows[y - y0];
    return !!r && r.some(([a, b]) => x >= a && x <= b);
  };
  rows.forEach((segs, i) => {
    const y = y0 + i;
    for (const [a, b] of segs)
      for (let x = a; x <= b; x++) {
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        put(x, y, edge ? ink : typeof fill === 'string' ? fill : fill(x, y));
      }
  });
}

/** Walk offset of the front leg for phase 0..3 (−1 = standing). */
export const stride = (walk: number) => (walk < 0 ? 0 : [1, 0, -1, 0][walk]!);

/** Two thin legs from `top` down to the floor (y = 45), shoes on y = 46. */
export function legs(put: Put, x: number, top: number, walk: number, shoe = INK, gap = 4, leg = INK): void {
  const a = stride(walk);
  rect(put, x + a, top, 1, 46 - top, leg);
  rect(put, x + gap - a, top, 1, 46 - top, leg);
  rect(put, x - 1 + a, 46, 2, 1, shoe);
  rect(put, x + gap - 1 - a, 46, 2, 1, shoe);
}

/** Pupils glance in the direction of travel on side frames (sprites are mirrored for "left"). */
export const lookOf = (f: Frame) => (f.facing === 'side' ? 1 : 0);

/** Brows over an eye at (x, y): angry slopes down to the nose, sad up to it. `inner` = +1 if the nose is to the right. */
export function brow(put: Put, x: number, y: number, e: Emotion, inner: 1 | -1, c = INK): void {
  if (e === 'angry') dots(put, [[x - inner, y - 2], [x, y - 2], [x + inner, y - 1]], c);
  else if (e === 'sad') dots(put, [[x - inner, y - 1], [x, y - 2]], c);
  else if (e === 'scared') dots(put, [[x - 1, y - 2], [x, y - 2], [x + 1, y - 2]], c);
}

/** A 1px eye at (x, y) for every emotion. */
export function eye(put: Put, x: number, y: number, e: Emotion, look: number, c = INK): void {
  if (e === 'happy') dots(put, [[x - 1, y], [x, y - 1], [x + 1, y]], c);
  else if (e === 'scared') dots(put, [[x, y - 1], [x, y]], c);
  else if (e === 'tired') dots(put, [[x - 1, y], [x, y], [x + 1, y]], c);
  else put(x + look, y, c);
}

/** A small mouth centred at (x, y): smile, frown, line, open. */
export function mouth(put: Put, x: number, y: number, e: Emotion, open: boolean, c = INK): void {
  if (open) return rect(put, x - 1, y, 3, 2, MOUTH), rect(put, x - 1, y - 1, 3, 1, c);
  if (e === 'happy') dots(put, [[x - 2, y - 1], [x - 1, y], [x, y], [x + 1, y], [x + 2, y - 1]], c);
  else if (e === 'sad') dots(put, [[x - 2, y + 1], [x - 1, y], [x, y], [x + 1, y], [x + 2, y + 1]], c);
  else if (e === 'scared') rect(put, x - 1, y, 2, 2, MOUTH), dots(put, [[x - 1, y - 1], [x, y - 1]], c);
  else if (e === 'angry') rect(put, x - 2, y, 5, 1, c);
  else if (e === 'tired') rect(put, x - 1, y, 2, 1, c);
  else rect(put, x - 1, y, 3, 1, c);
}

/** The compass's tiny dot face (unchanged working design): eyes 4 apart. */
export function dotFace(put: Put, cx: number, y: number, e: Emotion, mouthOpen: boolean, c = INK): void {
  if (e === 'happy') dots(put, [[cx - 2, y + 1], [cx - 3, y], [cx + 2, y + 1], [cx + 3, y]], c);
  else if (e === 'scared') rect(put, cx - 3, y - 1, 1, 2, c), rect(put, cx + 2, y - 1, 1, 2, c);
  else dots(put, [[cx - 2, y], [cx + 2, y]], c);
  if (e === 'angry') dots(put, [[cx - 3, y - 2], [cx + 3, y - 2]], c);
  if (mouthOpen) rect(put, cx - 1, y + 2, 2, 2, c);
  else if (e === 'sad' || e === 'scared') rect(put, cx - 1, y + 3, 2, 1, c), put(cx - 2, y + 4, c), put(cx + 1, y + 4, c);
  else rect(put, cx - 1, y + 3, 2, 1, c);
}
