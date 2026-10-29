// Комната Дамео: съёмная, он только что въехал. Обычная комната 4,4 × 4 м,
// потолок 2,55 м, мебель стоит по всему объёму, а не вдоль одной стены:
//   слева  — кровать изголовьем к стене, с длинной подушкой с аниме-принтом;
//   центр  — окно с полуопущенными жалюзи, ковёр, коробка от пиццы, банки;
//   справа — стол со старым бежевым компьютером (ЭЛТ, системный блок, лампа
//            на кронштейне) — по референсу автора, — офисное кресло, стеллаж с
//            мангой и фигурками у правой стены;
//   спереди — кресло-мешок, неразобранные коробки, мешок с мусором.
// Чужие выцветшие обои, голая лампочка, записки «для себя» на стене.
import * as THREE from 'three';
import { AppScreen } from '../app-screen';
import { LocationKit, rgb, rng, TEX, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import {
  architectLamp,
  bareBulb,
  can,
  clothesPile,
  crtComputer,
  crumpled,
  figurine,
  movingBox,
  noodleCup,
  officeChair,
  pizzaBox,
  poster,
  retroKeyboard,
  retroMouse,
  wallPaper,
} from '../props';

const BACK = -2.4;
const FRONT = 1.6;
const H = 2.55;
const XL = -2.2;
const XR = 2.2;

/** Faded wallpaper left by the previous tenant: vertical stems, small diamonds, stains. */
const wallpaper = () =>
  TX('dameoWallpaper2', 64, 64, (ctx, w, h) => {
    const r = rng(3);
    ctx.fillStyle = rgb(160, 170, 158);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      const v = (r() - 0.5) * 14;
      ctx.fillStyle = rgb(160 + v, 170 + v, 158 + v, 0.6);
      ctx.fillRect(r() * w, r() * h, 1, 1);
    }
    for (const x of [8, 40]) {
      ctx.fillStyle = 'rgba(110,122,106,0.55)';
      for (let y = 0; y < h; y += 2) ctx.fillRect(x + Math.round(Math.sin(y / 5) * 1.5), y, 1, 1);
      for (let y = 6; y < h; y += 16) {
        ctx.fillStyle = 'rgba(130,104,96,0.45)';
        ctx.fillRect(x - 2, y, 1, 1);
        ctx.fillRect(x - 3, y + 1, 3, 1);
        ctx.fillRect(x - 2, y + 2, 1, 1);
      }
    }
    for (let i = 0; i < 3; i++) {
      const cx = r() * w;
      const cy = r() * h;
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = 'rgba(130,118,86,0.12)';
        ctx.fillRect(cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 8, 2, 2);
      }
    }
  });

/** An original "magical girl" anime poster (not Melody): pastel, starry, a big-eyed heroine. */
function animePoster(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7a5ad8');
  g.addColorStop(1, '#ff8ac8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.5})`;
    ctx.fillRect(r() * w, r() * h * 0.6, 1, 1);
  }
  const cx = w / 2;
  ctx.fillStyle = '#3ac8c0';
  ctx.fillRect(cx - 18, 14, 36, 22);
  ctx.fillRect(cx - 24, 20, 8, 40);
  ctx.fillRect(cx + 16, 20, 8, 40);
  ctx.fillStyle = '#ffe0d0';
  ctx.fillRect(cx - 11, 22, 22, 18);
  ctx.fillStyle = '#2a2a5a';
  ctx.fillRect(cx - 8, 28, 5, 6);
  ctx.fillRect(cx + 3, 28, 5, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 7, 29, 2, 2);
  ctx.fillRect(cx + 4, 29, 2, 2);
  ctx.fillStyle = '#fff8fc';
  ctx.beginPath();
  ctx.moveTo(cx - 10, 42);
  ctx.lineTo(cx + 10, 42);
  ctx.lineTo(cx + 20, 80);
  ctx.lineTo(cx - 20, 80);
  ctx.fill();
  ctx.fillStyle = '#ff6cc5';
  ctx.fillRect(cx - 4, 44, 8, 4);
  ctx.fillStyle = '#f8e060';
  ctx.fillRect(cx + 18, 30, 2, 30);
  ctx.fillRect(cx + 15, 26, 8, 6);
  ctx.fillStyle = '#ffffff';
  ctx.font = '9px Tiny5, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ホシノ☆ミライ', cx, h - 14);
  ctx.font = '6px Tiny5, monospace';
  ctx.fillText('СЕЗОН 2', cx, h - 5);
}

