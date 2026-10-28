// Mini-game No. 5 «Погоня» (chapters 14–15). Dameo runs forward on his own;
// the player jumps over blocks, crouches under flying lines of code and
// dodges formulas. Every hit lets Melody close in; if she catches up the run
// restarts (failure → retry). `mode: 'car'` is the final ride on the
// Calculator car with its rainbow trail (chapter 15): faster, jump only.
import { el } from '../ui/dom';
import { createControls, drawPlaceholder, palette, pixelCanvas, startLoop } from './kit';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export type ObstacleKind = 'block' | 'code' | 'formula';

export interface Obstacle {
  x: number;
  kind: ObstacleKind;
}

export interface ChaseConfig {
  mode: 'run' | 'car';
  speed: number;
  length: number;
}

export const CONFIGS: Record<ChaseConfig['mode'], ChaseConfig> = {
  run: { mode: 'run', speed: 150, length: 3600 },
  car: { mode: 'car', speed: 230, length: 3400 },
};

const GROUND = 100;
const PLAYER_X = 70;
const JUMP_SPEED = 300;
const GRAVITY = 1000;
/** Seconds in the air for one jump. */
export const AIR_TIME = (2 * JUMP_SPEED) / GRAVITY;

/** Height bands an obstacle occupies (y from the top, canvas coordinates). */
export function obstacleBox(kind: ObstacleKind): { y: number; h: number; w: number } {
  if (kind === 'block') return { y: GROUND - 14, h: 14, w: 12 }; // jump over it
  if (kind === 'code') return { y: GROUND - 20, h: 8, w: 40 }; // crouch under it (or jump)
  return { y: GROUND - 18, h: 18, w: 16 }; // formula: tall, only a jump clears it
}

/** Deterministic course: obstacles spaced so each one leaves time to react and land. */
export function buildCourse(config: ChaseConfig): Obstacle[] {
  const kinds: ObstacleKind[] = config.mode === 'car' ? ['block', 'formula'] : ['block', 'code', 'formula', 'block', 'code'];
  const minGap = config.speed * (AIR_TIME + 0.45);
  const list: Obstacle[] = [];
  let x = 420;
  let i = 0;
  while (x < config.length - 200) {
    list.push({ x, kind: kinds[i % kinds.length]! });
    x += minGap + ((i * 37) % 90);
    i++;
  }
  return list;
}

export interface Runner {
  y: number; // feet height above ground (0 = on ground)
  vy: number;
  crouching: boolean;
}

export function stepRunner(r: Runner, jump: boolean, crouch: boolean, dt: number): Runner {
  let { y, vy } = r;
  if (jump && y === 0) vy = JUMP_SPEED;
  vy -= GRAVITY * dt;
  y = Math.max(0, y + vy * dt);
  if (y === 0) vy = 0;
  return { y, vy, crouching: crouch && y === 0 };
}

/** Player box in canvas coordinates. */
export function playerBox(r: Runner): { x: number; y: number; w: number; h: number } {
  const h = r.crouching ? 10 : 22;
  return { x: PLAYER_X, y: GROUND - r.y - h, w: 10, h };
}

export function hits(r: Runner, o: Obstacle, distance: number): boolean {
  const p = playerBox(r);
  const b = obstacleBox(o.kind);
  const ox = o.x - distance + PLAYER_X;
  return p.x < ox + b.w && p.x + p.w > ox && p.y < b.y + b.h && p.y + p.h > b.y;
}

const MAX_GAP = 100;
const HIT_PENALTY = 36;

const TAUNTS_RUN = [
  'Мелоди: Помнишь, как ты впервые решил задачу без ошибок? Я так тобой гордилась.',
  'Мелоди: Я могу сделать мир, где Сацуки ответит тебе взаимностью. Останься.',
  'Мелоди: Неблагодарный! Там ты снова будешь один.',
  'Мелоди: Сацуки никогда бы тебя не выбрала. Никакая геометрия не помогла бы.',
  'Мелоди: Ты не имеешь права бросить единственную, кто тебя замечал!',
];
const TAUNTS_CAR = ['Калькулятор: Держись крепче! Я всё рассчитал!', 'Мелоди пытается перекрыть дорогу…', 'Калькулятор: Почти выход!'];

