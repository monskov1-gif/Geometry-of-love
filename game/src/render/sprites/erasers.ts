// The three erasers after the author's art (which figure is which twin is the
// lead's mapping, to be confirmed by the author):
//   1 — the small grey wedge, smiling, waves its stick arms when happy;
//   2 — the tall eraser in a dark-blue paper sleeve, grey top with bite marks,
//       grumpy eyes peeking over the sleeve, an orange shard on top, orange shoes;
//   3 — the grey block with a black eye patch, a smirk and a chipped corner.
// Eraser 1 keeps the old footprint (body x 5..18, y top..top+12, legs below,
// eyes at (10|14, top+3)): world/erasure.ts rubs it out by those coordinates.
import type { Frame } from './humans';
import { blob, brow, dots, eye, INK, legs, lookOf, mouth, rect, type Put, type Row } from './tool-kit';

const GREY = '#b3c1c4';
const GREY_SIDE = '#8c9a9e';
const GREY_DARK = '#76838a';
const WHITE = '#f3f5f4';
const SLEEVE = '#1a4aa0';
const SLEEVE_SIDE = '#10336f';
const BAND = '#c8dce9';
const BAND_SIDE = '#98b0c2';
const ORANGE = '#f25a1e';
const ORANGE_DARK = '#b8401a';

const hopOf = (f: Frame) => (f.walk < 0 ? f.breath : [0, 2, 0, 1][f.walk]!);

/** Eraser 1: a wedge with a flat top, a thick darker side band and a round bottom. */
function wedge(put: Put, f: Frame): void {
  const top = 30 - hopOf(f);
  const rows: Row[] = [
    [[5, 12], [14, 17]],
    [[5, 18]],
    [[5, 18]],
    [[6, 18]],
    [[6, 18]],
    [[6, 18]],
    [[7, 18]],
    [[7, 18]],
    [[8, 18]],
    [[9, 17]],
    [[10, 16]],
    [[11, 15]],
    [[12, 14]],
  ];
  if (f.emotion === 'happy') {
    // waving stick arms, as in the art
    dots(put, [[4, top + 3], [3, top + 2], [2, top + 1], [2, top], [1, top - 1]], INK);
    dots(put, [[19, top + 4], [20, top + 3], [20, top + 2], [21, top + 1], [21, top], [22, top - 1]], INK);
  }
  legs(put, 10, top + 13, f.walk);
  blob(put, top, rows, (x, y) => (x <= rows[y - top]![0]![0] + 2 ? GREY_SIDE : GREY));
  const look = lookOf(f);
  for (const [x, inner] of [[10, 1], [14, -1]] as const) {
    eye(put, x, top + 3, f.emotion, look);
    brow(put, x, top + 3, f.emotion, inner);
  }
  // the default face smiles; "neutral" is a gentle smile
  if (f.emotion === 'neutral' && !f.mouthOpen) dots(put, [[10, top + 5], [11, top + 6], [12, top + 6], [13, top + 6], [14, top + 5]], INK);
  else mouth(put, 12, top + 6, f.emotion, f.mouthOpen);
}

