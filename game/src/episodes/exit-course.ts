// Course of mini-game No. 1 «Выход»: six sections stacked from the floor of
// the training level up to the monitor glass. Pure data + time functions
// (no DOM), so tests can check every jump with the real physics constants.
//   0 Кубики        — static alphabet blocks (warm-up)
//   1 Облака        — clouds sliding sideways and a lift going up and down
//   2 Треугольники  — triangle tiles that crumble a moment after you land
//   3 Карусели      — two wheels of star seats rotating in opposite directions
//   4 Окна          — the app's pop-up windows: platforms blink in turns,
//                     two tall windows block the ledge while open
//   5 Наверх        — a zig-zag shaft while the level erases itself from below
// Each section starts on a checkpoint ledge; a fall restarts that section.
import type { PhysConfig, Rect } from './physics';

export const VIEW_W = 480;
export const VIEW_H = 320;
export const BODY_W = 14;
export const BODY_H = 72;

/** Platformer physics of this mini-game (the hero sprite is 80 px tall). */
export const CLIMB_PHYS: PhysConfig = { gravity: 1500, jumpSpeed: 560, moveSpeed: 150, maxFall: 720, coyote: 0.09 };

/** A crumbling tile breaks after this much standing time, s … */
export const CRUMBLE_TIME = 0.55;
/** … and grows back after this long, s. */
export const CRUMBLE_BACK = 2.6;
/** Blinking windows and walls flicker this long before closing, s. */
export const BLINK_WARN = 0.45;

export type Look = 'ground' | 'block' | 'cake' | 'cloud' | 'lift' | 'tri' | 'star' | 'popup' | 'wall' | 'glass';

export type Motion =
  | { kind: 'static' }
  /** Eases back and forth by (dx, dy) once per period. */
  | { kind: 'slide'; dx: number; dy: number; period: number; phase: number }
  /** Top centre circles (cx, cy) with radius r; dir 1 = clockwise on screen. */
  | { kind: 'orbit'; cx: number; cy: number; r: number; period: number; phase: number; dir: 1 | -1 }
  /** Solid for `on` seconds, then gone for `off` seconds. */
  | { kind: 'blink'; on: number; off: number; phase: number };

export interface Piece extends Rect {
  look: Look;
  motion: Motion;
  section: number;
  /** Art variant (colour, letter). */
  variant: number;
  crumble?: boolean;
  /** Blocks from every side (not only from above). */
  wall?: boolean;
}

export interface Section {
  title: string;
  /** Checkpoint ledge (always static). */
  spawn: number;
  /** Pieces in the order of the intended route, ending on the next checkpoint. */
  route: number[];
  /** Falling below this y restarts the section. */
  fallY: number;
  /** The level erases itself from below (last section). */
  hazard?: { startY: number; delay: number; speed: number };
}

export interface Course {
  pieces: Piece[];
  sections: Section[];
  goal: number;
  height: number;
}

const TOP_UP = 2950; // height of the monitor ledge above the floor
const TOP_PAD = 200; // the glass and the room behind it, above the ledge
const GROUND_Y = TOP_PAD + TOP_UP;
export const LEVEL_H = GROUND_Y + 40;
/** World y of a height measured upwards from the floor. */
const Y = (up: number) => GROUND_Y - up;

const staticM: Motion = { kind: 'static' };
const slide = (dx: number, dyUp: number, period: number, phase = 0): Motion => ({ kind: 'slide', dx, dy: -dyUp, period, phase });
const orbit = (cx: number, cyUp: number, r: number, period: number, phase: number, dir: 1 | -1): Motion => ({
  kind: 'orbit',
  cx,
  cy: Y(cyUp),
  r,
  period,
  phase,
  dir,
});
const blink = (on: number, off: number, phase: number): Motion => ({ kind: 'blink', on, off, phase });

