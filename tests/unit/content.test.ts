// Validates the real game content. When a scene references an unknown
// character, pose, background, episode, ending or variable, this fails.
import { describe, expect, it } from 'vitest';
import { characters, contentIndex, story } from '../../game/src/content';
import { taskSets } from '../../game/src/content/geometry-tasks';
import { StoryRuntime } from '../../game/src/core/runtime';
import { findStagingClashes, validateStory } from '../../game/src/core/validate';
import type { Story } from '../../game/src/core/types';

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

/**
 * Clashes still in scenes owned elsewhere (reported to the lead, ch10/ch12/ch13):
 * listed per scene and pair so a new clash anywhere fails at once. Remove an
 * entry when its scene is fixed.
 */
const KNOWN_CLASHES: string[] = [];

describe('staging: two people never stand on one spot', () => {
  it('holds for the whole story (the final chase, ch14–ch15, excepted)', () => {
    const clashes = findStagingClashes(story).filter((c) => !KNOWN_CLASHES.includes(c.replace(/:\d+ \(\w+\)/, '')));
    expect(clashes).toEqual([]);
  });

  const scene = (steps: Story['scenes'][string]['steps']): Story => ({ startScene: 's', scenes: { s: { id: 's', title: 's', chapter: null, steps } } });

  it('reports two visible characters on one mark at a shown step', () => {
    const clashes = findStagingClashes(
      scene([
        { type: 'show', character: 'melody', pose: 'neutral', position: 'center' },
        { type: 'show', character: 'eraser-2', pose: 'default' }, // no position = center
        { type: 'say', text: 'x' },
        { type: 'ending', ending: 'e' },
      ]),
    );
    expect(clashes).toEqual(['s:2 (say): melody, eraser-2 at "center"']);
  });

  it('ignores a clash that is resolved before anything is shown, and follows moves and hides', () => {
    const clashes = findStagingClashes(
      scene([
        { type: 'show', character: 'dameo', pose: 'neutral', position: 'left' },
        { type: 'show', character: 'eraser-1', pose: 'default', position: 'left' },
        { type: 'show', character: 'dameo', pose: 'neutral', position: 'right' },
        { type: 'say', text: 'x' },
        { type: 'hide', character: 'dameo' },
        { type: 'show', character: 'melody', pose: 'neutral', position: 'right' },
        { type: 'say', text: 'y' },
        { type: 'ending', ending: 'e' },
      ]),
    );
    expect(clashes).toEqual([]);
  });

  it('follows both ways of a branch and every option of a choice', () => {
    const story: Story = {
      startScene: 'a',
      scenes: {
        a: {
          id: 'a',
          title: 'a',
          chapter: null,
          steps: [
            { type: 'show', character: 'dameo', pose: 'neutral', position: 'left' },
            { type: 'branch', if: { flag: 'f' }, goto: 'a#x' },
            { type: 'choice', options: [{ id: 'p', text: 'p', goto: 'b' }, { id: 'q', text: 'q' }] },
            { type: 'goto', target: 'b' },
            { type: 'label', name: 'x' },
            { type: 'show', character: 'melody', pose: 'neutral', position: 'left' },
            { type: 'goto', target: 'b' },
          ],
        },
        // the stage carries over into the next scene
        b: { id: 'b', title: 'b', chapter: null, steps: [{ type: 'say', text: 'z' }, { type: 'ending', ending: 'e' }] },
      },
    };
    expect(findStagingClashes(story)).toEqual(['b:0 (say): dameo, melody at "left"']);
    // exempt scenes (by default the final chase, ch14 and ch15) are not checked
    expect(findStagingClashes(story, ['b'])).toEqual([]);
  });
});
