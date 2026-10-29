// One-point perspective for 2.5D rooms. World coordinates:
//   u — across the room, 0 (left wall) … 1 (right wall)
//   d — depth, 0 (front, at the camera) … 1 (back wall)
//   h — height above the floor, in back-wall pixels × room height scale
// Depth uses real 1/z foreshortening, so objects shrink correctly with distance.
import { mix, shade, type Painter, type Pt } from './painter';

export interface RoomSpec {
  /** Back wall rectangle on screen. */
  back: { x0: number; y0: number; x1: number; y1: number };
  /** How much wider the room is at the camera than at the back wall (≥ 1). */
  depthRatio: number;
}

export class Room {
  readonly cx: number;
  readonly horizon: number; // vanishing point y (eye level)
  readonly backW: number;
  readonly backH: number;

  constructor(readonly spec: RoomSpec) {
    const { back } = spec;
    this.cx = (back.x0 + back.x1) / 2;
    this.backW = back.x1 - back.x0;
    this.backH = back.y1 - back.y0;
    this.horizon = back.y0 + this.backH * 0.42;
  }

  /** Screen point for a world point. */
  p(u: number, d: number, h = 0): Pt {
    const s = this.k(d);
    const { back } = this.spec;
    const floorBack = back.y1;
    return {
      x: this.cx + (u - 0.5) * this.backW * s,
      y: this.horizon + (floorBack - this.horizon) * s - h * s,
    };
  }

  /** Perspective scale at depth d: depthRatio at the camera → 1 at the back wall. */
  k(d: number): number {
    const r = this.spec.depthRatio;
    // Interpolate 1/scale linearly (perspective-correct).
    return 1 / (1 / r + (1 - 1 / r) * d);
  }

  /** Depth for a given screen floor y (inverse of p). */
  depthAtY(y: number): number {
    const s = (y - this.horizon) / (this.spec.back.y1 - this.horizon);
    const r = this.spec.depthRatio;
    return (1 / s - 1 / r) / (1 - 1 / r);
  }

  /** Height in world units of the back wall (floor → ceiling). */
  get wallH(): number {
    return this.backH;
  }
}

export interface BoxColors {
  top: string;
  front: string;
  side: string;
  edge?: string;
}

/** Axis-aligned box standing on the floor. Visible faces are chosen from the camera position. */
export function box(
  pt: Painter,
  room: Room,
  u: number,
  d: number,
  w: number,
  depth: number,
  h: number,
  c: BoxColors,
  lift = 0,
): void {
  const u0 = u;
  const u1 = u + w;
  const dFront = d;
  const dBack = d + depth;
  const P = (uu: number, dd: number, hh: number) => room.p(uu, dd, hh + lift);
  const front = [P(u0, dFront, 0), P(u1, dFront, 0), P(u1, dFront, h), P(u0, dFront, h)];
  const top = [P(u0, dFront, h), P(u1, dFront, h), P(u1, dBack, h), P(u0, dBack, h)];
  // Side faces: the one facing the centre of view is visible.
  const leftSide = [P(u0, dFront, 0), P(u0, dBack, 0), P(u0, dBack, h), P(u0, dFront, h)];
  const rightSide = [P(u1, dFront, 0), P(u1, dBack, 0), P(u1, dBack, h), P(u1, dFront, h)];
  if (u1 < 0.5) pt.poly(rightSide, c.side);
  if (u0 > 0.5) pt.poly(leftSide, c.side);
  // The top is visible only when it lies below eye level.
  if (P(u0, dFront, h).y > room.horizon) pt.poly(top, c.top);
  pt.poly(front, c.front);
  if (c.edge) {
    const e = c.edge;
    pt.line(front[3]!.x, front[3]!.y, front[2]!.x, front[2]!.y, e);
    pt.line(front[0]!.x, front[0]!.y, front[3]!.x, front[3]!.y, e);
    pt.line(front[1]!.x, front[1]!.y, front[2]!.x, front[2]!.y, e);
  }
}

/** Standard 3-tone shading for a base colour lit from the upper left. */
export function tones(base: string, edge = true): BoxColors {
  return { top: shade(base, 0.18), front: base, side: shade(base, -0.22), ...(edge ? { edge: shade(base, -0.45) } : {}) };
}