export const chase: EpisodeDefinition = {
  id: 'chase',
  kind: 'minigame',
  title: 'Погоня',
  instructions:
    'Дамео бежит сам. ↑ / W / Пробел — прыжок через блоки и формулы, ↓ / S — пригнуться под строками кода. Каждое столкновение приближает Мелоди. Если она догонит, погоня начнётся сначала.',
  create({ root, params }) {
    const mode = params.mode === 'car' ? 'car' : 'run';
    const config = CONFIGS[mode];
    const { canvas, ctx } = pixelCanvas(240, 120, 'Погоня');
    const caption = el('p', { class: 'episode-caption', 'aria-live': 'polite' });
    const meter = el('div', { class: 'chase-meter', role: 'meter', 'aria-label': 'Расстояние до Мелоди' });
    const controls = createControls(mode === 'car' ? ['jump'] : ['jump', 'down']);
    root.replaceChildren(el('div', { class: 'episode-canvas-wrap' }, caption, meter, canvas, controls.bar));
    const color = palette(root);
    const course = buildCourse(config);
    const taunts = mode === 'car' ? TAUNTS_CAR : TAUNTS_RUN;

    let distance = 0;
    let gap = MAX_GAP;
    let runner: Runner = { y: 0, vy: 0, crouching: false };
    let invulnerable = 0;
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    let stop = () => {};
    const hitSet = new Set<number>();

    const draw = () => {
      ctx.fillStyle = color('--terminal-black', '#15131b');
      ctx.fillRect(0, 0, 240, 120);
      ctx.strokeStyle = color('--code-grid', '#1b3928');
      for (let x = -(distance * 0.5) % 24; x < 240; x += 24) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, GROUND);
        ctx.stroke();
      }
      ctx.fillStyle = color('--system-gray', '#c9c9d2');
      ctx.fillRect(0, GROUND, 240, 2);
      if (mode === 'car') {
        const trail = ['--pink', '--lemon', '--mint', '--rainbow-blue', '--lavender'];
        trail.forEach((t, i) => {
          ctx.fillStyle = color(t, '#fff');
          ctx.fillRect(0, GROUND - runner.y - 8 + i * 2, PLAYER_X, 2);
        });
      }
      for (const o of course) {
        const ox = o.x - distance + PLAYER_X;
        if (ox < -50 || ox > 260) continue;
        const b = obstacleBox(o.kind);
        ctx.fillStyle = o.kind === 'code' ? color('--code-green', '#39ff88') : o.kind === 'formula' ? color('--code-warning', '#d7f36a') : color('--lavender', '#deccff');
        ctx.fillRect(Math.round(ox), b.y, b.w, b.h);
        if (o.kind !== 'block') {
          ctx.fillStyle = color('--code-black', '#080d0a');
          ctx.font = '6px monospace';
          ctx.fillText(o.kind === 'code' ? 'return you;' : 'Σ∠>180', Math.round(ox) + 1, b.y + b.h - 2);
        }
      }
      // Melody behind Dameo; the smaller the gap, the closer she is.
      const mx = PLAYER_X - 12 - gap * 0.55;
      ctx.fillStyle = color('--pink', '#ff6cc5');
      ctx.fillRect(Math.round(mx), GROUND - 30, 12, 30);
      const p = playerBox(runner);
      if (Math.floor(invulnerable * 10) % 2 === 0) {
        drawPlaceholder(ctx, p.x, p.y, p.w, p.h, mode === 'car' ? color('--mint', '#b2f5e4') : color('--paper', '#fff9fd'), color('--ink', '#30243b'));
      }
      meter.style.setProperty('--gap', String(gap / MAX_GAP));
      meter.setAttribute('aria-valuenow', String(Math.round(gap)));
    };

    const tick = (dt: number) => {
      distance += config.speed * dt;
      const jump = controls.state.jumpPressed;
      controls.state.jumpPressed = false;
      runner = stepRunner(runner, jump, controls.state.down, dt);
      invulnerable = Math.max(0, invulnerable - dt);
      gap = Math.min(MAX_GAP, gap + 5 * dt);
      course.forEach((o, i) => {
        if (invulnerable > 0 || hitSet.has(i) || !hits(runner, o, distance)) return;
        hitSet.add(i);
        gap -= HIT_PENALTY;
        invulnerable = 0.8;
      });
      caption.textContent = taunts[Math.min(taunts.length - 1, Math.floor((distance / config.length) * taunts.length))]!;
      draw();
      if (gap <= 0) {
        finish?.({ outcome: 'failure', reason: 'Мелоди догнала Дамео.' });
        return false;
      }
      if (distance >= config.length) {
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
