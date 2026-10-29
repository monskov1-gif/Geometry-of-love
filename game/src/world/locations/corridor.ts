// «Коридор» внутри игры (гл. 8–9): длинный школьный коридор детской
// программы. Разноцветные двери с радужными арками и знаками-фигурами,
// шкафчики в наклейках, доски объявлений, автомат с жвачкой, лампы-конфеты,
// гирлянда под потолком, радужная дорожка на клетчатом полу, парящие фигуры.
// В 'glitch' (гл. 9 «Стирание») свет гаснет до зелёного, по стенам бегут
// полосы сбоя, сквозь наклейки проступают глаза.
import * as THREE from 'three';
import { LocationKit } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { candyKit, flushCandy, pick } from '../candy/candy-kit';
import { balloon, beachBall, block, blockPile, crayon, lollipop, puffyShape, solid } from '../candy/toys';
import { bunting, candyDoor, lockers, mushroom, sideStickers, smileClock, stickerBomb } from '../candy/decor';
import { confetti, floaters, glitchLayer, glitter, type Fx } from '../candy/fx';
import { checkerFloor, polkaWall, stripeWall } from '../candy/textures';
import { CANDY, LOUD, RAINBOW } from '../candy/palette';
import { ACCENT_ON, CANDY_AMBIENT, CANDY_STATES } from '../candy/states';
import { candyRoom } from '../candy/room';

const BACK = -2.4;
const H = 3.0;
const XL = -10;
const XR = 10;
const FRONT = 6;

