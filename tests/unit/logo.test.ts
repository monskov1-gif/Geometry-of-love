import { describe, expect, it } from 'vitest';
import { EQUATION, handTop, heartPoints, LETTER_DOTS, LOGO_CUES, ORIGIN, T, typedChars, wordCells } from '../../game/src/render/logo';

describe('opening logo', () => {
  it('plots points that lie on (x² + y² − 1)³ − x²y³ = 0', () => {
    const scale = 30;
    for (const p of heartPoints(200, scale)) {
      const x = (p.x - ORIGIN.x) / scale;
      const y = (ORIGIN.y - p.y) / scale;
      expect(Math.abs((x * x + y * y - 1) ** 3 - x * x * y ** 3)).toBeLessThan(1e-6);
    }
  });

  it('has one plotted point per dot of «GEOMETRY OF»', () => {
    expect(LETTER_DOTS.length).toBe(wordCells('GEOMETRY OF').length);
    expect(LETTER_DOTS.length).toBeGreaterThan(100);
  });

  it('types the whole equation before the graph appears', () => {
    expect(typedChars(T.grid)).toBe([...EQUATION].length);
    expect(typedChars(0)).toBe(0);
  });

  it('slams the palm in, then slides it down and off the paper', () => {
    expect(handTop(T.slamFrom - 0.01)).toBeNull();
    let prev = -Infinity;
    for (let t = T.slam; t <= T.final; t += 0.05) {
      const y = handTop(t)!;
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
    expect(handTop(T.slideEnd)!).toBeGreaterThan(216);
  });

  it('cues sounds in time order within the intro', () => {
    const times = LOGO_CUES.map((c) => c.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(Math.max(...times)).toBeLessThan(T.final);
  });
});
