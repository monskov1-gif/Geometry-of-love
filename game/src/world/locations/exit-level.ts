// «Учебный уровень „Выход“» (гл. 3–4): первое место внутри игры, куда Дамео
// затягивает из монитора. По тексту главы 4: пастельные платформы уходят вверх,
// над ними облака-звёздочки, а ещё выше небо темнеет и становится гладким,
// стеклянным — обратная сторона монитора, где что-то светится, как окно ночью.
// Построен как стартовая площадка детского платформера: клетчатая площадка
// с радужным бортиком, арка «СТАРТ» с гирляндой, табличка «ВЫХОД ↑», лесенка,
// пружина-батут, лесенка платформ с полосатыми боками и наклейками, звёзды-
// бонусы над ними, облака со звёздами (референс IMG_5042), леденцы, кубики,
// цветы и грибы по краям кадра, парящие фигуры, блёстки, конфетти. Чуть-чуть
// неправильно: на табличке со счётом ровно одна жизнь.
import * as THREE from 'three';
import { LocationKit, roundedBox, rng, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { candyKit, flushCandy, pick, type CandyKit } from '../candy/candy-kit';
import { balloon, block, blockPile, crayon, lollipop, puffyShape, ringStack, solid } from '../candy/toys';
import { bunting, cloud, giantFlower, mushroom, rainbowArch } from '../candy/decor';
import { confetti, floaters, glitchLayer, glitter, type Fx } from '../candy/fx';
import { checkerFloor } from '../candy/textures';
import { CANDY, css, LOUD, PASTEL, RAINBOW } from '../candy/palette';
import { ACCENT_ON, CANDY_AMBIENT, CANDY_STATES } from '../candy/states';
import { cuteSticker } from '../candy/atlases';
import { fillTest, inCircle, inHeart, inStar, pixelText } from '../candy/shapes';
import { CANDY_LOOK } from '../candy/look';

const XL = -11;
const XR = 11;
const PAD_BACK = -3.2;
const SKY_Z = -14;

/** Sky of the training level: pastel at the horizon, darkening upward into smooth glass. */
const levelSky = (mood: string) =>
  TX(`exitSky-${mood}`, 256, 256, (ctx, w, h) => {
    const r = rng(77);
    const stops: [number, number[]][] =
      mood === 'glitch'
        ? [
            [0, [10, 6, 16]],
            [0.45, [30, 14, 44]],
            [1, [90, 30, 80]],
          ]
        : mood === 'dim'
          ? [
              [0, [22, 20, 34]],
              [0.4, [70, 62, 96]],
              [1, [170, 150, 180]],
            ]
          : [
              [0, [24, 20, 44]],
              [0.32, [72, 52, 120]],
              [0.6, [150, 140, 230]],
              [0.82, [170, 214, 250]],
              [1, [255, 200, 236]],
            ];
    for (let y = 0; y < h; y++) {
      const k = y / h;
      let i = 0;
      while (i < stops.length - 2 && k > stops[i + 1]![0]) i++;
      const [k0, c0] = stops[i]!;
      const [k1, c1] = stops[i + 1]!;
      const t = Math.min(1, Math.max(0, (k - k0) / (k1 - k0)));
      // dithered bands, not a smooth gradient: pixel-art sky
      const d = ((y % 2) * 0.5 - 0.25) / 8;
      const tt = Math.min(1, Math.max(0, Math.round((t + d) * 8) / 8));
      ctx.fillStyle = `rgb(${c0[0]! + (c1[0]! - c0[0]!) * tt},${c0[1]! + (c1[1]! - c0[1]!) * tt},${c0[2]! + (c1[2]! - c0[2]!) * tt})`;
      ctx.fillRect(0, y, w, 1);
    }
    // stars: tiny in the dark top, coloured sparkles lower down
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(Math.pow(r(), 1.6) * h * 0.7);
      ctx.fillStyle = i % 3 === 0 ? css(LOUD[i % LOUD.length]!) : '#fff9fd';
      ctx.fillRect(x, y, 1, 1);
      if (i % 7 === 0) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    if (mood === 'day') {
      // little pixel clouds with stars near the horizon
      for (let i = 0; i < 12; i++) {
        const cx = Math.floor(r() * w);
        const cy = Math.floor(h * (0.62 + r() * 0.3));
        const s = 8 + Math.floor(r() * 8);
        const tint = css(PASTEL[i % PASTEL.length]!);
        for (let k = 0; k < 4; k++) fillTest(ctx, cx + (k - 1.5) * s * 0.6 - s / 2, cy - (k % 2) * s * 0.3 - s / 2, s, s * 0.8, tint, inCircle);
        fillTest(ctx, cx - 3, cy - 4, 6, 6, css(LOUD[(i * 3) % LOUD.length]!), inStar());
      }
      for (let i = 0; i < 10; i++) fillTest(ctx, Math.floor(r() * w), Math.floor(h * (0.5 + r() * 0.4)), 5, 5, css(LOUD[(i * 5) % LOUD.length]!), inHeart);
    }
  });

/** The back of the monitor seen from inside: a dark glass with the night room glowing through it. */
const roomWindow = () =>
  TX('exitRoomWindow', 96, 64, (ctx, w, h) => {
    ctx.fillStyle = '#2a2236';
    ctx.fillRect(0, 0, w, h);
    // warm lamp glow on the far wall, the bed, the chair, the blinds: blurred by the glass
    ctx.fillStyle = '#5a4450';
    ctx.fillRect(0, 0, w, h * 0.62);
    ctx.fillStyle = '#7a5a54';
    fillTest(ctx, 54, 4, 40, 34, '#8a6a58', inCircle);
    fillTest(ctx, 64, 10, 20, 18, '#b48a66', inCircle);
    ctx.fillStyle = '#3a3040';
    for (let y = 6; y < 30; y += 3) ctx.fillRect(10, y, 26, 1);
    ctx.fillStyle = '#463a4a';
    ctx.fillRect(4, 40, 40, 10);
    ctx.fillStyle = '#5a4a58';
    ctx.fillRect(6, 36, 36, 5);
    ctx.fillStyle = '#1e1824';
    ctx.fillRect(60, 32, 14, 24);
    ctx.fillRect(56, 44, 22, 4);
    ctx.fillStyle = '#241e2a';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
  });

/** A floating platform: pastel top, candy-striped sides, a sticker on the front, a cloud puff under it. */
function platform(ck: CandyKit, x: number, y: number, z: number, w: number, top: number, side: number, i: number): void {
  const d = 0.9;
  ck.gloss.add(roundedBox(w, 0.16, d, 0.06, 2), top, x, y - 0.08, z);
  ck.gloss.add(new THREE.BoxGeometry(w - 0.04, 0.24, d - 0.04, Math.max(1, Math.round(w * 8)), 1, 1), (px) => (Math.floor((px + 40) * 5) % 2 ? side : CANDY.paper), x, y - 0.28, z, { perFace: true });
  // icing drips along the front edge
  for (let k = 0; k < Math.round(w * 4); k++) {
    const dx = -w / 2 + 0.12 + k * 0.25;
    ck.gloss.add(new THREE.SphereGeometry(0.05 + ((k * 7 + i) % 3) * 0.015, 10, 8), top, x + dx, y - 0.16 - ((k + i) % 3) * 0.03, z + d / 2 - 0.02, { sy: 1.6 });
  }
  ck.stickers.add(new THREE.PlaneGeometry(0.22, 0.22), 0xffffff, x + (i % 2 ? 0.3 : -0.3) * (w / 2), y - 0.28, z + d / 2 + 0.005, { tile: cuteSticker(ck.r) });
  cloud(ck, x, y - 0.55, z - 0.1, 0.32 + w * 0.08, PASTEL[i % PASTEL.length]!);
}

/** A cloud with stars stuck on it (the pixel clouds of the references, in 3D). */
function starCloud(ck: CandyKit, x: number, y: number, z: number, s: number, tint: number, i: number): void {
  cloud(ck, x, y, z, s, tint);
  cloud(ck, x + 0.15 * s, y + 0.05 * s, z + 0.25 * s, s * 0.7, CANDY.paper);
  const stars = [CANDY.pink, CANDY.sunshine, CANDY.grass, CANDY.blue, CANDY.tangerine];
  for (let k = 0; k < 3; k++) puffyShape(ck, 'star', x + (k - 1) * 0.55 * s, y + (k % 2 ? 0.25 : -0.1) * s, z + 0.55 * s, 0.16 * s + 0.04, stars[(i + k) % stars.length]!, { rz: (k - 1) * 0.3 });
  for (let k = 0; k < 6; k++) ck.gloss.add(new THREE.SphereGeometry(0.035 * s + 0.01, 10, 8), LOUD[(i * 3 + k) % LOUD.length]!, x + (ck.r() - 0.5) * 1.4 * s, y + (ck.r() - 0.3) * 0.6 * s, z + 0.5 * s);
}

/** A sign board on a pole with a pixel-text face. */
function sign(ck: CandyKit, x: number, z: number, h: number, face: THREE.Material, w: number, fh: number, frame: number, ry = 0): void {
  const { kit } = ck;
  kit.withT(x, z, ry, () => {
    ck.gloss.add(new THREE.CylinderGeometry(0.04, 0.05, h, 12, 6), (_x, yy) => (Math.floor((yy + 10) * 6) % 2 ? CANDY.paper : CANDY.cherry), 0, h / 2, 0, { perFace: true });
    ck.gloss.add(roundedBox(w + 0.12, fh + 0.12, 0.08, 0.04, 2), frame, 0, h + fh / 2, 0);
    kit.pl(w, fh, face, 0, h + fh / 2, 0.045);
    puffyShape(ck, 'star', w / 2 + 0.02, h + fh + 0.04, 0.06, 0.1, CANDY.sunshine, { rz: 0.3 });
  });
}

export const exitLevel3D: LocationDef3D = {
  id: 'exit-level',
  states: [...CANDY_STATES],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: CANDY_AMBIENT });
    kit.setupLights();
    const ck = candyKit(kit, 4040);
    const { r } = ck;
    const nt = { toneMapped: false };

    // ---- the start pad: checker tiles with a rainbow kerb; the cloud sea beyond it
    kit.floorRect(XL - 3, XR + 3, PAD_BACK, 7, kit.texM('exitPad', checkerFloor('exitPad', CANDY.babyPink, CANDY.mint, [CANDY.sunshine, CANDY.blue, CANDY.grape, CANDY.cherry]), { roughness: 0.55, ...nt }), { tile: 1.1 });
    for (let x = XL - 3; x < XR + 3; x += 0.5) ck.gloss.add(new THREE.BoxGeometry(0.46, 0.1, 0.14), RAINBOW[Math.round(x * 2 + 40) % RAINBOW.length]!, x + 0.25, 0.05, PAD_BACK + 0.07);
    // pad edge: a candy-striped skirt going down into the clouds
    ck.gloss.add(new THREE.BoxGeometry(XR - XL + 6, 0.9, 0.06, Math.round((XR - XL + 6) * 4), 1, 1), (px) => (Math.floor((px + 40) * 2) % 2 ? CANDY.pink : CANDY.paper), 0, -0.45, PAD_BACK - 0.03, { perFace: true });
    for (let i = 0; i < 26; i++) cloud(ck, XL - 2 + i * 1.0 + r() * 0.5, -0.5 + r() * 0.5, PAD_BACK - 1.0 - r() * 3, 0.7 + r() * 0.5, i % 3 ? CANDY.paper : PASTEL[i % PASTEL.length]!);
    for (let i = 0; i < 14; i++) cloud(ck, XL - 4 + i * 2.0 + r(), -0.9 + r() * 0.6, PAD_BACK - 5 - r() * 4, 1.2 + r() * 0.6, i % 2 ? CANDY.lavender : CANDY.babyPink);

    // ---- the climb: platforms zig-zagging up and away to the glass
    const platforms: [number, number, number, number][] = [
      [-6.2, 0.9, -4.6, 1.6],
      [-3.6, 1.7, -5.4, 1.4],
      [-0.6, 2.4, -5.0, 1.8],
      [2.4, 3.1, -5.6, 1.4],
      [5.4, 3.8, -6.0, 1.6],
      [3.0, 4.6, -7.0, 1.3],
      [0.2, 5.3, -7.4, 1.5],
      [-2.8, 6.0, -7.8, 1.3],
      [-5.6, 6.7, -8.4, 1.6],
      [-2.2, 7.4, -9.0, 1.2],
      [1.2, 8.1, -9.4, 1.4],
      [4.4, 8.8, -9.8, 1.2],
      [7.8, 2.2, -6.4, 1.4],
      [9.2, 1.2, -4.8, 1.2],
      [-8.8, 2.6, -6.8, 1.4],
    ];
    platforms.forEach(([x, y, z, w], i) => {
      platform(ck, x, y, z, w, PASTEL[i % PASTEL.length]!, LOUD[(i * 5) % LOUD.length]!, i);
      // bonus stars and coins hovering over the platforms
      if (i % 3 !== 2) puffyShape(ck, 'star', x + (i % 2 ? 0.3 : -0.3), y + 0.45, z, 0.16, CANDY.sunshine, { ry: 0.3 });
      if (i % 3 === 1)
        for (let k = 0; k < 3; k++) ck.gloss.add(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 18), CANDY.tangerine, x - 0.3 + k * 0.3, y + 0.25, z + 0.1, { rx: Math.PI / 2 });
      if (i % 4 === 0) puffyShape(ck, 'heart', x - w / 2 + 0.2, y + 0.3, z, 0.12, CANDY.cherry);
    });
    // arrows painted on clouds point the way up
    const arrowTex = TX('exitArrow', 16, 16, (ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#fff9fd';
      for (let y = 0; y < 8; y++) ctx.fillRect(8 - y, 1 + y, y * 2 + 1, 1);
      ctx.fillRect(5, 9, 7, 6);
      ctx.fillStyle = css(CANDY.pink);
      for (let y = 1; y < 7; y++) ctx.fillRect(8 - y + 1, 2 + y, y * 2 - 1, 1);
      ctx.fillRect(6, 9, 5, 5);
    });
    const arrowM = kit.mat('exitArrow', { map: arrowTex, color: 0xffffff, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, ...nt });
    for (const [x, y, z] of [
      [-5.0, 1.5, -4.9],
      [1.0, 3.0, -5.2],
      [4.0, 4.6, -6.6],
      [-1.4, 6.2, -7.5],
      [-4.0, 7.6, -8.6],
    ] as const)
      kit.pl(0.45, 0.45, arrowM, x, y, z, { rz: -0.4 + r() * 0.8 });

    // ---- clouds with stars (references: pixel clouds with stars) at every height
    const tints = [CANDY.sky, CANDY.lilac, CANDY.babyPink, CANDY.mint];
    [
      [-8.4, 4.2, -7.5, 0.9],
      [7.4, 5.6, -8.2, 1.0],
      [-4.6, 3.4, -6.4, 0.6],
      [6.4, 2.6, -5.0, 0.7],
      [-0.8, 9.6, -10.6, 1.1],
      [8.8, 8.6, -10.2, 0.9],
      [-8.2, 8.8, -10.4, 0.9],
      [3.6, 6.4, -8.6, 0.6],
    ].forEach(([x, y, z, s], i) => starCloud(ck, x!, y!, z!, s!, tints[i % tints.length]!, i));

    // ---- the start: a rainbow arch with bunting, a "СТАРТ" banner, the exit sign
    rainbowArch(ck, 0, PAD_BACK + 0.35, 2.6, 0.2);
    const banner = TX('exitStart', 64, 16, (ctx, w, h) => {
      ctx.fillStyle = css(CANDY.sunshine);
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) {
        ctx.fillStyle = css(CANDY.tangerine);
        ctx.fillRect(x, 0, 4, 2);
        ctx.fillRect(x + 4, h - 2, 4, 2);
      }
      pixelText(ctx, 'СТАРТ', w / 2, 3, 11, '#30243b', { align: 'center' });
    });
    ck.gloss.add(roundedBox(1.7, 0.48, 0.06, 0.03, 2), CANDY.cherry, 0, 2.72, PAD_BACK + 0.32);
    kit.pl(1.6, 0.4, kit.texM('exitStart', banner, { roughness: 0.7, ...nt }), 0, 2.72, PAD_BACK + 0.355);
    bunting(ck, [-2.6, 2.3, PAD_BACK + 0.4], [-6.2, 1.15, -4.2], 9, 0.3);
    bunting(ck, [2.6, 2.3, PAD_BACK + 0.4], [6.4, 1.8, PAD_BACK + 0.2], 10, 0.35);
    bunting(ck, [-2.4, 2.8, PAD_BACK + 0.38], [2.4, 2.8, PAD_BACK + 0.38], 12, 0.25);
    const exitFace = TX('exitSign', 48, 24, (ctx, w, h) => {
      ctx.fillStyle = css(CANDY.mint);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(CANDY.grass);
      ctx.fillRect(0, h - 3, w, 3);
      pixelText(ctx, 'ВЫХОД', w / 2, 2, 10, '#30243b', { align: 'center' });
      ctx.fillStyle = css(CANDY.pink);
      for (let y = 0; y < 5; y++) ctx.fillRect(w / 2 - y, 13 + y, y * 2 + 1, 1);
      ctx.fillRect(w / 2 - 1, 18, 3, 3);
    });
    sign(ck, -3.4, PAD_BACK + 0.6, 1.5, kit.texM('exitSign', exitFace, { roughness: 0.7, ...nt }), 0.8, 0.4, CANDY.grape, 0.15);
    // the score board: stars collected, and exactly one life
    const score = TX('exitScore', 48, 24, (ctx, w, h) => {
      ctx.fillStyle = '#fff9fd';
      ctx.fillRect(0, 0, w, h);
      fillTest(ctx, 2, 2, 8, 8, css(CANDY.sunshine), inStar());
      pixelText(ctx, '×0', 12, 2, 9, '#30243b');
      fillTest(ctx, 2, 13, 8, 7, css(CANDY.cherry), inHeart);
      pixelText(ctx, '×1', 12, 13, 9, '#30243b');
      pixelText(ctx, 'УР.1', 30, 7, 8, css(CANDY.grape));
    });
    sign(ck, 3.6, PAD_BACK + 0.6, 1.35, kit.texM('exitScore', score, { roughness: 0.7, ...nt }), 0.8, 0.4, CANDY.blue, -0.15);

    // ---- the way up from the pad: a ladder to the first platform, a spring pad
    kit.withT(-6.2, -4.1, 0, () => {
      for (const s of [-0.22, 0.22]) ck.gloss.add(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 10), CANDY.cobalt, s, 0.5, 0);
      for (let k = 0; k < 4; k++) ck.gloss.add(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8), LOUD[k * 2]!, 0, 0.15 + k * 0.22, 0, { rz: Math.PI / 2 });
    });
    kit.withT(6.0, -2.4, 0, () => {
      ck.gloss.add(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 24), CANDY.grape, 0, 0.06, 0);
      for (let k = 0; k < 4; k++) ck.gloss.add(new THREE.TorusGeometry(0.26, 0.03, 8, 20), CANDY.paper, 0, 0.16 + k * 0.08, 0, { rx: Math.PI / 2 });
      ck.gloss.add(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24), (px, _y, pz) => (Math.floor((Math.atan2(pz, px) + 4) * 2) % 2 ? CANDY.cherry : CANDY.paper), 0, 0.5, 0, { perFace: true });
    });

    // ---- toys around the pad (back edge and frame edges; the middle stays free)
    blockPile(ck, -8.6, -2.5, 3, 0.45, 41);
    blockPile(ck, 8.4, -2.6, 2, 0.5, 61);
    block(ck, -1.9, 0, -2.6, 0.5, { ry: 0.3, seed: 12 });
    block(ck, -1.4, 0, -2.75, 0.32, { ry: -0.4, seed: 13 });
    block(ck, 1.8, 0, -2.7, 0.42, { ry: 0.2, seed: 14 });
    ringStack(ck, -4.8, -2.4, 0.9);
    ringStack(ck, 4.9, -2.7, 1.1);
    [-7.4, -5.2, 7.2, 9.4].forEach((x, i) => lollipop(ck, x, -2.9 + (i % 2) * 0.3, 1.5 + (i % 3) * 0.3, 0.45 + (i % 2) * 0.12, i + 3));
    for (let i = 0; i < 8; i++) {
      const x = XL + 1 + i * 2.7 + r() * 0.6;
      if (Math.abs(x) < 2.6) continue;
      solid(ck, i, x, 0.22, -2.0 - r() * 0.6, 0.36, pick(r, LOUD), { ry: r() * 3 });
    }
    crayon(ck, -2.6, 0.11, -2.1, 1.1, 0.1, CANDY.aqua, { rz: Math.PI / 2, ry: 0.4 });
    [CANDY.cherry, CANDY.sunshine, CANDY.blue, CANDY.pink, CANDY.grass].forEach((c, i) => balloon(ck, -8.0 + (i % 3) * 0.3, 2.0 + i * 0.15, -2.6 + (i % 2) * 0.2, c, 0.3));
    [CANDY.grape, CANDY.tangerine, CANDY.aqua].forEach((c, i) => balloon(ck, 8.2 + i * 0.3, 2.2 + i * 0.2, -2.4, c, 0.3));
    // foreground at the frame edges: giant daisies and mushrooms, kept low
    for (const side of [-1, 1]) {
      giantFlower(ck, side * 3.0, 1.6, 0.7, side < 0 ? CANDY.pink : CANDY.blue, side * 0.12);
      giantFlower(ck, side * 4.2, 1.2, 1.0, side < 0 ? CANDY.grape : CANDY.tangerine, -side * 0.1);
      mushroom(ck, side * 5.4, 1.4, 1.0, side < 0 ? CANDY.cherry : CANDY.grape);
      mushroom(ck, side * 3.6, 2.2, 0.7, side < 0 ? CANDY.aqua : CANDY.pink);
    }

    // ---- the sky and the glass: the monitor's back, high above, with the room glowing through
    const skyMat = new THREE.MeshBasicMaterial({ map: levelSky('day'), toneMapped: false, fog: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(70, 40), skyMat);
    sky.position.set(0, 12, SKY_Z);
    root.add(sky);
    // the glass: a dark smooth band across the top with faint reflections
    const glassMat = kit.mat('exitGlass', { color: 0x1a1428, roughness: 0.12, metalness: 0.4, emissive: 0x0c0a16, ...nt });
    kit.withT(0, -11.5, 0, () => {
      ck.gloss.add(new THREE.BoxGeometry(46, 0.25, 0.3), 0x2a2238, 0, 11.0, 0.2);
      kit.pl(46, 8, glassMat, 0, 15.0, 0);
      for (let k = 0; k < 6; k++) ck.vc.add(new THREE.PlaneGeometry(0.12 + (k % 3) * 0.08, 6), 0x3a3456, -12 + k * 4.6, 14.6, 0.02, { rz: -0.5 });
    });
    const roomMat = new THREE.MeshBasicMaterial({ map: roomWindow(), toneMapped: false, fog: false, color: 0xd8c8c8 });
    const roomPane = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.6), roomMat);
    roomPane.position.set(1.2, 13.4, -11.45);
    root.add(roomPane);
    const halo = kit.halo(0xffd8b0, 9, 0.22, 1.2, 13.4, -11.3);
    kit.lamp('roomGlow', { glows: [halo], on: { day: 1, dim: 0.6, glitch: 0.8 } });

    // ---- light: soft fill, pink and blue accents, the warm glow from above in the evening of the level
    kit.lamp('exitFill', { light: kit.pointLight(0xfff4f0, 2.4, 18, 0, 3.2, 3, 0.8), on: { day: 1, dim: 0.35, glitch: 0.15 } });
    kit.lamp('exitPink', { light: kit.pointLight(CANDY.pink, 1.6, 9, -5, 2.4, -1.5, 1.2), on: ACCENT_ON });
    kit.lamp('exitBlue', { light: kit.pointLight(CANDY.blue, 1.6, 9, 5, 2.4, -1.5, 1.2), on: ACCENT_ON });
    kit.lamp('exitHigh', { light: kit.pointLight(0xffe0c0, 1.6, 14, 1, 9, -8, 1.0), on: { day: 1, dim: 0.5, glitch: 0.4 } });
    kit.lamp('exitCode', { light: kit.pointLight(0x39ff88, 3, 12, 0, 3, -2, 1.0), on: { day: 0, dim: 0, glitch: 1 } });

    const fx: Fx[] = [
      floaters(kit, root, { x0: XL, x1: XR, y0: 2.6, y1: 7, z0: -7, z1: -3 }, low ? 30 : 46, r),
      glitter(kit, root, { x0: XL, x1: XR, y0: 0.3, y1: 6, z0: -6, z1: 1.5 }, low ? 140 : 240, r),
      glitchLayer(kit, root, { x0: XL + 2, x1: XR - 2, y0: 1, y1: 7, z: -6 }, 14, r),
    ];
    confetti(kit, root, { x0: XL, x1: XR, z0: PAD_BACK + 0.3, z1: 3 }, low ? 300 : 520, r, 0.012);

    kit.onState((s) => {
      skyMat.map = levelSky(s);
      skyMat.needsUpdate = true;
      kit.fog = s === 'day' ? new THREE.Fog(0xe8d0f4, 18, 40) : s === 'dim' ? new THREE.Fog(0x8f8aa0, 4, 24) : new THREE.Fog(0x1a0c24, 6, 22);
    });
    flushCandy(ck, root);
    kit.flushBatches();

    return {
      kit,
      look: CANDY_LOOK,
      shots: {
        wide: { pos: [0, 1.75, 5.4], look: [0, 1.6, -2.4], fov: 50 },
        // Dameo looks up: the platforms climb into the dark glass, the room glows behind it
        up: { pos: [0, 1.2, 4.6], look: [0.6, 6.4, -8], fov: 58 },
        climb: { pos: [-3.2, 2.2, 3.4], look: [-4.6, 2.4, -5.2], fov: 50 },
      },
      marks: {
        left: { x: -1.6, z: -0.6 },
        center: { x: 0, z: -0.6 },
        right: { x: 1.6, z: -0.6 },
        ladder: { x: -6.2, z: -3.6, facing: 'back' },
        far: { x: 6.0, z: -2.0 },
      },
      walk: { minX: XL + 2, maxX: XR - 2, z: -0.6 },
      update(dt, t) {
        for (const f of fx) f.update(dt, t);
      },
    };
  },
};
