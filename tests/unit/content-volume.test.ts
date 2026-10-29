// Story volume guard (docs/AUDIT.md № 7, docs/STORY_EXPANSION.md): every
// chapter of volumes II–III must keep the depth of volume I. Counts the text
// of lines and choice options per chapter (all scenes of a chapter together).
import { describe, expect, it } from 'vitest';
import { story } from '../../game/src/content';

function charsByChapter(): Map<string, number> {
  const out = new Map<string, number>();
  for (const scene of Object.values(story.scenes)) {
    const key = scene.chapter === null ? scene.id : scene.id.startsWith('ending-') ? scene.id : `ch${scene.chapter}`;
    let n = 0;
    for (const s of scene.steps) {
      if (s.type === 'say') n += s.text.length;
      if (s.type === 'choice') n += s.options.reduce((a, o) => a + o.text.length, 0);
    }
    out.set(key, (out.get(key) ?? 0) + n);
  }
  return out;
}

describe('story volume', () => {
  const chars = charsByChapter();

  // Chapters 14–15 are mostly the chase mini-game: their floor is lower.
  const floor: Record<number, number> = { 14: 4000, 15: 2800 };
  it.each([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])('chapter %i keeps the depth of volume I', (ch) => {
    expect(chars.get(`ch${ch}`) ?? 0).toBeGreaterThanOrEqual(floor[ch] ?? 4500);
  });

  it('ending 2 and the epilogue are full scenes, not summaries', () => {
    expect(chars.get('ending-favorite-student') ?? 0).toBeGreaterThanOrEqual(2500);
    expect(chars.get('epilogue') ?? 0).toBeGreaterThanOrEqual(3000);
  });

  it('every chapter opens with a chapter card', () => {
    for (const ch of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
      const scene = story.scenes[`ch${String(ch).padStart(2, '0')}`]!;
      expect(scene.steps.some((s) => s.type === 'card' && s.card.label === `Глава ${ch}`), `ch${ch}`).toBe(true);
    }
  });
});
