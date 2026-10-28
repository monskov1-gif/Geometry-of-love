// Contract for mini-games and interactive cutscenes ("episodes").
// The story runtime blocks on an `episode` step; the EpisodeHost (ui) mounts
// the episode, waits for its outcome and only reports success to the runtime.
// Episodes never touch story state directly.

// Episodes are mandatory: after a failure the host always offers a retry and
// never a skip.
export type EpisodeOutcome = { outcome: 'success' } | { outcome: 'failure'; reason: string };

export interface EpisodeContext {
  /** Element the episode renders into; the host empties it afterwards. */
  root: HTMLElement;
  params: Record<string, unknown>;
  reduceMotion: boolean;
}

export interface EpisodeInstance {
  /** Resolves once with the outcome. */
  run(): Promise<EpisodeOutcome>;
  /** Stop loops and remove listeners. Called after run() settles or on abort. */
  destroy(): void;
}

export interface EpisodeDefinition {
  id: string;
  kind: 'minigame' | 'cutscene';
  title: string;
  /** Short goal and controls shown before start. */
  instructions: string;
  /** Throws on invalid params so content errors surface immediately. */
  create(ctx: EpisodeContext): EpisodeInstance;
}