/** Quad on the back wall (posters, windows): coordinates as fractions of the wall. */
export function wallRect(room: Room, fx0: number, fy0: number, fx1: number, fy1: number) {
  const { back } = room.spec;
  return {
    x: Math.round(back.x0 + room.backW * fx0),
    y: Math.round(back.y0 + room.backH * fy0),
    w: Math.round(room.backW * (fx1 - fx0)),
    h: Math.round(room.backH * (fy1 - fy0)),
  };
}

/** Draws the empty room shell: ceiling, walls, floor. */
export function shell(
  pt: Painter,
  room: Room,
  c: { wall: string; wallSide: string; floor: string; floorLine: string; ceiling: string; trim: string },
  floorPattern: 'planks' | 'tiles' | 'carpet' | 'none' = 'planks',
): void {
  const { back } = room.spec;
  const W = pt.w;
  const H = pt.h;
  const fl = room.p(0, 0, 0);
  const fr = room.p(1, 0, 0);
  const cl = room.p(0, 0, room.wallH);
  const cr = room.p(1, 0, room.wallH);
  // Ceiling, side walls, floor as trapezoids extending past the screen.
  pt.poly([{ x: cl.x, y: cl.y }, { x: cr.x, y: cr.y }, { x: back.x1, y: back.y0 }, { x: back.x0, y: back.y0 }], c.ceiling);
  pt.poly([{ x: cl.x, y: cl.y }, { x: back.x0, y: back.y0 }, { x: back.x0, y: back.y1 }, { x: fl.x, y: fl.y }], c.wallSide);
  pt.poly([{ x: cr.x, y: cr.y }, { x: back.x1, y: back.y0 }, { x: back.x1, y: back.y1 }, { x: fr.x, y: fr.y }], c.wallSide);
  pt.poly([{ x: fl.x, y: fl.y }, { x: fr.x, y: fr.y }, { x: back.x1, y: back.y1 }, { x: back.x0, y: back.y1 }], c.floor);
  // The floor continues below the front plane to the bottom of the frame.
  if (fl.y < H) pt.poly([{ x: fl.x, y: fl.y }, { x: fr.x, y: fr.y }, { x: fr.x + (fr.x - back.x1), y: H + 60 }, { x: fl.x - (back.x0 - fl.x), y: H + 60 }], c.floor);
  pt.rect(back.x0, back.y0, room.backW, room.backH, c.wall);
  // Skirting boards.
  pt.rect(back.x0, back.y1 - 3, room.backW, 3, c.trim);
  pt.line(back.x0, back.y1, fl.x, fl.y, c.trim);
  pt.line(back.x1, back.y1, fr.x, fr.y, c.trim);
  pt.line(back.x0, back.y0, cl.x, cl.y, mix(c.ceiling, c.trim, 0.5));
  pt.line(back.x1, back.y0, cr.x, cr.y, mix(c.ceiling, c.trim, 0.5));
  if (floorPattern === 'planks') {
    for (let i = 1; i < 12; i++) {
      const u = i / 12;
      const a = room.p(u, 0, 0);
      const b = room.p(u, 1, 0);
      pt.line(a.x, Math.min(a.y, H + 40), b.x, b.y, c.floorLine);
    }
    for (let d = 0.08; d < 1; d += 0.1) {
      const y = Math.round(room.p(0.5, d, 0).y);
      if (y < H) for (let i = 0; i < 12; i += 2) {
        const off = (Math.round(d * 10) % 2) * 0.5;
        const a = room.p((i + off) / 12, d, 0);
        pt.px(Math.round(a.x), y, c.floorLine);
      }
    }
  } else if (floorPattern === 'tiles') {
    for (let i = 0; i <= 10; i++) {
      const a = room.p(i / 10, 0, 0);
      const b = room.p(i / 10, 1, 0);
      pt.line(a.x, a.y, b.x, b.y, c.floorLine);
    }
    for (let d = 0; d < 1; d += 0.12) {
      const a = room.p(0, d, 0);
      const b = room.p(1, d, 0);
      pt.line(a.x, a.y, b.x, b.y, c.floorLine);
    }
  } else if (floorPattern === 'carpet') {
    pt.dither(0, back.y1, W, H - back.y1, c.floor, c.floorLine, (x, y) => ((x * 7 + y * 13) % 17) / 40);
  }
}
