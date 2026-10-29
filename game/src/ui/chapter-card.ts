// Full-screen chapter / volume card between story blocks: the chapter number in
// the pixel title face, its name typed out, a line under it, the 3D place of
// the chapter drifting behind a tinted veil. Each style has its own colours and
// entrance (app: pastel stickers; reality: plain; game: lavender; code: a
// terminal; volume/end: black with the title alone).
import type { ChapterCard } from '../core/types';
import { el } from './dom';

export function chapterCardView(card: ChapterCard): HTMLElement {
  const letters = [...card.title].map((ch, i) => el('span', { class: 'cc-letter', style: `--i:${i}` }, ch === ' ' ? ' ' : ch));
  return el(
    'div',
    { class: 'chapter-card', 'data-style': card.style, 'data-testid': 'chapter-card' },
    el('div', { class: 'cc-veil', 'aria-hidden': 'true' }),
    el(
      'div',
      { class: 'cc-body' },
      el('p', { class: 'cc-label' }, card.label),
      el('h2', { class: 'cc-title', 'aria-label': card.title }, ...letters),
      el('div', { class: 'cc-rule', 'aria-hidden': 'true' }),
      card.subtitle ? el('p', { class: 'cc-subtitle' }, card.subtitle) : null,
      el('p', { class: 'cc-hint' }, 'нажмите, чтобы продолжить'),
    ),
  );
}
