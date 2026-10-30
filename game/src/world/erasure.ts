// Глава 9: «Сначала исчезают мелкие детали тела, затем черты лица и
// конечности» (синопсис); in the chapter text: «уголок, шов на боку, надпись
// производителя», then «Глаза становятся пятнами. Рот — бледной полосой, которая
// ещё пытается двигаться», then the limbs. This draws those three stages onto
// an actor's sprite frame (Actor.redraw), so the figure in the 3D corridor
// loses exactly what the text says, in that order. The last stage — nothing
// left at all — is the actor's `erase` cut. No crumbs: «не остаётся крошек».
import type { Frame } from '../render/sprites';

/** How far each stage has gone, 0…1. */
export interface Erasure {
  details: number;
  face: number;
  limbs: number;
}

export const noErasure = (): Erasure => ({ details: 0, face: 0, limbs: 0 });

export const erasureKey = (e: Erasure) => `${Math.round(e.details * 12)}.${Math.round(e.face * 12)}.${Math.round(e.limbs * 12)}`;

type Rect = [number, number, number, number];

/** Where things are on a sprite (base 24×48 units), measured from the drawing code. */
interface Layout {
  details: Rect[];
  face: { area: Rect; eyes: [number, number][]; mouth: Rect; skin: [number, number] };
  limbs: Rect;
}

/** The eraser twins (render/sprites/tools.ts drawEraser): body from y = top, face at top+3, legs below top+13. */
function eraserLayout(f: Frame): Layout {
  const hop = f.walk < 0 ? f.breath : ([0, 2, 0, 1][f.walk] ?? 0);
  const top = 30 - hop;
  return {
    // a corner, the side seam, the maker's print (the white marks on the sleeve)
    details: [
      [5, top, 2, 1],
      [5, top + 1, 1, 1],
      [18, top, 1, 2],
      [18, top + 2, 1, 4],
      [7, top + 8, 1, 2],
      [9, top + 8, 1, 2],
      [11, top + 8, 1, 2],
      [17, top + 11, 2, 2],
      [5, top + 10, 1, 3],
    ],
    face: { area: [7, top + 1, 10, 5], eyes: [[10, top + 3], [14, top + 3]], mouth: [10, top + 5, 5, 1], skin: [16, top + 2] },
    limbs: [6, top + 13, 12, 48 - (top + 13)],
  };
}

/** Anyone else: the same three stages placed by the proportions of a standing figure. */
function personLayout(): Layout {
  return {
    details: [
      [8, 18, 1, 2],
      [15, 20, 1, 3],
      [10, 24, 2, 1],
      [13, 27, 1, 2],
      [9, 30, 1, 1],
    ],
    face: { area: [8, 5, 8, 8], eyes: [[10, 9], [14, 9]], mouth: [10, 12, 4, 1], skin: [12, 7] },
    limbs: [3, 32, 18, 16],
  };
}

const layoutOf = (id: string, f: Frame): Layout => (id.startsWith('eraser') ? eraserLayout(f) : personLayout());

/**
 * Applies the erasure to a frame already drawn on `ctx` (sprite scaled by `s`
 * from its 24×48 base). `talking` keeps the pale mouth strip twitching.
 */
export function drawErasure(ctx: CanvasRenderingContext2D, s: number, id: string, f: Frame, e: Erasure, talking: boolean): void {
  if (!e.details && !e.face && !e.limbs) return;
  const L = layoutOf(id, f);
  const clear = ([x, y, w, h]: Rect) => ctx.clearRect(x * s, y * s, w * s, h * s);
  // 1. small details, one after another
  const n = Math.round(e.details * L.details.length);
  for (let i = 0; i < n; i++) clear(L.details[i]!);
  // 2. the face: features rubbed into the body colour, eyes left as blots, the mouth a pale strip
  if (e.face > 0) {
    const [sx, sy] = L.face.skin;
    const px = ctx.getImageData(Math.floor((sx + 0.5) * s), Math.floor((sy + 0.5) * s), 1, 1).data;
    const skin = `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
    const [ax, ay, aw, ah] = L.face.area;
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.face * 1.4);
    ctx.fillStyle = skin;
    ctx.fillRect(ax * s, ay * s, aw * s, ah * s);
    // blots where the eyes were: soft, wider than the eyes, fading out as the stroke finishes
    ctx.globalAlpha = 0.45 * Math.min(1, e.face * 2) * (1 - Math.max(0, e.face - 0.7));
    ctx.fillStyle = 'rgb(120, 70, 96)';
    for (const [ex, ey] of L.face.eyes) {
      ctx.fillRect((ex - 1) * s, (ey - 0.5) * s, 2 * s, 2 * s);
      ctx.fillRect((ex - 0.5) * s, (ey - 1) * s, 1.5 * s, 3 * s);
    }
    // the pale strip of a mouth that still tries to move
    const [mx, my, mw, mh] = L.face.mouth;
    ctx.globalAlpha = Math.min(1, e.face * 1.6);
    ctx.fillStyle = 'rgb(253, 232, 240)';
    const twitch = talking ? 1 : 0;
    ctx.fillRect((mx + twitch * 0.5) * s, my * s, (mw - twitch) * s, (mh + twitch * 0.5) * s);
    ctx.restore();
  }
  // 3. the limbs, from the feet up
  if (e.limbs > 0) {
    const [x, y, w, h] = L.limbs;
    const gone = h * Math.min(1, e.limbs);
    ctx.clearRect(x * s, (y + h - gone) * s, w * s, gone * s);
  }
}
