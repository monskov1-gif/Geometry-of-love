// Аудитория 308: the seminar room behind the door in the university corridor
// (гл. 2, «преподаватель вызывает к доске»). Plain and worn like the rest of
// the university: a long green chalkboard, rows of desks, fluorescent panels,
// tall windows. The board carries the real problems of the 'university-board'
// task set, chalked in full, so the player sees how hard the problem is that
// Dameo fails to solve.
import { LocationKit, rng, TEX, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { universitySets } from '../../content/geometry-university';
import { wallPaper } from '../props';

const BACK = -3.0;
const FRONT = 4.5;
const H = 3.1;
const XL = -4.2;
const XR = 4.2;
const BOARD = { x: 0.3, y: 1.55, w: 3.6, h: 1.25 };

/** The board's problems as chalk lines (the input hints in parentheses are not written on a board). */
function boardLines(): string[][] {
  const set = universitySets['university-board'];
  if (!set) throw new Error('[classroom] task set "university-board" is missing');
  return set.tasks.map((t) => t.prompt.split('\n').filter((l) => !/^\(.*\)$/.test(l.trim())));
}

/** Green chalkboard with the four problems, smudges of old chalk, a date in the corner. */
function chalkboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const r = rng(17);
  ctx.fillStyle = '#26402f';
  ctx.fillRect(0, 0, w, h);
  // wiped chalk: pale clouds
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(220,230,220,${0.03 + r() * 0.04})`;
    ctx.fillRect(r() * w, r() * h, 40 + r() * 120, 6 + r() * 18);
  }
  ctx.fillStyle = '#e8eee6';
  ctx.textBaseline = 'top';
  const font = (px: number) => `${px}px Tiny5, "DejaVu Sans", "Segoe UI Symbol", sans-serif`;
  ctx.font = font(14);
  ctx.fillText('Семинар · высшая математика', 16, 10);
  // one problem under another, in the largest chalk that fits the board
  const lines = boardLines();
  const rows = lines.reduce((n, p) => n + p.length, 0) + lines.length * 0.6;
  let px = Math.floor((h - 44) / rows / 1.3);
  ctx.font = font(px);
  while (px > 9 && lines.flat().some((l) => ctx.measureText(l).width > w - 70)) ctx.font = font(--px);
  let y = 36;
  lines.forEach((problem, i) => {
    ctx.fillStyle = '#f4f0b8';
    ctx.fillText(`${i + 1}.`, 16, y);
    ctx.fillStyle = '#e8eee6';
    problem.forEach((l) => {
      ctx.fillText(l, 16 + px * 2, y);
      y += px * 1.3;
    });
    y += px * 0.6;
  });
  ctx.fillStyle = 'rgba(232,238,230,0.8)';
  ctx.font = font(10);
  ctx.fillText('d = ?', w - 60, h - 18);
}

export const classroom3D: LocationDef3D = {
  id: 'university-classroom',
  states: ['day', 'evening', 'night'],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low });
    kit.setupLights();
    kit.floorRect(XL, XR, BACK, FRONT, kit.texM('classPlanks', TEX.planks(1), { roughness: 0.6 }), { tile: 0.8 });
    const wallM = kit.texM('classWall', TEX.paint('class', [206, 200, 180]), { roughness: 0.9 });
    const windows: [number, number][] = [
      [-3.9, -2.9],
      [2.7, 3.7],
    ];
    kit.wall(XL, XR, H, BACK, wallM, windows.map(([x0, x1]) => ({ x0, x1, y0: 1.0, y1: 2.6 })));
    kit.sideWall(XL, BACK, FRONT, H, wallM, 1);
    kit.sideWall(XR, BACK, FRONT, H, wallM, -1);
    kit.ceilingPoly(
      [
        [XL, BACK],
        [XR, BACK],
        [XR, FRONT],
        [XL, FRONT],
      ],
      H,
      kit.M('classCeil', 0xd8d4c8, { roughness: 1 }),
    );
    kit.trims([[XL, XR]], BACK, H, { crown: false, color: 0x5a524a });
    windows.forEach(([x0, x1], i) => kit.brightWindow(x0, x1, 1.0, 2.6, BACK, { profile: i ? 'B' : 'A' }));
    for (const [x0, x1] of windows) kit.radiator((x0 + x1) / 2, 0.15, BACK, (x1 - x0) * 0.8, { h: 0.5 });

    // the board: wooden frame, chalk ledge, the problems
    const frame = kit.M('boardWood', 0x5a3e2a, { roughness: 0.7 });
    kit.rb(BOARD.w + 0.12, BOARD.h + 0.12, 0.04, 0.01, frame, BOARD.x, BOARD.y, BACK + 0.02);
    const tex = TX('chalkboard-308b', 960, 330, chalkboard, { nearest: false, aniso: 4 });
    kit.rb(BOARD.w, BOARD.h, 0.01, 0.002, kit.texM('chalkboard-308b', tex, { roughness: 0.95 }), BOARD.x, BOARD.y, BACK + 0.045);
    kit.rb(BOARD.w, 0.03, 0.08, 0.008, frame, BOARD.x, BOARD.y - BOARD.h / 2 - 0.06, BACK + 0.08);
    kit.rb(0.12, 0.02, 0.05, 0.006, kit.M('chalk', 0xf0f0e8, { roughness: 1 }), BOARD.x - 1.2, BOARD.y - BOARD.h / 2 - 0.035, BACK + 0.09);
    kit.rb(0.14, 0.04, 0.06, 0.01, kit.M('duster', 0x3a3a46, { roughness: 1 }), BOARD.x + 1.4, BOARD.y - BOARD.h / 2 - 0.025, BACK + 0.09);
    wallPaper(kit, -2.0, 2.35, BACK, 0.36, 0.22, 'class-rules', (ctx, w, h) => {
      ctx.fillStyle = '#eeece4';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(40,40,50,0.6)';
      for (let y = 4; y < h - 2; y += 3) ctx.fillRect(3, y, w - 6 - ((y * 7) % 9), 1);
    });

    // lecturer's desk, then rows of student desks facing the board
    kit.desk(BOARD.x + 1.2, BACK + 0.9, 0, { w: 1.3, d: 0.6 });
    kit.bookStack(BOARD.x + 0.9, 0.78, BACK + 1.1, 2, 5);
    const r = rng(4);
    for (let row = 0; row < 3; row++)
      for (const x of [-2.4, -0.6, 1.2, 3.0]) {
        const z = -0.6 + row * 1.25;
        kit.desk(x, z, 0, { w: 1.2, d: 0.5, h: 0.74 });
        kit.chair(x - 0.25, z + 0.85, Math.PI, { seed: 20 + row * 4 + Math.round(r() * 3) });
        kit.chair(x + 0.3, z + 0.85, Math.PI, { seed: 30 + row * 4 });
      }
    [-2.0, 1.6].forEach((x, i) => [-1.2, 1.4].forEach((z, j) => kit.fluorescent(`classFluo${i}${j}`, x, H - 0.04, z, { on: { evening: 1, night: 0.4, day: 0.7 } })));
    kit.ambient = { ...kit.ambient, day: { sky: 0xe4e6e2, ground: 0x8a8274, hemi: 1.05, fill: 0xf0f0ec, fillI: 0.55, bg: 0x8a9096 } };
    kit.flushBatches();
    return {
      kit,
      shots: {
        wide: { pos: [0.3, 1.7, 3.9], look: [0.3, 1.3, -1.8], fov: 50 },
        // the whole board, close enough to read what is written on it
        board: { pos: [BOARD.x, BOARD.y - 0.05, BACK + 1], look: [BOARD.x, BOARD.y - 0.05, BACK], fov: 40, fit: [BOARD.w + 0.3, BOARD.h + 0.3], frameY: 0.38, still: true },
      },
      marks: {
        left: { x: -1.2, z: BACK + 0.9 },
        center: { x: -0.4, z: BACK + 0.8, facing: 'front' },
        right: { x: 1.6, z: BACK + 1.6 },
        board: { x: -0.9, z: BACK + 0.55, facing: 'back' },
      },
      walk: { minX: XL + 0.8, maxX: XR - 0.8, z: BACK + 0.9 },
    };
  },
};
