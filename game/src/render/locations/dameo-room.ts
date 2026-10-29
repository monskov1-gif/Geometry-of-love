// Dameo's room (reality, state A). From the real-life references: a dim
// grey-teal room, window with bare winter branches, unmade bed, moving boxes
// he still hasn't unpacked, a desk with an old monitor and handwritten maths.
import { Painter, mix, rng } from '../painter';
import {
  bed,
  cardboard,
  chair,
  clothes,
  curtain,
  desk,
  deskClutter,
  deskLamp,
  hangingLamp,
  monitor,
  rug,
  wallPoster,
  wallWindow,
  type Lighting,
} from '../props';
import { Room, shell, wallRect } from '../space';
import type { LocationDef } from './types';

const room = new Room({ back: { x0: 96, y0: 30, x1: 300, y1: 126 }, depthRatio: 2.35 });
const WINDOW = [0.06, 0.13, 0.36, 0.66] as const;
const DESK = { u: 0.02, d: 0.3, w: 0.3, depth: 0.14, h: 28 };
const MON = { u: 0.11, d: 0.37 };

function screenColor(light: Lighting, app: boolean): string {
  if (app) return '#ffd6f2'; // the app's pastel glow
  return light === 'night' ? '#9fc8e6' : '#59676b';
}

function paint(pt: Painter, light: Lighting, variant: string | undefined): void {
  const app = variant === 'app';
  shell(pt, room, { wall: '#56625f', wallSide: '#47524f', floor: '#5d4b3f', floorLine: '#4b3c33', ceiling: '#414a48', trim: '#2f2b27' }, 'planks');
  wallWindow(pt, room, ...WINDOW, light, '#cfccc1');
  curtain(pt, room, 0.27, 0.09, 0.41, 0.78, '#c6c8bf', 0.8);
  wallPoster(pt, room, 0.56, 0.2, 0.66, 0.4, '#d7d2c4', '#7a3b35', 'calendar');
  wallPoster(pt, room, 0.7, 0.28, 0.76, 0.38, '#e2dccb', '#4d5967', 'notes');
  // Light switch and socket.
  const sw = wallRect(room, 0.47, 0.52, 0.49, 0.58);
  pt.rect(sw.x, sw.y, sw.w + 1, sw.h, '#cdc8bc');
  rug(pt, room, 0.33, 0.12, 0.34, 0.3, '#5d6a74', '#46505a');
  bed(pt, room, 0.53, 0.6, 0.44, 0.38, { frame: '#5a4535', sheet: '#a9ab9f', blanket: '#8b9493', pillow: '#c2c4ba' });
  hangingLamp(pt, room, 0.52, 0.55, false, '#3d3b37');
  desk(pt, room, DESK.u, DESK.d, DESK.w, DESK.depth, DESK.h, '#6b5545');
  monitor(pt, room, MON.u, MON.d, DESK.h, screenColor(light, app));
  deskLamp(pt, room, 0.26, 0.4, DESK.h, light === 'night');
  deskClutter(pt, room, 0.05, 0.33, DESK.h);
  chair(pt, room, 0.15, 0.22, '#3e4450');
  clothes(pt, room, 0.44, 0.2, ['#3c4652', '#6c6f63', '#2e3036']);
  cardboard(pt, room, 0.75, 0.12, 0.13, 0.1, 15);
  cardboard(pt, room, 0.77, 0.14, 0.1, 0.08, 11, 15, true);
  cardboard(pt, room, 0.62, 0.04, 0.11, 0.08, 12);
  // Cable from the monitor to the floor socket.
  const c0 = room.p(MON.u + 0.06, MON.d + 0.04, DESK.h);
  const c1 = room.p(0.0, 0.44, 4);
  pt.line(c0.x, c0.y, c1.x, c1.y, '#232323');

  lighting(pt, light, app);
  // Foreground: the dark corner of a box right at the camera (depth cue).
  pt.poly([{ x: 330, y: 216 }, { x: 352, y: 186 }, { x: 384, y: 182 }, { x: 384, y: 216 }], '#1d1a18');
  pt.line(352, 186, 384, 182, '#2c2723');
}

