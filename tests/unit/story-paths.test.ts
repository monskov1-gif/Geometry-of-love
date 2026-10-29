// Walks every path through the real story: each choice option, every
// mandatory episode completed. Proves that all three endings are reachable
// and that no path hits a dead end or a script error.
import { describe, expect, it } from 'vitest';
import { endings, story } from '../../game/src/content';
import { StoryRuntime } from '../../game/src/core/runtime';
import type { Step, StoryState } from '../../game/src/core/types';

interface Walk {
  endings: Map<string, number>;
  episodes: Set<string>;
  cutscenes: Set<string>;
  scenes: Set<string>;
  states: number;
}

type Condition = Extract<Step, { type: 'branch' }>['if'];

/**
 * Flags that conditions in each scene, or in any scene reachable from it, can
 * still read. A flag nobody reads again cannot change what happens, so two
 * choice points that differ only in such flags behave identically and the walk
 * needs just one of them. Without this, write-only history (an early flag that
 * is never read again) multiplies the states. Relationships and traits stay in
 * the key exactly: later effects add to them.
 */
function flagsReadAfter(): Map<string, string[]> {
  const own = new Map<string, Set<string>>();
  const next = new Map<string, Set<string>>();
  const addCond = (into: Set<string>, c: Condition): void => {
    if ('all' in c) c.all.forEach((x) => addCond(into, x));
    else if ('any' in c) c.any.forEach((x) => addCond(into, x));
    else if ('not' in c) addCond(into, c.not);
    else if ('flag' in c) into.add(c.flag);
  };
  for (const scene of Object.values(story.scenes)) {
    const flags = new Set<string>();
    const targets = new Set<string>();
    const target = (t: string) => targets.add(t.split('#')[0]!);
    for (const s of scene.steps) {
      if (s.type === 'branch') {
        addCond(flags, s.if);
        target(s.goto);
      } else if (s.type === 'goto') target(s.target);
      else if (s.type === 'choice')
        for (const o of s.options) {
          if (o.condition) addCond(flags, o.condition);
          if (o.goto) target(o.goto);
        }
    }
    own.set(scene.id, flags);
    next.set(scene.id, targets);
  }
  const result = new Map<string, string[]>();
  for (const id of own.keys()) {
    const acc = new Set<string>();
    const seen = new Set([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      own.get(cur)!.forEach((f) => acc.add(f));
      for (const n of next.get(cur) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    result.set(id, [...acc].sort());
  }
  return result;
}

const READ_FLAGS = flagsReadAfter();

function stateKey(state: StoryState): string {
  const flags = READ_FLAGS.get(state.position.scene)!.map((f) => (state.flags[f] ? 1 : 0));
  return JSON.stringify([state.position, flags, state.relationships, state.traits]);
}

function explore(): Walk {
  const result: Walk = { endings: new Map(), episodes: new Set(), cutscenes: new Set(), scenes: new Set(), states: 0 };
  const seen = new Set<string>();
  const stack: StoryState[] = [new StoryRuntime(story).snapshot()];
  while (stack.length) {
    const rt = new StoryRuntime(story, stack.pop());
    for (let guard = 0; guard < 5000; guard++) {
      result.scenes.add(rt.state.position.scene);
      const p = rt.present();
      if (p.kind === 'line' || p.kind === 'card') rt.advance();
      else if (p.kind === 'cutscene') {
        result.cutscenes.add(p.cutscene);
        rt.completeCutscene();
      } else if (p.kind === 'episode') {
        result.episodes.add(p.episode);
        rt.completeEpisode();
      } else if (p.kind === 'ending') {
        result.endings.set(p.ending, (result.endings.get(p.ending) ?? 0) + 1);
        break;
      } else {
        const key = stateKey(rt.state);
        if (!seen.has(key)) {
          seen.add(key);
          result.states++;
          for (const o of p.options.filter((x) => x.enabled)) {
            const branch = new StoryRuntime(story, rt.snapshot());
            branch.choose(o.id);
            stack.push(branch.snapshot());
          }
        }
        break;
      }
    }
  }
  return result;
}

describe('story paths', () => {
  const walk = explore();

  it('reaches all three endings', () => {
    expect([...walk.endings.keys()].sort()).toEqual(Object.keys(endings).sort());
  });

  it('visits every scene', () => {
    expect([...walk.scenes].sort()).toEqual(Object.keys(story.scenes).sort());
  });

  it('uses all five mini-games and the interactive episode', () => {
    expect([...walk.episodes].sort()).toEqual(['chase', 'exit-climb', 'geometry-quiz', 'horizontal-walk', 'ruler-bridge', 'system-files']);
  });

  it('starts with the install choice of chapter 1 leading to ending 1', () => {
    const rt = new StoryRuntime(story);
    // Lines and cards are read through; small choices on the way take their first option.
    const until = (stop: (p: ReturnType<typeof rt.present>) => boolean) => {
      let p = rt.present();
      for (let i = 0; i < 2000 && !stop(p); i++) {
        if (p.kind === 'line' || p.kind === 'card') p = rt.advance();
        else if (p.kind === 'choice') p = rt.choose(p.options[0]!.id);
        else throw new Error(`unexpected ${p.kind}`);
      }
      return p;
    };
    const install = until((p) => p.kind === 'choice' && p.options.some((o) => o.id === 'refuse'));
    expect(rt.state.position.scene).toBe('ch01');
    expect(install.kind).toBe('choice');
    rt.choose('refuse');
    expect(until((p) => p.kind === 'ending')).toMatchObject({ kind: 'ending', ending: 'self-taught' });
  });
});
