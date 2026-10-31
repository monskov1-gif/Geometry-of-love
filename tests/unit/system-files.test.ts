// Mini-game 4 «Системные файлы» (chapter 13): every stage is solvable, wrong
// cuts are caught, locks can always be opened in time (pure logic, no DOM).
import { describe, expect, it } from 'vitest';
import { checkCut, dameoLinks, findPath, holders, ownedFiles, ownedLinkFiles, solveOrder, solveSeparate } from '../../game/src/episodes/files-graph';
import { example, lockTime, makeLock, solveExample } from '../../game/src/episodes/files-lock';
import { LOCK_AT, MAX_STRIKES, StageRun } from '../../game/src/episodes/files-run';
import { FILES, STAGES, VIEW, type Stage } from '../../game/src/episodes/files-stages';

const byKind = (kind: string) => STAGES.find((s) => s.kind === kind)!;
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const reachesFrom = (stage: Stage, from: string, to: string) => findPath(stage, new Set(), to, from) !== null;

describe('Mini-game 4 «Системные файлы»: data', () => {
  it('has four escalating stages in order', () => {
    expect(STAGES.map((s) => s.kind)).toEqual(['trace', 'order', 'unstable', 'separate']);
  });
  for (const stage of STAGES) {
    it(`${stage.kind}: files are known, inside the view and apart; links connect files on the board`, () => {
      const ids = new Set(stage.nodes.map((n) => n.id));
      for (const n of stage.nodes) {
        expect(FILES[n.id]?.kind).toBe(n.kind);
        expect(n.x - 13.5).toBeGreaterThanOrEqual(0);
        expect(n.x + 13.5).toBeLessThanOrEqual(VIEW.w);
      }
      for (const a of stage.nodes) for (const b of stage.nodes) if (a !== b) expect(Math.abs(a.x - b.x) >= 28 || Math.abs(a.y - b.y) >= 12).toBe(true);
      for (const l of stage.links) expect(ids.has(l.from) && ids.has(l.to)).toBe(true);
      expect(ids.has('u07') && ids.has('world')).toBe(true);
      // decoys: the erased users' files are on the board and still hold parts of the program
      for (const n of stage.nodes.filter((x) => x.kind === 'damaged')) expect(reachesFrom(stage, n.id, 'world') || reachesFrom(stage, n.id, 'core')).toBe(true);
    });
  }
});

describe('stage 1: trace the wires', () => {
  const stage = byKind('trace');
  const mine = ownedLinkFiles(stage);
  it('has Dameo link files to find and decoy link files of erased users', () => {
    expect(mine.size).toBe(4);
    const decoys = stage.nodes.filter((n) => n.kind === 'link' && !mine.has(n.id));
    expect(decoys.length).toBeGreaterThanOrEqual(3);
    for (const d of decoys) expect(holders(stage, d.id).length).toBeGreaterThan(0);
  });
  it('marking exactly his link files passes; a decoy mark or a missing one restarts the stage', () => {
    const run = new StageRun(stage);
    for (const id of mine) run.toggleTag(id);
    expect(run.submitTags().tone).toBe('done');
    const wrong = new StageRun(stage);
    for (const id of mine) wrong.toggleTag(id);
    wrong.toggleTag('journal');
    expect(wrong.submitTags().tone).toBe('reset');
    expect(wrong.tags.size).toBe(0);
    const partial = new StageRun(stage);
    partial.toggleTag([...mine][0]!);
    expect(partial.submitTags().text).toMatch(/пропущено: 3/);
  });
  it('system files and user files cannot be marked', () => {
    const run = new StageRun(stage);
    run.toggleTag('world');
    run.toggleTag('u07');
    expect(run.tags.size).toBe(0);
  });
});

for (const kind of ['order', 'unstable'] as const) {
  describe(`stage ${kind}: cut in a valid order`, () => {
    const stage = byKind(kind);
    it('the solver finds a full valid order, and it needs depth (some links blocked at first)', () => {
      const plan = solveOrder(stage);
      expect(plan).not.toBeNull();
      expect(plan!.length).toBe(dameoLinks(stage).length);
      expect(plan!.length).toBeGreaterThanOrEqual(7);
      const blocked = dameoLinks(stage).filter((l) => checkCut(stage, new Set(), l.id, true).result === 'blocked');
      expect(blocked.length).toBeGreaterThanOrEqual(4);
    });
    it('every link not of Dameo (shared files, erased users, the program) is a wrong cut that restarts the stage', () => {
      const owned = ownedFiles(stage);
      const foreign = stage.links.filter((l) => !owned.has(l.from));
      expect(foreign.some((l) => reachesFrom(stage, 'u07', l.from))).toBe(true); // a shared-file trap exists
      for (const l of foreign) {
        const run = new StageRun(stage);
        expect(run.tryCut(l.id).tone).toBe('reset');
        expect(run.cut.size).toBe(0);
      }
    });
    it(`order mistakes are refused; mistake ${MAX_STRIKES} restarts the stage`, () => {
      const run = new StageRun(stage);
      const blocked = dameoLinks(stage).find((l) => checkCut(stage, new Set(), l.id, true).result === 'blocked')!;
      for (let i = 1; i < MAX_STRIKES; i++) {
        expect(run.tryCut(blocked.id).tone).toBe('bad');
        expect(run.strikes).toBe(i);
      }
      expect(run.tryCut(blocked.id).tone).toBe('reset');
      expect(run.strikes).toBe(0);
    });
  });
}

