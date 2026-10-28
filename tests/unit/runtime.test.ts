import { describe, expect, it } from 'vitest';
import { StoryError, StoryRuntime } from '../../game/src/core/runtime';
import { branch, choice, effects, ending, episode, goto, label, say, show, space } from '../../game/src/core/script';
import type { Story } from '../../game/src/core/types';

const story: Story = {
  startScene: 'a',
  scenes: {
    a: {
      id: 'a',
      title: 'A',
      chapter: 1,
      steps: [
        space('reality'),
        show('melody', 'neutral'),
        say('melody', 'hello'),
        choice([
          { id: 'up', text: 'up', effects: [{ relationship: 'melody', add: 2 }] },
          { id: 'down', text: 'down', effects: [{ relationship: 'melody', add: -1 }], goto: 'b#cold' },
          { id: 'never', text: 'never', condition: { flag: 'missing' } },
          { id: 'grey', text: 'grey', condition: { flag: 'missing' }, whenUnavailable: 'disable' },
        ]),
        episode('quiz'),
        goto('b'),
      ],
    },
    b: {
      id: 'b',
      title: 'B',
      chapter: 2,
      steps: [
        branch({ relationship: 'melody', gte: 2 }, 'b#warm'),
        label('cold'),
        say('', 'cold'),
        ending('bad'),
        label('warm'),
        effects({ setFlag: 'warm' }),
        say('', 'warm'),
        ending('good'),
      ],
    },
  },
};

describe('StoryRuntime', () => {
  it('applies non-blocking steps and rests on the first line', () => {
    const rt = new StoryRuntime(story);
    expect(rt.present()).toMatchObject({ kind: 'line', speaker: 'melody', text: 'hello', textKind: 'speech' });
    expect(rt.state.stage.space).toBe('reality');
    expect(rt.state.stage.characters).toEqual([{ id: 'melody', pose: 'neutral', position: 'center' }]);
  });

  it('hides or disables unavailable options', () => {
    const rt = new StoryRuntime(story);
    const p = rt.advance();
    expect(p.kind).toBe('choice');
    if (p.kind !== 'choice') return;
    expect(p.options.map((o) => [o.id, o.enabled])).toEqual([
      ['up', true],
      ['down', true],
      ['grey', false],
    ]);
    expect(() => rt.choose('grey')).toThrow(StoryError);
  });

  it('runs dialogue → choice → effects → mandatory episode → branch → ending', () => {
    const rt = new StoryRuntime(story);
    rt.advance();
    expect(rt.choose('up').kind).toBe('episode');
    expect(rt.state.relationships.melody).toBe(2);
    expect(() => rt.advance()).toThrow(StoryError); // cannot skip the episode
    const p = rt.completeEpisode();
    expect(p).toMatchObject({ kind: 'line', text: 'warm' });
    expect(rt.state.flags.warm).toBe(true);
    expect(rt.advance()).toMatchObject({ kind: 'ending', ending: 'good' });
    expect(rt.state.ending).toBe('good');
    expect(rt.state.decisions).toEqual([{ scene: 'a', index: 3, option: 'up' }]);
  });

  it('follows option goto with labels', () => {
    const rt = new StoryRuntime(story);
    rt.advance();
    expect(rt.choose('down')).toMatchObject({ kind: 'line', text: 'cold' });
    expect(rt.state.relationships.melody).toBe(-1);
  });

  it('marks checkpoints on start, scene change and episode completion', () => {
    const rt = new StoryRuntime(story);
    expect(rt.takeCheckpoint()).toBe(true);
    expect(rt.takeCheckpoint()).toBe(false);
    rt.advance();
    rt.choose('up');
    expect(rt.takeCheckpoint()).toBe(false);
    rt.completeEpisode();
    expect(rt.takeCheckpoint()).toBe(true);
  });

  it('restores from a snapshot exactly', () => {
    const rt = new StoryRuntime(story);
    rt.advance();
    rt.choose('up');
    const restored = new StoryRuntime(story, JSON.parse(JSON.stringify(rt.snapshot())));
    expect(restored.present()).toEqual(rt.present());
    expect(restored.state).toEqual(rt.state);
  });

  it('snapshot is independent from the live state', () => {
    const rt = new StoryRuntime(story);
    const snap = rt.snapshot();
    rt.advance();
    rt.choose('up');
    expect(snap.relationships.melody).toBeUndefined();
  });

  it('rejects unknown scenes in saves', () => {
    const rt = new StoryRuntime(story);
    const snap = rt.snapshot();
    snap.position.scene = 'deleted-scene';
    expect(() => new StoryRuntime(story, snap)).toThrow(/Unknown scene/);
  });

  it('detects goto loops instead of hanging', () => {
    const loop: Story = { startScene: 'x', scenes: { x: { id: 'x', title: 'x', chapter: null, steps: [goto('x')] } } };
    expect(() => new StoryRuntime(loop)).toThrow(/goto loop/);
  });

  it('reports a scene that runs off its end', () => {
    const open: Story = { startScene: 'x', scenes: { x: { id: 'x', title: 'x', chapter: null, steps: [say('', 'a')] } } };
    const rt = new StoryRuntime(open);
    expect(() => rt.advance()).toThrow(/ended without a goto or ending/);
  });
});
