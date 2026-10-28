import type { KeyValueStore } from '../core/saves';
import { readJson, writeJson } from './storage';

// Only settings that change behaviour today. Audio, flashes and key
// rebinding are added together with the features they control.
export interface Settings {
  /** Characters per second; 0 = show instantly. */
  textSpeed: number;
  autoDelayMs: number;
  skipMode: 'read' | 'all';
  textScale: number;
  dialogOpacity: number;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 40,
  autoDelayMs: 1500,
  skipMode: 'read',
  textScale: 1,
  dialogOpacity: 0.94,
  reduceMotion: false,
};

const KEY = 'gol:settings';

export class SettingsStore {
  private value: Settings;
  private listeners = new Set<(s: Settings) => void>();

  constructor(private readonly store: KeyValueStore) {
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.value = readJson(store, KEY, { ...DEFAULT_SETTINGS, reduceMotion: !!prefersReduced });
  }

  get(): Settings {
    return this.value;
  }

  update(patch: Partial<Settings>): void {
    this.value = { ...this.value, ...patch };
    writeJson(this.store, KEY, this.value);
    this.listeners.forEach((l) => l(this.value));
  }

  reset(): void {
    this.update(DEFAULT_SETTINGS);
  }

  subscribe(listener: (s: Settings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
