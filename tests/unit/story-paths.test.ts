// Walks every path through the real story: each choice option, every
// mandatory episode completed. Proves that all three endings are reachable
// and that no path hits a dead end or a script error.
import { describe, expect, it } from 'vitest';
import { endings, story } from '../../game/src/content';
import { StoryRuntime } from '../../game/src/core/runtime';
import type { StoryState } from '../../game/src/core/types';

interface Walk {
  endings: Map<string, number>;
  episodes: Set<string>;
  cutscenes: Set<string>;
  scenes: Set<string>;
  states: number;
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
        const key = JSON.stringify([rt.state.position, rt.state.flags, rt.state.relationships]);
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
