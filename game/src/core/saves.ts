import type { StoryState, TextKind } from './types';

/** Bump when the save format changes incompatibly; add a migration in `migrate`. */
export const SAVE_SCHEMA = 3;
export const MANUAL_SLOT_COUNT = 6;

export type SlotId = 'auto' | 'quick' | `slot-${number}`;

export const ALL_SLOTS: SlotId[] = [
  'auto',
  'quick',
  ...Array.from({ length: MANUAL_SLOT_COUNT }, (_, i) => `slot-${i + 1}` as SlotId),
];

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BacklogEntry {
  speaker: string | null;
  text: string;
  kind: TextKind;
}

export interface SaveData {
  schema: number;
  savedAt: string; // ISO date
  playTimeMs: number;
  sceneTitle: string;
  chapter: number | null;
  state: StoryState;
  backlog: BacklogEntry[];
}

export type SlotRead =
  | { status: 'ok'; data: SaveData }
  | { status: 'empty' }
  | { status: 'corrupted'; reason: string };

export type WriteResult = { ok: true } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumberMap = (v: unknown) => isRecord(v) && Object.values(v).every((x) => typeof x === 'number');

/** Structural check: guards against hand-edited or truncated localStorage data. */
export function checkSaveShape(v: unknown): string | null {
  if (!isRecord(v)) return 'not an object';
  if (typeof v.schema !== 'number') return 'missing schema version';
  if (v.schema > SAVE_SCHEMA) return `save is from a newer game version (schema ${v.schema})`;
  if (typeof v.savedAt !== 'string' || typeof v.playTimeMs !== 'number') return 'missing metadata';
  if (typeof v.sceneTitle !== 'string') return 'missing scene title';
  if (!Array.isArray(v.backlog)) return 'missing backlog';
  const s = v.state;
  if (!isRecord(s)) return 'missing state';
  const pos = s.position;
  if (!isRecord(pos) || typeof pos.scene !== 'string' || typeof pos.index !== 'number') return 'bad position';
  if (!isRecord(s.flags) || !Object.values(s.flags).every((x) => typeof x === 'boolean')) return 'bad flags';
  if (!isNumberMap(s.relationships) || !isNumberMap(s.traits)) return 'bad variables';
  if (!Array.isArray(s.decisions)) return 'bad decisions';
  const stage = s.stage;
  if (!isRecord(stage) || !Array.isArray(stage.characters) || typeof stage.space !== 'string') return 'bad stage';
  return null;
}

/** Upgrades older saves step by step to the current schema. */
export function migrate(data: SaveData): SaveData {
  let d = data;
  if (d.schema === 1) {
    // 2: the stage remembers lighting, location variant and music.
    const old = d.state.stage as Partial<StoryState['stage']>;
    d = { ...d, schema: 2, state: { ...d.state, stage: { ...d.state.stage, lighting: old.lighting ?? null, variant: old.variant ?? null, music: old.music ?? null } } };
  }
  if (d.schema === 2) {
    // 3: the stage remembers the camera shot of 3D locations.
    const old = d.state.stage as Partial<StoryState['stage']>;
    d = { ...d, schema: 3, state: { ...d.state, stage: { ...d.state.stage, shot: old.shot ?? null } } };
  }
  return d;
}

export class SaveStore {
  constructor(
    private readonly store: KeyValueStore,
    private readonly prefix = 'gol:save:',
  ) {}

  read(slot: SlotId): SlotRead {
    let raw: string | null;
    try {
      raw = this.store.getItem(this.prefix + slot);
    } catch (e) {
      return { status: 'corrupted', reason: `storage unavailable: ${(e as Error).message}` };
    }
    if (raw === null) return { status: 'empty' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: 'corrupted', reason: 'invalid JSON' };
    }
    const problem = checkSaveShape(parsed);
    if (problem) return { status: 'corrupted', reason: problem };
    return { status: 'ok', data: migrate(parsed as SaveData) };
  }

  write(slot: SlotId, data: SaveData): WriteResult {
    try {
      this.store.setItem(this.prefix + slot, JSON.stringify(data));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  remove(slot: SlotId): WriteResult {
    try {
      this.store.removeItem(this.prefix + slot);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /** Most recently written valid save across all slots (for "Continue"). */
  latest(): { slot: SlotId; data: SaveData } | null {
    let best: { slot: SlotId; data: SaveData } | null = null;
    for (const slot of ALL_SLOTS) {
      const r = this.read(slot);
      if (r.status === 'ok' && (!best || r.data.savedAt > best.data.savedAt)) best = { slot, data: r.data };
    }
    return best;
  }
}
