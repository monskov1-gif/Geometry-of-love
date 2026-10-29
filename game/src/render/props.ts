// Reusable props for 2.5D scenes. Each prop takes world coordinates (u, d)
// and draws with perspective through Room; colours come from the caller so
// the same prop works in every palette.
import { mix, shade, type Painter, rng } from './painter';
import { box, tones, wallRect, type Room } from './space';

export type Lighting = 'day' | 'evening' | 'night';

export const SKY: Record<Lighting, string[]> = {
  day: ['#b9c6c9', '#d4dbd8', '#e3e5dd'],
  evening: ['#6e6f88', '#b98a7b', '#e3a77a'],
  night: ['#121720', '#1b2430', '#243040'],
};

/** Window on the back wall with frame, sky, bare branches and a sheer curtain. */
export function wallWindow(pt: Painter, room: Room, fx0: number, fy0: number, fx1: number, fy1: number, light: Lighting, frame: string, seed = 7): void {
  const r = wallRect(room, fx0, fy0, fx1, fy1);
  pt.vgrad(r.x, r.y, r.w, r.h, SKY[light]);
  // Distant buildings and bare tree branches (photo reference: winter window).
  const R = rng(seed);
  const far = light === 'night' ? '#0d1118' : light === 'evening' ? '#5a5160' : '#a3aaa8';
  for (let x = r.x; x < r.x + r.w; x += 6 + Math.floor(R() * 6)) {
    const bh = 6 + Math.floor(R() * r.h * 0.3);
    pt.rect(x, r.y + r.h - bh, 5 + Math.floor(R() * 5), bh, far);
    if (light === 'night' && R() > 0.5) pt.px(x + 2, r.y + r.h - bh + 3, '#e8c97a');
  }
  const branch = light === 'night' ? '#0a0d12' : mix(far, '#2b2a2a', 0.6);
  const branchesFrom = (x: number, y: number, len: number, ang: number, depth: number): void => {
    if (depth <= 0 || len < 2) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    pt.line(x, y, x2, y2, branch);
    branchesFrom(x2, y2, len * 0.7, ang - 0.5 + R() * 0.3, depth - 1);
    branchesFrom(x2, y2, len * 0.6, ang + 0.4 + R() * 0.3, depth - 1);
  };
  pt.ctx.save();
  pt.ctx.beginPath();
  pt.ctx.rect(r.x, r.y, r.w, r.h);
  pt.ctx.clip();
  branchesFrom(r.x + r.w * 0.75, r.y + r.h, r.h * 0.45, -1.75, 5);
  pt.ctx.restore();
  // Frame and cross bars.
  pt.rect(r.x - 2, r.y - 2, r.w + 4, 2, frame);
  pt.rect(r.x - 2, r.y + r.h, r.w + 4, 3, shade(frame, -0.15));
  pt.rect(r.x - 2, r.y, 2, r.h, frame);
  pt.rect(r.x + r.w, r.y, 2, r.h, frame);
  pt.rect(r.x + Math.floor(r.w / 2) - 1, r.y, 2, r.h, frame);
  pt.rect(r.x, r.y + Math.floor(r.h * 0.45), r.w, 1, frame);
  // Window sill.
  pt.rect(r.x - 4, r.y + r.h + 3, r.w + 8, 2, shade(frame, 0.1));
}

/** Sheer curtain hanging over part of a window. */
export function curtain(pt: Painter, room: Room, fx0: number, fy0: number, fx1: number, fy1: number, color: string, alpha = 0.65): void {
  const r = wallRect(room, fx0, fy0, fx1, fy1);
  const ctx = pt.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let x = 0; x < r.w; x++) {
    const fold = Math.sin(x * 0.9) * 0.5 + 0.5;
    const c = mix(shade(color, -0.12), shade(color, 0.08), fold);
    pt.rect(r.x + x, r.y, 1, r.h + Math.round(fold * 2), c);
  }
  ctx.restore();
  pt.rect(r.x - 3, r.y - 3, r.w + 6, 1, shade(color, -0.5));
}