export function buildCourse(): Course {
  const pieces: Piece[] = [];
  const sections: Section[] = [];
  let section = 0;
  let variant = 0;
  const add = (look: Look, x: number, up: number, w: number, motion: Motion = staticM, extra: Partial<Piece> = {}) => {
    const h = extra.h ?? (look === 'ground' ? 28 : look === 'glass' ? 16 : 8);
    pieces.push({ x, y: Y(up), w, h, look, motion, section, variant: variant++, ...extra });
    return pieces.length - 1;
  };
  const begin = (title: string, spawn: number, extra: Partial<Section> = {}) => {
    section = sections.length;
    pieces[spawn]!.section = section;
    sections.push({ title, spawn, route: [spawn], fallY: pieces[spawn]!.y + 150, ...extra });
  };
  const route = (...ids: number[]) => sections[section]!.route.push(...ids);

  // 0 — alphabet blocks
  const ground = add('ground', 0, 0, VIEW_W);
  begin('Кубики', ground, { fallY: LEVEL_H + 100 });
  route(add('block', 150, 56, 48), add('block', 250, 112, 48), add('block', 360, 168, 64), add('block', 250, 236, 56), add('block', 130, 300, 56));
  const cp1 = add('cake', 16, 366, 80);
  route(cp1);

  // 1 — clouds and a lift
  begin('Облака', cp1);
  route(
    add('cloud', 110, 406, 56, slide(160, 0, 3.4)),
    add('cake', 386, 446, 72),
    add('lift', 300, 470, 48, slide(0, 160, 4)),
    add('cake', 200, 680, 56),
    add('cloud', 40, 740, 56, slide(200, 0, 3.6, 0.5)),
  );
  const cp2 = add('cake', 360, 806, 84);
  route(cp2);

  // 2 — crumbling triangles
  begin('Треугольники', cp2);
  const tri = (x: number, up: number, w: number) => add('tri', x, up, w, staticM, { crumble: true });
  route(
    tri(262, 860, 40),
    tri(160, 916, 40),
    tri(56, 972, 44),
    tri(150, 1040, 36),
    tri(250, 1096, 36),
    tri(350, 1150, 36),
    tri(430, 1210, 40),
    tri(330, 1270, 36),
    tri(236, 1270, 36),
    tri(142, 1270, 36),
  );
  const cp3 = add('cake', 16, 1320, 80);
  route(cp3);

  // 3 — rotating wheels of star seats
  begin('Карусели', cp3);
  const wheelA = [0, 1, 2, 3].map((k) => add('star', 0, 0, 44, orbit(200, 1440, 84, 7, k / 4, 1)));
  const wheelB = [0, 1, 2, 3].map((k) => add('star', 0, 0, 44, orbit(380, 1600, 84, 7, k / 4 + 0.09, -1)));
  route(wheelA[0]!, wheelB[0]!);
  const cp4 = add('cake', 210, 1740, 64);
  route(cp4);

  // 4 — Melody's pop-up windows
  begin('Окна', cp4);
  const popA = (x: number, up: number, w: number) => add('popup', x, up, w, blink(2.3, 1.1, 0));
  const popB = (x: number, up: number, w: number) => add('popup', x, up, w, blink(2.3, 1.1, 0.5));
  route(popA(320, 1796, 64), popB(410, 1860, 60), popA(300, 1926, 64));
  const ledge = add('cake', 30, 1990, 260);
  const wall = (x: number, phase: number) => add('wall', x, 1990 + 110, 28, blink(2, 1.6, phase), { h: 110, wall: true });
  wall(200, 0);
  wall(110, 0.5);
  route(ledge, popB(60, 2060, 56), popA(160, 2126, 56), popB(270, 2190, 56));
  const cp5 = add('cake', 380, 2250, 80);
  route(cp5);

  // 5 — the shaft up to the glass, the level erasing itself below
  begin('Наверх', cp5, { hazard: { startY: Y(2250 - 150), delay: 2, speed: 46 } });
  route(
    add('cake', 270, 2320, 56),
    tri(380, 2390, 44),
    add('cake', 260, 2460, 56),
    tri(150, 2530, 48),
    add('cake', 40, 2600, 56),
    tri(150, 2670, 44),
    add('cloud', 250, 2740, 56, slide(120, 0, 3)),
    add('cake', 410, 2810, 60),
    tri(300, 2880, 44),
  );
  const goal = add('glass', 0, TOP_UP, VIEW_W);
  route(goal);
  return { pieces, sections, goal, height: LEVEL_H };
}

const cyc = (t: number, period: number, phase: number) => (((t / period + phase) % 1) + 1) % 1;

export interface Point {
  x: number;
  y: number;
}

/** The point a trajectory follows: the top centre of the collision box (where the feet stand). */
export const anchorOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y });

/** Where along its path (0..1) a moving piece is at time t; 0 for pieces that do not move. */
export function pathParam(m: Motion, t: number): number {
  if (m.kind === 'slide') return (1 - Math.cos(2 * Math.PI * cyc(t, m.period, m.phase))) / 2;
  if (m.kind === 'orbit') return cyc(m.dir * t, m.period, m.phase);
  return 0;
}

/**
 * Anchor of a piece at path parameter s. The one definition of every path:
 * the collision box (pieceRect) and the drawn track (trackPoints) both use it.
 */
export function pathPoint(p: Piece, s: number): Point {
  const m = p.motion;
  if (m.kind === 'slide') return { x: p.x + p.w / 2 + m.dx * s, y: p.y + m.dy * s };
  if (m.kind === 'orbit') return { x: m.cx + m.r * Math.cos(2 * Math.PI * s), y: m.cy + m.r * Math.sin(2 * Math.PI * s) };
  return { x: p.x + p.w / 2, y: p.y };
}

/** Where a piece is at time t. */
export function pieceRect(p: Piece, t: number): Rect {
  const a = pathPoint(p, pathParam(p.motion, t));
  return { x: a.x - p.w / 2, y: a.y, w: p.w, h: p.h };
}

/** One full cycle of a moving piece, s (null for pieces that do not move). */
export function motionPeriod(m: Motion): number | null {
  return m.kind === 'slide' || m.kind === 'orbit' ? m.period : null;
}

/**
 * Dots of the drawn trajectory, about `spacing` px apart: exactly the anchors
 * the piece passes through (a segment for slides, a closed circle for orbits).
 * Empty for pieces that do not move.
 */
export function trackPoints(p: Piece, spacing = 6): Point[] {
  const m = p.motion;
  if (m.kind === 'slide') {
    const n = Math.max(1, Math.ceil(Math.hypot(m.dx, m.dy) / spacing));
    return Array.from({ length: n + 1 }, (_, i) => pathPoint(p, i / n));
  }
  if (m.kind === 'orbit') {
    const n = Math.max(12, Math.ceil((2 * Math.PI * m.r) / spacing));
    return Array.from({ length: n }, (_, i) => pathPoint(p, i / n));
  }
  return [];
}

/** Is a blinking piece open at time t (always true for other motions)? */
export function blinkOn(p: Piece, t: number): boolean {
  const m = p.motion;
  if (m.kind !== 'blink') return true;
  const cycle = m.on + m.off;
  return cyc(t, cycle, m.phase) * cycle < m.on;
}

/** Is a blinking piece about to close (flicker warning)? */
export function blinkWarning(p: Piece, t: number): boolean {
  const m = p.motion;
  if (m.kind !== 'blink') return false;
  const cycle = m.on + m.off;
  const at = cyc(t, cycle, m.phase) * cycle;
  return at < m.on && at > m.on - BLINK_WARN;
}
