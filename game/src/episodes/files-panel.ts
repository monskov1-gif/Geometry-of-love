// Side panel of «Системные файлы»: stage status, the selected file or wire
// with its links and actions, the lock keypad of stage 3. Big buttons so
// every action is easy to hit with a finger; all of them work by keyboard.
import { el } from '../ui/dom';
import { MAX_STRIKES, type StageRun } from './files-run';
import { FILES, label } from './files-stages';

export interface PanelHandlers {
  cut(linkId: string): void;
  tag(nodeId: string): void;
  submitTags(): void;
  trace(): void;
  digit(d: string): void;
}

const BIG = { minHeight: '44px', minWidth: '44px' };

const button = (text: string, focus: string, onclick: () => void, extra: Record<string, unknown> = {}) =>
  el('button', { class: 'btn', type: 'button', dataset: { focus }, style: BIG, onclick, ...extra }, text);

function status(run: StageRun): string {
  const { stage } = run;
  if (stage.kind === 'trace') return `Помечено связок: ${run.tags.size}`;
  if (stage.kind === 'separate') return `Разрывов: ${run.cut.size} из ${stage.budget}`;
  return `Разорвано: ${run.cut.size} · Ошибки порядка: ${run.strikes} из ${MAX_STRIKES}`;
}

function lockBox(run: StageRun, on: PanelHandlers): HTMLElement | null {
  const lock = run.lock;
  if (!lock) return null;
  const rows = lock.problems.map((p, i) =>
    el('li', { style: { color: i < lock.typed.length ? 'var(--code-green)' : i === lock.typed.length ? 'var(--code-warning)' : 'var(--code-green-muted)' } }, `${p} = ${lock.typed[i] ?? '?'}`),
  );
  const keys = Array.from({ length: 10 }, (_, i) => String((i + 1) % 10)).map((d) => button(d, `digit-${d}`, () => on.digit(d), { 'aria-label': `Цифра ${d}` }));
  return el(
    'div',
    { class: 'files-lock', role: 'group', 'aria-label': 'Замок', style: { border: '1px solid var(--code-corruption)', padding: 'var(--space-2)', display: 'grid', gap: 'var(--space-2)' } },
    el('strong', { style: { color: 'var(--code-corruption)' } }, `ЗАМОК: ${label(lock.node)}`),
    el(
      'div',
      { style: { height: '6px', background: 'var(--code-grid)' }, 'aria-hidden': 'true' },
      el('div', { dataset: { lockLeft: '' }, style: { height: '100%', width: `${(100 * lock.left) / lock.limit}%`, background: 'var(--code-corruption)' } }),
    ),
    el('ol', { class: 'files-lock-problems', style: { margin: 0, padding: 0, listStylePosition: 'inside', fontFamily: 'var(--font-pixel)', fontSize: 'var(--fs-small)', display: 'flex', flexWrap: 'wrap', gap: '0 var(--space-3)' } }, ...rows),
    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-1)' } }, ...keys),
  );
}

function linkRow(run: StageRun, linkId: string, from: string, on: PanelHandlers): HTMLElement {
  const link = run.stage.links.find((l) => l.id === linkId)!;
  const text = link.from === from ? `→ ${label(link.to)}` : `← ${label(link.from)}`;
  const cut = run.cut.has(link.id);
  const canCut = run.stage.kind !== 'trace' && !cut && !run.done;
  return el(
    'li',
    {},
    el('span', { style: { color: cut ? 'var(--code-corruption)' : run.relinked === link.id ? 'var(--code-warning)' : '' } }, `${text}${cut ? ' (разорвано)' : run.relinked === link.id ? ' (восстановлено)' : ''}`),
    canCut ? button('Разорвать', `cut-${link.id}`, () => on.cut(link.id), { class: 'btn btn-danger', dataset: { focus: `cut-${link.id}`, link: link.id } }) : null,
  );
}

export function renderPanel(side: HTMLElement, run: StageRun, selectedNode: string | null, selectedLink: string | null, on: PanelHandlers): void {
  const { stage } = run;
  const parts: (HTMLElement | null)[] = [el('p', { class: 'files-status', style: { margin: 0, fontSize: 'var(--fs-small)', color: 'var(--code-green)' } }, status(run)), lockBox(run, on)];
  const info = el('div', { class: 'files-info', 'aria-live': 'polite' });
  if (selectedLink) {
    const l = stage.links.find((x) => x.id === selectedLink)!;
    info.append(el('h3', { class: 'pixel' }, `${label(l.from)} → ${label(l.to)}`), el('p', {}, `${label(l.from)} держится за ${label(l.to)}.`), el('ul', { class: 'files-links' }, linkRow(run, l.id, l.from, on)));
  } else if (selectedNode) {
    const file = FILES[selectedNode]!;
    const own = stage.links.filter((l) => l.from === selectedNode || l.to === selectedNode);
    info.append(el('h3', { class: 'pixel' }, file.label), el('p', {}, file.meta), el('ul', { class: 'files-links' }, ...own.map((l) => linkRow(run, l.id, selectedNode, on))));
    if (stage.kind === 'trace' && file.kind === 'link') {
      const tagged = run.tags.has(selectedNode);
      info.append(button(tagged ? 'Снять метку' : 'Пометить: держится на user_07', `tag-${selectedNode}`, () => on.tag(selectedNode), { 'aria-pressed': String(tagged) }));
    }
  } else info.append(el('p', { class: 'muted' }, 'Выберите файл или провод на схеме.'));
  parts.push(info);
  if (stage.kind === 'trace') parts.push(button(`Проверить метки (${run.tags.size})`, 'submit', on.submitTags, { class: 'btn btn-primary' }));
  if (stage.kind === 'separate') parts.push(button('Трассировка', 'trace', on.trace));
  side.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
}
