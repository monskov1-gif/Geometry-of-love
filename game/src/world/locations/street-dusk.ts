// «Улица вечером» (эпилог, 'street-dusk'): «Вечером, по дороге домой,
// начинается дождь. Мелкий, холодный, настоящий… Дамео останавливается на
// остановке… Подходит автобус.» Реальный мир по фото-референсу IMG_5071
// (японская жилая улица): бетонные столбы с проводами и трансформаторами,
// таблички на столбах, двухэтажные дома с черепичными крышами, балконами и
// кондиционерами, блочный забор с живой изгородью, торговые автоматы, вывеска
// круглосуточного магазина, фонарь, остановка с табличкой и скамейкой.
// Real-world palette: muted grey-brown and blue dusk, warm windows and the
// vending machines as the only bright things; wet asphalt with long light
// streaks, puddles, fine rain (slow streaks, no flashes). No candy anywhere.
// States: 'evening' (story: the sky still holds a mauve glow), 'night'.
import * as THREE from 'three';
import { LocationKit, rgb, rng, TX, pixelate, canvasTexture } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { CandyBatch } from '../candy/batch';
import { pixelText } from '../candy/shapes';

const XL = -11;
const XR = 11;
const WALL_Z = -1.9; // block wall at the back of the pavement
const KERB_Z = 0.35;

const AMBIENT = {
  evening: { sky: 0x6c7490, ground: 0x2a2622, hemi: 0.78, fill: 0xb8c4e0, fillI: 0.32, bg: 0x2a3048 },
  night: { sky: 0x34405c, ground: 0x141210, hemi: 0.55, fill: 0x8ea0c8, fillI: 0.22, bg: 0x0c1020 },
};

// ------------------------------------------------------------------ textures

const asphalt = () =>
  TX('stAsphalt', 64, 64, (ctx, w, h) => {
    const r = rng(21);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = 46 + (r() - 0.5) * 16;
        ctx.fillStyle = rgb(n, n + 1, n + 4);
        ctx.fillRect(x, y, 1, 1);
      }
    ctx.fillStyle = 'rgba(20,20,24,0.5)';
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 8 + Math.floor(r() * 14), 1);
  });

const paving = () =>
  TX('stPaving', 64, 64, (ctx, w, h) => {
    const r = rng(22);
    for (let y = 0; y < h; y += 16)
      for (let x = 0; x < w; x += 32) {
        const ox = (y / 16) % 2 ? 16 : 0;
        const n = 92 + Math.floor((r() - 0.5) * 18);
        ctx.fillStyle = rgb(n, n - 4, n - 8);
        ctx.fillRect((x + ox) % w, y, 32, 16);
        if (ox) ctx.fillRect(0, y, ox, 16);
      }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
    }
    ctx.fillStyle = 'rgba(30,26,22,0.6)';
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 1);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < w; x += 32) ctx.fillRect(x, y, 1, 16);
  });

const blockWall = () =>
  TX('stBlock', 64, 64, (ctx, w, h) => {
    const r = rng(23);
    for (let y = 0; y < h; y += 16)
      for (let x = 0; x < w; x += 32) {
        const n = 128 + Math.floor((r() - 0.5) * 14);
        ctx.fillStyle = rgb(n, n - 2, n - 6);
        ctx.fillRect(x, y, 32, 16);
        for (let k = 0; k < 30; k++) {
          ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)';
          ctx.fillRect(x + Math.floor(r() * 32), y + Math.floor(r() * 16), 1, 1);
        }
      }
    ctx.fillStyle = 'rgba(40,36,32,0.55)';
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 1);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 32) ctx.fillRect(x, y, 1, 16);
    // rain streaks of dirt down the wall
    ctx.fillStyle = 'rgba(50,44,38,0.18)';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * w), 0, 2, 20 + Math.floor(r() * 40));
  });

