// Университет: коридор третьего этажа и читальный зал библиотеки (реальный мир).
// Коридор построен по примеру example-corridor из location-kit: окна с дневным
// светом и бликами, люминесцентные панели, кафельная панель с поручнем,
// пилястры, дверь в аудиторию 308, расписание, шкафчики, автомат с напитками.
// Библиотека — по референсу IMG_5068/5069: ряды стеллажей под люминесцентным
// светом, длинные столы с зелёными лампами, учебные кабинки.
import { LocationKit, rgb, rng, TEX, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { can, poster, wallPaper } from '../props';

const lino = () =>
  TX('uniLino', 60, 60, (ctx, w, h) => {
    const r = rng(5);
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const v = (r() - 0.5) * 16;
        const warm = (i + j) % 2 ? 6 : -4;
        ctx.fillStyle = rgb(150 + v + warm, 146 + v, 132 + v - warm);
        ctx.fillRect(i * 30, j * 30, 30, 30);
        for (let k = 0; k < 120; k++) {
          const q = (r() - 0.5) * 34;
          ctx.fillStyle = rgb(150 + v + q, 146 + v + q, 132 + v + q, 0.6);
          ctx.fillRect(i * 30 + r() * 30, j * 30 + r() * 30, 1, 1);
        }
      }
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = 'rgba(40,40,40,0.18)';
      ctx.fillRect(r() * w, r() * h, 4 + r() * 8, 1);
    }
    ctx.fillStyle = 'rgba(50,50,40,0.5)';
    for (const t of [0, 30]) {
      ctx.fillRect(0, t, w, 1);
      ctx.fillRect(t, 0, 1, h);
    }
  });

const wallTiles = () =>
  TX('uniTiles', 32, 32, (ctx, w, h) => {
    const r = rng(9);
    ctx.fillStyle = '#b8bcae';
    ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = rgb(92 + r() * 14, 116 + r() * 14, 124 + r() * 10);
        ctx.fillRect(i * 16 + 1, j * 16 + 1, 15, 15);
      }
  });