/** A scripted player: cuts the next valid link every `cutEvery` s, answers one lock example every `digitEvery` s. */
function playUnstable(seed: number, cutEvery: number, digitEvery: number) {
  const stage = byKind('unstable');
  const run = new StageRun(stage, seeded(seed));
  let worst = Infinity;
  let resets = 0;
  for (let step = 0; step < 400 && !run.done; step++) {
    if (run.lock) {
      const lock = run.lock;
      if (run.tick(digitEvery)?.tone === 'reset') resets++;
      if (!run.lock) continue;
      worst = Math.min(worst, lock.left);
      run.typeDigit(String(solveExample(lock.problems[lock.typed.length]!)));
      continue;
    }
    const next = dameoLinks(stage).find((l) => !run.cut.has(l.id) && checkCut(stage, run.cut, l.id, true).result === 'ok');
    expect(next).toBeDefined();
    expect(run.tryCut(next!.id).tone).not.toBe('reset');
    run.tick(cutEvery);
  }
  return { run, resets, worst };
}

describe('stage 3: the program locks files and restores links', () => {
  it('a lock appears after the set number of cuts, restores one cut link and locks one of his files', () => {
    const stage = byKind('unstable');
    const run = new StageRun(stage, seeded(7));
    const plan = solveOrder(stage)!;
    run.tryCut(plan[0]!);
    expect(run.lock).toBeNull();
    const e = run.tryCut(plan[1]!);
    expect(LOCK_AT[0]).toBe(2);
    expect(run.lock).not.toBeNull();
    expect(e.text).toMatch(/восстановлена/);
    expect(run.cut.size).toBe(1);
    expect(ownedFiles(stage).has(run.lock!.node)).toBe(true);
  });
  it('a slow but steady player (3 s per example) always opens every lock in time and finishes', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { run, resets, worst } = playUnstable(seed, 2, 3);
      expect(resets).toBe(0);
      expect(run.done).toBe(true);
      expect(run.locksUsed).toBe(LOCK_AT.length);
      expect(worst).toBeGreaterThan(2);
    }
  });
  it('letting a lock expire restores every link and restarts the stage', () => {
    const stage = byKind('unstable');
    const run = new StageRun(stage, seeded(3));
    const plan = solveOrder(stage)!;
    run.tryCut(plan[0]!);
    run.tryCut(plan[1]!);
    expect(run.tick(lockTime(3) + 0.1)?.tone).toBe('reset');
    expect(run.cut.size).toBe(0);
    expect(run.lock).toBeNull();
  });
  it('a wrong digit only clears the typed digits; links of the locked file cannot be cut', () => {
    const stage = byKind('unstable');
    const run = new StageRun(stage, seeded(5));
    const plan = solveOrder(stage)!;
    run.tryCut(plan[0]!);
    run.tryCut(plan[1]!);
    const lock = run.lock!;
    const wrongDigit = String((Number(lock.answer[0]) + 1) % 10);
    expect(run.typeDigit(wrongDigit).tone).toBe('bad');
    expect(lock.typed).toBe('');
    const touching = stage.links.find((l) => (l.from === lock.node || l.to === lock.node) && !run.cut.has(l.id))!;
    expect(run.tryCut(touching.id).text).toMatch(/заперт/);
  });
  it('lock examples always have one-digit answers matching the code', () => {
    const rand = seeded(11);
    for (let i = 0; i < 300; i++) {
      const d = i % 10;
      expect(solveExample(example(d, rand))).toBe(d);
      const lock = makeLock('x', 4, rand);
      expect(lock.problems.map(solveExample).join('')).toBe(lock.answer);
    }
  });
});

describe('stage 4: no path from user_07 to world.map', () => {
  const stage = byKind('separate');
  it('is solvable within the budget, not with fewer cuts, and not by cutting user_07’s own links', () => {
    const plan = solveSeparate(stage, stage.budget!);
    expect(plan).not.toBeNull();
    expect(plan!.length).toBe(stage.budget);
    expect(solveSeparate(stage, stage.budget! - 1)).toBeNull();
    expect(stage.links.filter((l) => l.from === 'u07').length).toBeGreaterThan(stage.budget!);
    const run = new StageRun(stage);
    for (const id of plan!.slice(0, -1)) expect(run.tryCut(id).tone).toBe('good');
    expect(run.tryCut(plan!.at(-1)!).tone).toBe('done');
  });
  it('using up the budget with a path left restarts the stage; tracing shows that path', () => {
    const run = new StageRun(stage);
    const own = stage.links.filter((l) => l.from === 'u07').slice(0, stage.budget!);
    expect(run.trace()).not.toBeNull();
    own.slice(0, -1).forEach((l) => run.tryCut(l.id));
    expect(run.trace()!.every((id) => !run.cut.has(id))).toBe(true);
    expect(run.tryCut(own.at(-1)!.id).tone).toBe('reset');
    expect(run.cut.size).toBe(0);
  });
  it('a cut that would erase an erased user’s file restarts the stage', () => {
    const run = new StageRun(stage);
    const shared = stage.links.find((l) => l.from === 'index')!;
    expect(holders(stage, 'index')).toEqual(['u05']);
    expect(run.tryCut(shared.id).text).toMatch(/user_05\.usr/);
    expect(run.restarts).toBe(1);
  });
});
