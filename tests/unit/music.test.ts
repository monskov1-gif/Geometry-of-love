// The music map and the synthesised themes: every scene gets a theme, every
// theme exists and compiles, neighbouring chapters do not share a theme.
import { describe, expect, it } from 'vitest';
import { story } from '../../game/src/content';
import { GENERIC_TRACKS, LOCATION_MUSIC, SCENE_MUSIC, SPACE_MUSIC, defaultTheme, musicFor } from '../../game/src/content/music-map';
import { TRACKS, TRACK_ALIASES, TRACK_IDS, resolveTrackId, trackDuration } from '../../game/src/audio/tracks';
import { RECORDED_IDS } from '../../game/src/audio/recorded';
import type { Voice } from '../../game/src/audio/voice';
import type { StageState, Step } from '../../game/src/core/types';

const THEMES = new Set([...TRACK_IDS, ...RECORDED_IDS]);
const BLOCKING = new Set<Step['type']>(['say', 'choice', 'episode', 'card', 'cutscene', 'ending']);

/** Theme heard at each blocking step, walking every scene in reading order (gotos ignored). */
function walk(): Map<string, { theme: string | null; explicitNull: boolean }[]> {
  const out = new Map<string, { theme: string | null; explicitNull: boolean }[]>();
  const stage: StageState = { background: null, lighting: null, variant: null, music: null, shot: null, space: 'app', phase: 'A', characters: [] };
  for (const scene of Object.values(story.scenes)) {
    const heard: { theme: string | null; explicitNull: boolean }[] = [];
    let explicitNull = false;
    scene.steps.forEach((step, index) => {
      if (step.type === 'space') {
        stage.space = step.space;
        if (step.phase) stage.phase = step.phase;
      } else if (step.type === 'background') stage.background = step.background;
      else if (step.type === 'music') {
        stage.music = step.track;
        explicitNull = step.track === null;
      }
      if (BLOCKING.has(step.type)) heard.push({ theme: musicFor(story, { position: { scene: scene.id, index }, stage }), explicitNull });
    });
    out.set(scene.id, heard);
  }
  return out;
}

const firstTheme = (h: { theme: string | null }[]) => h.find((x) => x.theme !== null)?.theme ?? null;
const lastTheme = (h: { theme: string | null }[]) => [...h].reverse().find((x) => x.theme !== null)?.theme ?? null;

/** Chapters in reading order: [chapter number, scene ids]. */
function chapters(): [number, string[]][] {
  const byNumber = new Map<number, string[]>();
  for (const s of Object.values(story.scenes)) {
    if (s.chapter === null) continue;
    byNumber.set(s.chapter, [...(byNumber.get(s.chapter) ?? []), s.id]);
  }
  return [...byNumber.entries()].sort((a, b) => a[0] - b[0]);
}

/** Boundaries where the same theme is meant to carry on into the next chapter. */
const CONTINUES = new Set([
  'ch03>ch04', // Dameo has just been pulled into the game: ch. 4 opens in the same place
  'ch14>ch15', // the chase goes on (the author's «Corrupted Pulse»)
]);

describe('music map', () => {
  it('names only existing themes (never aliases)', () => {
    const values: string[] = [...Object.values(LOCATION_MUSIC), ...Object.values(SPACE_MUSIC).flatMap((p) => Object.values(p))];
    for (const e of Object.values(SCENE_MUSIC)) {
      if (typeof e === 'string') values.push(e);
      else for (const t of Object.values(e)) values.push(...(typeof t === 'string' ? [t] : Object.values(t)));
    }
    for (const v of values) expect(THEMES.has(v), v).toBe(true);
  });

  it('has entries only for scenes that exist, and one for every story scene', () => {
    for (const id of Object.keys(SCENE_MUSIC)) expect(story.scenes[id], id).toBeDefined();
    for (const id of Object.keys(story.scenes)) expect(SCENE_MUSIC[id], id).toBeDefined();
  });

  it('gives every moment of every scene a theme; silence only after an explicit music(null)', () => {
    for (const [scene, heard] of walk()) {
      expect(heard.length, scene).toBeGreaterThan(0);
      for (const h of heard) {
        if (h.theme === null) expect(h.explicitNull, scene).toBe(true);
        else expect(THEMES.has(h.theme), `${scene}: ${h.theme}`).toBe(true);
      }
    }
  });

  it('opens neighbouring chapters on different themes', () => {
    const heard = walk();
    const list = chapters();
    for (let i = 1; i < list.length; i++) {
      const [prevN, prev] = list[i - 1]!;
      const [n, cur] = list[i]!;
      const a = firstTheme(heard.get(prev[0]!)!);
      const b = firstTheme(heard.get(cur[0]!)!);
      expect(a, `chapter ${prevN} vs ${n}`).not.toBe(b);
    }
  });

  it('changes the theme at chapter boundaries unless the scene is meant to carry on', () => {
    const heard = walk();
    const list = chapters();
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]![1].at(-1)!;
      const next = list[i]![1][0]!;
      if (CONTINUES.has(`${prev}>${next}`)) continue;
      expect(lastTheme(heard.get(prev)!), `${prev} > ${next}`).not.toBe(firstTheme(heard.get(next)!));
    }
  });

  it('uses every composed theme somewhere in the story or on the title screen', () => {
    const used = new Set(['title']);
    for (const h of walk().values()) for (const x of h) if (x.theme) used.add(x.theme);
    for (const id of TRACK_IDS) expect(used.has(id), id).toBe(true);
  });
});

