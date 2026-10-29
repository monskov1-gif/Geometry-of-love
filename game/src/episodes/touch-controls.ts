// Touch controls for phones and tablets: a floating circular joystick on the
// left half (left/right; pushing up jumps, pulling down crouches where the
// episode allows it) and big action buttons on the right. Pointer capture keeps
// a drag alive outside the zone; releasing, cancelling, losing focus or turning
// the screen always resets the stick, so a character never keeps walking alone.
import { el } from '../ui/dom';
import type { ControlName, ControlState } from './kit';

const DEAD = 0.28; // fraction of the radius ignored around the centre
const VERTICAL = 0.62; // how far up/down counts as jump/crouch

export interface TouchControls {
  root: HTMLElement;
  dispose(): void;
}

export function touchControls(enabled: ControlName[], set: (name: ControlName, down: boolean) => void, state: ControlState): TouchControls {
  const horizontal = enabled.includes('left') || enabled.includes('right');
  const knob = el('div', { class: 'joy-knob' });
  const base = el('div', { class: 'joy-base', 'aria-hidden': 'true' }, knob);
  const zone = el('div', { class: 'joy-zone', 'data-testid': 'joystick', role: 'application', 'aria-label': 'Джойстик: влево и вправо' }, base);
  let pointer: number | null = null;
  let origin = { x: 0, y: 0 };
  let radius = 60;

  const reset = () => {
    pointer = null;
    for (const n of ['left', 'right', 'down'] as const) if (state[n]) set(n, false);
    if (state.jump) set('jump', false);
    base.classList.remove('is-active');
    base.style.removeProperty('left');
    base.style.removeProperty('top');
    knob.style.transform = '';
  };

  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const len = Math.hypot(dx, dy);
    const k = len > radius ? radius / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const nx = dx / radius;
    const ny = dy / radius;
    set('left', nx < -DEAD);
    set('right', nx > DEAD);
    if (enabled.includes('jump')) set('jump', ny < -VERTICAL);
    if (enabled.includes('down')) set('down', ny > VERTICAL);
  };

  zone.addEventListener('pointerdown', (e) => {
    if (pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    const r = zone.getBoundingClientRect();
    radius = Math.max(40, Math.min(70, r.width * 0.22));
    // The stick appears under the thumb (floating joystick), inside the zone.
    origin = { x: Math.max(r.left + radius, Math.min(r.right - radius, e.clientX)), y: Math.max(r.top + radius, Math.min(r.bottom - radius, e.clientY)) };
    base.style.left = `${origin.x - r.left}px`;
    base.style.top = `${origin.y - r.top}px`;
    base.classList.add('is-active');
    move(e);
  });
  zone.addEventListener('pointermove', move);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) zone.addEventListener(ev, (e) => e.pointerId === pointer && reset());

  const action = (name: ControlName, label: string, aria: string) =>
    el(
      'button',
      {
        class: 'touch-action',
        type: 'button',
        'aria-label': aria,
        dataset: { control: name },
        onpointerdown: (e: PointerEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          set(name, true);
        },
        onpointerup: () => set(name, false),
        onpointercancel: () => set(name, false),
        onlostpointercapture: () => set(name, false),
        oncontextmenu: (e: Event) => e.preventDefault(),
      },
      label,
    );
  const actions = el(
    'div',
    { class: 'touch-actions' },
    ...(enabled.includes('down') ? [action('down', '▼', 'Пригнуться')] : []),
    ...(enabled.includes('jump') ? [action('jump', '▲', 'Прыжок')] : []),
  );
  const root = el('div', { class: 'touch-controls', dataset: { horizontal: String(horizontal) } }, horizontal ? zone : el('div'), actions);
  const onHide = () => reset();
  window.addEventListener('blur', onHide);
  window.addEventListener('orientationchange', onHide);
  document.addEventListener('visibilitychange', onHide);
  return {
    root,
    dispose: () => {
      reset();
      window.removeEventListener('blur', onHide);
      window.removeEventListener('orientationchange', onHide);
      document.removeEventListener('visibilitychange', onHide);
    },
  };
}
