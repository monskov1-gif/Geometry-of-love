import { applyEffects, evaluate } from './conditions';
import type { Presentation, Scene, ScreenEffect, Step, Story, StoryState, Target } from './types';

export class StoryError extends Error {
  override name = 'StoryError';
}

/** Safety net against `goto` loops that never reach a blocking step. */
const MAX_STEPS_PER_SETTLE = 10_000;

export function initialState(story: Story): StoryState {
  return {
    position: { scene: story.startScene, index: 0 },
    flags: {},
    relationships: {},
    traits: {},
    decisions: [],
    stage: { background: null, space: 'app', phase: 'A', characters: [] },
    ending: null,
  };
}

export function lineKey(scene: string, index: number): string {
  return `${scene}:${index}`;
}

/**
 * Interprets a Story. Non-blocking steps (show, background, effects, goto…)
 * are applied immediately; the runtime always rests on a blocking step
 * (say, choice, episode, ending), which `present()` describes for the UI.
 */
export class StoryRuntime {
  private s: StoryState;
  private checkpoint = true;
  private effects: ScreenEffect[] = [];

  constructor(
    private readonly story: Story,
    state?: StoryState,
  ) {
    this.s = structuredClone(state ?? initialState(story));
    this.scene(this.s.position.scene); // throws on unknown scene
    this.settle();
  }

  /** A deep copy of the current state, safe to serialise. */
  snapshot(): StoryState {
    return structuredClone(this.s);
  }

  /** Read-only view for rendering; do not mutate. */
  get state(): Readonly<StoryState> {
    return this.s;
  }

  get currentScene(): Scene {
    return this.scene(this.s.position.scene);
  }

  /** True once after entering a new scene or finishing an episode: a safe autosave point. */
  takeCheckpoint(): boolean {
    const value = this.checkpoint;
    this.checkpoint = false;
    return value;
  }

  /** Screen effects passed since the last call (one-shot, not saved). */
  takeEffects(): ScreenEffect[] {
    const list = this.effects;
    this.effects = [];
    return list;
  }

  present(): Presentation {
    const { scene, index } = this.s.position;
    const step = this.step();
    const key = lineKey(scene, index);
    switch (step.type) {
      case 'say':
        return {
          kind: 'line',
          key,
          speaker: step.speaker ?? null,
          text: step.text,
          textKind: step.kind ?? (step.speaker ? 'speech' : 'narration'),
          revision: step.revision ?? null,
        };
      case 'choice':
        return {
          kind: 'choice',
          key,
          prompt: step.prompt ?? null,
          options: step.options
            .map((o) => ({
              id: o.id,
              text: o.text,
              enabled: o.condition ? evaluate(o.condition, this.s) : true,
              hidden: o.whenUnavailable !== 'disable',
            }))
            .filter((o) => o.enabled || !o.hidden)
            .map(({ id, text, enabled }) => ({ id, text, enabled })),
        };
      case 'episode':
        return { kind: 'episode', key, episode: step.episode, params: step.params ?? {} };
      case 'ending':
        return { kind: 'ending', key, ending: step.ending };
      default:
        throw new StoryError(`Runtime rests on non-blocking step "${step.type}" at ${key}`);
    }
  }

  advance(): Presentation {
    this.expect('say', 'advance');
    this.s.position.index += 1;
    this.settle();
    return this.present();
  }

  choose(optionId: string): Presentation {
    const step = this.expect('choice', 'choose');
    const option = step.options.find((o) => o.id === optionId);
    if (!option) throw new StoryError(`Unknown option "${optionId}" at ${this.where()}`);
    if (option.condition && !evaluate(option.condition, this.s)) {
      throw new StoryError(`Option "${optionId}" is unavailable at ${this.where()}`);
    }
    const { scene, index } = this.s.position;
    this.s.decisions.push({ scene, index, option: optionId });
    if (option.effects) this.s = applyEffects(this.s, option.effects);
    if (option.goto) this.jump(option.goto);
    else this.s.position.index += 1;
    this.settle();
    return this.present();
  }

  /** Only a confirmed success moves the story past a mandatory episode. */
  completeEpisode(): Presentation {
    this.expect('episode', 'completeEpisode');
    this.s.position.index += 1;
    this.checkpoint = true;
    this.settle();
    return this.present();
  }

  private settle(): void {
    for (let guard = 0; guard < MAX_STEPS_PER_SETTLE; guard++) {
      const step = this.step();
      const stage = this.s.stage;
      switch (step.type) {
        case 'say':
        case 'choice':
        case 'episode':
          return;
        case 'ending':
          this.s.ending = step.ending;
          return;
        case 'show': {
          const position = step.position ?? 'center';
          const staged = { id: step.character, pose: step.pose, position, ...(step.fx ? { fx: step.fx } : {}) };
          const index = stage.characters.findIndex((c) => c.id === step.character);
          if (index >= 0) stage.characters[index] = staged;
          else stage.characters.push(staged);
          break;
        }
        case 'effect':
          this.effects.push(step.effect);
          break;
        case 'hide':
          stage.characters = stage.characters.filter((c) => c.id !== step.character);
          break;
        case 'background':
          stage.background = step.background;
          break;
        case 'space':
          stage.space = step.space;
          if (step.phase) stage.phase = step.phase;
          break;
        case 'label':
          break;
        case 'effects':
          this.s = applyEffects(this.s, step.effects);
          break;
        case 'branch':
          if (evaluate(step.if, this.s)) {
            this.jump(step.goto);
            continue;
          }
          break;
        case 'goto':
          this.jump(step.target);
          continue;
      }
      this.s.position.index += 1;
    }
    throw new StoryError(`No blocking step reached after ${MAX_STEPS_PER_SETTLE} steps (goto loop?) near ${this.where()}`);
  }

  private jump(target: Target): void {
    const { scene, index } = resolveTarget(this.story, target);
    if (scene !== this.s.position.scene) this.checkpoint = true;
    this.s.position = { scene, index };
  }

  private step(): Step {
    const scene = this.currentScene;
    const step = scene.steps[this.s.position.index];
    if (!step) {
      throw new StoryError(`Scene "${scene.id}" ended without a goto or ending (index ${this.s.position.index})`);
    }
    return step;
  }

  private expect<T extends Step['type']>(type: T, action: string): Extract<Step, { type: T }> {
    const step = this.step();
    if (step.type !== type) throw new StoryError(`${action}() called on "${step.type}" step at ${this.where()}`);
    return step as Extract<Step, { type: T }>;
  }

  private scene(id: string): Scene {
    const scene = this.story.scenes[id];
    if (!scene) throw new StoryError(`Unknown scene "${id}"`);
    return scene;
  }

  private where(): string {
    return lineKey(this.s.position.scene, this.s.position.index);
  }
}

export function resolveTarget(story: Story, target: Target): { scene: string; index: number } {
  const [sceneId = '', label] = target.split('#');
  const scene = story.scenes[sceneId];
  if (!scene) throw new StoryError(`Unknown scene in target "${target}"`);
  if (label === undefined) return { scene: sceneId, index: 0 };
  const index = scene.steps.findIndex((s) => s.type === 'label' && s.name === label);
  if (index < 0) throw new StoryError(`Unknown label in target "${target}"`);
  return { scene: sceneId, index };
}
