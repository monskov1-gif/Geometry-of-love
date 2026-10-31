// Calculator-Pushin after the author's art (materials/characters/npc-sprites-2026-10-30.png):
// a taupe Pusheen-shaped calculator with cat ears, forehead stripes, thick
// black glasses with bored "T" eyes, a pink bow tie over a green LCD, pink
// keys, a striped tail curling on the left and two stubby feet.
import type { Emotion, Frame } from './humans';
import { blob, dots, INK, MOUTH, rect, stride, type Put, type Row } from './tool-kit';

const BODY = '#b0a498';
const SHADE = '#968a7e';
const STRIPE = '#6e5f4f';
const TAIL_LIGHT = '#a49786';
const WHITE = '#f3f5f4';
const LCD = '#accb74';
const LCD_DARK = '#7b9a4e';
const KEY = '#f2b6c6';
const BOW = '#f0a3bd';
const BOW_DARK = '#c97191';

const rows = (n: number, r: Row): Row[] => Array.from({ length: n }, () => r);

/** Body rows from the ear tips (0) down to the bottom (27): a tall gumdrop. */
const BODY_ROWS: Row[] = [
  [[5, 7], [17, 19]],
  [[4, 8], [16, 20]],
  [[5, 19]],
  [[4, 20]],
  [[4, 20]],
  [[4, 20]],
  ...rows(7, [[4, 20]]),
  ...rows(13, [[3, 21]]),
  [[4, 20]],
  [[6, 18]],
];

/** Lens interior (3×3) at x0..x0+2, y..y+2: the eye for each emotion. `nose` = +1 if the nose is to the right. */
function lensEye(put: Put, x0: number, y: number, e: Emotion, look: number, nose: 1 | -1): void {
  const px = x0 + 1 + look;
  const inner = nose > 0 ? x0 + 2 : x0;
  const outer = nose > 0 ? x0 : x0 + 2;
  if (e === 'happy') dots(put, [[x0, y + 2], [x0 + 1, y + 1], [x0 + 2, y + 2]], INK);
  else if (e === 'tired') rect(put, x0, y, 3, 2, INK), put(px, y + 2, INK);
  else if (e === 'scared') put(x0 + 1, y + 1, INK);
  else if (e === 'angry') dots(put, [[inner, y], [inner, y + 1], [x0 + 1, y], [px, y + 2]], INK);
  else if (e === 'sad') dots(put, [[outer, y], [outer, y + 1], [x0 + 1, y], [px, y + 2]], INK);
  else rect(put, x0, y, 3, 1, INK), put(px, y + 1, INK); // the bored "T"
}

function catMouth(put: Put, y: number, e: Emotion, open: boolean): void {
  put(12, y, INK); // nose
  if (open) return rect(put, 11, y + 1, 3, 2, MOUTH);
  if (e === 'happy') dots(put, [[11, y + 1], [12, y + 2], [13, y + 1], [10, y + 1], [14, y + 1]], INK);
  else if (e === 'sad') dots(put, [[11, y + 2], [13, y + 2], [12, y + 1]], INK);
  else if (e === 'scared') put(12, y + 2, MOUTH), dots(put, [[11, y + 2], [13, y + 2]], INK);
  else if (e === 'angry' || e === 'tired') rect(put, 11, y + 2, 3, 1, INK);
  else dots(put, [[11, y + 1], [13, y + 1]], INK);
}

export function drawCalculator(put: Put, f: Frame): void {
  const top = 16 + (f.walk < 0 ? f.breath : f.walk % 2);
  const T = top + 3; // the face and keys are laid out from the brow line
  const look = f.facing === 'side' ? 1 : 0;
  const a = stride(f.walk);
  // feet (behind the body): stubby, one lifted mid-stride
  for (const [x, dx, lifted] of [[7, a, f.walk === 1], [15, -a, f.walk === 3]] as const) {
    blob(put, T + 21, Array.from({ length: 46 - (T + 21) + 1 - (lifted ? 1 : 0) }, () => [[x + dx, x + dx + 2]] as Row), BODY);
  }
  // striped tail curling around the lower left
  const tail: Row[] = [[[1, 3]], [[0, 3]], [[0, 3]], [[0, 3]], [[0, 4]], [[1, 5]], [[2, 7]], [[4, 9]]];
  blob(put, T + 16, tail, (_x, y) => ((y - T) % 3 === 0 ? STRIPE : TAIL_LIGHT));
  // body
  blob(put, top, BODY_ROWS, (x, y) => (x >= 20 && y > T + 9 && y < T + 24 ? SHADE : BODY));
  // forehead stripes
  for (const x of [10, 12, 14]) rect(put, x, T + 1, 1, 2, STRIPE);
  // glasses: thick black frames, white lenses, a bridge, temples to the cheeks
  rect(put, 6, T + 5, 5, 5, INK);
  rect(put, 14, T + 5, 5, 5, INK);
  rect(put, 11, T + 6, 3, 1, INK);
  rect(put, 7, T + 6, 3, 3, WHITE);
  rect(put, 15, T + 6, 3, 3, WHITE);
  lensEye(put, 7, T + 6, f.emotion, look, 1);
  lensEye(put, 15, T + 6, f.emotion, look, -1);
  catMouth(put, T + 8, f.emotion, f.mouthOpen);
  // LCD with a cursor, the bow tie on top
  rect(put, 4, T + 11, 17, 6, INK);
  rect(put, 5, T + 12, 15, 4, LCD);
  rect(put, 6, T + 13, 1, 2, LCD_DARK);
  dots(put, [[9, T + 11], [10, T + 11], [14, T + 11], [15, T + 11], [9, T + 13], [10, T + 13], [14, T + 13], [15, T + 13]], BOW);
  rect(put, 9, T + 12, 7, 1, BOW);
  put(12, T + 12, BOW_DARK);
  // keys: round top row, the 3×3 number pad, operators, the big "=" arrow
  dots(put, [[5, T + 18], [7, T + 18], [9, T + 18], [10, T + 18], [15, T + 18], [17, T + 18], [18, T + 18]], KEY);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rect(put, 5 + c * 3, T + 20 + r * 2, 2, 1, KEY);
  dots(put, [[15, T + 20], [15, T + 22]], KEY);
  rect(put, 18, T + 20, 1, 5, KEY);
  rect(put, 16, T + 24, 2, 1, KEY);
}
