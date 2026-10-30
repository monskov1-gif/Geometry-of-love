// Panels opened over the game or title screen: choices, backlog,
// save/load slots and settings. All of them only call back into the owner;
// none of them changes story state on its own.
import { characters } from '../content';
import { ALL_SLOTS, type BacklogEntry, type SaveData, type SaveStore, type SlotId } from '../core/saves';
import type { PresentedOption } from '../core/types';
import type { Settings, SettingsStore } from '../platform/settings';
import { el } from './dom';
import type { Overlays } from './overlays';

export function choicePanel(prompt: string | null, options: PresentedOption[], onChoose: (id: string) => void): HTMLElement {
  let locked = false;
  const buttons = options.map((o) =>
    el(
      'button',
      {
        class: 'btn choice-option',
        type: 'button',
        disabled: !o.enabled,
        'aria-disabled': String(!o.enabled),
        onclick: () => {
          if (locked || !o.enabled) return;
          locked = true; // guards against double selection before the next node renders
          buttons.forEach((b) => (b.disabled = true));
          onChoose(o.id);
        },
      },
      o.text,
    ),
  );
  return el(
    'div',
    { class: 'choices', role: 'group', 'aria-label': prompt ?? 'Выбор' },
    prompt ? el('p', { class: 'choice-prompt pixel' }, prompt) : null,
    ...buttons,
  );
}

/** Flag `erased.<characterId>` removes a character's name from the whole interface (state D). */
export const ERASED_NAME = '▒▒▒▒▒';

export function speakerName(id: string | null, flags: Readonly<Record<string, boolean>> = {}): string | null {
  if (!id) return null;
  if (flags[`erased.${id}`]) return ERASED_NAME;
  return characters[id]?.name ?? id;
}

export function backlogView(entries: BacklogEntry[], flags: Readonly<Record<string, boolean>> = {}): HTMLElement {
  if (entries.length === 0) return el('p', { class: 'muted' }, 'Журнал пока пуст.');
  const list = el(
    'ol',
    { class: 'backlog' },
    ...entries.map((e) =>
      el(
        'li',
        { class: 'backlog-entry', dataset: { kind: e.kind } },
        e.speaker ? el('span', { class: 'backlog-speaker' }, speakerName(e.speaker, flags)) : null,
        el('span', { class: 'backlog-text' }, e.text),
      ),
    ),
  );
  queueMicrotask(() => list.lastElementChild?.scrollIntoView({ block: 'end' }));
  return list;
}

const SLOT_NAMES: Record<string, string> = { auto: 'Автосохранение', quick: 'Быстрое сохранение' };
const slotName = (slot: SlotId) => SLOT_NAMES[slot] ?? `Слот ${slot.replace('slot-', '')}`;

function formatPlayTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h} ч ${m} мин` : `${m} мин ${s} с`;
}

export interface SaveLoadOptions {
  mode: 'save' | 'load';
  saves: SaveStore;
  overlays: Overlays;
  /** Present in save mode. */
  makeSave?: () => SaveData;
  onLoad?: (data: SaveData) => void;
}

/** Slot list. Manual saves go only to numbered slots; auto/quick are written by the game. */
export function saveLoadView(opts: SaveLoadOptions): HTMLElement {
  const container = el('div', { class: 'slots' });
  const render = () => {
    const slots = opts.mode === 'save' ? ALL_SLOTS.filter((s) => s.startsWith('slot-')) : ALL_SLOTS;
    container.replaceChildren(
      ...slots.map((slot) => {
        const read = opts.saves.read(slot);
        const actions = el('div', { class: 'slot-actions' });
        let info: HTMLElement;
        if (read.status === 'ok') {
          const d = read.data;
          info = el(
            'div',
            { class: 'slot-info' },
            el('strong', {}, d.sceneTitle),
            el('span', {}, d.chapter === null ? 'Вне глав' : `Глава ${d.chapter}`),
            el('span', {}, new Date(d.savedAt).toLocaleString('ru-RU')),
            el('span', {}, `Время игры: ${formatPlayTime(d.playTimeMs)}`),
          );
          if (opts.mode === 'load') {
            actions.append(el('button', { class: 'btn btn-primary', type: 'button', onclick: () => opts.onLoad?.(d) }, 'Загрузить'));
          }
        } else if (read.status === 'corrupted') {
          info = el('div', { class: 'slot-info slot-corrupted' }, el('strong', {}, 'Повреждённое сохранение'), el('span', {}, read.reason));
        } else {
          info = el('div', { class: 'slot-info slot-empty' }, el('span', {}, 'Пустой слот'));
        }
        if (opts.mode === 'save' && opts.makeSave) {
          const makeSave = opts.makeSave;
          actions.append(
            el(
              'button',
              {
                class: 'btn btn-primary',
                type: 'button',
                onclick: async () => {
                  if (read.status !== 'empty' && !(await opts.overlays.confirm(`Перезаписать «${slotName(slot)}»?`, 'Перезаписать'))) return;
                  const result = opts.saves.write(slot, makeSave());
                  if (result.ok) opts.overlays.toast(`Сохранено: ${slotName(slot)}`);
                  else opts.overlays.toast(`Не удалось сохранить: ${result.error}`, 'error');
                  render();
                },
              },
              'Сохранить',
            ),
          );
        }
        if (read.status !== 'empty') {
          actions.append(
            el(
              'button',
              {
                class: 'btn btn-danger',
                type: 'button',
                onclick: async () => {
                  if (!(await opts.overlays.confirm(`Удалить «${slotName(slot)}»? Это нельзя отменить.`, 'Удалить'))) return;
                  const result = opts.saves.remove(slot);
                  if (!result.ok) opts.overlays.toast(`Не удалось удалить: ${result.error}`, 'error');
                  render();
                },
              },
              'Удалить',
            ),
          );
        }
        return el('div', { class: 'slot', dataset: { slot, status: read.status } }, el('div', { class: 'slot-name pixel' }, slotName(slot)), info, actions);
      }),
    );
  };
  render();
  return container;
}

export function settingsView(store: SettingsStore): HTMLElement {
  const s = store.get();
  const range = (label: string, key: keyof Settings, min: number, max: number, step: number, format: (v: number) => string) => {
    const value = el('output', {}, format(s[key] as number));
    const input = el('input', {
      type: 'range',
      min,
      max,
      step,
      value: String(s[key]),
      'aria-label': label,
      oninput: (e: Event) => {
        const v = Number((e.target as HTMLInputElement).value);
        value.textContent = format(v);
        store.update({ [key]: v } as Partial<Settings>);
      },
    });
    return el('label', { class: 'setting' }, el('span', {}, label), input, value);
  };
  const toggle = (label: string, key: 'reduceMotion' | 'muted') =>
    el(
      'label',
      { class: 'setting setting-toggle' },
      el('span', {}, label),
      el('input', {
        type: 'checkbox',
        checked: s[key],
        onchange: (e: Event) => store.update({ [key]: (e.target as HTMLInputElement).checked }),
      }),
    );
  const skip = el(
    'select',
    {
      'aria-label': 'Пропуск',
      onchange: (e: Event) => store.update({ skipMode: (e.target as HTMLSelectElement).value as Settings['skipMode'] }),
    },
    el('option', { value: 'read', selected: s.skipMode === 'read' }, 'Только прочитанное'),
    el('option', { value: 'all', selected: s.skipMode === 'all' }, 'Всё'),
  );
  const view = el(
    'div',
    { class: 'settings' },
    el('h3', { class: 'pixel' }, 'Текст'),
    range('Скорость печати', 'textSpeed', 0, 120, 5, (v) => (v === 0 ? 'мгновенно' : `${v} зн/с`)),
    range('Задержка Auto', 'autoDelayMs', 500, 5000, 250, (v) => `${(v / 1000).toFixed(2)} с`),
    el('label', { class: 'setting' }, el('span', {}, 'Пропуск (Skip)'), skip),
    range('Размер текста', 'textScale', 0.85, 1.5, 0.05, (v) => `${Math.round(v * 100)}%`),
    range('Непрозрачность окна диалога', 'dialogOpacity', 0.5, 1, 0.02, (v) => `${Math.round(v * 100)}%`),
    el('h3', { class: 'pixel' }, 'Звук'),
    range('Музыка', 'musicVolume', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
    range('Звуки', 'sfxVolume', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
    range('Голос (японский)', 'voiceVolume', 0, 1, 0.05, (v) => (v === 0 ? 'выкл.' : `${Math.round(v * 100)}%`)),
    toggle('Выключить весь звук', 'muted'),
    el('h3', { class: 'pixel' }, 'Доступность'),
    toggle('Уменьшить движение', 'reduceMotion'),
    el(
      'button',
      {
        class: 'btn',
        type: 'button',
        onclick: () => {
          store.reset();
          view.replaceWith(settingsView(store));
        },
      },
      'Сбросить настройки',
    ),
  );
  return view;
}
