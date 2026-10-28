// Mini-game No. 1 «Выход» (chapter 4): a platformer. Jump up small
// platforms towards the top edge of the level — the back of the monitor.
// Higher up platforms vanish after you stand on them and the world becomes
// unstable. Falling below the checkpoint returns you to it. Reaching the top
// is the only success.
import { el } from '../ui/dom';
import { createControls, drawPlaceholder, palette, pixelCanvas, startLoop } from './kit';
import { stepBody, type Body, type Rect } from './physics';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export const VIEW_W = 200;
export const VIEW_H = 150;
export const LEVEL_H = 900;
const GROUND_Y = 880;
const TOP_Y = 60;
const STEP = 40;
const XS = [10, 70, 130, 80, 30, 90, 140, 90, 40, 100, 140, 80, 20, 70, 120, 60, 10, 70, 130, 70];
const VANISH_FROM = 10;
const CHECKPOINT = 9;

export interface ClimbPlatform extends Rect {
  vanishing: boolean;
}

/** The fixed level: ground, 20 steps, the top ledge under the monitor glass. */
export function buildLevel(): ClimbPlatform[] {
  const steps = XS.map((x, i) => ({
    x,
    y: GROUND_Y - STEP * (i + 1),
    w: i >= VANISH_FROM ? 46 : 60,
    h: 6,
    vanishing: i >= VANISH_FROM,
  }));
  return [{ x: 0, y: GROUND_Y, w: VIEW_W, h: 20, vanishing: false }, ...steps, { x: 0, y: TOP_Y, w: VIEW_W, h: 8, vanishing: false }];
}

const MELODY_LINES = [
  'Мелоди: Прыгай! Выход совсем рядом, я в тебя верю!',
  'Мелоди: Умница! Ещё чуть-чуть выше!',
  'Мелоди: Выше, выше, выше, выше…',
  'Мелоди: Выше. Выше. Выше. Выше. Выше.',
];

export const exitClimb: EpisodeDefinition = {
  id: 'exit-climb',
  kind: 'minigame',
  title: 'Выход',
  instructions:
    'Поднимитесь по платформам к верхней границе уровня — к обратной стороне монитора. ← → или A / D — движение, ↑ / W / Пробел — прыжок. Верхние платформы исчезают, если на них задержаться. Упав, вы вернётесь к последней контрольной точке.',
  create({ root, reduceMotion }) {
    const { canvas, ctx } = pixelCanvas(VIEW_W, VIEW_H, 'Уровень «Выход»');
    const caption = el('p', { class: 'episode-caption', 'aria-live': 'polite' }, MELODY_LINES[0]);
    const controls = createControls(['left', 'right', 'jump']);
    root.replaceChildren(el('div', { class: 'episode-canvas-wrap' }, caption, canvas, controls.bar));
    const color = palette(root);

    const level = buildLevel();
    const standTime = new Map<number, number>();
    const goneUntil = new Map<number, number>();
    let time = 0;
    let checkpointY = GROUND_Y;
    let body: Body = { x: 20, y: GROUND_Y - 16, w: 10, h: 16, vx: 0, vy: 0, onGround: true, standingOn: 0 };
    let lineIndex = 0;

    const respawn = () => {
      body = { ...body, x: 20, y: checkpointY - 16, vx: 0, vy: 0 };
      if (checkpointY !== GROUND_Y) body.x = (level[CHECKPOINT + 1]!.x ?? 20) + 20;
      goneUntil.clear();
      standTime.clear();
      caption.textContent = 'Платформа исчезла. Ещё раз — с контрольной точки.';
    };

    const draw = () => {
      const camY = Math.max(0, Math.min(LEVEL_H - VIEW_H, body.y - 90));
      const progress = 1 - (body.y - TOP_Y) / (GROUND_Y - TOP_Y);
      ctx.fillStyle = color('--mint', '#b2f5e4');
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = color('--lavender', '#deccff');
      ctx.fillRect(0, 0, VIEW_W, Math.max(0, 500 - camY));
      // The monitor glass: Dameo's real room, dim, behind it.
      ctx.fillStyle = color('--reality-shadow', '#242322');
      ctx.fillRect(0, 0, VIEW_W, Math.max(0, TOP_Y - camY));
      ctx.fillStyle = color('--room-teal', '#3c4644');
      ctx.fillRect(30, Math.max(0, TOP_Y - camY) - 40, 60, 30);
      level.forEach((p, i) => {
        const hidden = (goneUntil.get(i) ?? 0) > time;
        if (hidden) return;
        const fading = p.vanishing ? Math.max(0.25, 1 - (standTime.get(i) ?? 0) / 0.9) : 1;
        const jitter = !reduceMotion && p.vanishing && progress > 0.5 && Math.random() < 0.08 ? 1 : 0;
        ctx.globalAlpha = fading;
        ctx.fillStyle = i === level.length - 1 ? color('--system-gray', '#c9c9d2') : color('--baby-pink', '#ffc9f6');
        ctx.fillRect(p.x + jitter, p.y - camY, p.w, p.h);
        ctx.fillStyle = color('--ink', '#30243b');
        ctx.fillRect(p.x + jitter, p.y - camY + p.h - 1, p.w, 1);
        ctx.globalAlpha = 1;
      });
      if (checkpointY !== GROUND_Y) {
        ctx.fillStyle = color('--lemon', '#f8feb4');
        ctx.fillRect(level[CHECKPOINT + 1]!.x + 2, checkpointY - camY - 10, 3, 10);
      }
      drawPlaceholder(ctx, body.x, body.y - camY, body.w, body.h, color('--paper', '#fff9fd'), color('--ink', '#30243b'));
    };

    let stop = () => {};
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    const tick = (dt: number) => {
      time += dt;
      const platforms = level.map((p, i) => ({ ...p, solid: (goneUntil.get(i) ?? 0) <= time }));
      const jump = controls.state.jumpPressed;
      controls.state.jumpPressed = false;
      body = stepBody(body, { dir: (controls.state.right ? 1 : 0) - (controls.state.left ? 1 : 0), jump }, platforms, dt, { minX: 0, maxX: VIEW_W });

      const on = body.onGround ? body.standingOn : -1;
      for (const [i] of standTime) if (i !== on) standTime.delete(i);
      if (on >= 0 && level[on]!.vanishing) {
        const t = (standTime.get(on) ?? 0) + dt;
        standTime.set(on, t);
        if (t >= 0.9) {
          goneUntil.set(on, time + 2.5);
          standTime.delete(on);
        }
      }
      if (on === CHECKPOINT + 1 && checkpointY === GROUND_Y) {
        checkpointY = level[on]!.y;
        caption.textContent = 'Контрольная точка.';
      }
      if (body.y > checkpointY + 60) respawn();

      const progress = 1 - (body.y - TOP_Y) / (GROUND_Y - TOP_Y);
      const next = Math.min(MELODY_LINES.length - 1, Math.floor(progress * MELODY_LINES.length));
      if (next > lineIndex) {
        lineIndex = next;
        caption.textContent = MELODY_LINES[next]!;
      }
      draw();
      if (on === level.length - 1) {
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
