// Mini-game No. 3 «Предел измерения» (chapter 11): platformer with a puzzle.
// Measure the chasm, choose a firm anchor point and set the Ruler's length
// to make a temporary bridge, then walk across. A wrong anchor or length
// collapses the bridge and sends Dameo back to the start of the section.
// Look: the chasm by the old archives — candy cliffs with sprinkle strata, the
// archive shelves behind, the Sandbox's toys across, a void falling away into
// code. Dameo, the Ruler and the Calculator are the real pixel sprites; the
// stretched Ruler is drawn as a wooden ruler plank with her face (the sprite
// itself is never stretched). The rule works in world units; the canvas draws
// them at SCALE so the 32×80 sprites keep their own pixels.
import { el } from '../ui/dom';
import { rng } from '../world/kit/location-kit';
import { CANDY, css, LOUD, PASTEL, RAINBOW } from '../world/candy/palette';
import { fillTest, inCircle, inHeart, inStar, pixelText } from '../world/candy/shapes';
import { rainbowArc, stickers, strip, type Ctx } from './backdrops';
import { createControls, pixelCanvas, startLoop } from './kit';
import { drawActor, walkPhase } from './sprite-draw';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export const UNIT = 10; // px per ruler division
export const RULER_MAX = 10; // divisions the Ruler can stretch
const LEFT_EDGE = 100;
const RIGHT_EDGE = 180;
const W = 240;
const H = 120;
const GROUND = 90;
const SCALE = 2;

export interface Anchor {
  id: 'A' | 'B' | 'C';
  x: number;
  firm: boolean;
  note: string;
}