export const corridor3D: LocationDef3D = {
  id: 'corridor',
  states: [...CANDY_STATES],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: CANDY_AMBIENT });
    kit.setupLights();
    const ck = candyKit(kit, 808);
    const { r } = ck;
    const nt = { toneMapped: false };
    candyRoom(kit, ck, root, {
      XL,
      XR,
      BACK,
      H,
      FRONT,
      wall: kit.texM('corrWall', stripeWall('corridor', CANDY.mint, CANDY.lavender, [CANDY.pink, CANDY.tangerine, CANDY.cobalt, CANDY.sunshine]), { roughness: 0.9, ...nt }),
      side: kit.texM('corrSide', polkaWall('corrSide', CANDY.babyPink), { roughness: 0.9, ...nt }),
      floor: kit.texM('corrFloor', checkerFloor('corridor', CANDY.lemon, CANDY.babyPink, [CANDY.grape, CANDY.blue, CANDY.grass, CANDY.cherry]), { roughness: 0.45, ...nt }),
      ceiling: kit.texM('corrCeil', polkaWall('corrCeil', CANDY.sky), { roughness: 1, ...nt }),
      windows: [[-0.7, 0.7]],
      frameColor: CANDY.cobalt,
    });
    // wainscot band of polka dots with a rail
    kit.wainscot([[XL, XR]], BACK, 0.9, kit.texM('corrWains', polkaWall('corrWains', CANDY.lilac), { roughness: 0.8, ...nt }), { railColor: CANDY.pink });

    // ---- rainbow runner down the middle
    const runner = new THREE.PlaneGeometry(XR - XL, 1.4, 1, 7);
    runner.rotateX(-Math.PI / 2);
    ck.vc.add(runner, (_x, _y, pz) => RAINBOW[Math.min(6, Math.floor(((pz + 0.7) / 1.4) * 7))]!, (XL + XR) / 2, 0.006, -0.6, { perFace: true });
    for (let x = XL; x < XR; x += 0.6) ck.stickers.add(new THREE.PlaneGeometry(0.3, 0.3), 0xffffff, x + 0.3, 0.009, Math.round(x * 3) % 2 ? -0.95 : -0.25, { tile: Math.round(x * 7 + 40) % 2 ? 1 : 0, rx: -Math.PI / 2 });

    // ---- doors with rainbow arches, lockers between them
    const doors: [number, number, number][] = [
      [-7.6, CANDY.cherry, 9],
      [-3.4, CANDY.grape, 10],
      [3.4, CANDY.blue, 1],
      [7.6, CANDY.grass, 0],
    ];
    for (const [x, c, st] of doors) {
      candyDoor(ck, x, BACK, 1.0, 2.1, c, { sticker: st });
      RAINBOW.forEach((rc, i) => ck.gloss.add(new THREE.TorusGeometry(0.82 - i * 0.07, 0.04, 8, 28, Math.PI), rc, x, 2.15, BACK + 0.05, { sz: 0.5 }));
      puffyShape(ck, 'star', x, 2.62, BACK + 0.1, 0.16, CANDY.sunshine);
    }
    lockers(ck, -6.4, 5, BACK);
    lockers(ck, 4.6, 5, BACK);
    lockers(ck, -2.3, 2, BACK, 1.5);
    lockers(ck, 1.6, 2, BACK, 1.5);

    // ---- notice boards crowded with stickers and drawings
    for (const [x, c] of [
      [-5.3, CANDY.tangerine],
      [5.3, CANDY.magenta],
    ] as const) {
      ck.gloss.add(new THREE.BoxGeometry(1.0, 0.7, 0.04), c, x, 2.35, BACK + 0.02);
      ck.vc.add(new THREE.BoxGeometry(0.9, 0.6, 0.01), CANDY.paper, x, 2.35, BACK + 0.045);
      stickerBomb(ck, x - 0.4, x + 0.4, 2.1, 2.6, BACK + 0.05, 14, { min: 0.1, max: 0.2, wrong: 0.05 });
    }
    smileClock(ck, 0, 2.62, BACK, 0.22);

    // ---- gumball machine and a lollipop in a pot
    const gx = -1.3;
    ck.gloss.add(new THREE.CylinderGeometry(0.2, 0.26, 0.8, 16), CANDY.cherry, gx, 0.4, BACK + 0.5);
    ck.gloss.add(new THREE.BoxGeometry(0.16, 0.12, 0.05), CANDY.paper, gx, 0.65, BACK + 0.74);
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r()) * 0.24;
      const y = 0.88 + r() * 0.3;
      ck.gloss.add(new THREE.SphereGeometry(0.045, 10, 8), pick(r, LOUD), gx + Math.cos(a) * rr, y, BACK + 0.5 + Math.sin(a) * rr);
    }
    kit.sph(0.3, kit.glass(), gx, 1.06, BACK + 0.5, { ws: 24, hs: 18 });
    ck.gloss.add(new THREE.CylinderGeometry(0.06, 0.12, 0.08, 16), CANDY.cherry, gx, 1.38, BACK + 0.5);
    ck.gloss.add(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 16), CANDY.sunshine, 1.3, 0.15, BACK + 0.5);
    lollipop(ck, 1.3, BACK + 0.5, 1.2, 0.35, 2);

    // ---- toys left in the corridor (along the walls, not on the path)
    blockPile(ck, -9.2, -1.6, 3, 0.36, 210);
    blockPile(ck, 9.1, -1.7, 2, 0.4, 230);
    beachBall(ck, -4.8, 0, -1.7, 0.26, 0.7);
    mushroom(ck, 5.9, -1.7, 0.7, CANDY.grape);
    crayon(ck, -0.2, 0.12, -1.85, 1.0, 0.1, CANDY.aqua, { rz: Math.PI / 2, ry: 0.2 });
    for (let i = 0; i < 9; i++) block(ck, XL + 1 + i * 2.2 + r(), 0, -1.9 + r() * 0.2, 0.2 + r() * 0.12, { ry: r() * 2, seed: 900 + i });
    for (let i = 0; i < 6; i++) solid(ck, i, XL + 2 + i * 3.1, 0.2, 1.3 + r() * 0.5, 0.32, pick(r, LOUD), { ry: r() * 3 });
    [CANDY.cherry, CANDY.blue, CANDY.sunshine, CANDY.pink, CANDY.grass].forEach((c, i) => balloon(ck, 8.6 + (i % 3) * 0.28, 2.0 + i * 0.12, -1.9 + (i % 2) * 0.2, c, 0.1));

    // ---- ceiling: bunting swags and candy pendants
    for (let x = XL; x < XR - 0.1; x += 4) bunting(ck, [x, H - 0.08, -1.0], [x + 4, H - 0.08, -1.0], 9, 0.4);
    const pend = [CANDY.pink, CANDY.sunshine, CANDY.blue, CANDY.grass, CANDY.grape];
    [-8, -4, 0, 4, 8].forEach((x, i) => kit.pendant(`corrPend${i}`, x, H, -0.8, { drop: 0.45, shade: pend[i]!, kind: 'dome', on: { day: 0.8, dim: 0.2, glitch: i % 2 ? 0.6 : 0 }, intensity: 2.6, color: 0xfff0e8 }));

    // ---- stickers everywhere; eyes in the later phase
    stickerBomb(ck, XL, XR, 0.15, 0.85, BACK + 0.01, 90, { min: 0.1, max: 0.22 });
    stickerBomb(ck, XL, XR, 1.2, 2.85, BACK, 90, { wrong: 0.03 });
    stickerBomb(ck, XL, XR, 0.2, 2.8, BACK + 0.47, 50, { late: true, min: 0.12, max: 0.3 });
    sideStickers(ck, XL, BACK, 3, 0.3, 2.7, 1, 50, 0.03);
    sideStickers(ck, XR, BACK, 3, 0.3, 2.7, -1, 50, 0.03);

    kit.lamp('corrFill', { light: kit.pointLight(0xfff4f0, 5, 16, 0, 2.6, 2, 0.8), on: { day: 1, dim: 0.3, glitch: 0.1 } });
    kit.lamp('corrPink', { light: kit.pointLight(CANDY.pink, 2.5, 8, -6, 2.2, -1, 1.2), on: ACCENT_ON });
    kit.lamp('corrBlue', { light: kit.pointLight(CANDY.blue, 2.5, 8, 6, 2.2, -1, 1.2), on: ACCENT_ON });
    kit.lamp('corrCode', { light: kit.pointLight(0x39ff88, 4, 12, 0, 2.2, -1, 1.0), on: { day: 0, dim: 0, glitch: 1 } });

    const fx: Fx[] = [
      floaters(kit, root, { x0: XL, x1: XR, y0: 2.0, y1: 2.7, z0: -2.0, z1: 0.2 }, low ? 20 : 30, r),
      glitter(kit, root, { x0: XL, x1: XR, y0: 0.3, y1: 2.8, z0: -2.2, z1: 1.5 }, low ? 120 : 200, r),
      glitchLayer(kit, root, { x0: XL + 1, x1: XR - 1, y0: 0.4, y1: 2.7, z: BACK + 0.5 }, 16, r),
    ];
    confetti(kit, root, { x0: XL, x1: XR, z0: -2.2, z1: 2.5 }, low ? 200 : 360, r, 0.012);
    flushCandy(ck, root);
    kit.flushBatches();
    kit.onState((s) => {
      kit.fog = s === 'dim' ? new THREE.Fog(0x8f8aa0, 1, 16) : s === 'glitch' ? new THREE.Fog(0x0c0614, 3, 14) : null;
    });
    return {
      kit,
      shots: {
        wide: { pos: [0, 1.65, 4.6], look: [0, 1.35, -1.4], fov: 50 },
        long: { pos: [-8.5, 1.6, 2.6], look: [2, 1.2, -1.2], fov: 52 },
        door: { pos: [3.9, 1.5, 1.4], look: [3.4, 1.3, BACK], fov: 46 },
      },
      marks: {
        left: { x: -1.7, z: -0.6 },
        center: { x: 0, z: -0.6 },
        right: { x: 1.7, z: -0.6 },
        door: { x: 3.4, z: -1.5, facing: 'back' },
        far: { x: 8, z: -1.0 },
      },
      walk: { minX: XL + 1, maxX: XR - 1, z: -0.6 },
      update(dt, t) {
        for (const f of fx) f.update(dt, t);
      },
    };
  },
};