const siding = (key: string, base: [number, number, number], seed: number) =>
  TX(`stSiding-${key}`, 64, 64, (ctx, w, h) => {
    const r = rng(seed);
    for (let y = 0; y < h; y++) {
      const board = Math.floor(y / 8);
      const n = (board % 2 ? 4 : -2) + (y % 8 === 7 ? -18 : 0);
      for (let x = 0; x < w; x++) {
        const m = n + (r() - 0.5) * 6;
        ctx.fillStyle = rgb(base[0] + m, base[1] + m, base[2] + m);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(40,34,30,0.25)';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.floor(r() * w), 0, 1, h);
  });

const kawara = () =>
  TX('stKawara', 64, 64, (ctx, w, h) => {
    const r = rng(24);
    for (let x = 0; x < w; x += 8)
      for (let y = 0; y < h; y++) {
        const n = 58 + Math.round(Math.sin(((x % 8) / 8) * Math.PI) * 18) + (r() - 0.5) * 6;
        ctx.fillStyle = rgb(n - 4, n, n + 8);
        for (let k = 0; k < 8; k++) ctx.fillRect(x + k, y, 1, 1);
      }
    ctx.fillStyle = 'rgba(10,12,18,0.6)';
    for (let y = 0; y < h; y += 10) ctx.fillRect(0, y, w, 2);
  });

/** A window: lit (warm interior, curtain, a shelf silhouette) or dark (reflection of the sky). */
const windowTex = (lit: boolean, seed: number) =>
  TX(`stWin-${lit ? 'l' : 'd'}-${seed}`, 32, 32, (ctx, w, h) => {
    const r = rng(seed);
    if (lit) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#f8c880');
      g.addColorStop(1, '#c88848');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = r() < 0.5 ? '#d8b098' : '#b8c0a8';
      ctx.fillRect(0, 0, 8 + Math.floor(r() * 4), h); // curtain
      ctx.fillStyle = 'rgba(70,40,24,0.55)';
      if (r() < 0.6) ctx.fillRect(14, 18, 14, 3);
      if (r() < 0.5) ctx.fillRect(20, 8, 6, 10);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#4a5470');
      g.addColorStop(1, '#22283a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(200,210,240,0.12)';
      ctx.fillRect(4, 0, 6, h);
    }
    ctx.fillStyle = '#2a2826';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, h - 1, w, 1);
    ctx.fillRect(0, 0, 1, h);
    ctx.fillRect(w - 1, 0, 1, h);
    ctx.fillRect(w / 2, 0, 1, h);
  });

/** Vending machine front: rows of drink dummies, price lights, the slot. */
const vendingTex = (seed: number) =>
  TX(`stVend-${seed}`, 48, 96, (ctx, w, h) => {
    const r = rng(seed);
    ctx.fillStyle = seed % 2 ? '#e8ecf0' : '#d8e4ec';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f8ff';
    ctx.fillRect(3, 4, w - 6, 50);
    const cols = ['#c83a30', '#2a6ab8', '#f0c040', '#3a9a5a', '#e8e0d0', '#8a4a2a', '#f08a30', '#5a3a8a'];
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 6; k++) {
        const x = 5 + k * 6.6;
        const y = 6 + row * 12;
        ctx.fillStyle = cols[Math.floor(r() * cols.length)]!;
        ctx.fillRect(Math.round(x), y + 2, 5, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x) + 1, y + 1, 3, 1);
        ctx.fillStyle = r() < 0.2 ? '#ff4a4a' : '#4aff8a';
        ctx.fillRect(Math.round(x) + 1, y + 11, 3, 1);
      }
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(4, 60, w - 8, 8);
    pixelText(ctx, '¥130', 6, 59, 7, '#ff9a4a', { font: 'monospace' });
    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(6, h - 16, w - 12, 9); // the slot
    ctx.fillStyle = '#9aa4b0';
    ctx.fillRect(w - 12, 72, 6, 10); // coin box
  });

/** Konbini glass front: bright shelves, a magazine rack, the counter. */
const storeTex = () =>
  TX('stStore', 128, 64, (ctx, w, h) => {
    const r = rng(31);
    ctx.fillStyle = '#e8eef0';
    ctx.fillRect(0, 0, w, h);
    for (let s = 0; s < 4; s++) {
      const y = 14 + s * 11;
      ctx.fillStyle = '#b8c0c4';
      ctx.fillRect(0, y + 8, w, 2);
      for (let x = 2; x < w - 2; x += 3) {
        ctx.fillStyle = ['#d84a3a', '#3a7ad8', '#f0c84a', '#5aaa5a', '#f4f0e8', '#8a5a3a', '#e88ac0'][Math.floor(r() * 7)]!;
        ctx.fillRect(x, y + 2 + Math.floor(r() * 2), 2, 6);
      }
    }
    ctx.fillStyle = 'rgba(60,70,80,0.5)';
    for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 2, h); // mullions
    ctx.fillStyle = '#c8ccd0';
    ctx.fillRect(84, 40, 40, 24); // counter
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) ctx.fillRect(10 + i * 30, 0, 6, h);
  });

/** The store's sign band: stripes and "24H" (generic, no brand). */
const signTex = () =>
  TX('stSign', 128, 16, (ctx, w, h) => {
    ctx.fillStyle = '#f4f8fa';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a8a5a';
    ctx.fillRect(0, 2, w, 3);
    ctx.fillStyle = '#3a6ac8';
    ctx.fillRect(0, h - 5, w, 3);
    pixelText(ctx, '24H', 8, 3, 10, '#2a3a5a', { font: 'monospace' });
    pixelText(ctx, 'STORE', 52, 3, 10, '#2a8a5a', { font: 'monospace' });
  });

/** The bus stop plate: a round sign with a bus pictogram and a stop number. */
const busSignTex = () =>
  TX('stBusSign', 32, 32, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5);
        if (d < 15) {
          ctx.fillStyle = d > 12.5 ? '#c84a3a' : '#f4f2ea';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    ctx.fillStyle = '#2a4a8a';
    ctx.fillRect(9, 9, 14, 9);
    ctx.fillStyle = '#f4f2ea';
    ctx.fillRect(10, 10, 4, 3);
    ctx.fillRect(16, 10, 5, 3);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(10, 18, 3, 3);
    ctx.fillRect(19, 18, 3, 3);
    pixelText(ctx, '11', 16, 21, 7, '#2a4a8a', { align: 'center', font: 'monospace' });
  });

/** A pole plate like the ones in the reference: a coloured board with rows of small text. */
const polePlate = (seed: number, col: string) =>
  TX(`stPlate-${seed}`, 16, 48, (ctx, w, h) => {
    const r = rng(seed);
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f0e4';
    ctx.fillRect(1, 8, w - 2, h - 14);
    ctx.fillStyle = '#2a2622';
    for (let y = 10; y < h - 8; y += 3) ctx.fillRect(3, y, 4 + Math.floor(r() * 8), 1);
    ctx.fillStyle = '#c84a3a';
    ctx.fillRect(5, h - 12, 6, 3);
  });

