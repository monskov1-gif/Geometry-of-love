// Reusable dialogue box: nameplate, typewriter text, continue indicator and
// a visual style per text kind (speech, narration, thought, system, error,
// corrupted, memory).
import type { TextKind } from '../core/types';
import { el } from './dom';

export interface DialogueLine {
  speaker: string | null;
  accent: string | null;
  text: string;
  kind: TextKind;
}

export class DialogueBox {
  readonly root: HTMLElement;
  private readonly nameplate: HTMLElement;
  private readonly textNode: HTMLElement;
  private timer = 0;
  private full = '';
  private shown = 0;
  private onDone: (() => void) | null = null;

  constructor() {
    this.nameplate = el('div', { class: 'nameplate pixel' });
    this.textNode = el('p', { class: 'dialogue-text', 'aria-live': 'polite' });
    this.root = el(
      'div',
      { class: 'dialogue', 'data-testid': 'dialogue' },
      this.nameplate,
      // Scrolls long lines; the nameplate stays outside so it is never clipped.
      el('div', { class: 'dialogue-scroll' }, this.textNode),
      el('span', { class: 'continue-indicator', 'aria-hidden': 'true' }, '▼'),
    );
  }

  get typing(): boolean {
    return this.shown < this.full.length;
  }

  /** Shows a line; `charsPerSecond` 0 = instant. `onDone` fires when fully visible. */
  show(line: DialogueLine, charsPerSecond: number, onDone: () => void, onType?: () => void): void {
    this.stop();
    this.root.classList.remove('rewritten');
    this.root.dataset.kind = line.kind;
    this.nameplate.hidden = !line.speaker;
    this.nameplate.textContent = line.speaker ?? '';
    this.nameplate.style.setProperty('--accent', line.accent ?? 'var(--pink)');
    this.full = line.text;
    this.onDone = onDone;
    this.shown = 0;
    if (charsPerSecond <= 0) {
      this.complete();
      return;
    }
    this.root.classList.remove('done');
    const started = performance.now();
    const tick = () => {
      const next = Math.min(this.full.length, Math.floor(((performance.now() - started) / 1000) * charsPerSecond) + 1);
      if (next > this.shown && /\S/.test(this.full[next - 1] ?? '')) onType?.();
      this.shown = next;
      this.textNode.textContent = this.full.slice(0, this.shown);
      if (this.typing) this.timer = window.setTimeout(tick, 16);
      else this.finish();
    };
    tick();
  }

  /** Replaces the visible line: the program "corrects" what was just said. */
  rewrite(text: string): void {
    this.stop();
    this.full = text;
    this.shown = text.length;
    this.root.dataset.kind = 'corrupted';
    this.textNode.textContent = text;
    this.root.classList.remove('rewritten');
    void this.root.offsetWidth; // restart the CSS animation
    this.root.classList.add('rewritten');
  }

  /** Reveals the whole line immediately. */
  complete(): void {
    this.stop();
    this.shown = this.full.length;
    this.textNode.textContent = this.full;
    this.finish();
  }

  private finish(): void {
    this.root.classList.add('done');
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  private stop(): void {
    window.clearTimeout(this.timer);
  }
}
