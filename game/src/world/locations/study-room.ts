// «Учебная комната» (гл. 5, 9): класс внутри игры, где Мелоди «объясняет
// задачи». Детский сад, скрещённый с математическим приложением: доска с
// чертежами и формулами в цветном мелу, азбука-фриз под потолком, числовая
// линейка, улыбающиеся часы, ячейки с цветными корзинами, большие счёты,
// стеллаж с папками, учительский стол с глобусом и яблоком, детские столики,
// радужный ковёр, гирлянда, подвесные фигуры, стены в наклейках. Окна смотрят
// в конфетное небо. В 'glitch' сквозь наклейки проступают глаза.
import * as THREE from 'three';
import { LocationKit, rng, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { candyKit, flushCandy, pick } from '../candy/candy-kit';
import { abacus, balloon, block, blockPile, crayonBox, puffyShape, ringStack, solid } from '../candy/toys';
import { binderRow, bunting, cubbies, kidChair, kidTable, mobile, ringRug, sideStickers, smileClock, stickerBomb } from '../candy/decor';
import { floaters, glitchLayer, glitter, type Fx } from '../candy/fx';
import { alphabetFrieze, checkerFloor, polkaWall, stripeWall } from '../candy/textures';
import { CANDY, css, LOUD, RAINBOW } from '../candy/palette';
import { CANDY_LOOK } from '../candy/look';
import { ACCENT_ON, CANDY_AMBIENT, CANDY_STATES } from '../candy/states';
import { candyRoom } from '../candy/room';
import { fillTest, inCircle, pixelText } from '../candy/shapes';

const BACK = -3.0;
const H = 3.2;
const XL = -6.5;
const XR = 6.5;
const FRONT = 6;

/** The board: lavender slate, coloured chalk drawings of the lesson. */
const boardTex = () =>
  TX('studyBoard', 192, 96, (ctx, w, h) => {
    const r = rng(55);
    ctx.fillStyle = '#4a3a6a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.06})`;
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 1);
    }
    const chalk = (c: string, pts: [number, number][]) => {
      ctx.fillStyle = c;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[i + 1]!;
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1);
      }
    };
    // a right triangle with its sides
    chalk('#fff9fd', [
      [14, 80],
      [70, 80],
      [14, 26],
      [14, 80],
    ]);
    chalk('#ffd93d', [
      [14, 72],
      [22, 72],
      [22, 80],
    ]);
    pixelText(ctx, 'a', 4, 48, 9, '#8fd8ff');
    pixelText(ctx, 'b', 38, 82, 9, '#8fd8ff');
    pixelText(ctx, 'c', 44, 44, 9, '#ff8fd8');
    pixelText(ctx, 'a²+b²=c²', 84, 10, 11, '#fff9fd');
    pixelText(ctx, 'S=½ah', 92, 28, 11, '#b2f5e4');
    // a circle with a radius and an angle
    for (let a = 0; a < Math.PI * 2; a += 0.02) ctx.fillRect(Math.round(150 + Math.cos(a) * 18), Math.round(66 + Math.sin(a) * 18), 1, 1);
    chalk('#ff9a3c', [
      [150, 66],
      [168, 66],
    ]);
    chalk('#ff9a3c', [
      [150, 66],
      [162, 52],
    ]);
    pixelText(ctx, 'r', 156, 68, 8, '#ff9a3c');
    pixelText(ctx, '∠45°', 96, 52, 10, '#d4ff5a');
    // little doodles: hearts and stars the teacher drew
    fillTest(ctx, 176, 8, 8, 7, '#ff6cc5', (u, v) => {
      const x = u * 1.25;
      const y = -v * 1.25 + 0.25;
      const q = x * x + y * y - 1;
      return q * q * q - x * x * y * y * y <= 0;
    });
    fillTest(ctx, 82, 72, 6, 6, '#ffd93d', inCircle);
    pixelText(ctx, '★ 5+', 100, 76, 10, '#ffd93d');
    ctx.fillStyle = '#fff9fd';
    ctx.fillRect(0, 0, w, 1);
  });

