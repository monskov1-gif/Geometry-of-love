// «Старый архив» (гл. 7): «в дальнем углу Песочницы — старые папки и записи.
// Не математические задания. Что-то другое». Та же конфетная игра, только
// старше и забытая: выцветшие полосатые обои с отклеивающимися наклейками,
// стеллажи до потолка с разноцветными папками, лестница-стремянка,
// шкафы-картотеки пастельных цветов, стопки папок на полу, старый
// компьютер-игрушка с зелёным экраном, голая лампочка, паутина, пыль в
// воздухе. В 'glitch' — полосы сбоя и глаза среди наклеек.
import * as THREE from 'three';
import { LocationKit, rng, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { candyKit, flushCandy } from '../candy/candy-kit';
import { block, puffyShape, solid } from '../candy/toys';
import { binderRow, cabinet, folderStack, sideStickers, stickerBomb } from '../candy/decor';
import { floaters, glitchLayer, glitter, type Fx } from '../candy/fx';
import { checkerFloor, polkaWall, stripeWall } from '../candy/textures';
import { CANDY, PASTEL } from '../candy/palette';
import { CANDY_AMBIENT, CANDY_STATES } from '../candy/states';
import { candyRoom } from '../candy/room';
import { bareBulb } from '../props';
import { pixelText } from '../candy/shapes';

const BACK = -3.2;
const H = 3.4;
const XL = -6.5;
const XR = 6.5;
const FRONT = 6;

/** The old toy computer's screen: green rows of an old file list (no story text). */
const oldScreen = () =>
  TX('archiveScreen', 64, 48, (ctx, w, h) => {
    const r = rng(17);
    ctx.fillStyle = '#0a1a10';
    ctx.fillRect(0, 0, w, h);
    pixelText(ctx, 'ARCHIVE', 3, 2, 8, '#39ff88');
    for (let y = 14; y < h - 4; y += 5) {
      ctx.fillStyle = r() < 0.15 ? '#f04b67' : '#39ff88';
      ctx.fillRect(3, y, 4, 2);
      ctx.fillRect(9, y, 10 + Math.floor(r() * 30), 2);
    }
    ctx.fillStyle = '#39ff88';
    ctx.fillRect(3, h - 5, 4, 3);
  });

const AMBIENT = {
  ...CANDY_AMBIENT,
  day: { sky: 0xeadcf0, ground: 0x5a4a62, hemi: 0.95, fill: 0xffe8d8, fillI: 0.45, bg: 0x2a2230 },
};

export const archive3D: LocationDef3D = {
  id: 'archive',
  states: [...CANDY_STATES],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: AMBIENT });
    kit.setupLights();
    const ck = candyKit(kit, 707);
    const { r } = ck;
    const nt = { toneMapped: false };
    candyRoom(kit, ck, root, {
      XL,
      XR,
      BACK,
      H,
      FRONT,
      wall: kit.texM('archWall', stripeWall('archive', 0xd8c8d8, 0xe8dcc8, [0xc890b0, 0x90a8c8, 0xc8b070, 0x98c098]), { roughness: 0.95, ...nt }),
      side: kit.texM('archSide', polkaWall('archSide', 0xd0c4d8), { roughness: 0.95, ...nt }),
      floor: kit.texM('archFloor', checkerFloor('archive', 0xc8bcd0, 0xe0d4c0, [0xb07890, 0x7890b0, 0xb0a060, 0x80a880]), { roughness: 0.7, ...nt }),
      ceiling: kit.texM('archCeil', polkaWall('archCeil', 0xc8bcc8), { roughness: 1, ...nt }),
      frameColor: 0xb090b0,
    });

    // ---- shelves to the ceiling along the back wall, full of binders
    const shelfC = [CANDY.lilac, CANDY.peach, CANDY.mint];
    for (let s = 0; s < 4; s++) {
      const sx = -5.0 + s * 1.55;
      if (s === 2) continue; // the gap for the cabinets and the old computer
      kit.withT(sx, BACK, 0, () => {
        const c = shelfC[s % shelfC.length]!;
        for (const side of [-0.72, 0.72]) ck.gloss.add(new THREE.BoxGeometry(0.05, 3.1, 0.36), c, side, 1.55, 0.18);
        for (let k = 0; k < 7; k++) {
          ck.gloss.add(new THREE.BoxGeometry(1.44, 0.035, 0.36), c, 0, 0.12 + k * 0.44, 0.18);
          if (k < 6) binderRow(ck, -0.7, 0.14 + k * 0.44, 0, 1.4, 31 + s * 17 + k * 5);
        }
      });
    }
    kit.withT(3.6, BACK, 0, () => {
      for (const side of [-1.3, 1.3]) ck.gloss.add(new THREE.BoxGeometry(0.05, 3.1, 0.36), CANDY.lavender, side, 1.55, 0.18);
      for (let k = 0; k < 7; k++) {
        ck.gloss.add(new THREE.BoxGeometry(2.6, 0.035, 0.36), CANDY.lavender, 0, 0.12 + k * 0.44, 0.18);
        if (k < 6) binderRow(ck, -1.28, 0.14 + k * 0.44, 0, 2.56, 91 + k * 9);
      }
    });
    // rolling ladder leaning on the right shelf
    kit.withT(2.6, BACK + 0.5, 0, () => {
      for (const s of [-0.22, 0.22]) ck.gloss.add(new THREE.CylinderGeometry(0.025, 0.025, 3.0, 8), CANDY.tangerine, s, 1.45, 0, { rx: -0.14 });
      for (let k = 0; k < 9; k++) ck.gloss.add(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 8), CANDY.sunshine, 0, 0.25 + k * 0.32, 0.03 - k * 0.045, { rz: Math.PI / 2 });
    });

    // ---- the gap: filing cabinets and an old toy computer on them
    cabinet(ck, -2.3, BACK, 0xd8a8c8);
    cabinet(ck, -1.7, BACK, 0xa8c8d8, 3, 1.05);
    cabinet(ck, -1.1, BACK, 0xd8d0a0);
    const cy = 1.05;
    ck.gloss.add(new THREE.BoxGeometry(0.62, 0.48, 0.46), 0xf0d0e0, -1.7, cy + 0.26, BACK + 0.32);
    ck.gloss.add(new THREE.BoxGeometry(0.66, 0.06, 0.5), 0xd8a8c8, -1.7, cy + 0.03, BACK + 0.32);
    const screen = kit.glowM('archiveScreen', 0xffffff, 0x39ff88, { map: oldScreen(), emissiveMap: oldScreen() });
    kit.pl(0.44, 0.33, screen, -1.7, cy + 0.28, BACK + 0.555);
    kit.lamp('archiveScreen', { light: kit.pointLight(0x39ff88, 1.6, 3.5, -1.7, cy + 0.3, BACK + 1.0, 1.4), mats: [[screen, 1.0]], on: { day: 0.8, dim: 0.4, glitch: 1 } });
    for (let i = 0; i < 3; i++) ck.stickers.add(new THREE.PlaneGeometry(0.1, 0.1), 0xd8d0d8, -1.95 + i * 0.25, cy + 0.08, BACK + 0.557, { tile: i * 3 + 1, rz: i - 1 });

    // ---- folders and boxes on the floor, a fallen star, old toys covered in dust
    for (let i = 0; i < 9; i++) folderStack(ck, XL + 0.7 + i * 1.4 + r() * 0.3, 0, BACK + 0.6 + r() * 0.5, 3 + Math.floor(r() * 7));
    for (let i = 0; i < 4; i++) {
      const bx = XL + 0.8 + i * 3.6 + r();
      const c = PASTEL[i % PASTEL.length]!;
      ck.vc.add(new THREE.BoxGeometry(0.6, 0.42, 0.45), c, bx, 0.21, -1.6 + r() * 0.3, { ry: (r() - 0.5) * 0.4 });
      ck.vc.add(new THREE.BoxGeometry(0.62, 0.04, 0.47), CANDY.paper, bx, 0.43, -1.6, { ry: (r() - 0.5) * 0.4 });
      ck.stickers.add(new THREE.PlaneGeometry(0.2, 0.2), 0xd0c8d0, bx, 0.25, -1.36 + 0.02, { tile: Math.floor(r() * 20) });
    }
    puffyShape(ck, 'star', 4.9, 0.12, -1.5, 0.3, 0xd8c070, { rx: -Math.PI / 2 + 0.2 });
    solid(ck, 3, -5.6, 0.12, -0.9, 0.5, 0xc898b8, { rx: 1.5 });
    for (let i = 0; i < 5; i++) block(ck, -4.3 + i * 0.38, 0, -1.9 + (i % 2) * 0.15, 0.3, { ry: r(), seed: 400 + i });

    // ---- cobwebs in the top corners: little fans of threads
    const web = kit.M('cobweb', 0xf0eaf0, { roughness: 1 });
    for (const [wx, dir] of [
      [XL, 1],
      [XR, -1],
      [-0.9, 1],
    ] as const)
      for (let k = 0; k < 6; k++) {
        const a = (k / 5) * (Math.PI / 2);
        kit.rod([wx, H, BACK + 0.05], [wx + dir * Math.cos(a) * 0.6, H - Math.sin(a) * 0.6, BACK + 0.05], 0.003, web);
      }

    // ---- old stickers, peeling and faded; eyes later
    stickerBomb(ck, XL, XR, 0.2, 3.1, BACK + 0.37, 40, { tint: 0xd8d0d8, wrong: 0.06 });
    stickerBomb(ck, XL, XR, 0.3, 3.0, BACK + 0.37, 40, { late: true, min: 0.1, max: 0.24 });
    sideStickers(ck, XL, BACK, 3, 0.3, 3.0, 1, 40, 0.06);
    sideStickers(ck, XR, BACK, 3, 0.3, 3.0, -1, 40, 0.06);

    // ---- light: a bare bulb, the screen glow, a little coloured light left over
    bareBulb(kit, 'archiveBulb', 0.4, H, -1.3, 0.9, { day: 1, dim: 0.5, glitch: 0.3 });
    kit.lamp('archiveFill', { light: kit.pointLight(0xffe0d0, 3, 12, 0, 2.4, 2, 0.8), on: { day: 1, dim: 0.3, glitch: 0.1 } });
    kit.lamp('archivePink', { light: kit.pointLight(CANDY.pink, 1.6, 7, -4.5, 2.4, -1.5, 1.2), on: { day: 0.7, dim: 0.2, glitch: 0.3 } });
    kit.lamp('archiveCode', { light: kit.pointLight(0x39ff88, 3, 10, 2, 2.2, -1.5, 1.0), on: { day: 0, dim: 0, glitch: 1 } });

    const fx: Fx[] = [
      floaters(kit, root, { x0: XL + 1, x1: XR - 1, y0: 2.4, y1: 3.1, z0: -2.4, z1: -0.8 }, low ? 8 : 12, r),
      glitter(kit, root, { x0: XL, x1: XR, y0: 0.3, y1: 3.2, z0: -2.8, z1: 1.5 }, low ? 90 : 160, r),
      glitchLayer(kit, root, { x0: XL + 1, x1: XR - 1, y0: 0.4, y1: 3.0, z: BACK + 0.4 }, 14, r),
    ];
    flushCandy(ck, root);
    kit.flushBatches();
    kit.onState((s) => {
      kit.fog = s === 'dim' ? new THREE.Fog(0x8f8aa0, 1, 16) : s === 'glitch' ? new THREE.Fog(0x0c0614, 3, 14) : new THREE.Fog(0x3a3040, 8, 22);
    });
    return {
      kit,
      shots: {
        wide: { pos: [0, 1.7, 4.6], look: [0, 1.5, -1.6], fov: 50 },
        computer: { pos: [-1.2, 1.5, 0.6], look: [-1.7, 1.3, BACK], fov: 44 },
        shelves: { pos: [2.2, 1.8, 1.0], look: [3.6, 1.8, BACK], fov: 48 },
      },
      marks: {
        left: { x: -1.7, z: -0.6 },
        center: { x: 0, z: -0.6 },
        right: { x: 1.7, z: -0.6 },
        computer: { x: -1.7, z: -1.9, facing: 'back' },
        shelves: { x: 3.4, z: -1.9, facing: 'back' },
      },
      walk: { minX: XL + 1, maxX: XR - 1, z: -0.6 },
      update(dt, t) {
        for (const f of fx) f.update(dt, t);
      },
    };
  },
};
