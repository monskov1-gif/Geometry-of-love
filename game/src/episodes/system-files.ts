// Mini-game No. 4 «Системные файлы» (chapter 13): explore the program's
// file structure, find Dameo's file among the user files, inspect its links
// and cut only the links that bind him to the game. Cutting a link that
// holds the world together is refused by the Calculator and resets the
// puzzle (failure → retry). Success = every binding link of Dameo's file cut.
import { el } from '../ui/dom';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export interface FileNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'system' | 'user' | 'damaged' | 'link';
  meta: string;
}

export interface FileLink {
  id: string;
  from: string;
  to: string;
  /** binding = Dameo's tie to the game (must be cut); vital = holds the world (never cut). */
  role: 'binding' | 'vital';
}

export const NODES: FileNode[] = [
  { id: 'core', label: 'core.sys', x: 50, y: 12, kind: 'system', meta: 'Ядро программы. Системный компонент.' },
  { id: 'world', label: 'world.map', x: 82, y: 30, kind: 'system', meta: 'Карта мира и Песочницы. Системный компонент.' },
  { id: 'session', label: 'session.lnk', x: 50, y: 50, kind: 'link', meta: 'Активная сессия пользователя. Связывает пользователя с программой.' },
  { id: 'progress', label: 'progress.dat', x: 22, y: 70, kind: 'link', meta: 'Учебный прогресс. Привязан к пользователю.' },
  { id: 'u03', label: 'user_03.usr', x: 14, y: 32, kind: 'damaged', meta: 'Владелец: ▒▒▒▒▒. Файл повреждён: данные стёрты.' },
  { id: 'u05', label: 'user_05.usr', x: 86, y: 70, kind: 'damaged', meta: 'Владелец: ▒▒▒▒. Повреждён. Последняя запись: «держу дверь».' },
  { id: 'u06', label: 'user_06.usr', x: 66, y: 88, kind: 'damaged', meta: 'Владелец: ▒▒▒▒▒▒. Повреждён. Длина: предельная.' },
  { id: 'u07', label: 'user_07.usr', x: 36, y: 88, kind: 'user', meta: 'Владелец: Дамео. Статус: «становится частью кода».' },
];

export const LINKS: FileLink[] = [
  { id: 'l1', from: 'u07', to: 'session', role: 'binding' },
  { id: 'l2', from: 'u07', to: 'progress', role: 'binding' },
  { id: 'l3', from: 'session', to: 'core', role: 'vital' },
  { id: 'l4', from: 'u07', to: 'world', role: 'vital' },
  { id: 'l5', from: 'progress', to: 'world', role: 'vital' },
  { id: 'l6', from: 'u03', to: 'world', role: 'vital' },
];

export type CutResult = 'cut' | 'refused' | 'done';

/** Puzzle rule, unit-tested. Cutting a vital link fails; cutting all binding links wins. */
export function cutLink(cut: ReadonlySet<string>, linkId: string): CutResult {
  const link = LINKS.find((l) => l.id === linkId);
  if (!link || link.role === 'vital') return 'refused';
  const next = new Set(cut).add(linkId);
  return LINKS.filter((l) => l.role === 'binding').every((l) => next.has(l.id)) ? 'done' : 'cut';
}

const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

export const systemFiles: EpisodeDefinition = {
  id: 'system-files',
  kind: 'minigame',
  title: 'Системные файлы',
  instructions:
    'Найдите файл Дамео среди пользовательских файлов, изучите его связи и разорвите только те, что привязывают его к игре. Выберите файл, чтобы увидеть сведения и связи. Связи, которые держат мир, трогать нельзя.',
  create({ root }) {
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    const cut = new Set<string>();
    let selected: string | null = null;
    const svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'files-graph', role: 'img', 'aria-label': 'Граф файлов' }) as SVGSVGElement;
    const info = el('div', { class: 'files-info', 'aria-live': 'polite' });
    const hint = el('p', { class: 'episode-caption' }, 'Калькулятор: «Пользовательские файлы — внизу. Ищи по владельцу. Связи ядра и карты мира не трогай: на них держится всё».');
    const list = el('div', { class: 'files-list', role: 'list' });
    root.replaceChildren(el('div', { class: 'files' }, hint, el('div', { class: 'files-main' }, svg, el('div', { class: 'files-side' }, list, info))));

    const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

    const render = () => {
      svg.replaceChildren();
      for (const l of LINKS) {
        const a = nodeById(l.from);
        const b = nodeById(l.to);
        svg.append(
          svgEl('line', {
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            class: `files-link${cut.has(l.id) ? ' is-cut' : ''}${selected && (l.from === selected || l.to === selected) ? ' is-active' : ''}`,
          }),
        );
      }
      for (const n of NODES) {
        const g = svgEl('g', { class: `files-node kind-${n.kind}${selected === n.id ? ' is-selected' : ''}` });
        g.append(svgEl('rect', { x: n.x - 11, y: n.y - 4, width: 22, height: 8, rx: 1 }));
        const t = svgEl('text', { x: n.x, y: n.y + 1.6, 'text-anchor': 'middle' });
        t.textContent = n.label;
        g.append(t);
        g.addEventListener('click', () => select(n.id));
        svg.append(g);
      }
      list.replaceChildren(
        ...NODES.map((n) =>
          el(
            'button',
            { class: `btn files-item kind-${n.kind}`, type: 'button', role: 'listitem', 'aria-pressed': String(selected === n.id), onclick: () => select(n.id) },
            n.label,
          ),
        ),
      );
      if (!selected) {
        info.replaceChildren(el('p', { class: 'muted' }, 'Выберите файл.'));
        return;
      }
      const node = nodeById(selected);
      const links = LINKS.filter((l) => l.from === node.id || l.to === node.id);
      info.replaceChildren(
        el('h3', { class: 'pixel' }, node.label),
        el('p', {}, node.meta),
        el(
          'ul',
          { class: 'files-links' },
          ...links.map((l) => {
            const other = nodeById(l.from === node.id ? l.to : l.from);
            return el(
              'li',
              {},
              el('span', {}, `↔ ${other.label}${cut.has(l.id) ? ' (разорвано)' : ''}`),
              cut.has(l.id)
                ? null
                : el('button', { class: 'btn btn-danger', type: 'button', dataset: { link: l.id }, onclick: () => onCut(l.id) }, 'Разорвать'),
            );
          }),
        ),
      );
    };

    const select = (id: string) => {
      selected = id;
      render();
    };

    const onCut = (linkId: string) => {
      const result = cutLink(cut, linkId);
      if (result === 'refused') {
        cut.clear();
        selected = null;
        hint.textContent = 'Калькулятор: «Стой! Эта связь держит мир. Я откатил изменения — начни заново».';
        hint.dataset.state = 'wrong';
        render();
        return;
      }
      cut.add(linkId);
      hint.dataset.state = '';
      hint.textContent = result === 'done' ? 'Привязка отключена.' : 'Калькулятор: «Так. Ещё одна связь держит тебя».';
      render();
      if (result === 'done') window.setTimeout(() => finish?.({ outcome: 'success' }), 900);
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          render();
        }),
      destroy: () => {
        finish = null;
        root.replaceChildren();
      },
    };
  },
};
