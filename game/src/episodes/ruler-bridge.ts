// Mini-game No. 3 «Предел измерения» (chapter 11): platformer with a puzzle.
// Measure the chasm, choose a firm anchor point and set the Ruler's length
// to make a temporary bridge, then walk across. A wrong anchor or length
// collapses the bridge and sends Dameo back to the start of the section.
import { el } from '../ui/dom';
import { createControls, drawPlaceholder, palette, pixelCanvas, startLoop } from './kit';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export const UNIT = 10; // px per ruler division
export const RULER_MAX = 10; // divisions the Ruler can stretch
const LEFT_EDGE = 100;
const RIGHT_EDGE = 180;
const W = 240;
const H = 120;
const GROUND = 90;

export interface Anchor {
  id: 'A' | 'B' | 'C';
  x: number;
  firm: boolean;
  note: string;
}

export const ANCHORS: Anchor[] = [
  { id: 'A', x: LEFT_EDGE, firm: false, note: 'самый край, камень в трещинах' },
  { id: 'B', x: LEFT_EDGE - UNIT, firm: true, note: 'твёрдый выступ в одном делении от края' },
  { id: 'C', x: LEFT_EDGE - 3 * UNIT, firm: true, note: 'твёрдый выступ в трёх делениях от края' },
];

export type BridgeResult = 'ok' | 'too-short' | 'too-long' | 'cracked' | 'beyond-limit';

/** The puzzle rule: the bridge must reach the far edge, from firm ground, within the Ruler's limit. */
export function tryBridge(anchorId: string, length: number): BridgeResult {
  const anchor = ANCHORS.find((a) => a.id === anchorId);
  if (!anchor || !Number.isFinite(length) || length <= 0) return 'too-short';
  if (length > RULER_MAX) return 'beyond-limit';
  const needed = (RIGHT_EDGE - anchor.x) / UNIT;
  if (length < needed) return 'too-short';
  if (length > needed + 1) return 'too-long';
  if (!anchor.firm) return 'cracked';
  return 'ok';
}

const FAIL_TEXT: Record<Exclude<BridgeResult, 'ok'>, string> = {
  'too-short': 'Линейка не достала до другого края. Дамео сорвался вниз.',
  'too-long': 'Слишком длинно: Линейку перекосило, и мост соскользнул.',
  cracked: 'Край раскрошился под Линейкой. Мост рухнул.',
  'beyond-limit': `Линейка: «Я не вытянусь больше чем на ${RULER_MAX} делений… структура уже повреждена».`,
};