/** The far city behind the houses: apartment blocks, lit windows, the dusk sky. */
const skylineTex = (state: string) =>
  canvasTexture(`stSkyline-${state}`, 768, 256, (ctx, w, h) => {
    const r = rng(77);
    const eve = state === 'evening';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (eve) {
      g.addColorStop(0, '#1c2440');
      g.addColorStop(0.45, '#3c4466');
      g.addColorStop(0.75, '#7a6478');
      g.addColorStop(1, '#a87870');
    } else {
      g.addColorStop(0, '#060a16');
      g.addColorStop(0.6, '#10182c');
      g.addColorStop(1, '#1e2234');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // low rain clouds
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = eve ? 'rgba(90,96,120,0.25)' : 'rgba(30,36,56,0.4)';
      ctx.fillRect(r() * w, r() * h * 0.4, 60 + r() * 160, 6 + r() * 12);
    }
    // apartment blocks
    let x = -20;
    while (x < w) {
      const bw = 60 + r() * 110;
      const bh = 70 + r() * 110;
      const top = h - bh;
      const c = eve ? 54 + r() * 16 : 20 + r() * 8;
      ctx.fillStyle = rgb(c, c + 2, c + 10);
      ctx.fillRect(x, top, bw, bh);
      // balcony bands and windows
      for (let y = top + 8; y < h - 4; y += 12) {
        ctx.fillStyle = eve ? 'rgba(120,124,140,0.4)' : 'rgba(50,54,70,0.5)';
        ctx.fillRect(x, y + 8, bw, 2);
        for (let wx = x + 4; wx < x + bw - 8; wx += 10) {
          const lit = r() < (eve ? 0.45 : 0.28);
          ctx.fillStyle = lit ? (r() < 0.7 ? '#e8b070' : '#d8e0e8') : eve ? '#3a4058' : '#141826';
          ctx.fillRect(wx, y, 6, 6);
        }
      }
      // a red aviation light on some roofs (steady)
      if (r() < 0.3) {
        ctx.fillStyle = '#c84a3a';
        ctx.fillRect(x + bw / 2, top - 3, 3, 3);
      }
      x += bw + 6 + r() * 30;
    }
    pixelate(ctx, w, h, 3);
  }, { nearest: true, aniso: 1 });

// ------------------------------------------------------------------ the place

