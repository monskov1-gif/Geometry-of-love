import { describe, expect, it } from 'vitest';
import { initialState } from '../../game/src/core/runtime';
import { SAVE_SCHEMA, SaveStore, type KeyValueStore, type SaveData } from '../../game/src/core/saves';

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

const save = (savedAt: string): SaveData => ({
  schema: SAVE_SCHEMA,
  savedAt,
  playTimeMs: 1000,
  sceneTitle: 'Test',
  chapter: null,
  state: initialState({ startScene: 's', scenes: {} }),
  backlog: [{ speaker: null, text: 'hi', kind: 'narration' }],
});

describe('SaveStore', () => {
  it('round-trips a save', () => {
    const saves = new SaveStore(memoryStore());
    expect(saves.write('slot-1', save('2026-01-01T00:00:00.000Z'))).toEqual({ ok: true });
    const read = saves.read('slot-1');
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(read.data).toEqual(save('2026-01-01T00:00:00.000Z'));
  });

  it('reports empty, invalid JSON and wrong shapes without throwing', () => {
    const store = memoryStore();
    const saves = new SaveStore(store);
    expect(saves.read('slot-2').status).toBe('empty');
    store.map.set('gol:save:slot-2', '{broken');
    expect(saves.read('slot-2')).toEqual({ status: 'corrupted', reason: 'invalid JSON' });
    store.map.set('gol:save:slot-2', JSON.stringify({ ...save('x'), state: { position: 'nope' } }));
    expect(saves.read('slot-2')).toMatchObject({ status: 'corrupted', reason: 'bad position' });
    store.map.set('gol:save:slot-2', JSON.stringify({ ...save('x'), schema: SAVE_SCHEMA + 1 }));
    expect(saves.read('slot-2')).toMatchObject({ status: 'corrupted' });
  });

  it('finds the latest valid save, ignoring corrupted slots', () => {
    const store = memoryStore();
    const saves = new SaveStore(store);
    saves.write('slot-1', save('2026-01-01T00:00:00.000Z'));
    saves.write('auto', save('2026-03-01T00:00:00.000Z'));
    store.map.set('gol:save:quick', 'garbage');
    expect(saves.latest()?.slot).toBe('auto');
  });

  it('surfaces storage write failures', () => {
    const store = memoryStore();
    store.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(new SaveStore(store).write('slot-1', save('x'))).toEqual({ ok: false, error: 'QuotaExceededError' });
  });

  it('removes a slot', () => {
    const saves = new SaveStore(memoryStore());
    saves.write('slot-3', save('x'));
    expect(saves.remove('slot-3')).toEqual({ ok: true });
    expect(saves.read('slot-3').status).toBe('empty');
  });
});
