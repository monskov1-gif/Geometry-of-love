// Melody teaches before she asks: every task set the story plays opens with
// articles, every task names the article that teaches its method, and every
// such article has a worked example of the same type (author: "70% of the tasks
// Melody doesn't even teach").
import { describe, expect, it } from 'vitest';
import { checkAnswer, taskSets } from '../../game/src/content/geometry-tasks';
import { story } from '../../game/src/content/story';
import { garble } from '../../game/src/episodes/quiz-glitch';

/** Task sets the story runs as `geometry-quiz` episodes, in story order. */
function playedSets(): string[] {
  const ids: string[] = [];
  for (const scene of Object.values(story.scenes))
    for (const step of scene.steps)
      if (step.type === 'episode' && step.episode === 'geometry-quiz') ids.push(String(step.params?.taskSet));
  return ids;
}

describe('Melody teaches every method before asking it', () => {
  const played = playedSets();

  it('the story plays the lesson sets and Mini-game 2, never the board set', () => {
    expect(played).toEqual(expect.arrayContaining(['app-lessons', 'app-lessons-2', 'app-lessons-3', 'university-lecture', 'correct-answer']));
    expect(played).not.toContain('university-board');
  });

  for (const id of played)
    it(id, () => {
      const set = taskSets[id]!;
      const articles = set.articles ?? [];
      expect(articles.length, `${id} has no articles`).toBeGreaterThan(0);
      expect(articles.length, `${id}: the e2e helper pages through at most 5 articles`).toBeLessThanOrEqual(5);
      const titles = new Set(articles.map((a) => a.title));
      expect(titles.size).toBe(articles.length);
      for (const t of set.tasks) {
        expect(t.taughtIn, `${id}/${t.id} names no article`).toBeTruthy();
        expect(titles.has(t.taughtIn!), `${id}/${t.id}: «${t.taughtIn}» is not an article of this set`).toBe(true);
        const article = articles.find((a) => a.title === t.taughtIn)!;
        expect(article.body, `${id}/«${article.title}» needs a worked example`).toMatch(/Пример/);
      }
      // every article teaches something that is asked
      for (const a of articles) expect(set.tasks.some((t) => t.taughtIn === a.title), `${id}/«${a.title}» teaches nothing asked`).toBe(true);
    });

  it('every problem of the seminar board is taught in a later lesson, with the board problem as its example', () => {
    const board = taskSets['university-board']!.tasks;
    for (const t of board) {
      const home = played.map((id) => taskSets[id]!).find((s) => s.articles?.some((a) => a.title === t.taughtIn));
      expect(home, `${t.id}: «${t.taughtIn}» is not taught`).toBeTruthy();
      expect(home!.articles!.find((a) => a.title === t.taughtIn)!.body).toMatch(/с доски/);
    }
  });

  it('the lesson task differs from the worked example (no copying the answer)', () => {
    for (const id of played)
      for (const t of taskSets[id]!.tasks) {
        if (t.impossible || t.answer.type !== 'number') continue;
        const body = taskSets[id]!.articles!.find((a) => a.title === t.taughtIn)!.body;
        // every value worked out in the example («… = 9/3 = 3») differs from the task's answer
        for (const m of body.slice(body.indexOf('Пример')).matchAll(/=\s*([^=,:;\n]+)/g)) {
          const result = m[1]!.trim().replace(/[.!]$/, '');
          expect(checkAnswer(t.answer, result), `${id}/${t.id}: example gives «${result}»`).toBe(false);
        }
      }
  });
});

describe('the impossible task flickers its own numbers', () => {
  it('garbled numbers jump in length and only sometimes show the real value', () => {
    const seen = new Set(Array.from({ length: 400 }, () => garble('100')));
    expect(seen.has('100')).toBe(true);
    expect([...seen].some((s) => s.length >= 5)).toBe(true);
    expect(seen.size).toBeGreaterThan(50);
  });
});