describe('music resolution', () => {
  const stage = (over: Partial<StageState>): StageState => ({
    background: null, lighting: null, variant: null, music: null, shot: null, space: 'reality', phase: 'A', characters: [], ...over,
  });
  const at = (scene: string, index: number, over: Partial<StageState>) => musicFor(story, { position: { scene, index }, stage: stage(over) });
  const firstMusic = (scene: string) => story.scenes[scene]!.steps.findIndex((s) => s.type === 'music');

  it('does not carry music over from the previous scene', () => {
    // ch05 has no music() step: the stage still remembers ch04's theme, the map decides
    expect(at('ch05', 1, { space: 'game', phase: 'C', music: 'app-uneasy' })).toBe(defaultTheme('ch05', { space: 'game', phase: 'C', background: null }));
  });

  it('lets an explicit music() step in the scene win', () => {
    const i = firstMusic('ch01');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(at('ch01', i + 1, { music: 'tension' })).toBe('tension');
  });

  it('treats music(null) as silence once the step has passed', () => {
    const i = firstMusic('ch01');
    expect(at('ch01', i + 1, { music: null })).toBeNull();
  });

  it('resolves generic space ids by scene and location', () => {
    const i = firstMusic('ch01');
    expect(at('ch01', i + 1, { music: 'reality', background: 'university-hall' })).toBe('university');
    expect(at('ch01', i + 1, { music: 'reality', background: 'dameo-room' })).toBe('home-night');
    expect(at('ch01', i + 1, { music: 'app' })).toBe(defaultTheme('ch01', { space: 'app', phase: 'A', background: null }));
  });

  it('pins ending themes for the whole ending scene', () => {
    expect(defaultTheme('ending-self-taught', { space: 'reality', phase: 'A', background: 'university-hall' })).toBe('ending-self-taught');
    expect(defaultTheme('epilogue', { space: 'reality', phase: 'A', background: 'university-hall' })).toBe('ending-beyond-screen');
  });

  it('knows every generic id as an alias, and every alias points at a theme', () => {
    for (const g of Object.keys(GENERIC_TRACKS)) expect(TRACK_ALIASES[g], g).toBeDefined();
    for (const [a, t] of Object.entries(TRACK_ALIASES)) expect(TRACKS[t], `${a} → ${t}`).toBeDefined();
    expect(resolveTrackId('tension')).toBe('tension');
  });
});

describe('synthesised themes', () => {
  /** Plays a whole pass of a theme into a recording voice. */
  function render(id: string): { freqs: number[]; waves: Set<string>; notes: number } {
    const t = TRACKS[id]!;
    const freqs: number[] = [];
    const waves = new Set<string>();
    let notes = 0;
    const v: Voice = {
      ctx: {} as BaseAudioContext,
      tone: (o) => {
        notes++;
        waves.add(o.wave);
        if (freqs.length < 400) freqs.push(Math.round(o.freq));
      },
      noise: () => {
        notes++;
      },
    };
    const stepDur = 60 / t.bpm / t.stepsPerBeat;
    for (let bar = 0; bar < t.bars.length; bar++)
      for (let step = 0; step < t.stepsPerBar; step++) t.play(v, bar, step, bar * t.stepsPerBar * stepDur + step * stepDur, stepDur);
    return { freqs, waves, notes };
  }

  it.each(TRACK_IDS)('%s lasts 40–90 s before it loops and plays without errors', (id) => {
    const d = trackDuration(TRACKS[id]!);
    expect(d).toBeGreaterThanOrEqual(40);
    expect(d).toBeLessThanOrEqual(90);
    expect(render(id).notes).toBeGreaterThan(50);
  });

  it('every theme has its own tempo', () => {
    const bpms = TRACK_IDS.map((id) => TRACKS[id]!.bpm);
    expect(new Set(bpms).size).toBe(bpms.length);
  });

  it('no two themes start with the same notes', () => {
    const prints = TRACK_IDS.map((id) => render(id).freqs.slice(0, 48).join(','));
    expect(new Set(prints).size).toBe(prints.length);
  });
});
