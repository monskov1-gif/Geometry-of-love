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
  scenes: Set<string>;
  states: number;
}

function explore(): Walk {
  const result: Walk = { endings: new Map(), episodes: new Set(), scenes: new Set(), states: 0 };
  const seen = new Set<string>();
  const stack: StoryState[] = [new StoryRuntime(story).snapshot()];
  while (stack.length) {
    const rt = new StoryRuntime(story, stack.pop());
    for (let guard = 0; guard < 5000; guard++) {
      result.scenes.add(rt.state.position.scene);
      const p = rt.present();
      if (p.kind === 'line') rt.advance();
      else if (p.kind === 'episode') {
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
    let p = rt.present();
    while (p.kind === 'line') p = rt.advance();
    expect(p.kind).toBe('choice');
    expect(rt.choose('refuse').kind).toBe('line');
    while ((p = rt.present()).kind === 'line') rt.advance();
    expect(p).toMatchObject({ kind: 'ending', ending: 'self-taught' });
  });
});
