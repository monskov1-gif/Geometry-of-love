// Shared building blocks for canvas episodes: a crisp low-resolution canvas,
// keyboard + touch controls, a frame loop and palette lookup. Each episode
// keeps its own rules; this file only removes boilerplate.
import { el } from '../ui/dom';

export type ControlName = 'left' | 'right' | 'jump' | 'down';

export interface ControlState {
  left: boolean;
  right: boolean;
  jump: boolean;
  down: boolean;
  /** Set on a jump key/button press; the episode clears it after reading. */
  jumpPressed: boolean;
}

const KEYS: Record<string, ControlName> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'down',
  KeyS: 'down',
};

const LABELS: Record<ControlName, [string, string]> = {
  left: ['◀', 'Влево'],
  right: ['▶', 'Вправо'],
  jump: ['▲', 'Прыжок'],
  down: ['▼', 'Пригнуться'],
};

/** Keyboard listeners plus on-screen hold buttons for the given controls only. */
export function createControls(enabled: ControlName[]): { state: ControlState; bar: HTMLElement; dispose: () => void } {
  const state: ControlState = { left: false, right: false, jump: false, down: false, jumpPressed: false };
  const set = (name: ControlName, down: boolean) => {
    if (!enabled.includes(name)) return;
    if (name === 'jump' && down && !state.jump) state.jumpPressed = true;
    state[name] = down;
  };
  const onKey = (e: KeyboardEvent) => {
    const name = KEYS[e.code];
    if (!name || !enabled.includes(name)) return;
    e.preventDefault();
    if (e.type === 'keydown' && e.repeat) return;
    set(name, e.type === 'keydown');
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  const buttons = enabled.map((name) =>
    el(
      'button',
      {
        class: 'btn episode-button',
        type: 'button',
        'aria-label': LABELS[name][1],
        dataset: { control: name },
        onpointerdown: (e: PointerEvent) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          set(name, true);
        },
        onpointerup: () => set(name, false),
        onpointercancel: () => set(name, false),
      },
      LABELS[name][0],
    ),
  );
  return {
    state,
    bar: el('div', { class: 'episode-controls' }, ...buttons),
    dispose: () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    },
  };
}

export function pixelCanvas(width: number, height: number, label: string) {
  const canvas = el('canvas', { class: 'pixel-canvas', width, height, 'aria-label': label });
  // Fit both width and height without ever changing the aspect ratio.
  canvas.style.aspectRatio = `${width} / ${height}`;
  canvas.style.width = `min(100%, calc(var(--episode-max-h) * ${(width / height).toFixed(4)}))`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** requestAnimationFrame loop with clamped dt (seconds). `tick` returns false to stop. */
export function startLoop(tick: (dt: number) => boolean): () => void {
  let frame = 0;
  let last = 0;
  let running = true;
  const loop = (t: number) => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (!tick(dt)) return;
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => {
    running = false;
    cancelAnimationFrame(frame);
  };
}

/** Reads design tokens so canvas art follows styles/tokens.css. */
export function palette(root: HTMLElement): (token: string, fallback: string) => string {
  const css = getComputedStyle(root);
  return (token, fallback) => css.getPropertyValue(token).trim() || fallback;
}

/** Plain-box stand-in for a character without sprite art. */
export function drawPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, ink: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.strokeStyle = ink;
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w - 1, h - 1);
  ctx.setLineDash([]);
}
