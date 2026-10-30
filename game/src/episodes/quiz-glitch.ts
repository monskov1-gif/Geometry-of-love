// The impossible task (гл. 5): the given numbers inside the condition and on its
// figure never hold still. They jump between huge garbled values, stretch, skew
// and change colour, so the condition itself cannot be read (Baldi-style); now
// and then the real value flashes through. Layout stays put: every number sits
// in a fixed slot and only its transform changes, so the answer field and the
// buttons never move. Screen readers get the real condition once.
import { el } from '../ui/dom';

const NUMBER = /\d+/g;
const JUNK = '∞−.';
const TONES = ['red', 'ink', 'blue', 'pink'] as const;

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;

/** A huge garbled number; about one time in five the real one shows through. */
export function garble(real: string): string {
  if (Math.random() < 0.2) return real;
  const length = 1 + Math.floor(Math.random() * 7);
  let s = '';
  for (let i = 0; i < length; i++) s += Math.random() < 0.08 ? pick([...JUNK]) : String(Math.floor(Math.random() * 10));
  return s;
}

/** A new size and shape: sometimes enormous, sometimes squashed, always skewed. */
function warp(): string {
  const big = Math.random() < 0.5;
  const sx = big ? 1.4 + Math.random() * 2.6 : 0.4 + Math.random() * 1.1;
  const sy = big ? 1.6 + Math.random() * 3.4 : 0.3 + Math.random() * 1.4;
  const rot = (Math.random() - 0.5) * 50;
  const skew = (Math.random() - 0.5) * 60;
  return `rotate(${rot.toFixed(1)}deg) skewX(${skew.toFixed(1)}deg) scale(${sx.toFixed(2)}, ${sy.toFixed(2)})`;
}

interface Slot {
  node: HTMLElement | SVGTextElement;
  /** Original text; its digit groups are garbled on every tick. */
  text: string;
}

/**
 * Turns the numbers of `prompt` (and the labels of `figure`) into flickering slots.
 * Returns `tick`, which reshuffles them; the caller runs it on a timer.
 */
export function glitchNumbers(prompt: HTMLElement, figure: SVGSVGElement | null): () => void {
  const text = prompt.textContent ?? '';
  const slots: Slot[] = [];
  const parts: (string | HTMLElement)[] = [];
  let last = 0;
  for (const m of text.matchAll(NUMBER)) {
    parts.push(text.slice(last, m.index));
    const span = el('span', { class: 'quiz-glitch' }, m[0]);
    slots.push({ node: span, text: m[0] });
    parts.push(span);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  prompt.replaceChildren(el('span', { class: 'quiz-sr' }, text), el('span', { 'aria-hidden': 'true' }, ...parts));

  for (const label of figure?.querySelectorAll('text') ?? []) {
    const original = label.textContent ?? '';
    if (!/\d/.test(original)) continue;
    label.classList.add('quiz-glitch');
    slots.push({ node: label, text: original });
  }

  return () => {
    for (const slot of slots) {
      slot.node.textContent = slot.text.replace(NUMBER, garble);
      slot.node.style.transform = warp();
      slot.node.dataset.tone = pick(TONES);
    }
  };
}
