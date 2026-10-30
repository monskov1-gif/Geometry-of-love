// Geometry task sets: exact forms are accepted, every task explains how to solve
// it, the difficulty climbs. Answers are recomputed in geometry-tasks-answers.test.ts,
// the teaching order is checked in geometry-tasks-teaching.test.ts.
import { describe, expect, it } from 'vitest';
import { checkAnswer, taskSets, type GeometryTask } from '../../game/src/content/geometry-tasks';
import { parseNumber } from '../../game/src/content/math-input';

const task = (set: string, id: string): GeometryTask => {
  const t = taskSets[set]!.tasks.find((x) => x.id === id);
  if (!t) throw new Error(`${set}/${id} missing`);
  return t;
};

it('every numeric answer is accepted when typed exactly and rejected when off by 5 %', () => {
  for (const [id, set] of Object.entries(taskSets))
    for (const t of set.tasks) {
      if (t.impossible || t.answer.type !== 'number') continue;
      expect(checkAnswer(t.answer, String(t.answer.value)), `${id}/${t.id}`).toBe(true);
      expect(checkAnswer(t.answer, String(t.answer.value * 1.05 + 0.01)), `${id}/${t.id}`).toBe(false);
    }
});

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
  it('onboarding stays easy; from the second lesson on Melody teaches university material', () => {
    expect(taskSets['app-lessons']!.tasks.length).toBe(3);
    expect(taskSets['app-lessons-2']!.tasks.length).toBeGreaterThan(3);
    expect(taskSets['app-lessons-3']!.tasks.length).toBeGreaterThan(taskSets['app-lessons-2']!.tasks.length);
    expect(taskSets['university-board']!.tasks.length).toBeGreaterThanOrEqual(3);
    expect(taskSets['university-board']!.tasks.length).toBeLessThanOrEqual(4);
    expect(taskSets['university-lecture']!.tasks.length).toBeGreaterThanOrEqual(5);
    // no school geometry left in the later lessons
    for (const id of ['app-lessons-2', 'app-lessons-3', 'university-lecture'])
      for (const t of taskSets[id]!.tasks) expect(t.prompt, `${id}/${t.id}`).not.toMatch(/равнобедренн|прямоугольник|трапеци|квадрат/i);
  });

  it('the board keeps its four problems in order (the classroom location draws them)', () => {
    expect(taskSets['university-board']!.tasks.map((t) => t.id)).toEqual(['skew-lines', 'helix-curvature', 'rotation-volume', 'plane-origin']);
  });
});