const ceilTiles = () =>
  TX('uniCeil', 60, 60, (ctx, w, h) => {
    const r = rng(13);
    ctx.fillStyle = '#d4d6d0';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(80,80,70,${r() * 0.25})`;
      ctx.fillRect(r() * w, r() * h, 1, 1);
    }
    ctx.fillStyle = '#9a9c96';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, 0, 1, h);
  });

/** A row of grey steel lockers with vents, handles and the odd sticker. */
function lockers(kit: LocationKit, x0: number, n: number, z: number, seed: number): void {
  const r = rng(seed);
  const steel = kit.M('lockerSteel', 0x7a8a96, { metalness: 0.5, roughness: 0.45 });
  const dark = kit.M('lockerDark', 0x3a4048, { roughness: 0.5 });
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 0.42;
    kit.rb(0.4, 1.8, 0.45, 0.01, steel, x, 0.9, z + 0.23);
    for (let k = 0; k < 4; k++) kit.rb(0.22, 0.012, 0.004, 0.002, dark, x, 1.55 - k * 0.03, z + 0.455);
    kit.rb(0.025, 0.12, 0.02, 0.006, dark, x + 0.13, 1.0, z + 0.46);
    if (r() < 0.35) kit.rb(0.08, 0.06, 0.002, 0.001, kit.M(`sticker-${i % 3}`, [0xff6cc5, 0xf8e060, 0x55c9f5][i % 3]!), x - 0.05, 1.2 + r() * 0.3, z + 0.457, { rz: r() - 0.5 });
  }
}

/** Drinks machine: lit front panel, buttons, a dispensing flap. */
function vending(kit: LocationKit, id: string, x: number, z: number): void {
  const body = kit.M('vendBody', 0xb83030, { roughness: 0.4 });
  kit.rb(0.85, 1.85, 0.7, 0.03, body, x, 0.925, z + 0.35);
  const front = TX('vendFront', 40, 64, (ctx, w, h) => {
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(0, 0, w, h);
    const cols = ['#e84848', '#48a8e8', '#f8d048', '#48c878', '#f08ab0'];
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = cols[(i + j) % cols.length]!;
        ctx.fillRect(3 + i * 7, 4 + j * 12, 5, 9);
      }
    ctx.fillStyle = '#c8d0e0';
    ctx.fillRect(0, 52, w, 1);
  });
  const glow = kit.glowM(`vend-${id}`, 0xffffff, 0xdfe8ff, { map: front });
  kit.rb(0.6, 1.0, 0.02, 0.005, glow, x - 0.06, 1.25, z + 0.71);
  kit.rb(0.12, 0.5, 0.02, 0.005, kit.M('vendButtons', 0x2a2a30), x + 0.32, 1.2, z + 0.71);
  kit.rb(0.5, 0.14, 0.03, 0.01, kit.M('vendFlap', 0x14141a), x - 0.06, 0.3, z + 0.71);
  kit.lamp(id, { light: kit.pointLight(0xdfe8ff, 1.4, 3, x, 1.3, z + 1.1, 1.4), mats: [[glow, 1.0]], on: { evening: 1, night: 1, day: 0.8 } });
}

export const universityHall3D: LocationDef3D = {
  id: 'university-hall',
  states: ['day', 'evening', 'night'],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low });
    const BACK = -3.0;
    const H = 3.1;
    const XL = -7;
    const XR = 7;
    const FRONT = 6; // floor, ceiling and side walls run past the camera: no gaps at the frame edges
    kit.setupLights();
    kit.floorRect(XL, XR, BACK, FRONT, kit.texM('uniLino', lino(), { roughness: 0.25, metalness: 0.05 }), { tile: 0.6 });
    const wallM = kit.texM('uniWall', TEX.paint('uni', [214, 212, 196]), { roughness: 0.9 });
    const windows: [number, number][] = [
      [-5.6, -4.0],
      [-1.6, 0.0],
      [3.8, 5.4],
    ];
    const door = { x0: 1.4, x1: 2.4, y0: 0, y1: 2.2 };
    kit.wall(XL, XR, H, BACK, wallM, [...windows.map(([x0, x1]) => ({ x0, x1, y0: 1.0, y1: 2.6 })), door]);
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
      kit.texM('uniCeil', ceilTiles(), { roughness: 1 }),
      { tile: 0.6 },
    );
    const spans: [number, number][] = [
      [XL, door.x0],
      [door.x1, XR],
    ];
    kit.wainscot(spans, BACK, 1.0, kit.texM('uniTiles', wallTiles(), { roughness: 0.4 }), { railColor: 0x5a6a6a });
    kit.trims(spans, BACK, H, { crown: false, color: 0x5a625e });
    kit.brightWindow(-5.6, -4.0, 1.0, 2.6, BACK, { profile: 'A' });
    kit.brightWindow(-1.6, 0.0, 1.0, 2.6, BACK, { profile: 'C', blinds: true });
    kit.brightWindow(3.8, 5.4, 1.0, 2.6, BACK, { profile: 'B' });
    for (const [x0, x1] of windows) kit.radiator((x0 + x1) / 2, 0.15, BACK, (x1 - x0) * 0.8, { h: 0.5 });
    // auditorium 308: door with a number plate, a lit room behind
    kit.withT((door.x0 + door.x1) / 2, BACK, 0, () => kit.panelDoor(1.0, 2.2, 0x7a5a3a, { glassTop: true }));
    wallPaper(kit, (door.x0 + door.x1) / 2, 2.38, BACK, 0.22, 0.1, 'room308', (ctx, w, h) => {
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f0f0e8';
      ctx.font = '8px Tiny5, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText('308', 5, h / 2);
    });
    kit.wall(door.x0 - 0.3, door.x1 + 0.3, H, BACK - 2.0, kit.M('roomBack', 0xc8c0a8, { roughness: 1 }));
    kit.floorRect(door.x0 - 0.3, door.x1 + 0.3, BACK - 2.0, BACK, kit.texM('uniLino', lino()), { tile: 0.64 });
    kit.lamp('room308', { light: kit.pointLight(0xfff0d8, 1.6, 4, (door.x0 + door.x1) / 2, 2.4, BACK - 1.0), on: { evening: 1, night: 0, day: 1 } });
    // schedule board with timetable sheets
    kit.rb(1.2, 0.8, 0.03, 0.01, kit.M('boardFrame', 0x5a4a3a), -2.9, 1.65, BACK + 0.02);
    wallPaper(kit, -2.9, 1.65, BACK + 0.02, 1.1, 0.7, 'schedule', (ctx, w, h) => {
      ctx.fillStyle = '#a8804e';
      ctx.fillRect(0, 0, w, h);
      const r = rng(3);
      for (let i = 0; i < 6; i++) {
        const x = 3 + (i % 3) * 36;
        const y = 4 + Math.floor(i / 3) * 34;
        ctx.fillStyle = i === 1 ? '#f8f0a0' : '#eeece6';
        ctx.fillRect(x, y, 32, 30);
        ctx.fillStyle = 'rgba(40,40,50,0.6)';
        for (let k = 3; k < 28; k += 3) ctx.fillRect(x + 2, y + k, 10 + r() * 18, 1);
        ctx.fillStyle = '#c82020';
        ctx.fillRect(x + 15, y + 1, 2, 2);
      }
    });
    lockers(kit, 3.0, 2, BACK, 3);
    lockers(kit, 5.9, 2, BACK, 7);
    vending(kit, 'vend', -6.2, BACK);
    // pilasters, fluorescents, benches with a forgotten bag
    for (const x of [-6.8, -3.6, 0.7, 6.9]) kit.column(x, BACK + 0.15, H, kit.M('pilaster', 0xc8ccc2, { roughness: 0.8 }));
    [-4.8, -0.8, 4.6].forEach((x, i) => kit.fluorescent(`fluo${i}`, x, H - 0.04, -1.2, { on: { evening: 1, night: i === 1 ? 0.35 : 0, day: 0.6 } }));
    const benchM = kit.texM('benchOak', TEX.oak(1), { roughness: 0.5 });
    const steel = kit.M('steel', 0x9aa0a6, { metalness: 0.8, roughness: 0.35 });
    for (const bx of [-4.8, 4.6])
      kit.withT(bx, BACK + 0.15, 0, () => {
        kit.rb(1.6, 0.05, 0.4, 0.015, benchM, 0, 0.45, 0.25);
        kit.rb(1.6, 0.3, 0.04, 0.015, benchM, 0, 0.75, 0.05, { rx: -0.1 });
        for (const s of [-1, 1]) {
          kit.rb(0.04, 0.45, 0.36, 0.01, steel, s * 0.7, 0.225, 0.25);
          kit.rb(0.04, 0.4, 0.04, 0.01, steel, s * 0.7, 0.68, 0.06);
        }
      });
    kit.cush(0.32, 0.38, 0.18, 0.08, kit.M('bagOlive', 0x5a6a3a, { roughness: 0.9 }), 4.2, 0.67, BACK + 0.4, { puff: 0.6, seed: 9 });
    can(kit, -6.6, 0, BACK + 0.9, 0xd8d8e0, true);
    poster(kit, -1.0, 1.95, BACK, 0.42, 0.56, 'club', (ctx, w, h) => {
      ctx.fillStyle = '#2a6a9a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f8f0e0';
      ctx.font = '7px Tiny5, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ШАХМАТНЫЙ', w / 2, 10);
      ctx.fillText('КЛУБ', w / 2, 18);
      ctx.fillStyle = '#1a1a1a';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2) ctx.fillRect(6 + i * 5, 24 + j * 5, 5, 5);
    });
    kit.exitSign('exit', -6.4, 2.65, BACK);
    kit.ambient = { ...kit.ambient, day: { sky: 0xe4e8ea, ground: 0x8a8a80, hemi: 1.1, fill: 0xf0f2f4, fillI: 0.6, bg: 0x8a9096 } };
    kit.flushBatches();
    return {
      kit,
      shots: {
        wide: { pos: [0, 1.6, 4.4], look: [0, 1.4, -1.5], fov: 46 },
        door: { pos: [2.6, 1.5, 1.6], look: [1.9, 1.3, -2.6], fov: 44 },
        schedule: { pos: [-2.3, 1.55, 0.8], look: [-2.9, 1.5, BACK], fov: 40 },
      },
      marks: {
        left: { x: -1.6, z: -1.1 },
        center: { x: -0.2, z: -1.0 },
        right: { x: 1.2, z: -1.2 },
        schedule: { x: -2.7, z: -1.9, facing: 'back' },
        door: { x: 1.9, z: -2.2 },
        window: { x: -4.8, z: -1.6 },
      },
      walk: { minX: XL + 0.8, maxX: XR - 0.8, z: -1.1 },
    };
  },
};

export const universityLibrary3D: LocationDef3D = {
  id: 'university-library',
  states: ['day', 'evening', 'night'],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low });
    const BACK = -3.4;
    const H = 3.2;
    const XL = -6;
    const XR = 6;
    const FRONT = 6; // floor, ceiling and side walls run past the camera: no gaps at the frame edges
    kit.setupLights();
    kit.floorRect(XL, XR, BACK, FRONT, kit.texM('libCarpet', TEX.carpet(), { roughness: 1, color: 0x7a6a5a }), { tile: 0.5 });
    const wallM = kit.texM('libWall', TEX.paint('lib', [200, 196, 180]), { roughness: 0.9 });
    kit.wall(XL, XR, H, BACK, wallM, [{ x0: 3.4, x1: 5.0, y0: 1.0, y1: 2.7 }]);
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
      kit.texM('uniCeil', ceilTiles(), { roughness: 1 }),
      { tile: 0.6 },
    );
    kit.trims([[XL, XR]], BACK, H, { crown: false, color: 0x5a4a3a });
    kit.brightWindow(3.4, 5.0, 1.0, 2.7, BACK, { profile: 'B' });
    // shelves against the back wall and two free-standing rows going into depth
    const oak = kit.texM('libOak', TEX.oak(2), { roughness: 0.6 });
    for (let i = 0; i < 6; i++) kit.bookcase(-5.4 + i * 0.86, BACK, 0, { w: 0.84, h: 2.3, d: 0.34, shelves: 7, seed: 100 + i * 7, wood: oak });
    for (const rowX of [-4.6, -2.6])
      for (let k = 0; k < 2; k++) kit.bookcase(rowX, BACK + 0.9 + k * 0.9, Math.PI / 2, { w: 0.86, h: 2.0, d: 0.34, shelves: 6, seed: 200 + k * 13 + Math.round(rowX), wood: oak });
    // the reading table with green lamps
    const tableX = 1.2;
    kit.rb(3.0, 0.05, 1.0, 0.015, oak, tableX, 0.76, -1.3);
    for (const sx of [-1.4, 1.4]) for (const sz of [-1.7, -0.9]) kit.rb(0.06, 0.74, 0.06, 0.01, oak, tableX + sx, 0.37, sz);
    for (const lx of [-0.8, 0.8]) {
      const green = kit.glowM(`bankerShade-${lx}`, 0x1e6a3a, 0xfff0c0, { roughness: 0.3 });
      kit.cy(0.05, 0.06, 0.02, kit.brass(), tableX + lx, 0.79, -1.3, { seg: 16 });
      kit.rod([tableX + lx, 0.8, -1.3], [tableX + lx, 1.08, -1.3], 0.008, kit.brass());
      kit.cy(0.06, 0.12, 0.1, green, tableX + lx, 1.12, -1.25, { rz: Math.PI / 2, seg: 18, open: true });
      kit.lamp(`banker-${lx}`, {
        light: kit.pointLight(0xffe0b0, 1.6, 3, tableX + lx, 1.0, -1.15, 1.4),
        mats: [[green, 0.6]],
        glows: [kit.halo(0xffe0b0, 0.4, 0.25, tableX + lx, 1.07, -1.2)],
        on: { evening: 1, night: 1, day: 0.6 },
      });
    }
    kit.bookStack(tableX - 1.1, 0.785, -1.4, 3, 12);
    kit.bookStack(tableX + 0.3, 0.785, -1.1, 2, 44);
    for (const cx of [tableX - 0.9, tableX + 0.9]) kit.chair(cx, -0.55, Math.PI, { pad: 0x3a4a3a, seed: Math.round(cx * 10) });
    [-3.6, 0.0, 3.6].forEach((x, i) => kit.fluorescent(`libFluo${i}`, x, H - 0.04, -1.4, { w: 1.4, on: { evening: 1, night: 0.3, day: 0.8 } }));
    kit.flushBatches();
    return {
      kit,
      shots: {
        wide: { pos: [0, 1.65, 4.2], look: [0, 1.35, -1.8], fov: 48 },
        shelves: { pos: [-1.6, 1.5, 0.8], look: [-3.6, 1.4, -2.2], fov: 44 },
        table: { pos: [tableX + 1.8, 1.45, 0.9], look: [tableX, 0.95, -1.4], fov: 42 },
      },
      marks: {
        left: { x: -1.2, z: -0.8 },
        center: { x: 0.2, z: -0.4 },
        right: { x: 2.4, z: -0.5 },
        table: { x: tableX - 0.9, z: -0.6, facing: 'back' },
        shelves: { x: -3.6, z: -1.4, facing: 'left' },
      },
      walk: { minX: XL + 0.8, maxX: XR - 0.8, z: -0.4 },
    };
  },
};
