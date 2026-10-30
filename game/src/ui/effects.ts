// Screen effects requested by `effect` steps (shake, flash, glitch, blood,
// fades, the hand from the monitor). Purely presentational: they never block
// input and are not saved. With reduce-motion, movement-based effects become a
// short static tint and flashes are skipped.
//
// `rage-1`…`rage-5` are the one lasting effect: an escalating darkness for
// Melody's anger (ch08). Each level darkens the frame further, closes a
// red-black vignette, drains the colour, tears the picture and corrupts the
// dialogue band (styles/effects.css, keyed by data-rage on the game screen);
// a rise in level lands with a jolt. It stays until `rage-end` (or until the
// screen is rebuilt, e.g. by loading a save). With reduce-motion the levels
// keep their darkness and colour but nothing moves or flashes.
import type { ScreenEffect } from '../core/types';
import { el } from './dom';

type OneShot = Exclude<ScreenEffect, `rage-${string}`>;

const DURATION_MS: Record<OneShot, number> = {
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

/** The level a rage effect sets (0 = gone). */
export function rageLevel(effect: ScreenEffect): number | null {
  if (effect === 'rage-end') return 0;
  const m = /^rage-(\d)$/.exec(effect);
  return m ? Number(m[1]) : null;
}

export class EffectsLayer {
  readonly root = el('div', { class: 'fx-layer', 'aria-hidden': 'true' });
  private rage = 0;
  private rageNode: HTMLElement | null = null;

  /** Current rage level (0 = none); for tests and the screen. */
  get rageLevel(): number {
    return this.rage;
  }

  play(effects: ScreenEffect[], reduceMotion: boolean): void {
    for (const effect of effects) {
      const level = rageLevel(effect);
      if (level !== null) {
        this.setRage(level, reduceMotion);
        continue;
      }
      this.oneShot(effect as OneShot, reduceMotion);
    }
  }

  private oneShot(effect: OneShot, reduceMotion: boolean): void {
    if (reduceMotion && effect === 'flash') return;
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

  private setRage(level: number, reduceMotion: boolean): void {
    const host = this.root.parentElement;
    const rising = level > this.rage;
    this.rage = level;
    if (level === 0) {
      if (host) delete host.dataset.rage;
      this.rageNode?.remove();
      this.rageNode = null;
      return;
    }
    if (!this.rageNode) {
      this.rageNode = el(
        'div',
        { class: 'fx-rage' },
        el('div', { class: 'rage-dark' }),
        el('div', { class: 'rage-vignette' }),
        el('div', { class: 'rage-tear' }),
        el('div', { class: 'rage-pulse' }),
      );
      this.root.prepend(this.rageNode);
    }
    if (host) host.dataset.rage = String(level);
    // each step up lands like a blow: a shake, and from the third level a tear across the picture
    if (rising && !reduceMotion) {
      if (level >= 2) this.oneShot('shake', reduceMotion);
      if (level >= 3) this.oneShot('glitch', reduceMotion);
    }
  }
}