/** Unmade bed: frame, mattress, rumpled blanket, pillows. Sits on the floor. */
export function bed(pt: Painter, room: Room, u: number, d: number, w: number, depth: number, c: { frame: string; sheet: string; blanket: string; pillow: string }): void {
  box(pt, room, u, d, w, depth, 7, tones(c.frame));
  box(pt, room, u + 0.01, d + 0.01, w - 0.02, depth - 0.02, 6, tones(c.sheet, false), 7);
  // Headboard against the back.
  box(pt, room, u, d + depth - 0.03, w, 0.03, 26, tones(c.frame));
  // Pillows.
  box(pt, room, u + 0.04, d + depth - 0.12, w * 0.35, 0.08, 5, tones(c.pillow, false), 13);
  box(pt, room, u + w * 0.5, d + depth - 0.11, w * 0.35, 0.07, 4, tones(shade(c.pillow, -0.05), false), 13);
  // Rumpled blanket: a lumpy polygon over the front half with fold lines.
  const R = rng(31);
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(room.p(u + (w * i) / 10, d + 0.02, 13 + R() * 6));
  for (let i = 10; i >= 0; i--) pts.push(room.p(u + (w * i) / 10, d + depth * 0.62, 14 + R() * 5));
  pt.poly(pts, c.blanket);
  const front = [room.p(u, d + 0.02, 13), room.p(u + w, d + 0.02, 13), room.p(u + w, d + 0.02, 2), room.p(u, d + 0.02, 2)];
  pt.poly(front, shade(c.blanket, -0.15));
  for (let i = 0; i < 6; i++) {
    const a = room.p(u + w * (0.1 + R() * 0.8), d + 0.05, 15);
    const b = room.p(u + w * (0.1 + R() * 0.8), d + depth * 0.55, 16);
    pt.line(a.x, a.y, b.x, b.y, shade(c.blanket, -0.22));
  }
}

/** Desk with legs; returns the screen y of the desk top at its front for placing items. */
export function desk(pt: Painter, room: Room, u: number, d: number, w: number, depth: number, h: number, color: string): void {
  const t = tones(color);
  const leg = shade(color, -0.3);
  for (const [lu, ld] of [
    [u + 0.005, d + 0.005],
    [u + w - 0.02, d + 0.005],
    [u + 0.005, d + depth - 0.02],
    [u + w - 0.02, d + depth - 0.02],
  ] as const)
    box(pt, room, lu, ld, 0.015, 0.015, h - 3, { top: leg, front: leg, side: shade(leg, -0.2) });
  box(pt, room, u, d, w, depth, 3, t, h - 3);
  // Drawer unit.
  box(pt, room, u + w * 0.68, d + 0.01, w * 0.3, depth - 0.03, h - 8, tones(shade(color, -0.06)), 2);
}

/** CRT-ish monitor on a desk; glow colour shows what is on screen. */
export function monitor(pt: Painter, room: Room, u: number, d: number, deskH: number, screen: string, body = '#2b2e33'): void {
  box(pt, room, u + 0.025, d + 0.02, 0.03, 0.03, 4, tones(body), deskH);
  box(pt, room, u, d, 0.08, 0.05, 22, tones(body), deskH + 4);
  const a = room.p(u + 0.008, d - 0.001, deskH + 7);
  const b = room.p(u + 0.072, d - 0.001, deskH + 23);
  pt.rect(a.x, b.y, b.x - a.x, a.y - b.y, screen);
  pt.rect(a.x, b.y, b.x - a.x, 1, shade(screen, 0.25));
}

