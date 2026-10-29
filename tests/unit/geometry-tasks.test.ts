// Geometry task sets: every answer is recomputed here from the condition,
// exact forms are accepted, every task explains how to solve it.
import { describe, expect, it } from 'vitest';
import { checkAnswer, taskSets, type GeometryTask } from '../../game/src/content/geometry-tasks';
import { parseNumber } from '../../game/src/content/math-input';

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

const task = (set: string, id: string): GeometryTask => {
  const t = taskSets[set]!.tasks.find((x) => x.id === id);
  if (!t) throw new Error(`${set}/${id} missing`);
  return t;
};
const value = (set: string, id: string) => {
  const a = task(set, id).answer;
  if (a.type !== 'number') throw new Error('not numeric');
  return a.value;
};

describe('typed answers', () => {
  it('parses exact forms', () => {
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('4/3')).toBeCloseTo(4 / 3);
    expect(parseNumber('√3')).toBeCloseTo(Math.sqrt(3));
    expect(parseNumber('6/√14')).toBeCloseTo(6 / Math.sqrt(14));
    expect(parseNumber('3√2')).toBeCloseTo(3 * Math.sqrt(2));
    expect(parseNumber('8π')).toBeCloseTo(8 * Math.PI);
    expect(parseNumber('(1+√5)/2')).toBeCloseTo((1 + Math.sqrt(5)) / 2);
    expect(parseNumber('3²')).toBe(9);
    expect(parseNumber('2^3')).toBe(8);
    expect(parseNumber('−20')).toBe(-20);
    expect(parseNumber(' 90° ')).toBe(90);
    expect(parseNumber('sqrt(4)')).toBe(2);
  });
  it('rejects anything that is not a number', () => {
    for (const bad of ['', 'abc', '1/', '((2)', 'alert(1)', '2..3', '√']) expect(parseNumber(bad), bad).toBeNaN();
  });
  it('accepts an exact form of a hard answer', () => {
    expect(checkAnswer(task('university-board', 'skew-lines').answer, '√3')).toBe(true);
    expect(checkAnswer(task('university-board', 'plane-origin').answer, '6/√14')).toBe(true);
    expect(checkAnswer(task('university-lecture', 'area-integral').answer, '4/3')).toBe(true);
    expect(checkAnswer(task('university-lecture', 'area-integral').answer, '1,33')).toBe(true);
    expect(checkAnswer(task('university-lecture', 'area-integral').answer, '1.5')).toBe(false);
  });
});

describe('every ordinary task has a hint', () => {
  for (const [id, set] of Object.entries(taskSets))
    it(id, () => {
      for (const t of set.tasks) if (!t.impossible) expect(t.hint, `${id}/${t.id}`).toBeTruthy();
    });
});

describe('difficulty climbs', () => {
  it('onboarding stays easy; later lessons have more tasks; university sets are hard', () => {
    expect(taskSets['app-lessons']!.tasks.length).toBe(3);
    expect(taskSets['app-lessons-2']!.tasks.length).toBeGreaterThan(3);
    expect(taskSets['app-lessons-3']!.tasks.length).toBeGreaterThan(taskSets['app-lessons-2']!.tasks.length);
    expect(taskSets['university-board']!.tasks.length).toBeGreaterThanOrEqual(3);
    expect(taskSets['university-board']!.tasks.length).toBeLessThanOrEqual(4);
    expect(taskSets['university-lecture']!.tasks.length).toBeGreaterThanOrEqual(5);
  });
});

describe('answers are correct', () => {
  it('lessons 03–04', () => {
    expect(value('app-lessons-2', 'iso-height')).toBeCloseTo(Math.sqrt(13 ** 2 - 5 ** 2));
    expect(value('app-lessons-3', 'trapezoid-area')).toBe(((5 + 11) / 2) * 4);
    const p = (13 + 14 + 15) / 2;
    expect(value('app-lessons-3', 'heron')).toBeCloseTo(Math.sqrt(p * (p - 13) * (p - 14) * (p - 15)));
  });

  it('university lecture', () => {
    const A: V = [1, 0, 0];
    const B: V = [0, 2, 0];
    const C: V = [0, 0, 3];
    expect(value('university-lecture', 'cross-area')).toBeCloseTo(norm(cross(sub(B, A), sub(C, A))) / 2);
    expect(value('university-lecture', 'point-plane')).toBeCloseTo(Math.abs(2 * 3 + 1 - 2 * -1 + 9) / Math.sqrt(4 + 1 + 4));
    expect(value('university-lecture', 'tetra-volume')).toBeCloseTo(Math.abs(det3([1, 2, 3], [2, 0, 1], [1, 1, 4])) / 6);
    expect(value('university-lecture', 'ellipse-foci')).toBeCloseTo(2 * Math.sqrt(25 - 9));
    expect(value('university-lecture', 'area-integral')).toBeCloseTo(integrate((x) => 2 * x - x * x, 0, 2), 6);
    // x² − 4y² + 2x + 8y − 7 = 0: the quadratic part x² − 4y² has a negative discriminant product → hyperbola
    const conic = task('university-lecture', 'conic-type').answer;
    expect(conic.type === 'choice' && conic.correct).toBe('hyperbola');
    const [a, b, c] = [1, 0, -4]; // Ax² + Bxy + Cy²
    expect(b * b - 4 * a * c).toBeGreaterThan(0);
    // and it is not degenerate: (x + 1)²/4 − (y − 1)² = 1
    for (const x of [-3, 1, 3]) {
      const y = 1 + Math.sqrt((x + 1) ** 2 / 4 - 1);
      expect(x * x - 4 * y * y + 2 * x + 8 * y - 7).toBeCloseTo(0);
    }
  });

  it('university board', () => {
    const d1: V = [0, 1, 1];
    const d2: V = [1, 0, 1];
    const n = cross(d1, d2);
    expect(value('university-board', 'skew-lines')).toBeCloseTo(Math.abs(dot(sub([0, 0, 2], [1, 0, 0]), n)) / norm(n));
    // helix (a cos t, a sin t, b t): numeric curvature at an arbitrary t
    const t = 0.7;
    const r1: V = [-3 * Math.sin(t), 3 * Math.cos(t), 4];
    const r2: V = [-3 * Math.cos(t), -3 * Math.sin(t), 0];
    expect(value('university-board', 'helix-curvature')).toBeCloseTo(norm(cross(r1, r2)) / norm(r1) ** 3);
    expect(value('university-board', 'rotation-volume') * Math.PI).toBeCloseTo(Math.PI * integrate((x) => Math.sqrt(x) ** 2, 0, 4));
    const N = cross(sub([0, 3, 0], [2, 0, 0]), sub([0, 0, 6], [2, 0, 0]));
    expect(value('university-board', 'plane-origin')).toBeCloseTo(Math.abs(dot(N, [2, 0, 0])) / norm(N));
  });

  it('every numeric answer is accepted when typed exactly and rejected when off by 5 %', () => {
    for (const [id, set] of Object.entries(taskSets))
      for (const t of set.tasks) {
        if (t.impossible || t.answer.type !== 'number') continue;
        expect(checkAnswer(t.answer, String(t.answer.value)), `${id}/${t.id}`).toBe(true);
        expect(checkAnswer(t.answer, String(t.answer.value * 1.05 + 0.01)), `${id}/${t.id}`).toBe(false);
      }
  });
});
