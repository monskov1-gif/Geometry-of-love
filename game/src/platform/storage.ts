import type { KeyValueStore } from '../core/saves';

/**
 * localStorage when it works, otherwise an in-memory store (private mode,
 * blocked cookies). `persistent` tells the UI to warn that progress will be
 * lost when the tab closes.
 */
export function createStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const probe = '__gol_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { store: window.localStorage, persistent: true };
  } catch (e) {
    console.warn('[storage] localStorage unavailable, using memory only:', e);
    const map = new Map<string, string>();
    return {
      persistent: false,
      store: {
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, v) => void map.set(k, v),
        removeItem: (k) => void map.delete(k),
      },
    };
  }
}

/** Reads a JSON object and merges it over defaults; invalid data falls back to defaults with a warning. */
export function readJson<T extends object>(store: KeyValueStore, key: string, defaults: T): T {
  const raw = store.getItem(key);
  if (raw === null) return { ...defaults };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object');
    return { ...defaults, ...(parsed as Partial<T>) };
  } catch (e) {
    console.warn(`[storage] "${key}" is unreadable, using defaults:`, e);
    return { ...defaults };
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`[storage] failed to write "${key}":`, e);
    return false;
  }
}
