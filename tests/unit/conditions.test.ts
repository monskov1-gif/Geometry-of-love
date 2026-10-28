import { describe, expect, it } from 'vitest';
import { applyEffects, evaluate } from '../../game/src/core/conditions';

const base = { flags: { met: true }, relationships: { melody: 3 }, traits: { courage: -1 } };

describe('conditions', () => {
  it('evaluates flags, defaulting missing ones to false', () => {
    expect(evaluate({ flag: 'met' }, base)).toBe(true);
    expect(evaluate({ flag: 'met', is: false }, base)).toBe(false);
    expect(evaluate({ flag: 'unknown' }, base)).toBe(false);
    expect(evaluate({ flag: 'unknown', is: false }, base)).toBe(true);
  });

  it('evaluates numeric ranges, defaulting missing values to 0', () => {
    expect(evaluate({ relationship: 'melody', gte: 3 }, base)).toBe(true);
    expect(evaluate({ relationship: 'melody', gte: 4 }, base)).toBe(false);
    expect(evaluate({ relationship: 'satsuki', lte: 0 }, base)).toBe(true);
    expect(evaluate({ trait: 'courage', gte: -1, lte: 0 }, base)).toBe(true);
  });

  it('combines with all / any / not', () => {
    expect(evaluate({ all: [{ flag: 'met' }, { relationship: 'melody', gte: 1 }] }, base)).toBe(true);
    expect(evaluate({ any: [{ flag: 'nope' }, { trait: 'courage', lte: -5 }] }, base)).toBe(false);
    expect(evaluate({ not: { flag: 'met' } }, base)).toBe(false);
  });
});

describe('effects', () => {
  it('applies effects without mutating the input', () => {
    const next = applyEffects(base, [
      { setFlag: 'warm' },
      { setFlag: 'met', value: false },
      { relationship: 'melody', add: -2 },
      { relationship: 'satsuki', add: 1 },
      { trait: 'courage', add: 2 },
    ]);
    expect(next).toEqual({
      flags: { met: false, warm: true },
      relationships: { melody: 1, satsuki: 1 },
      traits: { courage: 1 },
    });
    expect(base.relationships.melody).toBe(3);
  });
});