/** A number line card strip 0…10 for over the board. */
const numberLine = () =>
  TX('numberLine', 176, 16, (ctx, w, h) => {
    ctx.fillStyle = '#fff9fd';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i <= 10; i++) {
      ctx.fillStyle = css(RAINBOW[i % RAINBOW.length]!);
      ctx.fillRect(i * 16, 0, 16, 3);
      pixelText(ctx, String(i), i * 16 + 8, 4, 10, css(LOUD[(i * 5) % LOUD.length]!), { align: 'center' });
    }
    ctx.fillStyle = '#30243b';
    ctx.fillRect(0, h - 1, w, 1);
  });

export const studyRoom3D: LocationDef3D = {
  id: 'study-room',
  states: [...CANDY_STATES],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: CANDY_AMBIENT });
    kit.setupLights();
    const ck = candyKit(kit, 505);
    const { r } = ck;
    const nt = { toneMapped: false };
    candyRoom(kit, ck, root, {
      XL,
      XR,
      BACK,
      H,
      FRONT,
      wall: kit.texM('studyWall', stripeWall('study', CANDY.babyPink, CANDY.lemon, [CANDY.pink, CANDY.blue, CANDY.grape, CANDY.grass]), { roughness: 0.9, ...nt }),
      side: kit.texM('studySide', polkaWall('studySide', CANDY.mint), { roughness: 0.9, ...nt }),
      floor: kit.texM('studyFloor', checkerFloor('study', CANDY.lavender, CANDY.sky, [CANDY.pink, CANDY.sunshine, CANDY.grass, CANDY.cherry]), { roughness: 0.5, ...nt }),
      ceiling: kit.texM('studyCeil', polkaWall('studyCeil', CANDY.lavender), { roughness: 1, ...nt }),
      windows: [
        [-5.6, -4.3],
        [4.3, 5.6],
      ],
      frameColor: CANDY.grape,
    });

    // ---- the board with chalk, a tray of coloured chalk, number line and clock above
    const bx = 0;
    ck.gloss.add(new THREE.BoxGeometry(3.6, 1.7, 0.08), CANDY.tangerine, bx, 1.75, BACK + 0.04);
    kit.pl(3.4, 1.5, kit.texM('studyBoard', boardTex(), { roughness: 0.9, ...nt }), bx, 1.75, BACK + 0.085);
    ck.gloss.add(new THREE.BoxGeometry(3.5, 0.05, 0.14), CANDY.tangerine, bx, 0.92, BACK + 0.12);
    for (let i = 0; i < 9; i++) ck.gloss.add(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), LOUD[i]!, bx - 1.2 + i * 0.12, 0.96, BACK + 0.13, { rz: Math.PI / 2 });
    kit.pl(3.5, 0.32, kit.texM('numberLine', numberLine(), { roughness: 0.9, ...nt }), bx, 2.82, BACK + 0.02);
    smileClock(ck, 2.55, 2.55, BACK, 0.3);
    // alphabet frieze along the top of the back wall and the side walls
    const frieze = kit.texM('alphabetFrieze', alphabetFrieze(), { roughness: 0.9, ...nt });
    for (const [a, b] of [
      [XL, -1.9],
      [1.9, XR],
    ] as const) {
      const g = new THREE.PlaneGeometry(b - a, 0.34);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * (b - a)) / 1.8);
      kit._add(g, frieze, (a + b) / 2, 2.88, BACK + 0.015);
    }

    // ---- left: shelf of binders, big abacus, crayon box, block pile
    kit.withT(-3.3, BACK, 0, () => {
      for (let k = 0; k < 4; k++) {
        ck.gloss.add(new THREE.BoxGeometry(1.4, 0.04, 0.32), CANDY.paper, 0, 0.3 + k * 0.45, 0.16);
        binderRow(ck, -0.68, 0.32 + k * 0.45, 0, 1.36, 11 + k * 7);
      }
      for (const s of [-0.71, 0.71]) ck.gloss.add(new THREE.BoxGeometry(0.04, 1.75, 0.32), CANDY.cobalt, s, 0.875, 0.16);
      ck.gloss.add(new THREE.BoxGeometry(1.46, 0.05, 0.34), CANDY.cobalt, 0, 1.75, 0.16);
      puffyShape(ck, 'star', -0.3, 1.95, 0.15, 0.16, CANDY.sunshine);
      solid(ck, 3, 0.25, 1.92, 0.15, 0.28, CANDY.magenta);
    });
    abacus(ck, -5.4, 0.15, BACK + 0.6, 1.0, 0.9, 3);
    for (const s of [-1, 1]) ck.gloss.add(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8), CANDY.tangerine, -5.4 + s * 0.5, 0.1, BACK + 0.6);
    crayonBox(ck, -4.3, BACK + 0.9, 0.6, 0.3);
    blockPile(ck, -6.0, -0.6, 3, 0.34, 120);

    // ---- right: cubbies with bins, a ring stack and balloons in the corner
    const top = cubbies(ck, 3.5, BACK, 4, 3, 0.42);
    for (let i = 0; i < 5; i++) block(ck, 2.8 + i * 0.3, top, BACK + 0.2, 0.22, { ry: (r() - 0.5) * 0.5, seed: 700 + i });
    puffyShape(ck, 'heart', 4.2, top + 0.4, BACK + 0.2, 0.18, CANDY.cherry);
    ringStack(ck, 5.9, -1.0, 0.8);
    [CANDY.pink, CANDY.sunshine, CANDY.blue, CANDY.grass].forEach((c, i) => balloon(ck, 6.0 + (i % 2) * 0.25, 2.2 + i * 0.18, -2.2 + (i % 2) * 0.2, c, 0.4));

    // ---- the teacher's desk (Melody's) with a globe, an apple, stacked books
    const deskX = -1.9;
    const dy = kidTable(ck, deskX, -2.1, 1.3, 0.6, CANDY.pink) + 0.12;
    ck.gloss.add(new THREE.BoxGeometry(1.3, 0.2, 0.6), CANDY.pink, deskX, 0.62 + 0.04, -2.1);
    ck.gloss.add(new THREE.SphereGeometry(0.16, 20, 14), (px, py) => (Math.sin(px * 30) * Math.cos(py * 24) > 0.2 ? CANDY.grass : CANDY.blue), deskX - 0.4, dy + 0.27, -2.15, { perFace: true });
    ck.gloss.add(new THREE.TorusGeometry(0.19, 0.012, 6, 24, Math.PI), CANDY.sunshine, deskX - 0.4, dy + 0.27, -2.15, { rz: 0.4 });
    ck.gloss.add(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 12), CANDY.sunshine, deskX - 0.4, dy + 0.05, -2.15);
    ck.gloss.add(new THREE.SphereGeometry(0.07, 16, 12), CANDY.cherry, deskX + 0.15, dy + 0.06, -2.0);
    ck.vc.add(new THREE.SphereGeometry(0.03, 8, 6), CANDY.grass, deskX + 0.18, dy + 0.14, -2.0, { sx: 1.5, sy: 0.4 });
    for (let i = 0; i < 4; i++) ck.vc.add(new THREE.BoxGeometry(0.34 - i * 0.03, 0.05, 0.24), LOUD[(i * 3) % LOUD.length]!, deskX + 0.45, dy + 0.025 + i * 0.05, -2.15, { ry: (i - 1.5) * 0.12 });
    stickerBomb(ck, deskX - 0.6, deskX + 0.6, 0.35, 0.6, -1.795, 6, { min: 0.1, max: 0.16 });

    // ---- kid tables and chairs at the sides, the rug in the middle
    for (const [tx, c] of [
      [-4.4, CANDY.aqua],
      [4.5, CANDY.sunshine],
    ] as const) {
      const ty = kidTable(ck, tx, -0.4, 0.9, 0.7, c);
      kidChair(ck, tx - 0.3, 0.25, Math.PI, pick(r, LOUD));
      kidChair(ck, tx + 0.3, 0.25, Math.PI, pick(r, LOUD));
      for (let i = 0; i < 3; i++) solid(ck, i + Math.round(tx), tx - 0.25 + i * 0.25, ty + 0.1, -0.45, 0.16, pick(r, LOUD), { ry: r() * 3 });
      ck.vc.add(new THREE.BoxGeometry(0.3, 0.005, 0.22), CANDY.paper, tx + 0.1, ty + 0.003, -0.2, { ry: 0.3 });
    }
    ringRug(ck, 0, -0.7, 1.5);

    // ---- ceiling: bunting, a mobile, candy pendants
    bunting(ck, [XL + 0.2, H - 0.15, BACK + 0.4], [XR - 0.2, H - 0.15, BACK + 0.4], 30, 0.45);
    bunting(ck, [XL + 0.2, H - 0.1, -1.6], [XR - 0.2, H - 0.1, -1.6], 26, 0.3);
    mobile(ck, 3.0, H, -1.4, 1.4);
    mobile(ck, -3.2, H, -1.0, 1.2);
    const pend = [CANDY.pink, CANDY.blue, CANDY.sunshine];
    [-2.4, 0.4, 3.2].forEach((x, i) => kit.pendant(`studyPend${i}`, x, H, -0.6, { drop: 0.55, shade: pend[i]!, kind: 'dome', on: { day: 0.7, dim: 0.2, glitch: i === 1 ? 0.5 : 0 }, intensity: 3, color: 0xfff0e8 }));

    // ---- stickers everywhere
    stickerBomb(ck, XL + 0.2, -1.9, 0.3, 2.6, BACK, 70, { wrong: 0.03 });
    stickerBomb(ck, 1.9, XR - 0.2, 1.7, 2.65, BACK, 50, { wrong: 0.03 });
    stickerBomb(ck, -1.8, 1.8, 0.2, 0.85, BACK, 26);
    stickerBomb(ck, XL, XR, 0.3, 2.7, BACK, 40, { late: true });
    sideStickers(ck, XL, BACK, 3, 0.3, 2.8, 1, 60, 0.03);
    sideStickers(ck, XR, BACK, 3, 0.3, 2.8, -1, 60, 0.03);

    // ---- light
    kit.lamp('studyFill', { light: kit.pointLight(0xfff4f0, 5, 14, 0, 2.8, 1.5, 0.8), on: { day: 1, dim: 0.3, glitch: 0.15 } });
    kit.lamp('studyPink', { light: kit.pointLight(CANDY.pink, 2.5, 7, -4.5, 2.2, -1.5, 1.2), on: ACCENT_ON });
    kit.lamp('studyBlue', { light: kit.pointLight(CANDY.blue, 2.5, 7, 4.5, 2.2, -1.5, 1.2), on: ACCENT_ON });
    kit.lamp('studyCode', { light: kit.pointLight(0x39ff88, 3, 10, 0, 2.2, -1.5, 1.0), on: { day: 0, dim: 0, glitch: 1 } });

    const fx: Fx[] = [
      floaters(kit, root, { x0: XL + 0.5, x1: XR - 0.5, y0: 2.2, y1: 2.9, z0: -2.5, z1: -0.5 }, low ? 15 : 25, r),
      glitter(kit, root, { x0: XL, x1: XR, y0: 0.3, y1: 3.0, z0: -2.8, z1: 1.5 }, low ? 100 : 180, r),
      glitchLayer(kit, root, { x0: XL + 1, x1: XR - 1, y0: 0.4, y1: 2.8, z: BACK }, 12, r),
    ];
    flushCandy(ck, root);
    kit.flushBatches();
    kit.onState((s) => {
      kit.fog = s === 'dim' ? new THREE.Fog(0x8f8aa0, 1, 16) : s === 'glitch' ? new THREE.Fog(0x1a0c24, 4, 16) : null;
    });
    return {
      kit,
      look: CANDY_LOOK,
      shots: {
        wide: { pos: [0, 1.65, 4.6], look: [0, 1.4, -1.6], fov: 50 },
        board: { pos: [0.6, 1.55, 1.4], look: [0, 1.6, BACK], fov: 46 },
        desk: { pos: [-1.0, 1.4, 1.0], look: [deskX, 0.95, -2.1], fov: 44 },
      },
      marks: {
        left: { x: -1.6, z: -0.8 },
        center: { x: 0, z: -0.9 },
        right: { x: 1.6, z: -0.8 },
        board: { x: 0.9, z: -1.9, facing: 'back' },
        desk: { x: deskX, z: -1.4 },
        door: { x: XR - 1.0, z: -0.4 },
      },
      walk: { minX: XL + 1, maxX: XR - 1, z: -0.8 },
      update(dt, t) {
        for (const f of fx) f.update(dt, t);
      },
    };
  },
};