/** Simple chair (seat + back). */
export function chair(pt: Painter, room: Room, u: number, d: number, color: string): void {
  const leg = shade(color, -0.35);
  box(pt, room, u + 0.03, d + 0.02, 0.012, 0.012, 14, { top: leg, front: leg, side: leg });
  box(pt, room, u + 0.075, d + 0.02, 0.012, 0.012, 14, { top: leg, front: leg, side: leg });
  box(pt, room, u, d, 0.09, 0.07, 3, tones(color), 14);
  // Back: two posts and a top rail, not a solid slab.
  box(pt, room, u, d + 0.06, 0.012, 0.012, 15, tones(shade(color, -0.05)), 17);
  box(pt, room, u + 0.078, d + 0.06, 0.012, 0.012, 15, tones(shade(color, -0.05)), 17);
  box(pt, room, u, d + 0.06, 0.09, 0.012, 6, tones(shade(color, -0.02)), 26);
}

/** Moving boxes, partly opened. */
export function cardboard(pt: Painter, room: Room, u: number, d: number, w: number, depth: number, h: number, lift = 0, open = false): void {
  const c = tones('#9b7a54');
  box(pt, room, u, d, w, depth, h, c, lift);
  const top = room.p(u + w / 2, d, h + lift);
  const bot = room.p(u + w / 2, d, lift);
  pt.line(top.x, top.y, bot.x, bot.y, '#c9b38a'); // tape
  if (open) {
    const a = room.p(u, d, h + lift);
    const b = room.p(u - 0.02, d - 0.03, h + lift + 7);
    pt.poly([a, b, room.p(u + w * 0.45, d - 0.03, h + lift + 7), room.p(u + w * 0.45, d, h + lift)], shade('#9b7a54', -0.1));
  }
}

/** Bookshelf against a wall, with deterministic book spines. */
export function bookshelf(pt: Painter, room: Room, u: number, d: number, w: number, h: number, wood: string, seed: number, colors: string[]): void {
  box(pt, room, u, d, w, 0.05, h, tones(wood));
  const R = rng(seed);
  const shelves = Math.max(2, Math.round(h / 18));
  for (let s = 0; s < shelves; s++) {
    const y0 = (h / shelves) * s + 3;
    const y1 = (h / shelves) * (s + 1) - 1;
    let x = u + 0.006;
    while (x < u + w - 0.012) {
      const bw = 0.006 + R() * 0.008;
      const bh = (y1 - y0) * (0.65 + R() * 0.33);
      const c = colors[Math.floor(R() * colors.length)]!;
      const a = room.p(x, d - 0.001, y0);
      const b = room.p(x + bw, d - 0.001, y0 + bh);
      pt.rect(a.x, b.y, Math.max(1, b.x - a.x), a.y - b.y, c);
      pt.px(a.x, b.y + 2, shade(c, 0.3));
      x += bw + 0.001;
    }
    const sa = room.p(u, d - 0.001, y0 - 2);
    const sb = room.p(u + w, d - 0.001, y0 - 2);
    pt.rect(sa.x, sa.y, sb.x - sa.x, 2, shade(wood, 0.1));
  }
}

/** Rug on the floor (flat quad). */
export function rug(pt: Painter, room: Room, u: number, d: number, w: number, depth: number, color: string, border: string): void {
  pt.poly([room.p(u, d), room.p(u + w, d), room.p(u + w, d + depth), room.p(u, d + depth)], border);
  pt.poly([room.p(u + 0.015, d + 0.02), room.p(u + w - 0.015, d + 0.02), room.p(u + w - 0.015, d + depth - 0.02), room.p(u + 0.015, d + depth - 0.02)], color);
}

/** Pile of clothes on the floor. */
export function clothes(pt: Painter, room: Room, u: number, d: number, colors: string[]): void {
  const R = rng(5);
  colors.forEach((c, i) => {
    const pts = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      pts.push(room.p(u + Math.cos(a) * 0.035 * (0.7 + R() * 0.5) + i * 0.012, d + Math.sin(a) * 0.03, 2 + i * 1.5 + R() * 2));
    }
    pt.poly(pts, c);
  });
}