/** Eraser 2: tall box, left side face, grey top with bites, light band, blue sleeve. */
function sleeved(put: Put, f: Frame): void {
  const top = 22 - hopOf(f);
  const e = f.emotion;
  // the orange shard stuck in the top
  dots(put, [[13, top - 4], [12, top - 3], [13, top - 3], [12, top - 2], [11, top - 1], [12, top - 1]], ORANGE);
  dots(put, [[11, top - 2], [13, top - 1]], ORANGE_DARK);
  legs(put, 10, top + 20, f.walk, ORANGE);
  const rows: Row[] = [[[7, 14], [16, 16]], ...Array.from({ length: 19 }, () => [[6, 18]] as Row)];
  blob(put, top, rows, (x, y) => {
    const r = y - top;
    const side = x <= 7;
    if (x === 8 && r > 0) return INK; // the box edge
    if (r <= 4) return side ? GREY_SIDE : GREY;
    if (r <= 6) return side ? BAND_SIDE : BAND;
    return side ? SLEEVE_SIDE : SLEEVE;
  });
  put(15, top + 1, GREY_DARK); // bite marks
  put(17, top + 1, GREY_DARK);
  rect(put, 7, top + 9, 1, 6, INK); // the crease on the side
  dots(put, [[5, top + 13], [19, top + 12]], INK); // little hands
  // grumpy eyes peeking over the sleeve
  for (const [x, inner] of [[10, 1], [15, -1]] as const) {
    if (e === 'happy' || e === 'tired') {
      eye(put, x + (inner > 0 ? 1 : 0), top + 3, e, 0);
      continue;
    }
    rect(put, x, top + 3, 2, 1, WHITE);
    put(e === 'scared' ? x + (inner > 0 ? 0 : 1) : x + 1, top + 3, INK); // glancing right, as in the art
    if (e === 'angry') dots(put, [[x - inner + (inner > 0 ? 0 : 1), top + 1], [x, top + 2], [x + 1, top + 2]], INK);
    else if (e === 'sad') dots(put, [[x + (inner > 0 ? 0 : 1), top + 2], [x + (inner > 0 ? 1 : 0), top + 1]], INK);
    else if (e === 'scared') rect(put, x, top + 1, 2, 1, INK);
    else rect(put, x, top + 2, 2, 1, INK); // heavy flat brows: the default scowl
  }
  // the mouth hides behind the sleeve; it shows only when it says or feels something
  if (f.mouthOpen) rect(put, 12, top + 4, 2, 1, '#6b2a3c');
  else if (e === 'happy') dots(put, [[11, top + 4], [12, top + 5], [13, top + 5], [14, top + 4]], INK);
  else if (e === 'sad' || e === 'scared') rect(put, 12, top + 4, 2, 1, INK);
}

/** Eraser 3: a grey block, side face on the right, chipped top-left corner, an eye patch. */
function patched(put: Put, f: Frame): void {
  const top = 26 - hopOf(f);
  const e = f.emotion;
  legs(put, 10, top + 15, f.walk);
  // stick arms hanging at the sides
  dots(put, [[4, top + 4], [4, top + 5], [4, top + 6], [4, top + 7], [3, top + 8]], INK);
  dots(put, [[20, top + 4], [20, top + 5], [20, top + 6], [20, top + 7], [21, top + 8]], INK);
  const rows: Row[] = [[[6, 7], [10, 17]], ...Array.from({ length: 12 }, () => [[6, 18]] as Row), [[7, 18]], [[8, 17]]];
  blob(put, top, rows, (x, y) => (y - top >= 12 ? GREY_DARK : x >= 17 ? GREY_SIDE : GREY));
  dots(put, [[8, top + 1], [9, top + 1]], GREY_DARK); // the chip
  // the patch over its left eye, the strap to the top corner
  rect(put, 13, top + 3, 3, 3, INK);
  dots(put, [[16, top + 2], [17, top + 1], [12, top + 2], [11, top + 1]], INK);
  // the one eye: half-lidded and sideways by default
  const look = lookOf(f);
  const x = 9;
  const y = top + 4;
  if (e === 'neutral' || e === 'angry') rect(put, x - 1, y - 1, 3, 1, INK), put(x + 1, y, INK);
  else eye(put, x, y, e, look);
  if (e === 'angry') dots(put, [[x - 1, y - 2], [x + 1, y - 1]], INK);
  else brow(put, x, y, e, 1);
  // smirk by default
  if (e === 'neutral' && !f.mouthOpen) dots(put, [[9, top + 8], [10, top + 8], [11, top + 8], [12, top + 7]], INK);
  else mouth(put, 11, top + 8, e, f.mouthOpen);
}

/** Eraser twins/triplets: `variant` 1..3. */
export function drawEraser(put: Put, f: Frame, variant: number): void {
  if (variant === 2) sleeved(put, f);
  else if (variant === 3) patched(put, f);
  else wedge(put, f);
}

