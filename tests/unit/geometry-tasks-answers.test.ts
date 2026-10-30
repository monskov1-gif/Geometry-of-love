// Every task's accepted answer is recomputed here from its condition, and every
// hint must end with «Ответ: …» stating exactly that answer (the author found a
// hint that said "2c" where the answer was 8).
import { describe, expect, it } from 'vitest';
import { checkAnswer, taskSets, type GeometryTask } from '../../game/src/content/geometry-tasks';

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V) => Math.sqrt(dot(a, a));
const det3 = (a: V, b: V, c: V) => dot(a, cross(b, c));
/** Simpson's rule. */
const integrate = (f: (x: number) => number, a: number, b: number, n = 1000) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
/** Distance between lines P1 + t·d1 and P2 + s·d2. */
const skew = (p1: V, d1: V, p2: V, d2: V) => {
  const n = cross(d1, d2);
  return Math.abs(dot(sub(p2, p1), n)) / norm(n);
};
/** Distance from the origin to the plane through three points. */
const originToPlane = (a: V, b: V, c: V) => {
  const n = cross(sub(b, a), sub(c, a));
  return Math.abs(dot(n, a)) / norm(n);
};
/** Curvature of a helix (r cos t, r sin t, h t), computed numerically at some t. */
const helix = (r: number, h: number, t = 0.7) => {
  const r1: V = [-r * Math.sin(t), r * Math.cos(t), h];
  const r2: V = [-r * Math.cos(t), -r * Math.sin(t), 0];
  return norm(cross(r1, r2)) / norm(r1) ** 3;
};
const vecText = (v: V) => `(${v.map((x) => String(x).replace('-', '−')).join(', ')})`;

/** Recomputed answer per task: a number, or the text of the correct option. */
const expected: Record<string, number | string> = {
  'app-lessons/right-angle': 90,
  'app-lessons/triangle-sides': '3',
  'app-lessons/square-perimeter': 4 * 2,

  'app-lessons-2/vec-length': norm([2, 3, 6]),
  'app-lessons-2/dot-product': dot([1, 2, 3], [4, -5, 6]),
  'app-lessons-2/cross-product': vecText(cross([1, 2, 0], [0, 1, 3])),
  'app-lessons-2/skew-lines-lesson': skew([0, 0, 0], [1, 2, 2], [3, 0, 1], [2, 1, -2]),

  'app-lessons-3/plane-normal': vecText([3, -1, 2]),
  'app-lessons-3/point-plane': Math.abs(2 * 3 + 1 - 2 * -1 + 9) / norm([2, 1, -2]),
  'app-lessons-3/plane-origin-lesson': originToPlane([4, 0, 0], [0, 2, 0], [0, 0, 4]),
  'app-lessons-3/cross-area': norm(cross(sub([0, 2, 0], [1, 0, 0]), sub([0, 0, 3], [1, 0, 0]))) / 2,
  'app-lessons-3/tetra-volume': Math.abs(det3([1, 2, 3], [2, 0, 1], [1, 1, 4])) / 6,

  'university-lecture/ellipse-foci': 2 * Math.sqrt(25 - 9),
  // x² − 4y² + 2x + 8y − 7 = 0: B² − 4AC = 0 − 4·1·(−4) > 0 → hyperbola (non-degenerate, checked below)
  'university-lecture/conic-type': 'Гипербола',
  'university-lecture/area-integral': integrate((x) => 2 * x - x * x, 0, 2),
  'university-lecture/rotation-volume-lesson': integrate((x) => (x * x) ** 2, 0, 2),
  'university-lecture/helix-curvature-lesson': helix(4, 3),

  'university-board/skew-lines': skew([1, 0, 0], [0, 1, 1], [0, 0, 2], [1, 0, 1]),
  'university-board/helix-curvature': helix(3, 4),
  'university-board/rotation-volume': integrate((x) => Math.sqrt(x) ** 2, 0, 4),
  'university-board/plane-origin': originToPlane([2, 0, 0], [0, 3, 0], [0, 0, 6]),

  'correct-answer/third-angle': '70°',
  'correct-answer/rectangle-area': 4 * 5,
  'correct-answer/construct-345': 'Да',
};

const allTasks = (): [string, GeometryTask][] =>
  Object.entries(taskSets).flatMap(([setId, set]) => set.tasks.filter((t) => !t.impossible).map((t): [string, GeometryTask] => [`${setId}/${t.id}`, t]));

const correctText = (t: GeometryTask) => (t.answer.type === 'choice' ? t.answer.options.find((o) => o.id === (t.answer as { correct: string }).correct)?.text : undefined);

describe('every answer is recomputed', () => {
  it('no task is left without a recomputation', () => {
    expect(allTasks().map(([key]) => key).filter((key) => !(key in expected))).toEqual([]);
  });

  for (const [key, t] of allTasks())
    it(key, () => {
      const want = expected[key];
      if (t.answer.type === 'number') {
        expect(typeof want, key).toBe('number');
        expect(t.answer.value).toBeCloseTo(want as number, 6);
      } else {
        expect(correctText(t)).toBe(want);
      }
    });

  it('the conic is a real hyperbola, not a pair of lines', () => {
    // (x + 1)²/4 − (y − 1)² = 1: points of it satisfy the original equation
    for (const x of [-3, 1, 3]) {
      const y = 1 + Math.sqrt((x + 1) ** 2 / 4 - 1);
      expect(x * x - 4 * y * y + 2 * x + 8 * y - 7).toBeCloseTo(0);
    }
  });
});

describe('every hint ends with the accepted answer', () => {
  for (const [key, t] of allTasks())
    it(key, () => {
      const m = /\nОтвет:\s*(.+)$/.exec(t.hint ?? '');
      expect(m, `${key}: the hint must end with a line «Ответ: …»`).not.toBeNull();
      const stated = m![1]!.trim();
      if (t.answer.type === 'number') {
        // «4/3 ≈ 1,333», «32/5 = 6,4»: every form stated must be accepted
        for (const form of stated.split(/\s*[≈=]\s*/)) expect(checkAnswer(t.answer, form), `${key}: «${form}»`).toBe(true);
      } else {
        expect(stated.toLowerCase()).toBe(correctText(t)?.toLowerCase());
      }
    });

  it('the ellipse hint states 8, not just 2c (author bug report)', () => {
    const t = taskSets['university-lecture']!.tasks.find((x) => x.id === 'ellipse-foci')!;
    expect(t.hint).toMatch(/2c = 2 · 4 = 8/);
    expect(t.hint).toMatch(/Ответ: 8$/);
  });
});