/** Framed thing on the back wall (poster, calendar, notes). */
export function wallPoster(pt: Painter, room: Room, fx0: number, fy0: number, fx1: number, fy1: number, paper: string, ink: string, kind: 'calendar' | 'poster' | 'notes'): void {
  const r = wallRect(room, fx0, fy0, fx1, fy1);
  pt.rect(r.x + 1, r.y + 1, r.w, r.h, shade(paper, -0.5));
  pt.rect(r.x, r.y, r.w, r.h, paper);
  if (kind === 'calendar') {
    pt.rect(r.x, r.y, r.w, 3, ink);
    for (let yy = r.y + 5; yy < r.y + r.h - 1; yy += 3) for (let xx = r.x + 1; xx < r.x + r.w - 1; xx += 3) pt.px(xx, yy, shade(paper, -0.3));
  } else if (kind === 'notes') {
    for (let yy = r.y + 2; yy < r.y + r.h - 1; yy += 2) pt.line(r.x + 1, yy, r.x + r.w - 2 - ((yy * 7) % 4), yy, shade(ink, 0.3));
  } else {
    pt.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 7, ink);
    pt.rect(r.x + 2, r.y + r.h - 4, r.w - 4, 1, shade(ink, 0.2));
  }
}

/** Ceiling lamp hanging from the ceiling at (u, d). */
export function hangingLamp(pt: Painter, room: Room, u: number, d: number, on: boolean, shadeColor: string): void {
  const top = room.p(u, d, room.wallH);
  const bottom = room.p(u, d, room.wallH - 26);
  pt.line(top.x, top.y, bottom.x, bottom.y, '#1d1c1b');
  const s = room.k(d);
  const w = 7 * s;
  pt.poly(
    [
      { x: bottom.x - w * 0.4, y: bottom.y },
      { x: bottom.x + w * 0.4, y: bottom.y },
      { x: bottom.x + w, y: bottom.y + 6 * s },
      { x: bottom.x - w, y: bottom.y + 6 * s },
    ],
    shadeColor,
  );
  if (on) pt.rect(bottom.x - w * 0.5, bottom.y + 6 * s, w, 1, '#ffe6a8');
}

/** Small desk lamp. */
export function deskLamp(pt: Painter, room: Room, u: number, d: number, deskH: number, on: boolean): void {
  const base = room.p(u, d, deskH);
  const head = room.p(u + 0.02, d, deskH + 16);
  pt.rect(base.x - 3, base.y - 1, 7, 2, '#2c2a28');
  pt.line(base.x, base.y - 1, head.x - 2, head.y + 3, '#3a3734');
  pt.poly([{ x: head.x - 5, y: head.y }, { x: head.x + 3, y: head.y - 2 }, { x: head.x + 5, y: head.y + 4 }, { x: head.x - 3, y: head.y + 5 }], '#4b4a45');
  if (on) pt.rect(head.x - 3, head.y + 5, 7, 1, '#ffd98a');
}

/** Mug and stacked books on a surface at height h. */
export function deskClutter(pt: Painter, room: Room, u: number, d: number, h: number): void {
  const mug = room.p(u, d, h);
  pt.rect(mug.x, mug.y - 4, 3, 4, '#c9c2b4');
  pt.px(mug.x + 3, mug.y - 3, '#c9c2b4');
  const b = room.p(u + 0.05, d + 0.01, h);
  ['#58606b', '#7d5a46', '#6f7356'].forEach((c, i) => pt.rect(b.x - i, b.y - 2 - i * 2, 9 + i, 2, c));
  // Open notebook with handwritten math (photo reference IMG_5070).
  const n = room.p(u + 0.11, d - 0.01, h);
  pt.rect(n.x, n.y - 2, 12, 3, '#d6d3c7');
  for (let x = 1; x < 11; x += 2) pt.px(n.x + x, n.y - 1, '#6a7489');
  pt.px(n.x + 6, n.y - 2, '#8a8a80');
}

/** Foreground silhouette strip (out-of-focus object nearest to camera). */
export function foregroundShape(pt: Painter, points: { x: number; y: number }[], color: string): void {
  pt.poly(points, color);
}

export { shade, mix };