function lighting(pt: Painter, light: Lighting, app: boolean): void {
  const win = wallRect(room, ...WINDOW);
  const floorA = room.p(0.1, 0.25);
  const floorB = room.p(0.5, 0.12);
  const shaft = [
    { x: win.x, y: win.y + win.h },
    { x: win.x + win.w, y: win.y + win.h },
    { x: floorB.x + 30, y: floorB.y },
    { x: floorA.x - 10, y: floorA.y },
  ];
  if (light === 'day') {
    pt.wash('#cdd6d8', 0.22, 'multiply');
    pt.glowPoly(shaft, '#f3efe0', 0.16);
    pt.pool((floorA.x + floorB.x) / 2, (floorA.y + floorB.y) / 2, 70, 16, '#f6f0dc', 0.12);
  } else if (light === 'evening') {
    pt.wash('#b98068', 0.42, 'multiply');
    pt.glowPoly(shaft, '#ffb27a', 0.2);
    pt.pool((floorA.x + floorB.x) / 2 + 10, (floorA.y + floorB.y) / 2, 80, 18, '#ffa66a', 0.16);
  } else {
    pt.wash('#1a2132', 0.74, 'multiply');
    const s = room.p(MON.u + 0.04, MON.d, DESK.h + 15);
    const glow = app ? '#ff9fdc' : '#7fb8e6';
    pt.pool(s.x, s.y, 90, 60, glow, 0.32);
    pt.pool(s.x + 10, room.p(0.2, 0.3).y, 70, 14, glow, 0.18);
    const lamp = room.p(0.28, 0.4, DESK.h + 12);
    pt.pool(lamp.x, lamp.y + 10, 30, 14, '#ffcf80', 0.22);
  }
  // Emissive pixels stay bright after the ambient wash.
  const a = room.p(MON.u + 0.008, MON.d - 0.001, DESK.h + 7);
  const b = room.p(MON.u + 0.072, MON.d - 0.001, DESK.h + 23);
  const sc = screenColor(light, app);
  pt.rect(a.x, b.y, b.x - a.x, a.y - b.y, light === 'night' || app ? sc : mix(sc, '#000000', 0.2));
  if (app) {
    // A tiny pixel Melody logo on the screen.
    pt.rect(a.x + 3, b.y + 3, 3, 3, '#ff6cc5');
    pt.rect(a.x + 7, b.y + 4, 6, 1, '#b2f5e4');
  }
}

/** Animated layer: dust in the window light, monitor flicker at night. */
function animate(pt: Painter, t: number, light: Lighting, variant: string | undefined): void {
  pt.ctx.clearRect(0, 0, pt.w, pt.h);
  if (light !== 'night') {
    const R = rng(11);
    const win = wallRect(room, ...WINDOW);
    for (let i = 0; i < 26; i++) {
      const bx = win.x + R() * 140;
      const by = win.y + win.h + R() * 70;
      const x = bx + Math.sin(t * 0.0004 + i) * 6;
      const y = by + ((t * 0.004 + i * 13) % 30) - 15;
      pt.px(x, y, light === 'evening' ? '#ffd2a8' : '#f7f3e6');
    }
  } else {
    const a = room.p(MON.u + 0.008, MON.d - 0.001, DESK.h + 7);
    const b = room.p(MON.u + 0.072, MON.d - 0.001, DESK.h + 23);
    const row = Math.floor((t / 60) % (a.y - b.y));
    pt.ctx.globalAlpha = 0.35;
    pt.rect(a.x, b.y + row, b.x - a.x, 1, variant === 'app' ? '#ffffff' : '#d8f0ff');
    pt.ctx.globalAlpha = 1;
  }
}

export const dameoRoom: LocationDef = {
  id: 'dameo-room',
  space: 'reality',
  lightings: ['day', 'evening', 'night'],
  defaultLighting: 'evening',
  paint,
  animate,
};
