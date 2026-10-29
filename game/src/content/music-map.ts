// Which theme plays where, without music() steps in every scene. The reasons
// for each choice are in docs/MUSIC.md.
//
// Order of resolution for the current moment of the story:
//   1. A music() step already passed in the current scene wins:
//      a theme id plays that theme, music(null) is silence, and the generic ids
//      'reality' / 'app' / 'sandbox' mean "this space's theme here" (steps 2–4).
//   2. SCENE_MUSIC: a string pins one theme for the whole scene; an object
//      gives a theme per space (and optionally per visual phase).
//   3. LOCATION_MUSIC: a theme for a painted location (the university, the room).
//   4. SPACE_MUSIC: the default of the space and visual phase.
// Music never carries over from the previous scene: each chapter starts on its own theme.
import type { SpaceId, StageState, Story, StoryState, VisualPhase } from '../core/types';

/** A theme for a space: one id, or one per visual phase (missing phases fall through). */
type SpaceTheme = string | Partial<Record<VisualPhase, string>>;
export type SceneMusic = string | Partial<Record<SpaceId, SpaceTheme>>;

export const SCENE_MUSIC: Record<string, SceneMusic> = {
  // Volume I — the real world and the app. Ch. 1 follows its locations (room / university).
  ch01: {},
  'ending-self-taught': 'ending-self-taught',
  // the chapter card still shows the room of ch. 1's last scene: its unease carries on until the installer's silence
  ch02: { reality: 'tension', app: 'app-sweet' },
  'ch02-day2': { app: 'app-sweet' },
  'ch02-day3': { app: 'app-sweet' },
  'ch02-day4': { app: 'app-sweet' },
  ch03: { app: 'app-uneasy', game: 'game-cute' },
  ch04: { game: 'game-cute' },
  // Volume II — inside the game.
  ch05: { game: 'game-wrong' },
  ch06: { game: 'game-cute' },
  ch07: { game: 'code-space' },
  ch08: { game: { C: 'friends', D: 'tension', E: 'tension' } },
  ch09: { game: 'app-uneasy' },
  'ending-favorite-student': 'ending-favourite-student',
  // Volume III — the way out.
  ch10: { game: 'grief' },
  ch11: { game: 'game-wrong' },
  ch12: { game: { D: 'grief', E: 'tension' } },
  ch13: { code: 'code-space' },
  ch14: { code: 'app-uneasy' },
  ch15: { code: 'corrupted-pulse' },
  epilogue: 'ending-beyond-screen',
};

export const LOCATION_MUSIC: Record<string, string> = {
  'dameo-room': 'home-night',
  'dameo-desk': 'home-night',
  'university-hall': 'university',
  'university-library': 'university',
  'university-classroom': 'university',
};

export const SPACE_MUSIC: Record<SpaceId, Record<VisualPhase, string>> = {
  reality: { A: 'home-night', B: 'home-night', C: 'home-night', D: 'home-night', E: 'home-night' },
  app: { A: 'app-sweet', B: 'app-sweet', C: 'app-uneasy', D: 'app-uneasy', E: 'app-uneasy' },
  game: { A: 'game-cute', B: 'game-cute', C: 'game-wrong', D: 'game-wrong', E: 'tension' },
  code: { A: 'code-space', B: 'code-space', C: 'code-space', D: 'code-space', E: 'code-space' },
};

/** Old space-wide track ids: in a scene they ask for the map's theme of that space. */
export const GENERIC_TRACKS: Record<string, SpaceId> = { reality: 'reality', app: 'app', sandbox: 'game' };

type Place = Pick<StageState, 'space' | 'phase' | 'background'>;

/** The theme the map gives this scene at this place (no music() steps considered). */
export function defaultTheme(sceneId: string, place: Place): string {
  const entry = SCENE_MUSIC[sceneId];
  if (typeof entry === 'string') return entry;
  const forSpace = entry?.[place.space];
  const fromScene = typeof forSpace === 'string' ? forSpace : forSpace?.[place.phase];
  if (fromScene) return fromScene;
  const fromLocation = place.background ? LOCATION_MUSIC[place.background] : undefined;
  return fromLocation ?? SPACE_MUSIC[place.space][place.phase];
}

/** The theme for the current moment of the story; null means silence (an explicit music(null)). */
export function musicFor(story: Story, state: Pick<StoryState, 'position' | 'stage'>): string | null {
  const { scene: sceneId, index } = state.position;
  const scene = story.scenes[sceneId];
  const stage = state.stage;
  const explicit = scene?.steps.slice(0, index).some((s) => s.type === 'music') ?? false;
  if (!explicit) return defaultTheme(sceneId, stage);
  if (stage.music === null) return null;
  const generic = GENERIC_TRACKS[stage.music];
  return generic ? defaultTheme(sceneId, { ...stage, space: generic }) : stage.music;
}
