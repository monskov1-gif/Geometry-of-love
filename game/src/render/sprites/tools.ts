// The Sandbox inhabitants as pixel creatures on the same 24×48 grid as the
// humans (feet on y = 46), so they stand together in one scene at one scale.
// Their looks follow the synopsis (a talking calculator with expressive digits,
// an ancient ruler, a lively compass, three eraser twins); details are
// working designs to be approved by the author.
import type { Emotion, Frame } from './humans';

type Put = (x: number, y: number, c: string) => void;

const INK = '#22202a';

function rect(put: Put, x: number, y: number, w: number, h: number, c: string): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
}

function legs(put: Put, x: number, top: number, walk: number, c: string): void {
  const a = walk < 0 ? 0 : [1, 0, -1, 0][walk]!;
  rect(put, x + a, top, 1, 46 - top, c);
  rect(put, x + 4 - a, top, 1, 46 - top, c);
  rect(put, x - 1 + a, 46, 2, 1, INK);
  rect(put, x + 3 - a, 46, 2, 1, INK);
}

/** Tiny dot face used by tools: eyes 2 apart. */
function dotFace(put: Put, cx: number, y: number, e: Emotion, mouthOpen: boolean, c = INK): void {
  if (e === 'happy') {
    put(cx - 2, y + 1, c);
    put(cx - 3, y, c);
    put(cx + 2, y + 1, c);
    put(cx + 3, y, c);
  } else if (e === 'scared') {
    rect(put, cx - 3, y - 1, 1, 2, c);
    rect(put, cx + 2, y - 1, 1, 2, c);
  } else {
    put(cx - 2, y, c);
    put(cx + 2, y, c);
  }
  if (e === 'angry') {
    put(cx - 3, y - 2, c);
    put(cx + 3, y - 2, c);
  }
  if (mouthOpen) rect(put, cx - 1, y + 2, 2, 2, c);
  else if (e === 'sad' || e === 'scared') rect(put, cx - 1, y + 3, 2, 1, c), put(cx - 2, y + 4, c), put(cx + 1, y + 4, c);
  else rect(put, cx - 1, y + 3, 2, 1, c);
}

/** Calculator-Pushin: grey body, LCD screen that shows his face in digits. */
export function drawCalculator(put: Put, f: Frame): void {
  const bob = f.breath;
  const top = 22 + bob;
  rect(put, 5, top, 14, 18, INK);
  rect(put, 6, top + 1, 12, 16, '#a7aeb7');
  rect(put, 6, top + 15, 12, 2, '#8b929b');
  // LCD.
  rect(put, 7, top + 2, 10, 6, '#2e3a2c');
  rect(put, 8, top + 3, 8, 4, '#c6e6a4');
  const lcd = '#2f4a2a';
  const faces: Record<Emotion, [number, number][]> = {
    neutral: [[9, 4], [14, 4], [10, 6], [11, 6], [12, 6], [13, 6]],
    happy: [[9, 4], [10, 3], [11, 4], [13, 4], [14, 3], [15, 4], [11, 6], [12, 6]],
    sad: [[9, 4], [14, 4], [10, 6], [11, 5], [12, 5], [13, 6]],
    angry: [[9, 3], [10, 4], [14, 3], [13, 4], [10, 6], [11, 6], [12, 6], [13, 6]],
    scared: [[9, 3], [9, 4], [14, 3], [14, 4], [11, 5], [12, 5], [11, 6], [12, 6]],
    tired: [[9, 4], [10, 4], [13, 4], [14, 4], [11, 6], [12, 6]],
  };
  for (const [x, y] of faces[f.emotion]) put(x, top + y - (f.mouthOpen && y === 6 ? 1 : 0), lcd);
  if (f.mouthOpen) put(12, top + 6, lcd);
  // Buttons.
  const colors = ['#e0e3e7', '#e0e3e7', '#ff9fd0', '#e0e3e7', '#e0e3e7', '#b2f5e4', '#e0e3e7', '#e0e3e7', '#f8feb4'];
  colors.forEach((c, i) => rect(put, 7 + (i % 3) * 4, top + 9 + Math.floor(i / 3) * 2, 2, 1, c));
  // Thin arms.
  put(4, top + 9, INK);
  put(3, top + 10, INK);
  put(19, top + 9, INK);
  put(20, top + 10, INK);
  legs(put, 9, top + 18, f.walk, INK);
}

/** The Talking Ruler: a long old wooden ruler with tick marks and a face. */
export function drawRuler(put: Put, f: Frame): void {
  const sway = f.breath;
  const x = 9 + sway;
  rect(put, x - 1, 3, 8, 41, INK);
  rect(put, x, 4, 6, 39, '#e9cf6a');
  rect(put, x + 5, 4, 1, 39, '#c9ad4c');
  for (let y = 8; y < 42; y += 2) rect(put, x, y, y % 10 === 0 ? 3 : 2, 1, '#7a5a20');
  dotFace(put, x + 3, 6, f.emotion, f.mouthOpen, '#4a3510');
  put(x - 2, 20, INK);
  put(x - 3, 21, INK);
  put(x + 7, 20, INK);
  put(x + 8, 21, INK);
  legs(put, x + 1, 43, f.walk, INK);
}

/** Tsirkulyonok (the little compass): hinge head, two metal legs, a pencil lead. */
export function drawCompass(put: Put, f: Frame): void {
  const spread = f.walk < 0 ? 3 + f.breath : [2, 4, 6, 4][f.walk]!;
  const head = 18;
  rect(put, 9, head, 6, 6, INK);
  rect(put, 10, head + 1, 4, 4, '#d9dde6');
  put(12, head - 1, '#9aa1b0');
  put(12, head - 2, '#9aa1b0');
  dotFace(put, 12, head + 2, f.emotion, f.mouthOpen);
  for (let k = 0; k < 22; k++) {
    const y = head + 6 + k;
    const dx = Math.round((spread * k) / 21);
    put(11 - dx, y, '#b8bfcc');
    put(13 + dx, y, '#b8bfcc');
    put(10 - dx, y, k % 4 === 0 ? INK : '#8e95a3');
  }
  put(13 + spread, 46, '#4a4a55'); // pencil lead
  put(11 - spread, 46, '#c9ccd4'); // needle
}

/** Eraser twins: two-tone rubber block with a paper sleeve. `variant` 1..3. */
export function drawEraser(put: Put, f: Frame, variant: number): void {
  const hop = f.walk < 0 ? f.breath : [0, 2, 0, 1][f.walk]!;
  const top = 30 - hop;
  const body = variant === 2 ? '#f6a0b4' : variant === 3 ? '#f4a8a8' : '#f39cc0';
  rect(put, 5, top, 14, 13, INK);
  rect(put, 6, top + 1, 12, 11, body);
  // Sleeve: blue for №1 and №3, mint for №2 (the twins are nearly identical).
  rect(put, 6, top + 6, 12, 6, variant === 2 ? '#7fd8c0' : '#6f9fe0');
  for (let s = 0; s < variant; s++) rect(put, 7 + s * 2, top + 8, 1, 2, '#ffffff');
  dotFace(put, 12, top + 3, f.emotion, f.mouthOpen);
  legs(put, 9, top + 13, f.walk, INK);
}
