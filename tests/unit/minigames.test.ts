// Rules of the five story mini-games (pure logic, no DOM).
import { describe, expect, it } from 'vitest';
import { taskSets, checkAnswer } from '../../game/src/content/geometry-tasks';
import { AIR_TIME, BODY, buildCourse, CONFIGS, hits, JUMP_HEIGHT, obstacleBox, startState, stepChase, stepRunner, type Runner } from '../../game/src/episodes/chase-logic';
import { buildLevel } from '../../game/src/episodes/exit-climb';
import { MAX_JUMP_HEIGHT, stepBody, unreachablePlatforms, type Body } from '../../game/src/episodes/physics';
import { RULER_MAX, tryBridge } from '../../game/src/episodes/ruler-bridge';
import { cutLink, LINKS } from '../../game/src/episodes/system-files';

describe('platformer physics', () => {
  const ground = [{ x: 0, y: 100, w: 200, h: 10 }];
  const body: Body = { x: 10, y: 84, w: 10, h: 16, vx: 0, vy: 0, onGround: true, standingOn: 0 };

  it('lands on platforms from above and jumps about 60px high', () => {
    let b = stepBody(body, { dir: 0, jump: true }, ground, 0.016, { minX: 0, maxX: 200 });
    let top = b.y;
    for (let i = 0; i < 120; i++) {
      b = stepBody(b, { dir: 0, jump: false }, ground, 0.016, { minX: 0, maxX: 200 });
      top = Math.min(top, b.y);
    }
    expect(b.onGround).toBe(true);
    expect(b.y).toBeCloseTo(84);
    expect(84 - top).toBeGreaterThan(MAX_JUMP_HEIGHT * 0.9);
  });

  it('passes through a platform from below (one-way)', () => {
    const above = [{ x: 0, y: 60, w: 200, h: 6 }];
    const b = stepBody({ ...body, y: 70, vy: -300, onGround: false }, { dir: 0, jump: false }, above, 0.02, { minX: 0, maxX: 200 });
    expect(b.onGround).toBe(false);
    expect(b.y).toBeLessThan(70);
  });
});

describe('Mini-game 1 «Выход»', () => {
  it('every platform of the level can be reached by a jump', () => {
    expect(unreachablePlatforms(buildLevel())).toEqual([]);
  });
  it('upper platforms vanish, the top ledge does not', () => {
    const level = buildLevel();
    expect(level.some((p) => p.vanishing)).toBe(true);
    expect(level.at(-1)!.vanishing).toBe(false);
  });
});

describe('Mini-game 2 «Правильный ответ»', () => {
  const set = taskSets['correct-answer']!;
  it('has three ordinary tasks followed by one impossible task', () => {
    expect(set.tasks.map((t) => !!t.impossible)).toEqual([false, false, false, true]);
  });
  it('rejects every answer to the impossible task, even the "logical" one', () => {
    const t = set.tasks[3]!;
    for (const a of ['-20', '0', '180', '200', '20']) expect(checkAnswer(t.answer, a)).toBe(false);
  });
  it('onboarding lessons are short and very easy', () => {
    const intro = taskSets['app-lessons']!;
    expect(intro.articles!.length).toBeLessThanOrEqual(3);
    expect(intro.tasks.length).toBeLessThanOrEqual(3);
  });
});

describe('Mini-game 3 «Предел измерения»', () => {
  it('only a firm anchor with a length that reaches the far edge works', () => {
    expect(tryBridge('B', 9)).toBe('ok');
    expect(tryBridge('B', 10)).toBe('ok');
    expect(tryBridge('B', 8)).toBe('too-short');
    expect(tryBridge('A', 8)).toBe('cracked');
    expect(tryBridge('C', RULER_MAX)).toBe('too-short');
    expect(tryBridge('C', 11)).toBe('beyond-limit');
    expect(tryBridge('B', 12)).toBe('beyond-limit');
  });
});

describe('Mini-game 4 «Системные файлы»', () => {
  const binding = LINKS.filter((l) => l.role === 'binding').map((l) => l.id);
  const vital = LINKS.filter((l) => l.role === 'vital').map((l) => l.id);
  it('cutting a vital link is refused', () => {
    for (const id of vital) expect(cutLink(new Set(), id)).toBe('refused');
  });
  it('cutting every binding link completes the puzzle', () => {
    const cut = new Set<string>();
    binding.slice(0, -1).forEach((id) => {
      expect(cutLink(cut, id)).toBe('cut');
      cut.add(id);
    });
    expect(cutLink(cut, binding.at(-1)!)).toBe('done');
  });
});

describe('Mini-game 5 «Погоня»', () => {
  for (const config of Object.values(CONFIGS)) {
    it(`${config.mode}: obstacles leave time to react and land`, () => {
      const course = buildCourse(config);
      expect(course.length).toBeGreaterThan(8);
      for (let i = 1; i < course.length; i++) {
        expect((course[i]!.x - course[i - 1]!.x) / config.speed).toBeGreaterThan(AIR_TIME + 0.4);
      }
      if (config.mode === 'car') expect(course.every((o) => o.kind !== 'code')).toBe(true);
    });

    it(`${config.mode}: a careful player escapes, a passive one is caught`, () => {
      const course = buildCourse(config);
      const run = (smart: boolean) => {
        const s = startState(config);
        for (let t = 0; t < 120; t += 1 / 60) {
          const ahead = course.slice(s.next).find((o) => o.x + obstacleBox(o.kind).w > s.distance - BODY.width);
          const d = ahead ? ahead.x - s.distance : Infinity;
          const jump = smart && !!ahead && ahead.kind !== 'code' && d < config.speed * 0.2 && d > 0;
          const crouch = smart && !!ahead && ahead.kind === 'code' && d < 1.2;
          const r = stepChase(s, config, course, { jump, crouch }, 1 / 60);
          if (r !== 'running') return { r, hits: s.hitsTaken };
        }
        return { r: 'timeout', hits: s.hitsTaken };
      };
      expect(run(true)).toEqual({ r: 'escaped', hits: 0 });
      expect(run(false).r).toBe('caught');
    });
  }

  const standing: Runner = { y: 0, vy: 0, crouching: false };
  const at = (kind: 'block' | 'code' | 'formula') => ({ x: 0, kind });

  it('blocks and formulas hit a standing runner; a jump clears them', () => {
    expect(hits(standing, at('block'), 0.3)).toBe(true);
    expect(hits(standing, at('formula'), 0.3)).toBe(true);
    const airborne = { y: obstacleBox('formula').y1 + 0.05, vy: 0, crouching: false };
    expect(hits(airborne, at('formula'), 0.3)).toBe(false);
    expect(JUMP_HEIGHT).toBeGreaterThan(obstacleBox('formula').y1);
  });

  it('code lines hit a standing runner but not a crouching one', () => {
    expect(hits(standing, at('code'), 0.5)).toBe(true);
    expect(hits({ ...standing, crouching: true }, at('code'), 0.5)).toBe(false);
    expect(hits({ ...standing, crouching: true }, at('formula'), 0.3)).toBe(true);
  });

  it('a jump starts only from the ground', () => {
    const up = stepRunner(standing, true, false, 0.016);
    expect(up.y).toBeGreaterThan(0);
    const again = stepRunner(up, true, false, 0.016);
    expect(again.vy).toBeLessThan(up.vy);
  });
});
