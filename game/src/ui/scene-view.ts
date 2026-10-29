// Shows a painted location: two static layers for crossfading lighting or
// location changes, plus an animated layer (~12 fps). Locations without a
// painter fall back to the CSS background of the same id.
import { Painter, VIEW_H, VIEW_W } from '../render/painter';
import { locations } from '../render/locations';
import type { Lighting } from '../render/props';
import { el } from './dom';

const FPS = 12;

export class SceneView {
  readonly root: HTMLElement;
  private readonly layers: [HTMLCanvasElement, HTMLCanvasElement];
  private readonly fx: HTMLCanvasElement;
  private readonly fxPainter: Painter;
  private readonly fallback: HTMLElement;
  private front = 0;
  private key = '';
  private timer = 0;
  private current: { id: string; light: Lighting; variant: string | undefined } | null = null;

  constructor() {
    const canvas = () => {
      const c = el('canvas', { class: 'scene-layer', width: VIEW_W, height: VIEW_H, 'aria-hidden': 'true' });
      return c;
    };
    this.layers = [canvas(), canvas()];
    this.fx = canvas();
    this.fx.classList.add('scene-fx');
    this.fxPainter = new Painter(this.fx);
    this.fallback = el('div', { class: 'stage-bg' });
    this.root = el('div', { class: 'scene-view' }, this.fallback, ...this.layers, this.fx);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stopLoop() : this.startLoop()));
  }

  /** Paints (or crossfades to) a location; `reduceMotion` disables the animated layer. */
  show(bg: string | null, lighting: Lighting | null, variant: string | null, reduceMotion: boolean, placeholder?: string): void {
    const loc = bg ? locations[bg] : undefined;
    const light = loc ? (lighting && loc.lightings.includes(lighting) ? lighting : loc.defaultLighting) : 'day';
    const key = `${bg}|${light}|${variant ?? ''}`;
    if (key === this.key) return;
    this.key = key;
    this.root.dataset.bg = bg ?? '';
    if (!loc) {
      this.current = null;
      this.stopLoop();
      this.layers.forEach((l) => l.classList.remove('is-visible'));
      this.fx.classList.remove('is-visible');
      this.fallback.dataset.bg = bg ?? '';
      this.fallback.replaceChildren(placeholder ? el('span', { class: 'bg-placeholder-label' }, placeholder) : '');
      return;
    }
    this.fallback.dataset.bg = '';
    this.fallback.replaceChildren();
    const next = this.layers[1 - this.front]!;
    const pt = new Painter(next);
    pt.ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    loc.paint(pt, light, variant ?? undefined); // errors reach GameScreen.act(), which shows them
    next.classList.add('is-visible');
    this.layers[this.front]!.classList.remove('is-visible');
    this.front = 1 - this.front;
    this.current = { id: loc.id, light, variant: variant ?? undefined };
    this.fx.classList.toggle('is-visible', !!loc.animate && !reduceMotion);
    this.stopLoop();
    if (loc.animate && !reduceMotion) this.startLoop();
  }

  destroy(): void {
    this.stopLoop();
  }

  private startLoop(): void {
    if (this.timer || !this.current) return;
    const loc = locations[this.current.id];
    if (!loc?.animate) return;
    const tick = () => {
      if (!this.current) return;
      loc.animate!(this.fxPainter, performance.now(), this.current.light, this.current.variant);
    };
    tick();
    this.timer = window.setInterval(tick, 1000 / FPS);
  }

  private stopLoop(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
  }
}
