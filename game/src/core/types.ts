// Story data model. Everything here is plain data: scripts are written as
// arrays of steps, and the runtime (runtime.ts) interprets them. UI code never
// decides story logic — it only displays what the runtime presents.

/** The four kinds of space from the art brief; each has its own palette. */
export type SpaceId = 'reality' | 'app' | 'game' | 'code';

/** Visual story phases A–E from the art brief (section 7). */
export type VisualPhase = 'A' | 'B' | 'C' | 'D' | 'E';

export type TextKind =
  | 'speech'
  | 'narration'
  | 'thought'
  | 'system'
  | 'error'
  | 'corrupted'
  | 'memory';

export type StagePosition = 'left' | 'center' | 'right';

/** `"sceneId"` (scene start) or `"sceneId#label"`. */
export type Target = string;

export type Condition =
  | { flag: string; is?: boolean }
  | { relationship: string; gte?: number; lte?: number }
  | { trait: string; gte?: number; lte?: number }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { setFlag: string; value?: boolean }
  | { relationship: string; add: number }
  | { trait: string; add: number };

export interface ChoiceOption {
  /** Stable id, recorded in the decision history and saves. */
  id: string;
  text: string;
  effects?: Effect[];
  goto?: Target;
  /** When present and false, the option is unavailable. */
  condition?: Condition;
  /** How an unavailable option is shown. Default: 'hide'. */
  whenUnavailable?: 'hide' | 'disable';
}

export type Step =
  | { type: 'say'; speaker?: string; text: string; kind?: TextKind }
  | { type: 'show'; character: string; pose: string; position?: StagePosition }
  | { type: 'hide'; character: string }
  | { type: 'background'; background: string }
  | { type: 'space'; space: SpaceId; phase?: VisualPhase }
  | { type: 'label'; name: string }
  | { type: 'effects'; effects: Effect[] }
  | { type: 'choice'; prompt?: string; options: ChoiceOption[] }
  | { type: 'branch'; if: Condition; goto: Target }
  | { type: 'goto'; target: Target }
  | { type: 'episode'; episode: string; params?: Record<string, unknown> }
  | { type: 'ending'; ending: string };

export interface Scene {
  id: string;
  title: string;
  /** Chapter number from the synopsis, or null for technical/test scenes. */
  chapter: number | null;
  steps: Step[];
}

export interface Story {
  startScene: string;
  scenes: Record<string, Scene>;
}

export interface StagedCharacter {
  id: string;
  pose: string;
  position: StagePosition;
}

export interface StageState {
  background: string | null;
  space: SpaceId;
  phase: VisualPhase;
  characters: StagedCharacter[];
}

export interface Decision {
  scene: string;
  index: number;
  option: string;
}

/** Everything needed to restore a playthrough. Serialised into saves. */
export interface StoryState {
  position: { scene: string; index: number };
  flags: Record<string, boolean>;
  relationships: Record<string, number>;
  traits: Record<string, number>;
  decisions: Decision[];
  stage: StageState;
  /** Set when an ending step is reached. */
  ending: string | null;
}

export interface PresentedOption {
  id: string;
  text: string;
  enabled: boolean;
}

/** What the UI must show right now. Always a blocking step. */
export type Presentation =
  | {
      kind: 'line';
      key: string;
      speaker: string | null;
      text: string;
      textKind: TextKind;
    }
  | { kind: 'choice'; key: string; prompt: string | null; options: PresentedOption[] }
  | { kind: 'episode'; key: string; episode: string; params: Record<string, unknown> }
  | { kind: 'ending'; key: string; ending: string };
