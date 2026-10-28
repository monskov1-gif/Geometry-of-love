import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../game/src/content/geometry-tasks';
import { reachedGoal, stepWalk, WALK_SPEED } from '../../game/src/episodes/horizontal-walk';

describe('geometry-quiz answers', () => {
  const num = { type: 'number' as const, value: 180 };
  it('accepts numbers with degree signs, spaces and decimal commas', () => {
    expect(checkAnswer(num, '180')).toBe(true);
    expect(checkAnswer(num, ' 180° ')).toBe(true);
    expect(checkAnswer({ type: 'number', value: 2.5 }, '2,5')).toBe(true);
  });
  it('rejects wrong, empty and non-numeric input', () => {
    expect(checkAnswer(num, '181')).toBe(false);
    expect(checkAnswer(num, '')).toBe(false);
    expect(checkAnswer(num, 'abc')).toBe(false);
  });
  it('honours tolerance', () => {
    expect(checkAnswer({ type: 'number', value: 3.14, tolerance: 0.01 }, '3.15')).toBe(true);
  });
  it('checks choice ids', () => {
    const answer = { type: 'choice' as const, options: [{ id: 'a', text: 'A' }], correct: 'a' };
    expect(checkAnswer(answer, 'a')).toBe(true);
    expect(checkAnswer(answer, 'b')).toBe(false);
  });
});

describe('horizontal-walk movement', () => {
  it('moves only horizontally and clamps to the level bounds', () => {
    let s = { x: 0, distance: 100 };
    s = stepWalk(s, -1, 1);
    expect(s.x).toBe(0);
    s = stepWalk(s, 1, 0.5);
    expect(s.x).toBe(WALK_SPEED * 0.5);
    s = stepWalk(s, 1, 10);
    expect(s.x).toBe(100);
    expect(reachedGoal(s)).toBe(true);
  });
});
