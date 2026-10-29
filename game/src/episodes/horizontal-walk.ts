// Interactive cutscene with left/right movement only (no jumping, no vertical
// movement), e.g. Dameo running from the study room to the Sandbox
// (chapters 5–6). Params: distance, setting (backdrop theme), caption, goal label.
// Dameo is the real pixel sprite with its walk cycle; the place is a painted
// parallax backdrop (episodes/backdrops.ts). The goal is drawn by its label:
// «выход» — an exit door with a sign, «дверь» — the mechanical door the
// Compass holds open (chapter 10, the caption says so); anything else — a flag.
import { el } from '../ui/dom';
import { CANDY, css, LOUD } from '../world/candy/palette';
import { fillTest, inCircle, pixelText } from '../world/candy/shapes';
import { candyDoor, strip, walkBackdrop, type Ctx, type WalkTheme } from './backdrops';
import { createControls, pixelCanvas, startLoop } from './kit';
import { drawActor, walkPhase } from './sprite-draw';
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

const VIEW_W = 400;
const VIEW_H = 200;
const GROUND = 168;
const START = 40; // where Dameo stands at x = 0, in world px

const SETTINGS: Record<string, WalkTheme> = { room: 'room', corridor: 'corridor', collapse: 'collapse' };

/** The goal object with its left edge at `gx`, drawn once into an offscreen canvas. */
function drawGoal(ctx: Ctx, gx: number, label: string): void {
  if (label === 'дверь') {
    // a huge mechanical door: riveted pastel steel, a gear, a lever jammed by the Compass
    ctx.fillStyle = '#8a7a9a';
    ctx.fillRect(gx - 6, GROUND - 130, 72, 130);
    ctx.fillStyle = '#b8a8c8';
    ctx.fillRect(gx, GROUND - 124, 60, 124);
    for (let y = GROUND - 120; y < GROUND; y += 12)
      for (const x of [gx + 4, gx + 54]) fillTest(ctx, x, y, 3, 3, '#6a5a7a', inCircle);
    for (let y = GROUND - 110; y < GROUND - 4; y += 22) {
      ctx.fillStyle = css(LOUD[(y >> 3) % LOUD.length]!);
      ctx.fillRect(gx + 10, y, 40, 4);
    }
    // the door is up: a dark gap beneath it to run through
    ctx.fillStyle = '#30243b';
    ctx.fillRect(gx + 6, GROUND - 40, 48, 40);
    ctx.fillStyle = '#ffd93d';
    for (let x = gx + 6; x < gx + 54; x += 8) ctx.fillRect(x, GROUND - 44, 4, 4);
    return;
  }
  if (label === 'выход') {
    candyDoor(ctx, gx, GROUND, 40, 76, CANDY.grass, 1);
    ctx.fillStyle = '#1f7a3a';
    ctx.fillRect(gx - 6, GROUND - 100, 52, 14);
    pixelText(ctx, 'ВЫХОД', gx + 20, GROUND - 99, 11, '#d4ff5a', { align: 'center' });
    return;
  }
  ctx.fillStyle = css(CANDY.paper);
  ctx.fillRect(gx, GROUND - 60, 3, 60);
  ctx.fillStyle = css(CANDY.pink);
  ctx.fillRect(gx + 3, GROUND - 60, 20, 12);
}

/** The turning gear of the mechanical door (the Compass keeps it going). */
function drawGear(ctx: Ctx, cx: number, cy: number, t: number): void {
  for (let k = 0; k < 8; k++) {
    const ang = t * 0.6 + (k / 8) * Math.PI * 2;
    ctx.fillStyle = '#c8b8d8';
    ctx.fillRect(Math.round(cx + Math.cos(ang) * 14 - 3), Math.round(cy + Math.sin(ang) * 14 - 3), 6, 6);
  }
}

const GOAL_PAD = 20;

export const horizontalWalk: EpisodeDefinition = {
  id: 'horizontal-walk',
  kind: 'cutscene',
  title: 'Интерактивный эпизод',
  instructions: 'Дойдите до отметки. Управление: ← → или A / D, на телефоне — кнопки под сценой.',
  create({ root, params, reduceMotion }) {
    const distance = Number(params.distance ?? 600);
    if (!Number.isFinite(distance) || distance <= 0) throw new Error(`horizontal-walk: bad distance "${params.distance}"`);
    const theme = SETTINGS[String(params.setting ?? 'room')];
    if (!theme) throw new Error(`horizontal-walk: unknown setting "${params.setting}"`);

    const { canvas, ctx } = pixelCanvas(VIEW_W, VIEW_H, 'Сцена эпизода');
    const controls = createControls(['left', 'right']);
    const caption = params.caption ? el('p', { class: 'episode-caption' }, String(params.caption)) : null;
    root.replaceChildren(el('div', { class: 'episode-canvas-wrap walk' }, ...(caption ? [caption] : []), canvas, controls.bar));
    const goalLabel = String(params.goal ?? '');
    const backdrop = walkBackdrop(theme, VIEW_W, VIEW_H, GROUND, distance + START + 120, reduceMotion);
    const goalImg = strip(140, VIEW_H, (g) => {
      drawGoal(g, GOAL_PAD, goalLabel);
      if (goalLabel === 'дверь') {
        fillTest(g, GOAL_PAD + 71, GROUND - 109, 26, 26, '#c8b8d8', inCircle);
        fillTest(g, GOAL_PAD + 79, GROUND - 101, 10, 10, '#6a5a7a', inCircle);
      }
      if (goalLabel) pixelText(g, goalLabel, GOAL_PAD, GROUND - (goalLabel === 'дверь' ? 146 : 116), 9, css(CANDY.plum));
    });

    let state: WalkState = { x: 0, distance };
    let dir: -1 | 1 = 1;
    let moving = false;
    let time = 0;
    const draw = () => {
      const px = state.x + START;
      const camera = Math.min(Math.max(0, px - VIEW_W / 3), distance + START + 120 - VIEW_W);
      backdrop.draw(ctx, camera, time);
      const gx = Math.round(distance + START - camera);
      if (goalLabel === 'дверь') drawGear(ctx, gx + 84, GROUND - 96, reduceMotion ? 0 : time);
      ctx.drawImage(goalImg, gx - GOAL_PAD, 0);
      if (goalLabel === 'дверь') drawActor(ctx, 'compass', gx + 84, GROUND, { dir: 0, walk: -1, emotion: 'happy', breath: (Math.floor(time / 0.7) % 2) as 0 | 1 });
      drawActor(ctx, 'dameo', px - camera, GROUND + 2, { dir: moving ? dir : 1, walk: moving ? walkPhase(state.x, 10) : -1, emotion: 'scared', breath: (Math.floor(time / 0.7) % 2) as 0 | 1 });
      backdrop.front(ctx, camera);
    };

    let finish: ((o: EpisodeOutcome) => void) | null = null;
    let stop = () => {};
    const tick = (dt: number) => {
      time += dt;
      const d = (controls.state.right ? 1 : 0) - (controls.state.left ? 1 : 0);
      if (d) dir = d > 0 ? 1 : -1;
      const before = state.x;
      state = stepWalk(state, d, dt);
      moving = state.x !== before;
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
