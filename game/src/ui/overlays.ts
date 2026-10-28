// Modal overlays, confirmations and toasts. Every overlay pushes an input
// layer, so keys pressed while it is open never reach the game underneath.
import type { InputManager } from '../platform/input';
import { el } from './dom';

export class Overlays {
  private readonly toastRoot: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly input: InputManager,
  ) {
    this.toastRoot = el('div', { class: 'toast-root', role: 'status', 'aria-live': 'polite' });
    root.append(this.toastRoot);
  }

  /** Opens a panel; returns a close function. `onClose` runs once on any close. */
  open(title: string, body: HTMLElement, opts: { onClose?: () => void; className?: string } = {}): () => void {
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      popInput();
      backdrop.remove();
      previousFocus?.focus?.();
      opts.onClose?.();
    };
    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = el(
      'section',
      { class: `panel ${opts.className ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' },
      el(
        'header',
        { class: 'panel-header' },
        el('h2', { class: 'pixel' }, title),
        el('button', { class: 'btn btn-icon', type: 'button', 'aria-label': 'Закрыть', onclick: close }, '×'),
      ),
      el('div', { class: 'panel-body' }, body),
    );
    const backdrop = el('div', { class: 'overlay', onclick: (e: Event) => e.target === backdrop && close() }, panel);
    const popInput = this.input.push(`overlay:${title}`, (action) => {
      if (action === 'menu' || action === 'back') close();
    });
    this.root.append(backdrop);
    // Focus the panel itself: focusing the × button would let Enter close it by accident.
    panel.focus();
    return close;
  }

  confirm(message: string, confirmLabel = 'Да', cancelLabel = 'Отмена'): Promise<boolean> {
    return new Promise((resolve) => {
      let answer = false;
      const yes = el('button', { class: 'btn btn-primary', type: 'button' }, confirmLabel);
      const no = el('button', { class: 'btn', type: 'button' }, cancelLabel);
      const body = el('div', { class: 'confirm' }, el('p', {}, message), el('div', { class: 'row' }, no, yes));
      const close = this.open('Подтверждение', body, { className: 'panel-small', onClose: () => resolve(answer) });
      no.focus(); // the safe answer is the default
      yes.addEventListener('click', () => {
        answer = true;
        close();
      });
      no.addEventListener('click', close);
    });
  }

  toast(message: string, tone: 'info' | 'error' = 'info'): void {
    const node = el('div', { class: `toast toast-${tone}` }, message);
    this.toastRoot.append(node);
    window.setTimeout(() => node.remove(), tone === 'error' ? 6000 : 2500);
  }
}
