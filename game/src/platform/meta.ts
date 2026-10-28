import type { KeyValueStore } from '../core/saves';
import { readJson, writeJson } from './storage';

// Progress that survives across playthroughs: read lines (for Skip) and
// unlocked endings (for the title screen). Stored apart from save slots.
interface MetaData {
  readLines: string[];
  endings: string[];
}

const KEY = 'gol:meta';

export class MetaStore {
  private read: Set<string>;
  private endingSet: Set<string>;

  constructor(private readonly store: KeyValueStore) {
    const data = readJson<MetaData>(store, KEY, { readLines: [], endings: [] });
    this.read = new Set(Array.isArray(data.readLines) ? data.readLines : []);
    this.endingSet = new Set(Array.isArray(data.endings) ? data.endings : []);
  }

  isRead(key: string): boolean {
    return this.read.has(key);
  }

  markRead(key: string): void {
    if (this.read.has(key)) return;
    this.read.add(key);
    this.persist();
  }

  unlockEnding(id: string): void {
    if (this.endingSet.has(id)) return;
    this.endingSet.add(id);
    this.persist();
  }

  get endings(): string[] {
    return [...this.endingSet];
  }

  private persist(): void {
    writeJson(this.store, KEY, { readLines: [...this.read], endings: [...this.endingSet] });
  }
}
