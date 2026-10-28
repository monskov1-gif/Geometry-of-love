// Small helpers that keep scene files readable. They only build plain Step
// objects; scripts may also use object literals directly.
import type {
  CharacterFx,
  ChoiceOption,
  Condition,
  Effect,
  Scene,
  ScreenEffect,
  SpaceId,
  StagePosition,
  Step,
  Target,
  TextKind,
  VisualPhase,
} from './types';

export const say = (speaker: string, text: string, kind: TextKind = 'speech'): Step => ({
  type: 'say',
  speaker,
  text,
  kind,
});
/** A line the program rewrites right after it is shown. */
export const rewritten = (speaker: string | null, text: string, revision: string, kind: TextKind = 'corrupted'): Step =>
  speaker ? { type: 'say', speaker, text, kind, revision } : { type: 'say', text, kind, revision };
export const narrate = (text: string): Step => ({ type: 'say', text, kind: 'narration' });
export const think = (speaker: string, text: string): Step => ({ type: 'say', speaker, text, kind: 'thought' });
export const system = (text: string, kind: 'system' | 'error' | 'corrupted' = 'system'): Step => ({
  type: 'say',
  text,
  kind,
});
export const show = (character: string, pose: string, position?: StagePosition, fx?: CharacterFx): Step => ({
  type: 'show',
  character,
  pose,
  ...(position ? { position } : {}),
  ...(fx ? { fx } : {}),
});
export const fx = (effect: ScreenEffect): Step => ({ type: 'effect', effect });
export const hide = (character: string): Step => ({ type: 'hide', character });
export const background = (id: string): Step => ({ type: 'background', background: id });
export const space = (id: SpaceId, phase?: VisualPhase): Step =>
  phase ? { type: 'space', space: id, phase } : { type: 'space', space: id };
export const label = (name: string): Step => ({ type: 'label', name });
export const effects = (...list: Effect[]): Step => ({ type: 'effects', effects: list });
export const choice = (options: ChoiceOption[], prompt?: string): Step =>
  prompt ? { type: 'choice', prompt, options } : { type: 'choice', options };
export const branch = (condition: Condition, goto: Target): Step => ({ type: 'branch', if: condition, goto });
export const goto = (target: Target): Step => ({ type: 'goto', target });
export const episode = (id: string, params?: Record<string, unknown>): Step =>
  params ? { type: 'episode', episode: id, params } : { type: 'episode', episode: id };
export const ending = (id: string): Step => ({ type: 'ending', ending: id });

export const defineScene = (scene: Scene): Scene => scene;
