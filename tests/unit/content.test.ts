// Validates the real game content. When a scene references an unknown
// character, pose, background, episode, ending or variable, this fails.
import { describe, expect, it } from 'vitest';
import { characters, contentIndex, story } from '../../game/src/content';
import { taskSets } from '../../game/src/content/geometry-tasks';
import { StoryRuntime } from '../../game/src/core/runtime';
import { validateStory } from '../../game/src/core/validate';

describe('game content', () => {
  it('story passes static validation', () => {
    expect(validateStory(story, contentIndex)).toEqual([]);
  });

  it('starts without errors', () => {
    // The story opens on the volume card of Volume I.
    expect(new StoryRuntime(story).present()).toMatchObject({ kind: 'card', card: { label: 'Том I' } });
  });

  it('sheet poses stay inside their sprite sheets', () => {
    for (const c of Object.values(characters)) {
      for (const [id, pose] of Object.entries(c.poses)) {
        if (pose.kind !== 'sheet') continue;
        const { frame, sheet } = pose;
        expect(frame.x + frame.w, `${c.id}/${id}`).toBeLessThanOrEqual(sheet.w);
        expect(frame.y + frame.h, `${c.id}/${id}`).toBeLessThanOrEqual(sheet.h);
        expect(pose.baseline, `${c.id}/${id}`).toBeLessThanOrEqual(frame.h);
      }
    }
  });

  it('every geometry task set has tasks and valid choice answers', () => {
    for (const [id, set] of Object.entries(taskSets)) {
      expect(set.tasks.length, id).toBeGreaterThan(0);
      for (const t of set.tasks) {
        if (t.answer.type === 'choice') {
          expect(t.answer.options.map((o) => o.id), `${id}/${t.id}`).toContain(t.answer.correct);
        }
      }
    }
  });
});

describe('validateStory', () => {
  it('reports broken references', () => {
    const problems = validateStory(
      {
        startScene: 'missing',
        scenes: {
          s: {
            id: 's',
            title: 's',
            chapter: null,
            steps: [
              { type: 'say', speaker: 'nobody', text: 'x' },
              { type: 'show', character: 'melody', pose: 'dancing' },
              { type: 'background', background: 'nowhere' },
              { type: 'effects', effects: [{ trait: 'unapproved', add: 1 }] },
              { type: 'episode', episode: 'unknown' },
              { type: 'goto', target: 's#nolabel' },
            ],
          },
        },
      },
      contentIndex,
    );
    expect(problems).toEqual([
      'startScene "missing" does not exist',
      's:0 (say): unknown character "nobody"',
      's:1 (show): unknown pose "dancing" for "melody"',
      's:2 (background): unknown background "nowhere"',
      's:3 (effects): undeclared trait "unapproved"',
      's:4 (episode): unknown episode "unknown"',
      's:5 (goto): Unknown label in target "s#nolabel"',
    ]);
  });

  it('requires scenes to terminate', () => {
    const problems = validateStory(
      { startScene: 's', scenes: { s: { id: 's', title: 's', chapter: null, steps: [{ type: 'say', text: 'x' }] } } },
      contentIndex,
    );
    expect(problems).toEqual(['scene "s" must end with goto, ending, or a choice whose options all jump']);
  });
});
