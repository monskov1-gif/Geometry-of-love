// Interactive cutscene with left/right movement only (no jumping, no vertical
// movement), as required for episodes like Dameo running to the Sandbox.
// Rendering is a low-resolution canvas scaled with crisp pixels; all art is
// placeholder until real sprites and backgrounds exist.
import { el } from '../ui/dom';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export interface WalkState {
  x: number;
  distance: number;
}

export const WALK_SPEED = 120; // world px per second

/** Pure movement step, unit-tested. `dir` is -1, 0 or 1. */
export function stepWalk(state: WalkState, dir: number, dt: number): WalkState {
  const x = Math.min(state.distance, Math.max(0, state.x + dir * WALK_SPEED * dt));
  return { ...state, x };
}

export const reachedGoal = (s: WalkState) => s.x >= s.distance;

const VIEW_W = 320;
const VIEW_H = 120;
const GROUND = 96;

export const horizontalWalk: EpisodeDefinition = {
  id: 'horizontal-walk',
  kind: 'cutscene',
  title: 'Интерактивный эпизод',
  instructions: 'Дойдите до отметки. Управление: ← → или A / D, на телефоне — кнопки под сценой.',
  create({ root, params }) {
    const distance = Number(params.distance ?? 600);
    if (!Number.isFinite(distance) || distance <= 0) throw new Error(`horizontal-walk: bad distance "${params.distance}"`);

    const canvas = el('canvas', { class: 'walk-canvas', width: VIEW_W, height: VIEW_H, 'aria-label': 'Сцена эпизода' });
    const held = { left: false, right: false };
    const holdButton = (label: string, side: 'left' | 'right') =>
      el(
        'button',
        {
          class: 'btn walk-button',
          type: 'button',
          'aria-label': side === 'left' ? 'Влево' : 'Вправо',
          onpointerdown: (e: PointerEvent) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            held[side] = true;
          },
          onpointerup: () => (held[side] = false),
          onpointercancel: () => (held[side] = false),
        },
        label,
      );
    root.replaceChildren(
      el(
        'div',
        { class: 'walk' },
        canvas,
        el('div', { class: 'walk-controls' }, holdButton('◀', 'left'), holdButton('▶', 'right')),
      ),
    );

    const keyMap: Record<string, 'left' | 'right'> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    const onKey = (e: KeyboardEvent) => {
      const side = keyMap[e.key];
      if (!side) return;
      e.preventDefault();
      held[side] = e.type === 'keydown';
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('horizontal-walk: 2D canvas unavailable');
    let state: WalkState = { x: 0, distance };
    let frame = 0;
    let last = 0;

    const css = getComputedStyle(root);
    const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;

    const draw = () => {
      const camera = Math.min(Math.max(0, state.x - VIEW_W / 3), distance + 40 - VIEW_W);
      ctx.fillStyle = color('--reality-shadow', '#242322');
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = color('--reality-stone', '#77736f');
      for (let x = -((camera * 0.5) % 40); x < VIEW_W; x += 40) ctx.fillRect(Math.round(x), 40, 24, GROUND - 40);
      ctx.fillStyle = color('--reality-wood', '#59463d');
      ctx.fillRect(0, GROUND, VIEW_W, VIEW_H - GROUND);
      const goalX = Math.round(distance - camera);
      ctx.fillStyle = color('--mint', '#b2f5e4');
      ctx.fillRect(goalX, GROUND - 40, 3, 40);
      ctx.fillRect(goalX + 3, GROUND - 40, 14, 9);
      // Placeholder for Dameo: a plain box, clearly not final art.
      const px = Math.round(state.x - camera) - 8;
      ctx.fillStyle = color('--reality-paper', '#d8d3c9');
      ctx.fillRect(px, GROUND - 32, 16, 32);
      ctx.fillStyle = color('--reality-shadow', '#242322');
      ctx.font = '8px monospace';
      ctx.fillText('ЗАГЛУШКА', px - 14, GROUND - 36);
    };

    let finish: ((o: EpisodeOutcome) => void) | null = null;
    const loop = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      state = stepWalk(state, (held.right ? 1 : 0) - (held.left ? 1 : 0), dt);
      draw();
      if (reachedGoal(state)) {
        finish?.({ outcome: 'success' });
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          frame = requestAnimationFrame(loop);
        }),
      destroy: () => {
        finish = null;
        cancelAnimationFrame(frame);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        root.replaceChildren();
      },
    };
  },
};
