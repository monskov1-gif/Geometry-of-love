// Interactive cutscene with left/right movement only (no jumping, no vertical
// movement), e.g. Dameo running from the study room to the Sandbox
// (chapters 5–6). Params: distance, setting (palette), caption, goal label.
import { el } from '../ui/dom';
import { createControls, drawPlaceholder, palette, pixelCanvas, startLoop } from './kit';
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

/** Token names per setting: [sky, far shapes, floor, goal]. */
const SETTINGS: Record<string, [string, string, string, string]> = {
  room: ['--reality-shadow', '--reality-stone', '--reality-wood', '--mint'],
  corridor: ['--lavender', '--plum', '--baby-pink', '--lemon'],
  collapse: ['--terminal-black', '--code-grid', '--system-gray', '--rainbow-blue'],
};

export const horizontalWalk: EpisodeDefinition = {
  id: 'horizontal-walk',
  kind: 'cutscene',
  title: 'Интерактивный эпизод',
  instructions: 'Дойдите до отметки. Управление: ← → или A / D, на телефоне — кнопки под сценой.',
  create({ root, params }) {
    const distance = Number(params.distance ?? 600);
    if (!Number.isFinite(distance) || distance <= 0) throw new Error(`horizontal-walk: bad distance "${params.distance}"`);
    const setting = SETTINGS[String(params.setting ?? 'room')];
    if (!setting) throw new Error(`horizontal-walk: unknown setting "${params.setting}"`);
    const [skyT, farT, floorT, goalT] = setting;

    const { canvas, ctx } = pixelCanvas(VIEW_W, VIEW_H, 'Сцена эпизода');
    const controls = createControls(['left', 'right']);
    const caption = params.caption ? el('p', { class: 'episode-caption' }, String(params.caption)) : null;
    root.replaceChildren(el('div', { class: 'episode-canvas-wrap walk' }, ...(caption ? [caption] : []), canvas, controls.bar));
    const color = palette(root);
    const goalLabel = String(params.goal ?? '');

    let state: WalkState = { x: 0, distance };
    const draw = () => {
      const camera = Math.min(Math.max(0, state.x - VIEW_W / 3), distance + 40 - VIEW_W);
      ctx.fillStyle = color(skyT, '#242322');
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = color(farT, '#77736f');
      for (let x = -((camera * 0.5) % 40); x < VIEW_W; x += 40) ctx.fillRect(Math.round(x), 40, 24, GROUND - 40);
      ctx.fillStyle = color(floorT, '#59463d');
      ctx.fillRect(0, GROUND, VIEW_W, VIEW_H - GROUND);
      const goalX = Math.round(distance - camera);
      ctx.fillStyle = color(goalT, '#b2f5e4');
      ctx.fillRect(goalX, GROUND - 40, 3, 40);
      ctx.fillRect(goalX + 3, GROUND - 40, 14, 9);
      if (goalLabel) {
        ctx.font = '8px monospace';
        ctx.fillText(goalLabel, goalX - 10, GROUND - 44);
      }
      drawPlaceholder(ctx, state.x - camera - 8, GROUND - 32, 16, 32, color('--reality-paper', '#d8d3c9'), color('--ink', '#30243b'));
    };

    let finish: ((o: EpisodeOutcome) => void) | null = null;
    let stop = () => {};
    const tick = (dt: number) => {
      state = stepWalk(state, (controls.state.right ? 1 : 0) - (controls.state.left ? 1 : 0), dt);
      draw();
      if (reachedGoal(state)) {
        finish?.({ outcome: 'success' });
        return false;
      }
      return true;
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          stop = startLoop(tick);
        }),
      destroy: () => {
        finish = null;
        stop();
        controls.dispose();
        root.replaceChildren();
      },
    };
  },
};
