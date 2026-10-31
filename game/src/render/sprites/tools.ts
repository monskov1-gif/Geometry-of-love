// The Sandbox inhabitants as pixel creatures on the same 24×48 grid as the
// humans (feet on y = 46), so they stand together in one scene at one scale.
// Calculator, ruler and erasers follow the author's art of 2026-10-30
// (calculator.ts, ruler.ts, erasers.ts); the compass is not on that sheet and
// keeps its working design here.
import type { Frame } from './humans';
import { dotFace, INK, rect, type Put } from './tool-kit';

export { drawCalculator } from './calculator';
export { drawRuler } from './ruler';
export { drawEraser } from './erasers';

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

