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

/** left / center / right, or a named mark of a 3D location (e.g. 'desk', 'door'). */
export type StagePosition = 'left' | 'center' | 'right' | (string & {});

/** Lighting state of a painted location. */
export type LightingId = 'day' | 'evening' | 'night';

/** Persistent visual state of a staged character (saved with the stage). */
export type CharacterFx = 'distorted' | 'erasing' | 'frozen';

/** One-shot screen effects; presentational only, never saved. */
export type ScreenEffect = 'shake' | 'flash' | 'glitch' | 'blood' | 'fade-black' | 'fade-white' | 'hand';

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
  | {
      type: 'say';
      speaker?: string;
      text: string;
      kind?: TextKind;
      /** The program "corrects" the line after it is shown; the backlog keeps only the revision. */
      revision?: string;
    }
  | { type: 'show'; character: string; pose: string; position?: StagePosition; fx?: CharacterFx }
  | { type: 'effect'; effect: ScreenEffect }
  | { type: 'hide'; character: string }
  | { type: 'background'; background: string; lighting?: LightingId; variant?: string }
  | { type: 'light'; lighting: LightingId }
  /** Camera shot of the 3D location; null hands framing back to the automatic director. */
  | { type: 'shot'; shot: string | null }
  | { type: 'music'; track: string | null }
  | { type: 'sfx'; sound: string }
  | { type: 'space'; space: SpaceId; phase?: VisualPhase }
  | { type: 'label'; name: string }
  | { type: 'effects'; effects: Effect[] }
  | { type: 'choice'; prompt?: string; options: ChoiceOption[] }
  | { type: 'branch'; if: Condition; goto: Target }
  | { type: 'goto'; target: Target }
  | { type: 'episode'; episode: string; params?: Record<string, unknown> }
  /** Full-screen chapter / volume card; waits for the player. */
  | { type: 'card'; card: ChapterCard }
  /** A staged scene run by the Cutscene Director (world/director); the story waits for it. */
  | { type: 'cutscene'; cutscene: string }
  /**
   * What Dameo's monitor shows (CRT close-up and his room): a cover view over
   * the app page (null = back to what the background implies), pop-up
   * notifications appended to the stack, or the stack cleared.
   */
  | { type: 'screen'; view?: ScreenView | null; notify?: string[]; clear?: boolean }
  | { type: 'ending'; ending: string };

export interface ChapterCard {
  /** e.g. 'Глава 1' or 'Том I'. */
  label: string;
  title: string;
  /** Small line under the title (volume name, epigraph). */
  subtitle?: string;
  /** Look of the card: the space it opens, or a story moment. */
  style: 'reality' | 'app' | 'game' | 'code' | 'volume' | 'end';
  /** 3D location shown behind the title (blurred, slow camera drift). */
  backdrop?: string;
}

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
  fx?: CharacterFx;
}

/** A view of the monitor that covers the app page: the program closed (desktop) or the exit dialog. */
export type ScreenView = 'desktop' | 'close-dialog';

/** The physical monitor in Dameo's room. Reset by every `background` step. */
export interface ScreenState {
  view: ScreenView | null;
  /** Pop-up notifications on the monitor, oldest first. */
  notices: string[];
}

export interface StageState {
  background: string | null;
  /** Lighting of the painted location (null = the location's default). */
  lighting: LightingId | null;
  /** Scene detail switch for a location (e.g. the app shown on the monitor). */
  variant: string | null;
  /** Current music track; restored on load. */
  music: string | null;
  /** Named camera shot (3D locations); null = automatic framing of the cast. */
  shot: string | null;
  /** The monitor's cover view and notifications. */
  screen: ScreenState;
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
      revision: string | null;
    }
  | { kind: 'choice'; key: string; prompt: string | null; options: PresentedOption[] }
  | { kind: 'episode'; key: string; episode: string; params: Record<string, unknown> }
  | { kind: 'card'; key: string; card: ChapterCard }
  | { kind: 'cutscene'; key: string; cutscene: string }
  | { kind: 'ending'; key: string; ending: string };
