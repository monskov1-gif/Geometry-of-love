// The animated opening logo (render/logo.ts) with its typed equation and
// sound cues. Any key or click skips to the final frame.
import type { AudioEngine } from '../audio/engine';
import { drawLogo, EQUATION, LOGO_CUES, LOGO_H, LOGO_W, T, typedChars } from '../render/logo';
import { Painter } from '../render/painter';
import { el } from './dom';

export class LogoIntro {
  readonly root: HTMLElement;
  private readonly painter: Painter;
  private readonly equation: HTMLElement;
  private frame = 0;
  private cue = 0;
  private finished = false;

  constructor(private readonly audio: AudioEngine) {
    const canvas = el('canvas', { class: 'logo-canvas', width: LOGO_W, height: LOGO_H, 'aria-hidden': 'true' });
    this.painter = new Painter(canvas);
    this.equation = el('p', { class: 'logo-equation', 'aria-hidden': 'true' });
    this.root = el(
      'div',
      { class: 'logo-frame', role: 'img', 'aria-label': 'Geometry of Love', 'data-testid': 'logo' },
      canvas,
      this.equation,
    );
    drawLogo(this.painter, -1);
  }

  get done(): boolean {
    return this.finished;
  }

  /** Plays from the start; `onDone` fires once the logo is readable (or skipped). */
  play(onDone: () => void): void {
    const start = performance.now();
    this.root.dataset.state = 'playing';
    const step = () => {
      const t = (performance.now() - start) / 1000;
      this.render(t);
      while (this.cue < LOGO_CUES.length && LOGO_CUES[this.cue]!.at <= t) this.audio.sfx(LOGO_CUES[this.cue++]!.sound);
      if (t >= T.done && !this.finished) {
        this.finished = true;
        onDone();
      }
      if (t < T.final) this.frame = requestAnimationFrame(step);
      else this.root.dataset.state = 'done';
    };
    this.onSkip = () => {
      cancelAnimationFrame(this.frame);
      const notified = this.finished;
      this.showFinal();
      if (!notified) onDone();
    };
    this.frame = requestAnimationFrame(step);
  }

  private onSkip: () => void = () => {};

  skip(): void {
    this.onSkip();
  }

  showFinal(): void {
    this.finished = true;
    this.cue = LOGO_CUES.length;
    this.render(T.final);
    this.root.dataset.state = 'done';
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private render(t: number): void {
    drawLogo(this.painter, t);
    const n = typedChars(t);
    const text = [...EQUATION].slice(0, n).join('');
    if (this.equation.dataset.n !== String(n)) {
      this.equation.dataset.n = String(n);
      this.equation.replaceChildren(text, el('span', { class: 'logo-caret' }));
    }
  }
}