/** An original retro arcade shooter poster. */
function arcadePoster(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#0c0a24';
  ctx.fillRect(0, 0, w, h);
  const r = rng(30);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = r() < 0.2 ? '#ffd070' : '#ffffff';
    ctx.fillRect(r() * w, r() * h, 1, 1);
  }
  ctx.strokeStyle = '#ff3ac8';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = h * 0.62 + i * i * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 4, h * 0.62);
    ctx.lineTo(w / 2 + i * 16, h);
    ctx.stroke();
  }
  ctx.fillStyle = '#c8d8f0';
  ctx.beginPath();
  ctx.moveTo(w / 2, 22);
  ctx.lineTo(w / 2 + 12, 46);
  ctx.lineTo(w / 2 - 12, 46);
  ctx.fill();
  ctx.fillStyle = '#ff7a30';
  ctx.fillRect(w / 2 - 3, 46, 6, 5);
  ctx.fillStyle = '#ffe060';
  ctx.font = '10px Tiny5, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STAR LANCER', w / 2, 12);
}

/** A notes-to-self sheet: the voice Dameo talks to himself in. */
function selfNotes(lines: string[], bg: string) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#20202c';
    ctx.font = '6px Tiny5, monospace';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, 2, 2 + i * 7));
  };
}

export const dameoRoom3D: LocationDef3D = {
  id: 'dameo-room',
  states: ['evening', 'night', 'day'],
  defaultState: 'evening',
  build(root, { low }) {
    const kit = new LocationKit(root, { low });
    kit.setupLights();
    const r = rng(9);

    // ---- shell
    kit.floorRect(XL, XR, BACK, FRONT, kit.texM('dameoFloor', TEX.planks(1), { roughness: 0.55 }));
    const wallM = kit.texM('dameoWall2', wallpaper(), { roughness: 0.95 });
    const win = { x0: -0.75, x1: 0.45, y0: 0.95, y1: 2.15 };
    kit.wall(XL, XR, H, BACK, wallM, [win], { tile: 1.6 });
    kit.sideWall(XL, BACK, FRONT, H, wallM, 1, { tile: 1.6 });
    kit.sideWall(XR, BACK, FRONT, H, wallM, -1, { tile: 1.6 });
    const ceilT = TX('dameoCeil2', 64, 64, (ctx, w, h) => {
      const q = rng(21);
      ctx.fillStyle = '#d4d0c4';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = `rgba(90,80,60,${q() * 0.15})`;
        ctx.fillRect(q() * w, q() * h, 1, 1);
      }
    });
    kit.ceilingPoly(
      [
        [XL, BACK],
        [XR, BACK],
        [XR, FRONT],
        [XL, FRONT],
      ],
      H,
      kit.texM('dameoCeil2', ceilT, { roughness: 1, emissive: 0x0a0806 }),
    );
    kit.trims([[XL, XR]], BACK, H, { crown: false, color: 0x7a7264 });

    // ---- window: blinds half down; the street behind
    kit.brightWindow(win.x0, win.x1, win.y0, win.y1, BACK, { profile: 'C', blinds: true, variant: 'low' });
    kit.radiator((win.x0 + win.x1) / 2, 0.14, BACK, 0.9, { h: 0.5 });
    kit.rb(win.x1 - win.x0 + 0.1, 0.03, 0.2, 0.008, kit.white(), (win.x0 + win.x1) / 2, win.y0 - 0.015, BACK + 0.08);
    kit.plant(win.x0 + 0.18, win.y0, BACK + 0.1, 0.32, 'pothos', 0x9a5a3a);
    can(kit, win.x1 - 0.12, win.y0, BACK + 0.1, 0x2ab068);
    can(kit, win.x1 - 0.22, win.y0, BACK + 0.08, 0x2ab068);

    // ---- bed along the left wall, head to the back wall; long printed pillow
    kit.bed(-1.55, BACK + 1.08, -Math.PI / 2, { L: 2.0, W: 1.15, duvet: TEX.plaid(1), sheet: 0xbcc0bc, seed: 5 });
    const daki = TX('dakimakura', 24, 72, (ctx, w, h) => {
      ctx.fillStyle = '#f4eef4';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3ac8c0';
      ctx.fillRect(4, 4, 16, 14);
      ctx.fillRect(2, 10, 4, 26);
      ctx.fillRect(18, 10, 4, 26);
      ctx.fillStyle = '#ffe0d0';
      ctx.fillRect(7, 10, 10, 9);
      ctx.fillStyle = '#2a2a5a';
      ctx.fillRect(8, 13, 3, 3);
      ctx.fillRect(13, 13, 3, 3);
      ctx.fillStyle = '#ff9ad0';
      ctx.fillRect(6, 22, 12, 30);
    });
    kit.cush(0.36, 0.13, 1.05, 0.06, kit.texM('dakimakura', daki, { roughness: 0.9 }), -1.25, 0.66, BACK + 1.15, { puff: 0.7, seed: 4, ry: 0.08 });
    clothesPile(kit, -1.0, 0.0, 12, [0x3a4a4c, 0x2a2a30, 0x9a9488]);
    const ns = movingBox(kit, -0.62, 0, BACK + 0.28, 0.42, 0.42, 0.38, { seed: 8, label: 'ВСЁ' });
    kit.rb(0.075, 0.15, 0.01, 0.004, kit.M('phone', 0x18181c, { roughness: 0.3 }), -0.58, ns + 0.006, BACK + 0.3, { rx: -Math.PI / 2, rz: 0.4 });
    kit.cy(0.05, 0.05, 0.05, kit.M('clock', 0xe8e4dc, { roughness: 0.4 }), -0.7, ns + 0.025, BACK + 0.22, { rx: Math.PI / 2, seg: 18 });
    kit.tube(
      [
        [-0.54, ns + 0.01, BACK + 0.34],
        [-0.4, ns - 0.1, BACK + 0.4],
        [-0.38, 0.05, BACK + 0.2],
        [-0.3, 0.02, BACK + 0.06],
      ],
      0.003,
      kit.M('cable', 0xe8e8e4),
    );
    poster(kit, -1.55, 1.62, BACK, 0.5, 0.72, 'anime', animePoster, 0.02);

    // ---- the computer corner (author's reference: beige CRT, architect lamp, clutter)
    const deskW = 1.45;
    const deskX = XR - deskW / 2 - 0.05;
    const top = kit.desk(deskX, BACK + 0.02, 0, { w: deskW, d: 0.7, wood: kit.texM('deskOak', TEX.oak(1), { roughness: 0.5 }) });
    const app = new AppScreen();
    const crtX = deskX - 0.12;
    const crt = crtComputer(kit, crtX, top, BACK + 0.06, app.texture);
    retroKeyboard(kit, crtX, top, BACK + 0.58);
    retroMouse(kit, crtX + 0.38, top, BACK + 0.56);
    architectLamp(kit, 'archLamp', deskX + 0.58, top, BACK + 0.08, { evening: 1, night: 0.7, day: 0 }, { reach: 0.4, ry: -0.5 });
    kit.withT(deskX, BACK + 0.02, 0, () => {
      noodleCup(kit, -0.58, top, 0.32, 11);
      noodleCup(kit, -0.5, top, 0.5, 14);
      can(kit, 0.48, top, 0.52, 0x2ab068);
      can(kit, 0.55, top, 0.42, 0x2ab068, true);
      kit.mug(-0.42, top, 0.18, 0x4a5a6a, 0.8);
      crumpled(kit, 0.32, top, 0.62, 2);
      // a pocket calculator by the keyboard (a calculator matters later)
      kit.rb(0.075, 0.012, 0.13, 0.004, kit.M('calcBody', 0x3a3a40, { roughness: 0.5 }), 0.3, top + 0.006, 0.5, { ry: 0.35 });
      kit.rb(0.055, 0.002, 0.03, 0.001, kit.M('calcLcd', 0x9aa88a, { roughness: 0.3 }), 0.29, top + 0.013, 0.46, { ry: 0.35 });
      const page = TX('homework', 30, 20, (ctx, w, h) => {
        const q = rng(44);
        ctx.fillStyle = '#f4f0e6';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#b8d0e8';
        for (let y = 3; y < h; y += 3) ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = '#26384b';
        for (let i = 0; i < 12; i++) ctx.fillRect(2 + q() * 20, 2 + q() * 16, 3 + q() * 5, 1);
        ctx.fillStyle = '#d94c62';
        ctx.fillRect(20, 3, 7, 1);
        ctx.fillRect(20, 3, 1, 7);
      });
      kit.rb(0.3, 0.01, 0.2, 0.003, kit.texM('homework', page, { roughness: 0.9 }), -0.4, top + 0.005, 0.55, { ry: 0.25 });
      kit.bookStack(-0.62, top, 0.12, 3, 9);
    });
    // shelf above the desk: manga volumes and figures
    const shelfY = 1.6;
    const oak = kit.texM('deskOak', TEX.oak(1), { roughness: 0.5 });
    kit.rb(deskW - 0.2, 0.025, 0.22, 0.006, oak, deskX, shelfY, BACK + 0.11);
    for (const s of [-1, 1]) kit.rb(0.02, 0.12, 0.18, 0.004, kit.M('bracket', 0x5a5a5c, { metalness: 0.6 }), deskX + s * 0.5, shelfY - 0.07, BACK + 0.09);
    kit.bookRow(deskX - 0.6, shelfY + 0.012, BACK + 0.12, 16, 77, 0.62, 0.15);
    figurine(kit, deskX + 0.15, shelfY + 0.012, BACK + 0.12, 0xff8ac8, 0xfff8fc);
    figurine(kit, deskX + 0.3, shelfY + 0.012, BACK + 0.11, 0x3ac8c0, 0x2a2a5a, 1.2);
    figurine(kit, deskX + 0.47, shelfY + 0.012, BACK + 0.12, 0xf8e060, 0xd83a3a);
    poster(kit, deskX - 0.2, 2.05, BACK, 0.42, 0.34, 'arcade', arcadePoster, -0.03);
    // notes to self stuck around the monitor
    wallPaper(kit, crtX - 0.4, 1.28, BACK, 0.12, 0.1, 'self-1', selfNotes(['ОНИ', 'ЕЩЁ', 'ПОЙМУТ'], '#f8f0a0'), 0.08);
    wallPaper(kit, crtX + 0.38, 1.33, BACK, 0.12, 0.1, 'self-2', selfNotes(['Я УМНЕЕ', 'ИХ ВСЕХ'], '#ffc9f6'), -0.1);
    wallPaper(kit, crtX + 0.36, 1.2, BACK, 0.12, 0.1, 'self-3', selfNotes(['С. — пн', '14:00', 'библ.'], '#b2f5e4'), 0.05);
    officeChair(kit, crtX + 0.05, -1.25, Math.PI + 0.25);

    // ---- bookcase against the right wall, facing into the room
    kit.bookcase(XR, -0.55, -Math.PI / 2, { w: 0.8, h: 1.8, d: 0.32, shelves: 5, seed: 61 });
    figurine(kit, XR - 0.18, 1.82, -0.7, 0xff6cc5, 0xffffff, 1.3);
    figurine(kit, XR - 0.18, 1.82, -0.4, 0x5a3d78, 0x2a2a30, 1.1);

    // ---- the middle of the room: rug, the floor's story
    kit.rug(0.1, -0.7, 2.0, 1.4, { tex: TEX.carpet(), tile: 0.5, color: 0x6a5a5a });
    pizzaBox(kit, 0.35, -0.35, 0.5);
    for (let i = 0; i < 5; i++) can(kit, -0.6 + r() * 1.8, 0, -1.6 + r() * 2.2, [0x2ab068, 0xd8d8e0, 0x2a5ab8][i % 3]!, r() < 0.7);
    crumpled(kit, 0.9, 0, -0.1, 5);
    crumpled(kit, -0.2, 0, 0.3, 9);

    // ---- foreground: a beanbag left, boxes and a trash bag right (kept low: the camera looks over them)
    kit.cush(0.9, 0.5, 0.8, 0.25, kit.M('beanbag', 0x5a2a3a, { roughness: 1 }), -1.35, 0.25, 0.85, { puff: 1.1, seed: 17, lump: 0.02 });
    movingBox(kit, 1.55, 0, 0.75, 0.6, 0.45, 0.5, { seed: 1, label: 'КНИГИ', ry: -0.15 });
    movingBox(kit, 1.6, 0.45, 0.72, 0.48, 0.32, 0.42, { seed: 2, label: 'ЗИМА', ry: 0.2 });
    movingBox(kit, 0.85, 0, 1.05, 0.5, 0.38, 0.45, {
      seed: 3,
      open: true,
      ry: 0.4,
      inside: (h) => kit.bookRow(-0.2, h - 0.02, -0.1, 5, 17, 0.4, 0.16),
    });
    kit.cush(0.45, 0.55, 0.4, 0.15, kit.M('trashBag', 0x18181c, { roughness: 0.35, metalness: 0.1 }), XR - 0.35, 0.27, 1.25, { puff: 0.9, seed: 23, lump: 0.02 });

    // ---- lights: bare bulb (off: he never turns it on), CRT glow, window by state
    bareBulb(kit, 'bulb', 0.0, H, -0.6, 0.5, { evening: 0, night: 0, day: 0 });
    const screenLight = kit.pointLight(0xffb8f0, 1.6, 3.2, crtX, top + 0.38, BACK + 0.75, 1.4);
    kit.lamp('screen', { light: screenLight, on: { evening: 0.7, night: 1, day: 0.3 } });
    kit.lamp('eveningBounce', { light: kit.pointLight(0xffa868, 0.9, 7, -0.2, 1.8, 0.2, 1.2), on: { evening: 1, night: 0, day: 0 } });
    kit.lamp('dayFill', { light: kit.pointLight(0xdfe6ee, 2.0, 8, -0.2, 2.0, -0.8, 1.0), on: { evening: 0, night: 0, day: 1 } });
    kit.lamp('moon', { light: kit.pointLight(0x7890c8, 1.2, 5, -0.15, 1.9, -1.6, 1.2), on: { evening: 0, night: 1, day: 0 } });
    kit.statePool(0x5a74b8, -0.15, 0.02, -1.4, 1.4, 1.2, 0.26, ['night']);
    kit.statePool(0xffb8f0, crtX, 0.02, -1.5, 1.2, 0.9, 0.12, ['night']);
    kit.ambient = {
      ...kit.ambient,
      night: { sky: 0x2c3858, ground: 0x0e0c0c, hemi: 0.42, fill: 0x8aa4d8, fillI: 0.22, bg: 0x04060a },
    };

    // ---- dust in the light from the blinds
    const dustN = low ? 40 : 90;
    const dustPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      dustPos[i * 3] = win.x0 + r() * (win.x1 - win.x0 + 0.5);
      dustPos[i * 3 + 1] = 0.3 + r() * 1.8;
      dustPos[i * 3 + 2] = BACK + 0.3 + r() * 1.6;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe0b0, size: 0.01, transparent: true, opacity: 0.5, depthWrite: false }));
    root.add(dust);
    kit.onState((s: string) => {
      dust.visible = s !== 'night';
    });

    kit.flushBatches();

    const screenCenter = crt.corners.reduce((a, c) => a.add(c), new THREE.Vector3()).multiplyScalar(0.25);
    return {
      kit,
      screen: { app, corners: crt.corners },
      shots: {
        wide: { pos: [0.0, 1.6, 1.5], look: [0.05, 1.05, -1.6], fov: 62 },
        // The app on the monitor (lessons, quizzes): the whole beige CRT with its
        // bezel, the case under it, the wall notes and the dark room around. The
        // fit box keeps all of it in frame on a phone held upright, too.
        crt: {
          // (a wide lens keeps the camera in front of his office chair even on a phone)
          pos: [screenCenter.x, screenCenter.y + 0.1, screenCenter.z + 1],
          look: [screenCenter.x, screenCenter.y - 0.03, screenCenter.z],
          fov: 60,
          fit: [0.45, 0.56],
          frameY: 0.42,
          still: true,
        },
        // Melody's pop-ups stacked on the right edge of the screen, close enough to read
        'crt-notice': {
          pos: [screenCenter.x + 0.06, screenCenter.y + 0.05, screenCenter.z + 1],
          look: [screenCenter.x + 0.075, screenCenter.y, screenCenter.z],
          fov: 60,
          fit: [0.26, 0.36],
          frameY: 0.38,
          still: true,
        },
        // first person: Dameo in his chair, looking at the monitor (chapter 3 cutscene)
        pov: { pos: [crtX + 0.02, 1.22, -1.05], look: [screenCenter.x, screenCenter.y - 0.02, screenCenter.z], fov: 50 },
        // he jerks back from the glass
        'pov-recoil': { pos: [crtX + 0.06, 1.3, -0.97], look: [screenCenter.x, screenCenter.y + 0.02, screenCenter.z], fov: 54 },
        desk: { pos: [crtX - 0.9, 1.45, -0.4], look: [crtX + 0.1, 0.95, BACK + 0.2], fov: 42 },
        bed: { pos: [0.2, 1.4, 0.9], look: [-1.5, 0.6, -1.3], fov: 46 },
        window: { pos: [0.3, 1.45, 0.8], look: [-0.15, 1.45, BACK], fov: 44 },
        // behind Dameo at the desk, the monitor over his shoulder (cutscenes)
        'over-shoulder': { pos: [crtX + 0.55, 1.5, -0.05], look: [crtX - 0.05, 1.05, BACK], fov: 46 },
        // the room as the monitor sees it: from inside the glass (chapter 4, «Выход»)
        'from-screen': {
          pos: [screenCenter.x, screenCenter.y + 0.02, screenCenter.z - 0.03],
          look: [screenCenter.x - 0.6, 1.0, 1.2],
          fov: 72,
        },
        // the camera falls into the tube after him
        'into-screen': {
          pos: [screenCenter.x, screenCenter.y, screenCenter.z + 0.09],
          look: [screenCenter.x, screenCenter.y, screenCenter.z - 1],
          fov: 16,
        },
      },
      marks: {
        left: { x: -0.45, z: -1.05 },
        center: { x: 0.15, z: -0.95 },
        right: { x: 0.8, z: -1.15 },
        desk: { x: crtX - 0.62, z: -1.45, facing: 'right' },
        window: { x: -0.15, z: -1.55 },
        bed: { x: -0.75, z: -1.3 },
        chair: { x: crtX + 0.02, z: -1.02, facing: 'back' },
        'backed-off': { x: crtX - 1.0, z: -0.55 },
      },
      walk: { minX: XL + 0.6, maxX: XR - 0.6, z: -1.0 },
      update(dt, t) {
        const p = dust.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dustN; i++) {
          let y = p.getY(i) + dt * 0.03 * (0.5 + ((i * 37) % 10) / 10);
          if (y > 2.2) y = 0.3;
          p.setY(i, y);
          p.setX(i, p.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.01);
        }
        p.needsUpdate = true;
        const fps = app.fps;
        if (Math.floor(t * fps) !== Math.floor((t - dt) * fps)) app.draw(t);
        // the screen light follows what the screen shows
        const v = app.shown;
        const dark = v === 'off' || v === 'void';
        screenLight.color.setHex(v === 'desktop' ? 0x8ab8d8 : v === 'static' ? 0xc8c8d0 : app.current.unease > 0.6 ? 0xff4a7a : 0xffb8f0);
        screenLight.intensity = dark ? (v === 'void' ? 0.25 : 0) : 1.6 * (app.current.unease > 0.6 ? 0.7 + Math.random() * 0.6 : 1);
      },
      setVariant(v) {
        // variant names used by scripts: 'app' / 'app-dark' / 'off' / null (desktop)
        if (v === 'off') app.set({ view: 'off' });
        else if (v === 'app') app.set({ view: 'lesson', unease: 0 });
        else if (v === 'app-dark') app.set({ view: 'lesson', unease: 0.8 });
        else app.set({ view: 'desktop', melody: null, unease: 0 });
      },
    };
  },
};
