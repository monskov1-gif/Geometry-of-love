import { describe, expect, it } from 'vitest';
import { initialState } from '../../game/src/core/runtime';
import { ALL_SLOTS, MANUAL_SLOT_COUNT, migrate, SAVE_SCHEMA, SaveStore, type KeyValueStore, type SaveData, type SlotId } from '../../game/src/core/saves';
import { savePreview } from '../../game/src/ui/panels';
import { story } from '../../game/src/content';

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

describe('migrate', () => {
  it('upgrades a schema-1 save through every step to the current stage shape', () => {
    const current = save('2026-01-01T00:00:00.000Z');
    const { lighting, variant, music, shot, screen, ...stage1 } = current.state.stage;
    void lighting, void variant, void music, void shot, void screen;
    const old = { ...current, schema: 1, state: { ...current.state, stage: stage1 } } as unknown as SaveData;
    const up = migrate(old);
    expect(up.schema).toBe(SAVE_SCHEMA);
    expect(up.state.stage).toEqual({ ...stage1, lighting: null, variant: null, music: null, shot: null, screen: { view: null, notices: [] } });
  });

  it('adds the camera shot to schema-2 saves', () => {
    const current = save('x');
    const { shot, ...stage2 } = current.state.stage;
    void shot;
    const up = migrate({ ...current, schema: 2, state: { ...current.state, stage: stage2 as typeof current.state.stage } });
    expect(up.state.stage.shot).toBeNull();
  });

  it('adds the monitor state to schema-3 saves and keeps ch03 positions on the same line', () => {
    const current = save('x');
    const { screen, ...stage3 } = current.state.stage;
    void screen;
    const at = (index: number) => migrate({ ...current, schema: 3, state: { ...current.state, position: { scene: 'ch03', index }, stage: stage3 as typeof current.state.stage } });
    const steps = story.scenes.ch03!.steps;
    expect(at(10).state.stage.screen).toEqual({ view: null, notices: [] });
    // before the inserted steps nothing moves
    expect(at(49).state.position.index).toBe(49);
    // old 53 = the first «Ты здесь?» line, old 78 = the exit dialog line
    expect(steps[at(53).state.position.index]).toMatchObject({ type: 'say', text: 'Мелоди: Ты здесь?' });
    expect(steps[at(78).state.position.index]).toMatchObject({ type: 'say', text: 'Закрыть «メロディのまほう»? [Да] [Нет]' });
    expect(steps[at(79).state.position.index]).toMatchObject({ type: 'say', text: 'Дамео тянется к мышке.' });
    // ch02: the blackboard shot and the university lecture lesson
    const in2 = (scene: string, index: number) =>
      story.scenes[scene]!.steps[migrate({ ...current, schema: 3, state: { ...current.state, position: { scene, index }, stage: stage3 as typeof current.state.stage } }).state.position.index];
    expect(in2('ch02-day2', 4)).toMatchObject({ type: 'say', kind: 'narration' });
    expect((in2('ch02-day2', 4) as { text: string }).text).toMatch(/^Преподаватель стучит мелом по первой задаче/);
    expect(in2('ch02-day2', 6)).toMatchObject({ type: 'show', character: 'dameo', pose: 'angry' });
    expect(in2('ch02-day4', 4)).toMatchObject({ type: 'show', character: 'melody', pose: 'neutral' });
    // other scenes keep their indices
    const other = migrate({ ...current, schema: 3, state: { ...current.state, position: { scene: 'ch02', index: 60 }, stage: stage3 as typeof current.state.stage } });
    expect(other.state.position.index).toBe(60);
  });
});

describe('save slots (author bug 18: every slot must work on its own, not only the quick one)', () => {
  const at = (slot: string, index: number): SaveData => {
    const s = save(`2026-02-0${1 + (index % 9)}T00:00:00.000Z`);
    return { ...s, sceneTitle: slot, state: { ...s.state, position: { scene: 'ch01', index } } };
  };

  it('every slot (auto, quick and all numbered ones) round-trips its own save under its own key', () => {
    const store = memoryStore();
    const saves = new SaveStore(store);
    ALL_SLOTS.forEach((slot, k) => expect(saves.write(slot, at(slot, k + 1))).toEqual({ ok: true }));
    expect(ALL_SLOTS.length).toBe(MANUAL_SLOT_COUNT + 2);
    expect(new Set(store.map.keys()).size).toBe(ALL_SLOTS.length);
    // a fresh store over the same storage (= a page reload) reads every slot back unchanged
    const reloaded = new SaveStore(store);
    ALL_SLOTS.forEach((slot, k) => {
      const read = reloaded.read(slot);
      expect(read.status).toBe('ok');
      if (read.status === 'ok') {
        expect(read.data.sceneTitle).toBe(slot);
        expect(read.data.state.position).toEqual({ scene: 'ch01', index: k + 1 });
      }
    });
  });

  it('overwriting one slot leaves the others alone', () => {
    const saves = new SaveStore(memoryStore());
    saves.write('slot-2', at('slot-2', 2));
    saves.write('slot-3', at('slot-3', 3));
    saves.write('quick', at('quick', 4));
    saves.write('slot-2', at('slot-2', 7));
    const index = (slot: SlotId) => {
      const r = saves.read(slot);
      return r.status === 'ok' ? r.data.state.position.index : r.status;
    };
    expect([index('slot-2'), index('slot-3'), index('quick')]).toEqual([7, 3, 4]);
  });

  it('deleting one slot empties only that slot', () => {
    const saves = new SaveStore(memoryStore());
    for (const slot of ALL_SLOTS) saves.write(slot, at(slot, 1));
    expect(saves.remove('slot-4')).toEqual({ ok: true });
    for (const slot of ALL_SLOTS) expect(saves.read(slot).status).toBe(slot === 'slot-4' ? 'empty' : 'ok');
  });

  it('a corrupted slot is reported, leaves its neighbours alone, and can be overwritten or deleted', () => {
    const store = memoryStore();
    const saves = new SaveStore(store);
    saves.write('slot-1', at('slot-1', 1));
    saves.write('slot-3', at('slot-3', 3));
    store.map.set('gol:save:slot-2', '{"schema":4,"savedAt":"x"');
    expect(saves.read('slot-2')).toEqual({ status: 'corrupted', reason: 'invalid JSON' });
    expect(saves.read('slot-1').status).toBe('ok');
    expect(saves.read('slot-3').status).toBe('ok');
    expect(saves.write('slot-2', at('slot-2', 2)).ok).toBe(true);
    expect(saves.read('slot-2').status).toBe('ok');
    store.map.set('gol:save:slot-2', 'garbage');
    expect(saves.remove('slot-2')).toEqual({ ok: true });
    expect(saves.read('slot-2').status).toBe('empty');
  });

  it('a slot shows the line it stopped at, so slots of one chapter can be told apart', () => {
    const steps = story.scenes.ch01!.steps;
    const i = steps.findIndex((s) => s.type === 'say');
    const s = save('x');
    const preview = savePreview({ ...s, state: { ...s.state, position: { scene: 'ch01', index: i } } });
    expect(preview).toContain((steps[i] as { text: string }).text.slice(0, 30));
    expect(savePreview({ ...s, state: { ...s.state, position: { scene: 'no-such-scene', index: 3 } } })).toBeNull();
  });
});