export const ANCHORS: Anchor[] = [
  { id: 'A', x: LEFT_EDGE, firm: false, note: 'край, в трещинах' },
  { id: 'B', x: LEFT_EDGE - UNIT, firm: true, note: 'твёрдо, 1 деление от края' },
  { id: 'C', x: LEFT_EDGE - 3 * UNIT, firm: true, note: 'твёрдо, 3 деления от края' },
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

const CW = W * SCALE;
const CH = H * SCALE;
const G = GROUND * SCALE;
const L = LEFT_EDGE * SCALE;
const R = RIGHT_EDGE * SCALE;

/** The still part of the picture: sky, archive shelves, cliffs, the void. */
function paintScene(ctx: Ctx): void {
  const r = rng(1111);
  // sky: candy gradient getting darker towards the void
  for (let y = 0; y < CH; y++) {
    const k = y / CH;
    ctx.fillStyle = `rgb(${Math.round(255 - k * 120)},${Math.round(200 - k * 120)},${Math.round(246 - k * 60)})`;
    ctx.fillRect(0, y, CW, 1);
  }
  rainbowArc(ctx, 330, 150, 90, 5);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 3 ? '#fff9fd' : css(LOUD[i % LOUD.length]!);
    ctx.fillRect(Math.floor(r() * CW), Math.floor(r() * 110), 1, 1);
  }
  for (let i = 0; i < 4; i++) fillTest(ctx, 30 + i * 120 + r() * 30, 40 + r() * 30, 30, 14, '#fff9fd', inCircle);
  // the old archive on the left: shelves of binders, faded
  for (let s = 0; s < 3; s++) {
    const x0 = 4 + s * 62;
    ctx.fillStyle = css(PASTEL[(s + 3) % PASTEL.length]!);
    ctx.fillRect(x0, 60, 58, G - 60);
    for (let k = 0; k < 6; k++) {
      const y = 64 + k * 22;
      if (y > G - 20) break;
      let x = x0 + 3;
      while (x < x0 + 53) {
        const w = 3 + Math.floor(r() * 4);
        ctx.fillStyle = css([...LOUD, ...PASTEL][Math.floor(r() * (LOUD.length + PASTEL.length))]!);
        ctx.fillRect(x, y + Math.floor(r() * 4), w, 17 - Math.floor(r() * 4));
        x += w + 1;
      }
      ctx.fillStyle = '#8a7a9a';
      ctx.fillRect(x0, y + 18, 58, 2);
    }
  }
  ctx.fillStyle = css(CANDY.plum);
  ctx.fillRect(66, 44, 60, 14);
  pixelText(ctx, 'АРХИВ', 96, 45, 11, css(CANDY.lemon), { align: 'center' });
  // the void in the chasm: darker bands, floating shapes, code at the bottom
  for (let y = G; y < CH; y++) {
    const k = (y - G) / (CH - G);
    ctx.fillStyle = `rgb(${Math.round(90 - k * 80)},${Math.round(61 - k * 55)},${Math.round(120 - k * 100)})`;
    ctx.fillRect(L, y, R - L, 1);
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = r() < 0.2 ? '#f04b67' : '#39ff88';
    ctx.fillRect(L + Math.floor(r() * (R - L)), G + 20 + Math.floor(r() * (CH - G - 20)), 1, 2 + Math.floor(r() * 3));
  }
  // cliffs: sprinkle-sand strata, grass top, flowers
  for (const [x0, x1] of [
    [0, L],
    [R, CW],
  ] as const) {
    for (let y = G; y < CH; y++) {
      ctx.fillStyle = css(RAINBOW[Math.floor((y - G) / 8) % RAINBOW.length]!);
      ctx.fillRect(x0, y, x1 - x0, 1);
      ctx.fillStyle = 'rgba(255,249,253,0.35)';
      if ((y - G) % 8 === 0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
    for (let i = 0; i < (x1 - x0) / 3; i++) {
      ctx.fillStyle = r() < 0.5 ? '#fff9fd' : css(LOUD[i % LOUD.length]!);
      ctx.fillRect(x0 + Math.floor(r() * (x1 - x0)), G + 6 + Math.floor(r() * (CH - G - 6)), 2, 1);
    }
    ctx.fillStyle = '#7ee05a';
    ctx.fillRect(x0, G, x1 - x0, 5);
    ctx.fillStyle = '#3fbf5a';
    for (let x = x0; x < x1; x += 3) ctx.fillRect(x, G - 2 + ((x >> 1) % 2), 1, 3);
  }
  // cracks at the near edge (anchor A is not firm)
  ctx.fillStyle = '#30243b';
  for (let k = 0; k < 14; k++) ctx.fillRect(L - 8 + (k % 3) * 2 - (k > 7 ? 4 : 0), G + 4 + k * 3, 2, 3);
  // far side: Sandbox toys left behind
  for (let i = 0; i < 4; i++) {
    const x = R + 16 + i * 22;
    const s = 12 + (i % 2) * 6;
    ctx.fillStyle = css(LOUD[(i * 4) % LOUD.length]!);
    ctx.fillRect(x, G - s, s, s);
    ctx.fillStyle = '#fff9fd';
    ctx.fillRect(x + 2, G - s + 2, s - 4, 1);
    pixelText(ctx, 'АБВГ'[i]!, x + s / 2, G - s + 2, s - 4, '#fff9fd', { align: 'center' });
  }
  fillTest(ctx, R + 30, G - 52, 14, 13, css(CANDY.pink), inHeart);
  fillTest(ctx, R + 70, G - 60, 16, 16, css(CANDY.sunshine), inStar());
  stickers(ctx, r, 6, 62, 180, G - 72, 16, [6, 10]);
}

/** Anchor posts A, B, C on the near cliff: green = firm, red = cracked. */
function paintAnchors(ctx: Ctx): void {
  for (const a of ANCHORS) {
    const ax = a.x * SCALE;
    ctx.fillStyle = a.firm ? '#3fbf5a' : '#d94c62';
    ctx.fillRect(ax - 4, G - 5, 8, 5);
    ctx.fillStyle = '#fff9fd';
    ctx.fillRect(ax - 3, G - 4, 6, 1);
    ctx.fillStyle = '#30243b';
    ctx.fillRect(ax, G - 16, 1, 11);
    pixelText(ctx, a.id, ax + 3, G - 22, 10, a.firm ? '#1f6a3a' : '#a82a40');
  }
}

/** The measuring scale along the top: a tick per division, numbers every 2 (gameplay). */
function paintScale(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(255,249,253,0.85)';
  ctx.fillRect(0, 6, CW, 34);
  for (let u = 0; u <= W / UNIT; u++) {
    const x = u * UNIT * SCALE;
    ctx.fillStyle = '#30243b';
    ctx.fillRect(x, 8, 1, u % 2 === 0 ? 12 : 6);
    if (u % 2 === 0) pixelText(ctx, String(u), x + 2, 22, 11, '#30243b');
  }
  ctx.fillStyle = css(CANDY.pink);
  ctx.fillRect(L, 38, R - L, 2);
}

/** The Ruler stretched into a bridge: a wooden ruler with ticks and her little face at the anchor end. */
function drawBridge(ctx: Ctx, from: number, to: number, y: number, tilt: number): void {
  const x0 = Math.round(from * SCALE);
  const len = Math.round((to - from) * SCALE);
  ctx.save();
  ctx.translate(x0, Math.round(y));
  ctx.rotate(tilt);
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(0, -1, len, 9);
  ctx.fillStyle = '#e8b860';
  ctx.fillRect(0, 0, len, 7);
  ctx.fillStyle = '#f8d890';
  ctx.fillRect(0, 0, len, 1);
  ctx.fillStyle = '#30243b';
  for (let x = 0; x <= len; x += UNIT * SCALE) ctx.fillRect(x, 0, 1, 4);
  for (let x = UNIT; x < len; x += UNIT * SCALE) ctx.fillRect(x, 0, 1, 2);
  // her face, tired but holding
  ctx.fillRect(6, 3, 1, 1);
  ctx.fillRect(10, 3, 1, 1);
  ctx.fillRect(7, 5, 3, 1);
  ctx.restore();
}

export const rulerBridge: EpisodeDefinition = {
  id: 'ruler-bridge',
  kind: 'minigame',
  title: 'Предел измерения',
  instructions: `Определите ширину пропасти по делениям сверху, выберите надёжную точку опоры и задайте длину Линейки (не больше ${RULER_MAX} делений). Затем перейдите по мосту: ← → или A / D. Ошибка вернёт к началу участка.`,
  create({ root, reduceMotion }) {
    const { canvas, ctx } = pixelCanvas(CW, CH, 'Пропасть у архивов');
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
    // `.bridge-panel { display: flex }` beats the [hidden] attribute, so hide it inline as well
    const showPanel = (on: boolean) => {
      panel.hidden = !on;
      panel.style.display = on ? '' : 'none';
    };
    showPanel(false);
    const scene = strip(CW, CH, (g) => {
      paintScene(g);
      paintAnchors(g);
    });
    const scale = strip(CW, 44, paintScale);

    let x = 20;
    let walked = 0;
    let dir: -1 | 1 = 1;
    let moving = false;
    let time = 0;
    let calcX = 4;
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
        showPanel(false);
        caption.textContent = 'Линейка: «Иди. Я держу — недолго».';
      } else {
        falling = 1.2;
        fallMessage = FAIL_TEXT[result];
        caption.textContent = fallMessage;
        showPanel(false);
      }
    });

    const draw = (fall: number) => {
      ctx.drawImage(scene, 0, 0);
      ctx.drawImage(scale, 0, 0);
      const breath = (Math.floor(time / 0.7) % 2) as 0 | 1;
      if (bridge) drawBridge(ctx, bridge.from, bridge.to, G - 4 + fall * 2, falling > 0 ? (1.2 - falling) * 0.9 : 0);
      // the Ruler stands by the edge until she stretches into the bridge
      else drawActor(ctx, 'ruler', (LEFT_EDGE - 42) * SCALE, G + 1, { dir: 0, walk: -1, emotion: 'neutral', breath });
      drawActor(ctx, 'calculator', calcX * SCALE, G + 1, { dir: moving ? dir : 1, walk: moving ? walkPhase(walked, 7) : -1, emotion: falling > 0 ? 'scared' : 'neutral', breath });
      drawActor(ctx, 'dameo', x * SCALE, G + 2 + fall * 2, { dir: moving || falling > 0 ? dir : 1, walk: falling > 0 ? 1 : moving ? walkPhase(walked, 6) : -1, emotion: falling > 0 ? 'scared' : 'tired', breath });
      // a few hearts drifting over the void
      if (!reduceMotion)
        for (let i = 0; i < 4; i++) fillTest(ctx, L + 20 + i * 36, G + 40 + Math.round(Math.sin(time + i) * 6), 8, 7, css(LOUD[(i * 3) % LOUD.length]!), inHeart);
    };

    const tick = (dt: number) => {
      time += dt;
      if (falling > 0) {
        falling -= dt;
        // he slips off the edge into the chasm, not through the ground
        x += (LEFT_EDGE + 14 - x) * Math.min(1, dt * 8);
        draw(Math.max(0, 1.2 - falling - 0.15) * 70);
        if (falling <= 0) {
          x = 20;
          calcX = 4;
          bridge = null;
          caption.textContent = `${fallMessage} Назад к началу участка.`;
        }
        return true;
      }
      const d = (controls.state.right ? 1 : 0) - (controls.state.left ? 1 : 0);
      if (d) dir = d > 0 ? 1 : -1;
      const limit = bridge && !falling ? W - 8 : LEFT_EDGE - 4;
      const before = x;
      x = Math.max(6, Math.min(limit, x + d * 90 * dt));
      moving = x !== before;
      walked += Math.abs(x - before);
      // the Calculator keeps a few steps behind
      const target = Math.max(4, x - 22);
      calcX += Math.sign(target - calcX) * Math.min(Math.abs(target - calcX), 80 * dt);
      if (!bridge && x >= LEFT_EDGE - 30 && panel.hidden) {
        showPanel(true);
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