export const rulerBridge: EpisodeDefinition = {
  id: 'ruler-bridge',
  kind: 'minigame',
  title: 'Предел измерения',
  instructions: `Определите ширину пропасти по делениям сверху, выберите надёжную точку опоры и задайте длину Линейки (не больше ${RULER_MAX} делений). Затем перейдите по мосту: ← → или A / D. Ошибка вернёт к началу участка.`,
  create({ root }) {
    const { canvas, ctx } = pixelCanvas(W, H, 'Пропасть у архивов');
    const caption = el('p', { class: 'episode-caption', 'aria-live': 'polite' }, 'Линейка: «Подойди к краю и измерь расстояние. Я помогу».');
    const controls = createControls(['left', 'right']);
    const anchorSelect = el(
      'select',
      { 'aria-label': 'Точка опоры' },
      ...ANCHORS.map((a) => el('option', { value: a.id }, `${a.id} — ${a.note}`)),
    );
    const lengthInput = el('input', { type: 'number', min: 1, max: 15, step: 1, value: '5', 'aria-label': 'Длина Линейки, делений', class: 'quiz-input' });
    const place = el('button', { class: 'btn btn-primary', type: 'button' }, 'Перекинуть Линейку');
    const panel = el(
      'div',
      { class: 'bridge-panel', hidden: true },
      el('label', {}, 'Точка опоры ', anchorSelect),
      el('label', {}, 'Длина, делений ', lengthInput),
      place,
    );
    root.replaceChildren(el('div', { class: 'episode-canvas-wrap' }, caption, canvas, panel, controls.bar));
    const color = palette(root);

    let x = 20;
    let bridge: { from: number; to: number } | null = null;
    let falling = 0; // seconds of fall animation left
    let fallMessage = '';
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    let stop = () => {};

    place.addEventListener('click', () => {
      const result = tryBridge(anchorSelect.value, Number(lengthInput.value));
      const anchor = ANCHORS.find((a) => a.id === anchorSelect.value)!;
      bridge = { from: anchor.x, to: anchor.x + Number(lengthInput.value) * UNIT };
      if (result === 'ok') {
        panel.hidden = true;
        caption.textContent = 'Линейка: «Иди. Я держу — недолго».';
      } else {
        falling = 1.2;
        fallMessage = FAIL_TEXT[result];
        caption.textContent = fallMessage;
        panel.hidden = true;
      }
    });

    const draw = (fallY: number) => {
      ctx.fillStyle = color('--baby-pink', '#ffc9f6');
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = color('--plum', '#5a3d78');
      ctx.fillRect(LEFT_EDGE, GROUND, RIGHT_EDGE - LEFT_EDGE, H - GROUND);
      ctx.fillStyle = color('--lavender', '#deccff');
      ctx.fillRect(0, GROUND, LEFT_EDGE, H - GROUND);
      ctx.fillRect(RIGHT_EDGE, GROUND, W - RIGHT_EDGE, H - GROUND);
      // Cracks on the edge (anchor A)
      ctx.fillStyle = color('--ink', '#30243b');
      ctx.fillRect(LEFT_EDGE - 4, GROUND + 2, 1, 6);
      ctx.fillRect(LEFT_EDGE - 2, GROUND + 4, 1, 8);
      // Measuring scale along the top: one tick per division, numbers every 2.
      ctx.fillStyle = color('--ink', '#30243b');
      ctx.font = '6px monospace';
      for (let u = 0; u <= W / UNIT; u++) {
        ctx.fillRect(u * UNIT, 8, 1, u % 2 === 0 ? 6 : 3);
        if (u % 2 === 0) ctx.fillText(String(u), u * UNIT + 1, 22);
      }
      for (const a of ANCHORS) {
        ctx.fillStyle = a.firm ? color('--mint', '#b2f5e4') : color('--correction-red', '#d94c62');
        ctx.fillRect(a.x - 2, GROUND - 3, 4, 3);
        ctx.fillStyle = color('--ink', '#30243b');
        ctx.fillText(a.id, a.x - 2, GROUND - 6);
      }
      if (bridge) {
        ctx.fillStyle = color('--lemon', '#f8feb4');
        ctx.fillRect(bridge.from, GROUND - 2 + fallY, bridge.to - bridge.from, 3);
      }
      drawPlaceholder(ctx, x - 5, GROUND - 16 + fallY, 10, 16, color('--paper', '#fff9fd'), color('--ink', '#30243b'));
    };

    const tick = (dt: number) => {
      if (falling > 0) {
        falling -= dt;
        draw((1.2 - falling) * 60);
        if (falling <= 0) {
          x = 20;
          bridge = null;
          caption.textContent = `${fallMessage} Назад к началу участка.`;
        }
        return true;
      }
      const dir = (controls.state.right ? 1 : 0) - (controls.state.left ? 1 : 0);
      const limit = bridge && !falling ? W - 8 : LEFT_EDGE - 4;
      x = Math.max(6, Math.min(limit, x + dir * 90 * dt));
      if (!bridge && x >= LEFT_EDGE - 30 && panel.hidden) {
        panel.hidden = false;
        caption.textContent = `Линейка: «Измерь пропасть по делениям наверху. Дальше ${RULER_MAX} делений я не вытянусь».`;
      }
      draw(0);
      if (bridge && x >= RIGHT_EDGE + 20) {
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