export const streetDusk3D: LocationDef3D = {
  id: 'street-dusk',
  states: ['evening', 'night'],
  defaultState: 'evening',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: AMBIENT });
    kit.setupLights();
    const r = rng(2025);
    const vc = new CandyBatch(kit);

    // ---- ground: wet asphalt road in front, the pavement (stage), a kerb, puddles, road paint
    const wet = { roughness: 0.22, metalness: 0.15 };
    kit.floorRect(XL - 8, XR + 8, KERB_Z, 9, kit.texM('stAsphalt', asphalt(), wet), { tile: 0.9 });
    kit.floorRect(XL - 8, XR + 8, WALL_Z - 0.2, KERB_Z, kit.texM('stPaving', paving(), { roughness: 0.35, metalness: 0.08 }), { tile: 0.64, y: 0.12 });
    kit.rb(XR - XL + 16, 0.14, 0.18, 0.02, kit.M('stKerb', 0x8a8680, { roughness: 0.5 }), 0, 0.07, KERB_Z, {});
    const paint = kit.M('stPaint', 0xc8c4b8, { roughness: 0.4 });
    for (let x = XL - 6; x < XR + 6; x += 3) kit.pl(1.6, 0.12, paint, x, 0.006, 3.6, { rx: -Math.PI / 2 });
    kit.pl(XR - XL + 16, 0.1, paint, 0, 0.006, 1.0, { rx: -Math.PI / 2 });
    // 止まれ-style stop line and a manhole
    kit.pl(0.18, 2.4, paint, 6.4, 0.007, 2.4, { rx: -Math.PI / 2 });
    kit.cy(0.32, 0.32, 0.01, kit.M('stManhole', 0x3a3834, { roughness: 0.3, metalness: 0.5 }), -2.8, 0.005, 2.2, { seg: 24 });
    const puddle = kit.mat('stPuddle', { color: 0x1a1e2a, roughness: 0.04, metalness: 0.4, transparent: true, opacity: 0.8, depthWrite: false });
    for (const [x, z, s, y] of [[-4.2, 1.6, 1.4, 0.004], [1.6, 2.6, 2.0, 0.004], [5.8, 1.2, 1.1, 0.004], [-0.8, -0.2, 0.7, 0.124], [3.2, -1.2, 0.5, 0.124]] as const) {
      const g = new THREE.CircleGeometry(s * 0.5, 20);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 1; i < p.count; i++) p.setXY(i, p.getX(i) * (1 + Math.sin(i * 1.7) * 0.15), p.getY(i) * (0.55 + Math.cos(i * 2.3) * 0.1));
      kit._add(g, puddle, x, y + 0.002, z, { rx: -Math.PI / 2 });
    }
    // gutter grate along the kerb
    for (let x = XL; x < XR; x += 2.2) kit.rb(0.5, 0.01, 0.16, 0.003, kit.M('stGrate', 0x2a2a2c, { metalness: 0.5, roughness: 0.4 }), x, 0.008, KERB_Z + 0.22);

    // ---- the block wall with a hedge, gates into the houses
    const block = kit.texM('stBlock', blockWall(), { roughness: 0.9 });
    const gaps = [[-6.2, -5.2], [1.4, 2.4]] as const;
    let x0 = XL - 6;
    for (const [a, b] of [...gaps, [XR + 6, XR + 6]] as const) {
      if (a > x0) kit.rb(a - x0, 1.25, 0.15, 0.01, block, (a + x0) / 2, 0.12 + 0.62, WALL_Z, { uv: [0.64, 0.64] });
      if (a > x0) kit.rb(a - x0 + 0.02, 0.06, 0.2, 0.01, kit.M('stCap', 0x9a968e, { roughness: 0.8 }), (a + x0) / 2, 1.4, WALL_Z);
      x0 = b;
    }
    // hedge on top (soft lumps of leaves)
    const leafCols = [0x2e3a2a, 0x36442e, 0x283224, 0x3e4a34];
    for (let x = XL - 5; x < XR + 5; x += 0.32) {
      if (gaps.some(([a, b]) => x > a - 0.2 && x < b + 0.2) || (x > 3.4 && x < 9.6)) continue;
      const s = 0.22 + r() * 0.14;
      vc.add(new THREE.IcosahedronGeometry(s, 1), leafCols[Math.floor(r() * 4)]!, x, 1.55 + r() * 0.12, WALL_Z - 0.1 + (r() - 0.5) * 0.2, { sy: 0.8 });
    }
    // sliding gates in the gaps
    for (const [a, b] of gaps)
      for (let k = 0; k < 9; k++) kit.cy(0.012, 0.012, 1.0, kit.M('stGate', 0x4a4a46, { metalness: 0.6, roughness: 0.4 }), a + 0.06 + k * ((b - a - 0.12) / 8), 0.62, WALL_Z - 0.3, { seg: 6 });

    // ---- the houses behind the wall
    const houseMats = [
      kit.texM('stSidA', siding('a', [150, 140, 124], 3), { roughness: 0.85 }),
      kit.texM('stSidB', siding('b', [118, 120, 116], 5), { roughness: 0.85 }),
      kit.texM('stSidC', siding('c', [166, 150, 132], 7), { roughness: 0.85 }),
      kit.texM('stSidD', siding('d', [98, 92, 86], 9), { roughness: 0.85 }),
    ];
    const roof = kit.texM('stRoof', kawara(), { roughness: 0.55, metalness: 0.15 });
    const trim = kit.M('stTrim', 0x3a3632, { roughness: 0.7 });
    const litMats: THREE.MeshStandardMaterial[] = [];
    const nightOff: THREE.MeshStandardMaterial[] = [];
    const house = (cx: number, z: number, w: number, d: number, h: number, mi: number, seed: number) => {
      const m = houseMats[mi]!;
      kit.rb(w, h, d, 0.02, m, cx, h / 2, z - d / 2, { uv: [1, 1] });
      // gable roof along x: two tilted slabs + ridge
      const pitch = 0.5;
      const half = d / 2 + 0.35;
      const slab = half / Math.cos(pitch);
      for (const s of [-1, 1]) kit.rb(w + 0.5, 0.08, slab, 0.02, roof, cx, h + Math.sin(pitch) * slab * 0.5, z - d / 2 + s * (half / 2), { rx: s * pitch, uv: [0.64, 0.64] });
      kit.rb(w + 0.55, 0.12, 0.16, 0.04, roof, cx, h + Math.tan(pitch) * half + 0.02, z - d / 2);
      kit.rb(w + 0.04, 0.08, d + 0.04, 0.01, trim, cx, h, z - d / 2);
      // windows: two floors, lit or dark, with frames and sills
      const rr = rng(seed);
      const nw = Math.max(1, Math.floor(w / 1.6));
      for (let f = 0; f < 2; f++)
        for (let k = 0; k < nw; k++) {
          const wx = cx - w / 2 + (k + 0.5) * (w / nw);
          const wy = f ? h - 1.0 : 1.05;
          if (f === 0 && z > -3.6) continue; // the wall hides the ground floor of the near houses
          const lit = rr() < 0.55;
          const tex = windowTex(lit, seed * 10 + f * 3 + k);
          const mat = lit ? kit.glowM(`stWin${seed}-${f}-${k}`, 0xffffff, 0xffffff, { map: tex, emissiveMap: tex, roughness: 0.3 }) : kit.texM(`stWinD${seed}-${f}-${k}`, tex, { roughness: 0.15, metalness: 0.2 });
          if (lit) {
            litMats.push(mat);
            if (rr() < 0.45) nightOff.push(mat);
          }
          kit.rb(0.98, 0.84, 0.05, 0.01, trim, wx, wy, z + 0.01);
          kit.pl(0.86, 0.72, mat, wx, wy, z + 0.04);
          kit.rb(1.04, 0.05, 0.12, 0.01, trim, wx, wy - 0.45, z + 0.05);
          // an AC unit under some upstairs windows, a balcony rail on others
          if (f && rr() < 0.4) {
            kit.rb(0.7, 0.5, 0.26, 0.02, kit.M('stAC', 0xc8c4bc, { roughness: 0.6 }), wx + 0.9, wy - 0.85, z + 0.15);
            kit.cy(0.17, 0.17, 0.02, kit.M('stACfan', 0x5a5852, { roughness: 0.6 }), wx + 0.82, wy - 0.85, z + 0.29, { rx: Math.PI / 2, seg: 16 });
            kit.tube([[wx + 1.2, wy - 0.7, z + 0.1], [wx + 1.3, wy - 0.4, z + 0.06], [wx + 1.3, wy + 0.4, z + 0.04]], 0.02, kit.M('stACpipe', 0xd8d4c8));
          } else if (f && rr() < 0.5) {
            kit.rb(1.4, 0.04, 0.5, 0.01, trim, wx, wy - 0.5, z + 0.25);
            for (let b = 0; b < 12; b++) kit.cy(0.008, 0.008, 0.5, trim, wx - 0.68 + b * 0.124, wy - 0.24, z + 0.48, { seg: 5 });
            kit.rb(1.4, 0.03, 0.03, 0.01, trim, wx, wy, z + 0.48);
          }
        }
    };
    house(-8.8, -3.0, 4.2, 4.5, 5.6, 0, 11);
    house(-3.6, -2.7, 4.6, 4.0, 5.2, 1, 12);
    house(0.6, -3.4, 3.2, 3.8, 6.0, 2, 13);
    house(-6.2, -8.0, 4.0, 3.5, 6.4, 3, 14);
    house(2.2, -8.5, 5.0, 3.5, 6.8, 0, 15);

    // ---- the convenience store on the right: glass front, sign band, light spilling onto the wet pavement
    const SX = 6.5;
    kit.rb(6.2, 3.2, 4.0, 0.02, kit.M('stStoreWall', 0xb8b8b4, { roughness: 0.7 }), SX, 1.6, WALL_Z - 2.1);
    const storeGlass = kit.glowM('stStoreGlass', 0xffffff, 0xffffff, { map: storeTex(), emissiveMap: storeTex(), roughness: 0.15 });
    kit.pl(5.0, 2.1, storeGlass, SX, 1.17, WALL_Z - 0.07);
    for (let k = 0; k <= 5; k++) kit.rb(0.06, 2.2, 0.06, 0.01, kit.M('stMullion', 0x8a8e92, { metalness: 0.5, roughness: 0.4 }), SX - 2.5 + k, 1.17, WALL_Z - 0.04);
    const sign = kit.glowM('stSign', 0xffffff, 0xffffff, { map: signTex(), emissiveMap: signTex(), roughness: 0.4 });
    kit.rb(6.3, 0.62, 0.22, 0.03, kit.M('stSignBox', 0xd8dcdc, { roughness: 0.5 }), SX, 2.72, WALL_Z - 0.05);
    kit.pl(6.1, 0.48, sign, SX, 2.72, WALL_Z + 0.065);
    // umbrella stand, a trash station by the door
    kit.cy(0.16, 0.14, 0.5, kit.M('stUmb', 0x5a6a7a, { metalness: 0.4, roughness: 0.4 }), SX - 2.0, 0.37, WALL_Z + 0.3, { seg: 16 });
    for (let k = 0; k < 4; k++) kit.rod([SX - 2.0 + (k - 1.5) * 0.06, 0.4, WALL_Z + 0.3], [SX - 2.0 + (k - 1.5) * 0.1, 1.0, WALL_Z + 0.32 + k * 0.02], 0.012, kit.M(`stUmbS${k}`, [0x2a3a5a, 0xd8d4cc, 0x3a3a3c, 0x8a2a2a][k]!));
    for (let k = 0; k < 3; k++) kit.rb(0.5, 0.9, 0.45, 0.03, kit.M('stBin', [0x5a7a9a, 0x7a9a6a, 0x9a8a5a][k]!, { roughness: 0.5 }), SX + 1.3 + k * 0.55, 0.57, WALL_Z + 0.25);

    // ---- vending machines against the wall (left of the stop)
    const vendFront: THREE.MeshStandardMaterial[] = [];
    [-4.5, -3.7].forEach((vx, i) => {
      kit.rb(0.76, 1.83, 0.7, 0.03, kit.M(`stVendBody${i}`, i ? 0x2a5a9a : 0xc8ccd0, { roughness: 0.4, metalness: 0.2 }), vx, 0.12 + 0.915, WALL_Z + 0.4);
      const tex = vendingTex(i + 1);
      const m = kit.glowM(`stVend${i}`, 0xffffff, 0xffffff, { map: tex, emissiveMap: tex, roughness: 0.2 });
      vendFront.push(m);
      kit.pl(0.66, 1.6, m, vx, 1.0, WALL_Z + 0.755);
    });
    kit.rb(0.5, 0.7, 0.4, 0.03, kit.M('stRecycle', 0x3a6a4a, { roughness: 0.5 }), -3.0, 0.47, WALL_Z + 0.32);

    // ---- the bus stop: sign pole with a round plate and timetable, a bench, a small roof
    kit.cy(0.03, 0.03, 2.3, kit.M('stPole', 0x8a8e92, { metalness: 0.5, roughness: 0.4 }), -1.4, 1.27, -0.05, { seg: 12 });
    kit.cy(0.25, 0.28, 0.12, kit.M('stBase', 0x4a4a48, { roughness: 0.7 }), -1.4, 0.18, -0.05, { seg: 20 });
    kit.pl(0.5, 0.5, kit.texM('stBusSign', busSignTex(), { roughness: 0.5, transparent: true, alphaTest: 0.5 }), -1.4, 2.3, -0.02);
    const tt = TX('stTimetable', 24, 32, (ctx, w, h) => {
      const rr = rng(5);
      ctx.fillStyle = '#f4f2ea';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a4a8a';
      ctx.fillRect(0, 0, w, 5);
      ctx.fillStyle = '#3a3a3a';
      for (let y = 7; y < h - 2; y += 3) {
        ctx.fillRect(2, y, 3, 1);
        for (let x = 7; x < w - 2; x += 4) if (rr() < 0.7) ctx.fillRect(x, y, 2, 1);
      }
    });
    kit.rb(0.36, 0.5, 0.04, 0.01, kit.M('stTTbox', 0x8a8e92, { metalness: 0.4 }), -1.4, 1.55, 0.0);
    kit.pl(0.32, 0.44, kit.texM('stTT', tt, { roughness: 0.5 }), -1.4, 1.55, 0.025);
    kit.withT(0.6, WALL_Z + 0.25, 0, () => {
      const wood = kit.M('stBench', 0x7a6248, { roughness: 0.7 });
      for (let k = 0; k < 3; k++) kit.rb(1.6, 0.04, 0.1, 0.01, wood, 0, 0.55, 0.06 + k * 0.12);
      for (let k = 0; k < 2; k++) kit.rb(1.6, 0.08, 0.03, 0.01, wood, 0, 0.75 + k * 0.14, 0.0);
      for (const s of [-0.7, 0.7]) kit.rb(0.05, 0.5, 0.36, 0.01, kit.M('stBenchLeg', 0x4a4a48, { metalness: 0.5 }), s, 0.37, 0.15);
    });

    // ---- utility poles, crossarms, transformers, wires sagging between them and into the houses
    const conc = kit.M('stConcrete', 0x8e8a84, { roughness: 0.8 });
    const dark = kit.M('stDarkMetal', 0x2e2e30, { roughness: 0.5, metalness: 0.5 });
    const insul = kit.M('stInsul', 0xd8d4c8, { roughness: 0.3 });
    const wireM = kit.M('stWire', 0x121214, { roughness: 0.6 });
    const poles = [-7.4, 1.0 + 1.6, 10.5];
    const tops: THREE.Vector3[] = [];
    poles.forEach((px, i) => {
      const pz = WALL_Z + 0.55 + (i === 1 ? 0.1 : 0);
      kit.cy(0.12, 0.17, 9.2, conc, px, 4.6, pz, { seg: 16 });
      for (let k = 0; k < 2; k++) {
        const y = 8.4 - k * 0.7;
        kit.rb(1.6, 0.08, 0.08, 0.01, dark, px, y, pz);
        for (const s of [-0.65, 0, 0.65]) kit.cy(0.04, 0.05, 0.12, insul, px + s, y + 0.1, pz, { seg: 10 });
      }
      if (i !== 1) {
        kit.cy(0.24, 0.24, 0.8, kit.M('stTrafo', 0x7a8288, { roughness: 0.5, metalness: 0.3 }), px + 0.38, 6.8, pz + 0.05, { seg: 16 });
        kit.cy(0.26, 0.26, 0.05, dark, px + 0.38, 7.22, pz + 0.05, { seg: 16 });
      }
      // step bolts and a plate like the reference
      for (let k = 0; k < 8; k++) kit.cy(0.012, 0.012, 0.22, dark, px, 2.4 + k * 0.45, pz, { rz: Math.PI / 2, ry: k % 2 ? 0.3 : -0.3, seg: 6 });
      kit.pl(0.24, 0.72, kit.texM(`stPlate${i}`, polePlate(i + 3, ['#d86a2a', '#3a6aa8', '#5a8a4a'][i]!), { roughness: 0.5 }), px, 1.9, pz + 0.175);
      tops.push(new THREE.Vector3(px, 8.5, pz));
    });
    // wires: three per crossarm across the whole frame, sagging; service drops into the houses
    for (let k = 0; k < 2; k++)
      for (const s of [-0.65, 0, 0.65]) {
        const pts = [XL - 8, ...poles, XR + 8].map((x) => new THREE.Vector3(x + s, 8.52 - k * 0.7, WALL_Z + 0.55));
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i]!;
          const b = pts[i + 1]!;
          const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.35 - Math.abs(b.x - a.x) * 0.02, 0));
          kit.tube([a.toArray(), mid.toArray(), b.toArray()] as [number, number, number][], 0.012, wireM, { seg: 16, rs: 4 });
        }
      }
    for (const [px, hx, hy, hz] of [[-7.4, -8.4, 5.0, -3.0], [2.6, 0.6, 5.4, -3.4], [2.6, 4.2, 3.0, WALL_Z - 2.0], [-7.4, -3.2, 4.8, -2.7]] as const)
      kit.tube([[px, 7.6, WALL_Z + 0.55], [(px + hx) / 2, (7.6 + hy) / 2 - 0.4, (WALL_Z + 0.55 + hz) / 2], [hx, hy, hz + 0.05]], 0.01, wireM, { seg: 12, rs: 4 });
    // cables down the pole to a box
    kit.tube([[2.6 + 0.16, 7.4, WALL_Z + 0.6], [2.6 + 0.17, 4, WALL_Z + 0.62], [2.6 + 0.16, 2.6, WALL_Z + 0.62]], 0.025, wireM, { seg: 10, rs: 5 });
    kit.rb(0.3, 0.4, 0.15, 0.02, kit.M('stBox', 0x9a9e98, { roughness: 0.6 }), 2.6 + 0.2, 2.4, WALL_Z + 0.7);

    // ---- street lamp on the near pole: a curved arm, a cold LED head
    const lampX = -7.4;
    kit.tube([[lampX, 5.6, WALL_Z + 0.6], [lampX + 0.5, 6.1, WALL_Z + 0.8], [lampX + 1.2, 6.2, WALL_Z + 1.1]], 0.035, dark, { seg: 16 });
    kit.rb(0.5, 0.08, 0.2, 0.03, dark, lampX + 1.35, 6.18, WALL_Z + 1.15);
    const ledM = kit.glowM('stLed', 0xe8f0ff, 0xdfe8ff, { roughness: 0.2 });
    kit.rb(0.42, 0.02, 0.14, 0.01, ledM, lampX + 1.35, 6.13, WALL_Z + 1.15);
    kit.lamp('stStreetLamp', {
      light: kit.pointLight(0xd8e4ff, 10, 14, lampX + 1.35, 5.9, WALL_Z + 1.3, 1.2),
      glows: [kit.halo(0xdfe8ff, 1.4, 0.3, lampX + 1.35, 6.08, WALL_Z + 1.2)],
      mats: [[ledM, 1.2]],
      on: { evening: 1, night: 1 },
    });
    // another lamp far right, behind the store
    kit.lamp('stStreetLamp2', { light: kit.pointLight(0xffc888, 3, 10, 11, 5, 0, 1.3), glows: [kit.halo(0xffc888, 1.0, 0.25, 11.2, 5.6, WALL_Z + 1.2)], on: { evening: 1, night: 1 } });

    // ---- a bicycle leaning on the wall, potted plants by a gate
    kit.withT(-1.0, WALL_Z + 0.35, 0.06, () => {
      const fr = kit.M('stBike', 0x5a6a6a, { metalness: 0.5, roughness: 0.4 });
      for (const s of [-0.55, 0.55]) kit.torus(0.32, 0.018, dark, s, 0.44, 0, { rs: 8, ts: 28 });
      kit.rod([-0.55, 0.44, 0], [0, 0.48, 0], 0.016, fr);
      kit.rod([0, 0.48, 0], [0.4, 0.9, 0], 0.016, fr);
      kit.rod([-0.55, 0.44, 0], [-0.1, 0.9, 0], 0.016, fr);
      kit.rod([-0.1, 0.9, 0], [0.4, 0.9, 0], 0.016, fr);
      kit.rod([0, 0.48, 0], [-0.12, 0.98, 0], 0.016, fr);
      kit.rod([0.4, 0.9, 0], [0.55, 0.44, 0], 0.016, fr);
      kit.rod([0.4, 0.9, 0], [0.36, 1.08, 0], 0.014, fr);
      kit.rod([0.26, 1.08, -0.22], [0.46, 1.08, 0.22], 0.012, dark);
      kit.rb(0.24, 0.06, 0.12, 0.03, dark, -0.13, 1.02, 0);
      kit.rb(0.36, 0.2, 0.26, 0.02, kit.M('stBasket', 0x7a7e80, { metalness: 0.4 }), 0.6, 0.98, 0);
    });
    for (const [px, s] of [[-5.0 - 1.0, 1], [2.55, 0.8], [1.25, 0.9]] as const) {
      kit.cy(0.17 * s, 0.13 * s, 0.32 * s, kit.M('stPot', 0x9a8e7a, { roughness: 0.8 }), px, 0.12 + 0.16 * s, WALL_Z + 0.3, { seg: 16 });
      for (let k = 0; k < 6; k++) vc.add(new THREE.IcosahedronGeometry(0.12 * s, 1), leafCols[k % 4]!, px + (r() - 0.5) * 0.25 * s, 0.12 + 0.4 * s + r() * 0.3 * s, WALL_Z + 0.3 + (r() - 0.5) * 0.2, { sy: 1.3 });
    }

    // ---- the city behind and the sky
    const skyMat = new THREE.MeshBasicMaterial({ map: skylineTex('evening'), toneMapped: false, fog: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(64, 21), skyMat);
    sky.position.set(0, 6.5, -22);
    root.add(sky);

    // ---- light: warm spill from windows and the store, the vending glow, cold fill from the sky
    kit.lamp('stStore', { light: kit.pointLight(0xf4f8ff, 6, 8, SX, 1.6, WALL_Z + 1.4, 1.3), mats: [[storeGlass, 0.7], [sign, 0.8]], on: { evening: 1, night: 1 } });
    kit.lamp('stVending', { light: kit.pointLight(0xe8f0ff, 3.2, 4.5, -4.1, 1.2, WALL_Z + 1.3, 1.4), mats: vendFront.map((m) => [m, 0.72] as [THREE.Material, number]), glows: [kit.halo(0xdfe8ff, 1.6, 0.1, -4.1, 1.1, WALL_Z + 0.9)], on: { evening: 1, night: 1 } });
    kit.lamp('stWindows', { mats: litMats.map((m) => [m, 0.85] as [THREE.Material, number]), on: { evening: 1, night: 1 } });
    kit.lamp('stHouseWarm', { light: kit.pointLight(0xffb070, 2.4, 9, -3, 4, -1.5, 1.2), on: { evening: 1, night: 0.6 } });
    kit.lamp('stFront', { light: kit.pointLight(0xc8d0e8, 3.4, 16, 0, 3.5, 5, 0.9), on: { evening: 1, night: 0.6 } });
    // long light streaks on the wet road (fake reflections) under the lamps, the store and the vending machines
    const streak = (color: number, x: number, z: number, w: number, d: number, op: number) => kit.statePool(color, x, 0.012, z, w, d, op, ['evening', 'night']);
    streak(0xdfe8ff, lampX + 1.35, 2.6, 1.0, 5.0, 0.12);
    streak(0xf0f6ff, SX, 1.4, 4.0, 3.5, 0.12);
    streak(0xdfe8ff, -4.1, -0.6, 1.4, 2.2, 0.1);
    streak(0xffc070, 11, 2.6, 0.8, 4.0, 0.1);

    // ---- rain: thin slanted streaks falling, one instanced draw call (slow enough to never strobe)
    const rainN = low ? 380 : 700;
    const dropGeo = new THREE.BoxGeometry(0.008, 0.34, 0.008);
    const rainMat = new THREE.MeshBasicMaterial({ color: 0xa8b4cc, transparent: true, opacity: 0.38, depthWrite: false });
    const rain = new THREE.InstancedMesh(dropGeo, rainMat, rainN);
    rain.frustumCulled = false;
    root.add(rain);
    const drops = Array.from({ length: rainN }, () => ({ x: XL - 2 + r() * (XR - XL + 4), y: r() * 8, z: -3 + r() * 8, v: 6 + r() * 2 }));
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12));
    const m4 = new THREE.Matrix4();
    const v3 = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const still = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    // ripples in the puddles: little rings that grow and fade
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8a96b0, transparent: true, opacity: 0.35, depthWrite: false });
    const ringGeo = new THREE.RingGeometry(0.03, 0.04, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ripN = low ? 24 : 40;
    const ripples = new THREE.InstancedMesh(ringGeo, ringMat, ripN);
    ripples.frustumCulled = false;
    root.add(ripples);
    const rip = Array.from({ length: ripN }, (_, i) => ({ x: 0, z: 0, y: 0, t: (i / ripN) * 1.2 }));
    const spots: [number, number, number, number][] = [[-4.2, 1.6, 1.4, 0.008], [1.6, 2.6, 2.0, 0.008], [5.8, 1.2, 1.1, 0.008], [-0.8, -0.2, 0.7, 0.128]];
    const respawn = (p: (typeof rip)[number]) => {
      const s = spots[Math.floor(r() * spots.length)]!;
      p.x = s[0] + (r() - 0.5) * s[2] * 0.8;
      p.z = s[1] + (r() - 0.5) * s[2] * 0.4;
      p.y = s[3];
      p.t = 0;
    };
    rip.forEach(respawn);

    vc.flush(root, kit.mat('stVc', { vertexColors: true, color: 0xffffff, roughness: 0.85 }));
    kit.flushBatches();
    kit.onState((s) => {
      skyMat.map = skylineTex(s === 'night' ? 'night' : 'evening');
      skyMat.needsUpdate = true;
      for (const m of nightOff) m.emissiveIntensity = s === 'night' ? 0 : m.emissiveIntensity;
      kit.fog = new THREE.Fog(s === 'night' ? 0x0c1020 : 0x3a4058, 14, 34);
    });

    return {
      kit,
      look: { exposure: 1.0, bloom: 0.3, threshold: 0.92 },
      shots: {
        wide: { pos: [0, 1.9, 7.4], look: [0, 2.0, -3], fov: 52 },
        stop: { pos: [-0.6, 1.5, 3.2], look: [-1.2, 1.4, -1.2], fov: 46 },
        store: { pos: [4.4, 1.6, 3.6], look: [SX, 1.6, WALL_Z], fov: 46 },
        wires: { pos: [0, 1.4, 5.0], look: [0.6, 6.5, -2], fov: 56 },
        vending: { pos: [-3.0, 1.3, 2.0], look: [-4.1, 1.1, WALL_Z], fov: 46 },
      },
      marks: {
        left: { x: -1.9, z: -0.5 },
        center: { x: -0.4, z: -0.5 },
        right: { x: 1.2, z: -0.5 },
        stop: { x: -1.0, z: -0.3, facing: 'right' },
        bench: { x: 0.6, z: -1.2 },
        store: { x: SX - 1.2, z: -0.9, facing: 'back' },
        vending: { x: -4.1, z: -0.9, facing: 'back' },
      },
      walk: { minX: XL + 1, maxX: XR - 1, z: -0.5 },
      update(dt) {
        for (let i = 0; i < rainN; i++) {
          const d = drops[i]!;
          d.y -= d.v * dt;
          d.x -= d.v * dt * 0.12;
          if (d.y < 0.1) {
            d.y += 8;
            d.x = XL - 2 + r() * (XR - XL + 4);
          }
          m4.compose(v3.set(d.x, d.y, d.z), tilt, one);
          rain.setMatrixAt(i, m4);
        }
        rain.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < ripN; i++) {
          const p = rip[i]!;
          p.t += dt;
          if (p.t > 1.2) respawn(p);
          const s = 1 + p.t * 5;
          m4.compose(v3.set(p.x, p.y, p.z), still, scale.set(s, 1, s));
          ripples.setMatrixAt(i, m4);
        }
        ripples.instanceMatrix.needsUpdate = true;
      },
    };
  },
};
