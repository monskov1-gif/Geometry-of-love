// One-shot screen effects requested by `effect` steps (shake, flash, glitch,
// blood, fades, the hand from the monitor). Purely presentational: they never
// block input and are not saved. With reduce-motion, movement-based effects
// become a short static tint and flashes are skipped.
import type { ScreenEffect } from '../core/types';
import { el } from './dom';

const DURATION_MS: Record<ScreenEffect, number> = {
  shake: 500,
  flash: 450,
  glitch: 700,
  blood: 1600,
  'fade-black': 1400,
  'fade-white': 1400,
  hand: 2200,
};

const HAND_SVG = `<svg viewBox="0 0 16 20" shape-rendering="crispEdges" aria-hidden="true">
<path fill="currentColor" d="M5 0h2v9h1V2h2v7h1V3h2v8h1V6h2v8l-1 1v2l-2 2v1H5v-1l-2-2-2-3V9h2l2 3z"/></svg>`;

export class EffectsLayer {
  readonly root = el('div', { class: 'fx-layer', 'aria-hidden': 'true' });

  play(effects: ScreenEffect[], reduceMotion: boolean): void {
    for (const effect of effects) {
      if (reduceMotion && effect === 'flash') continue;
      const node = el('div', { class: `fx fx-${effect}` });
      if (effect === 'hand') node.innerHTML = HAND_SVG; // static, trusted markup
      this.root.append(node);
      const host = this.root.parentElement;
      if (effect === 'shake' || effect === 'glitch') host?.classList.add(`fx-host-${effect}`);
      window.setTimeout(() => {
        node.remove();
        host?.classList.remove(`fx-host-${effect}`);
      }, DURATION_MS[effect]);
    }
  }
}
