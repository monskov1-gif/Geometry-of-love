// The Talking Ruler after the author's art: a long wooden ruler with tick
// marks on the right edge, a huge white powdered curly wig with a light-blue
// ribbon, small rectangular glasses over stern half-closed eyes, hands on hips,
// thin legs with light-blue shoes.
import type { Emotion, Frame } from './humans';
import { blob, dots, INK, legs, MOUTH, rect, type Put, type Row } from './tool-kit';

const WOOD = '#a67844';
const WOOD_DARK = '#86602f';
const TICK = '#3b2a17';
const WIG = '#e6e2dc';
const WIG_SHADE = '#c6c1b9';
const WIG_CURL = '#a29c93';
const RIBBON = '#bcd8ee';
const RIBBON_DARK = '#7fa6cc';
const GLASS = '#c8dce9';
const SHOE = '#bcd6ea';

/** Curls: rows of little "u" rolls, offset every band, like a powdered wig. */
function curl(x: number, y: number): string {
  const band = Math.floor(y / 3);
  const k = (x + band * 2) % 4;
  if (y % 3 === 2) return k === 0 || k === 3 ? WIG_CURL : WIG;
  if (y % 3 === 1) return k === 0 ? WIG_SHADE : WIG;
  return WIG;
}

/** Lens interior 3×2 at (x, y): stern half-closed lids by default. `inner` = +1 if the nose is to the right. */
function lens(put: Put, x: number, y: number, e: Emotion, look: number, inner: 1 | -1): void {
  const ix = inner > 0 ? x + 2 : x;
  const ox = inner > 0 ? x : x + 2;
  const px = x + 1 + look;
  if (e === 'happy') dots(put, [[x, y + 1], [x + 1, y], [x + 2, y + 1]], INK);
  else if (e === 'tired') rect(put, x, y + 1, 3, 1, INK);
  else if (e === 'scared') put(x + 1, y + 1, INK);
  else if (e === 'angry') dots(put, [[ix, y], [x + 1, y], [px, y + 1], [ix, y + 1]], INK);
  else if (e === 'sad') dots(put, [[ox, y], [x + 1, y], [px, y + 1], [ox, y + 1]], INK);
  else rect(put, x, y, 3, 1, INK), put(px, y + 1, INK);
}

function sternMouth(put: Put, y: number, e: Emotion, open: boolean): void {
  if (open) return rect(put, 11, y, 3, 2, MOUTH);
  if (e === 'happy') dots(put, [[10, y], [11, y + 1], [12, y + 1], [13, y]], INK);
  else if (e === 'sad') dots(put, [[10, y + 1], [11, y], [12, y], [13, y + 1]], INK);
  else if (e === 'scared') rect(put, 11, y, 2, 2, MOUTH);
  else if (e === 'angry') rect(put, 10, y, 4, 1, INK);
  else if (e === 'tired') rect(put, 11, y + 1, 2, 1, INK);
  else dots(put, [[11, y + 1], [12, y], [13, y + 1]], INK); // the little frown of the art
}

export function drawRuler(put: Put, f: Frame): void {
  const b = f.walk < 0 ? f.breath : f.walk % 2;
  const look = f.facing === 'side' ? 1 : 0;
  // hands on hips: thin bent arms behind the wig curls
  const arm: [number, number][] = [[7, 27], [6, 27], [5, 28], [4, 29], [4, 30], [5, 31], [6, 32], [7, 32]];
  dots(put, arm, INK, 0, b);
  dots(put, arm.map(([x, y]) => [24 - x, y] as [number, number]), INK, 0, b);
  const W = 1 + b;
  // long curls hanging down both sides (behind the ruler)
  const curls: Row[] = [];
  for (let i = 0; i < 16; i++) curls.push([[i % 3 === 0 ? 2 : 3, 8], [15, i % 3 === 1 ? 21 : 20]]);
  curls.push([[3, 7], [16, 20]], [[4, 6], [17, 20]], [[17, 19]]);
  blob(put, W + 8, curls, curl);
  // the ruler: wood, a darker right bevel, ticks on the right edge
  blob(put, 8 + b, Array.from({ length: 42 - 8 }, () => [[8, 16]] as Row), (x) => (x === 15 ? WOOD_DARK : WOOD));
  for (let y = 22; y < 41; y += 2) rect(put, y % 10 === 0 ? 11 : 14, y + b, y % 10 === 0 ? 4 : 1, 1, TICK);
  // the wig cloud on top, its fringe framing the top of the ruler
  const cloud: Row[] = [
    [[5, 7], [10, 12]],
    [[3, 8], [9, 15]],
    [[2, 17]],
    [[1, 19]],
    [[2, 20]],
    [[1, 20]],
    [[1, 21]],
    [[2, 21]],
    [[2, 9], [15, 21]],
  ];
  blob(put, W, cloud, curl);
  // small glasses sticking out past the edges of the plank
  rect(put, 6, 11 + b, 5, 4, INK);
  rect(put, 13, 11 + b, 5, 4, INK);
  rect(put, 11, 12 + b, 2, 1, INK);
  rect(put, 7, 12 + b, 3, 2, GLASS);
  rect(put, 14, 12 + b, 3, 2, GLASS);
  lens(put, 7, 12 + b, f.emotion, look, 1);
  lens(put, 14, 12 + b, f.emotion, look, -1);
  sternMouth(put, 16 + b, f.emotion, f.mouthOpen);
  // the light-blue ribbon: a bow on top right, the long tail down the curls
  rect(put, 18, W + 2, 1, 22, RIBBON);
  rect(put, 19, W + 2, 1, 22, RIBBON_DARK);
  blob(put, W - 1, [[[16, 17], [20, 21]], [[16, 21]], [[17, 20]], [[16, 17], [20, 21]]], RIBBON);
  put(18, W, RIBBON_DARK);
  put(19, W + 1, RIBBON_DARK);
  legs(put, 10, 42 + b, f.walk, SHOE);
}
