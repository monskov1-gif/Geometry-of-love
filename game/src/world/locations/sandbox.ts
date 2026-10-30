// «Песочница» (гл. 6–8, 11): огромная свободная область игры, где «можно
// создавать задачи, менять параметры окружения, крутить и растягивать фигуры»;
// «из-за гигантского кубика выглядывают местные обитатели». Построена как
// площадка детской обучающей игры: конфетная трава, песочница с радужным
// бортиком, гигантский кубик с буквами, пирамиды кубиков, мелки-забор, леденцы,
// радуга на облаках, улыбающееся солнце, гирлянда флажков, шары, парящие
// звёзды и сердечки, блёстки, конфетти. Чуть-чуть неправильно: у солнца
// слишком много зубов, среди наклеек есть глаз.
// 'sandbox-dim' — тот же мир, застывший («всё вокруг замирает»): серо-лавандовый
// свет, бледное небо. Состояние 'glitch' — поздние фазы.
import * as THREE from 'three';
import { LocationKit } from '../kit/location-kit';
import type { LocationBuild, LocationDef3D } from '../types';
import { candyKit, flushCandy, pick } from '../candy/candy-kit';
import { balloon, beachBall, block, blockPile, crayon, lollipop, pencil, puffyShape, ringStack, solid } from '../candy/toys';
import { bunting, cloud, giantFlower, mushroom, rainbowArch, ringRug, stickerBomb, sun } from '../candy/decor';
import { confetti, floaters, glitchLayer, glitter, type Fx } from '../candy/fx';
import { candyGrass, checkerFloor, skyBackdrop, sprinkleSand } from '../candy/textures';
import { CANDY, LOUD, PASTEL, RAINBOW } from '../candy/palette';
import { CANDY_LOOK } from '../candy/look';
import { ACCENT_ON, CANDY_AMBIENT, CANDY_STATES, moodOf } from '../candy/states';

const XL = -11;
const XR = 11;
const SKY_Z = -10;

function buildSandbox(root: THREE.Group, low: boolean): LocationBuild {
  const kit = new LocationKit(root, { low, ambient: CANDY_AMBIENT });
  kit.setupLights();
  const ck = candyKit(kit, 606);
  const { r } = ck;

  // ---- ground: candy grass, a checker path along the play strip, the sand pit
  const grass = kit.texM('candyGrass', candyGrass('sandbox'), { roughness: 0.95, toneMapped: false });
  kit.floorRect(XL - 4, XR + 4, SKY_Z, 7, grass, { tile: 1.2 });
  kit.floorRect(XL - 4, XR + 4, -1.5, 0.5, kit.texM('sandPath', checkerFloor('sandPath', CANDY.babyPink, CANDY.mint, [CANDY.pink, CANDY.blue, CANDY.sunshine, CANDY.grape]), { roughness: 0.6, toneMapped: false }), { tile: 1.0, y: 0.004 });
  // path edge: a row of rainbow kerb stones
  for (let x = XL - 3; x < XR + 3; x += 0.5)
    for (const z of [-1.55, 0.55]) ck.gloss.add(new THREE.BoxGeometry(0.46, 0.06, 0.1), RAINBOW[Math.round(x * 2 + 40) % RAINBOW.length]!, x + 0.25, 0.03, z);

  // sand pit behind the path, rim of striped planks
  const pit = { x0: -4.2, x1: 1.6, z0: -4.6, z1: -2.2 };
  kit.floorRect(pit.x0, pit.x1, pit.z0, pit.z1, kit.texM('candySand', sprinkleSand('sandbox'), { roughness: 1, toneMapped: false }), { tile: 1.0, y: 0.12 });
  const rim = (x: number, z: number, w: number, d: number) =>
    ck.gloss.add(new THREE.BoxGeometry(w, 0.24, d, Math.max(1, Math.round(w * 4)), 1, Math.max(1, Math.round(d * 4))), (px, _py, pz) => RAINBOW[Math.floor((px + pz + 20) * 2) % RAINBOW.length]!, x, 0.12, z, { perFace: true });
  rim((pit.x0 + pit.x1) / 2, pit.z1, pit.x1 - pit.x0 + 0.2, 0.18);
  rim((pit.x0 + pit.x1) / 2, pit.z0, pit.x1 - pit.x0 + 0.2, 0.18);
  rim(pit.x0, (pit.z0 + pit.z1) / 2, 0.18, pit.z1 - pit.z0);
  rim(pit.x1, (pit.z0 + pit.z1) / 2, 0.18, pit.z1 - pit.z0);
  // in the sand: half-buried shapes, a bucket, a spade, little blocks
  solid(ck, 2, -3.4, 0.45, -3.0, 0.7, CANDY.cherry, { rz: 0.3 });
  solid(ck, 0, -1.2, 0.35, -3.8, 0.6, CANDY.aqua);
  solid(ck, 3, 0.6, 0.3, -3.2, 0.7, CANDY.sunshine, { rx: 1.2 });
  ck.gloss.add(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 20, 1, true), CANDY.blue, -2.2, 0.3, -2.7);
  ck.gloss.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20), CANDY.blue, -2.2, 0.15, -2.7);
  ck.gloss.add(new THREE.TorusGeometry(0.17, 0.012, 6, 16, Math.PI), CANDY.paper, -2.2, 0.46, -2.7);
  pencil(ck, -0.4, 0.25, -2.7, 0.8, 0.04, CANDY.grass, { rz: 1.2, ry: 0.3 });
  for (let i = 0; i < 7; i++) block(ck, pit.x0 + 0.5 + r() * (pit.x1 - pit.x0 - 1), 0.12, pit.z0 + 0.4 + r() * 1.6, 0.22 + r() * 0.12, { ry: r() * 2, seed: 300 + i });

  // ---- the giant cube the inhabitants peek from behind, and block pyramids
  block(ck, -6.0, 0, -3.4, 2.3, { ry: 0.35, seed: 7 });
  block(ck, -4.7, 0, -2.2, 0.7, { ry: -0.2, seed: 8 });
  block(ck, -4.9, 0.7, -2.3, 0.55, { ry: 0.5, seed: 9 });
  blockPile(ck, 3.4, -3.6, 4, 0.55, 40);
  blockPile(ck, -8.6, -2.4, 3, 0.5, 70);
  blockPile(ck, 7.8, -1.9, 2, 0.45, 90);

  // ---- crayon fence along the back, pencils leaning on it
  for (let x = XL; x <= XR; x += 0.42) crayon(ck, x, 0, -6.2 + Math.sin(x) * 0.15, 1.3 + Math.sin(x * 1.7) * 0.25, 0.16, LOUD[Math.round((x - XL) / 0.42) % LOUD.length]!);
  for (let x = XL + 1; x <= XR; x += 3.7) pencil(ck, x, 0, -5.7, 2.2, 0.1, pick(r, LOUD), { rz: 0.35, rx: -0.15 });

  // ---- lollipop trees with bunting between them
  const trees = [-9.6, -7.2, -3.2, 1.2, 4.6, 7.0, 9.8];
  trees.forEach((x, i) => lollipop(ck, x, -4.9 + (i % 2) * 0.4, 1.9 + (i % 3) * 0.3, 0.55 + (i % 2) * 0.15, i));
  for (let i = 0; i < trees.length - 1; i++) {
    const a = trees[i]!;
    const b = trees[i + 1]!;
    const ha = 1.9 + (i % 3) * 0.3 + 0.3;
    const hb = 1.9 + ((i + 1) % 3) * 0.3 + 0.3;
    bunting(ck, [a, ha, -4.9 + (i % 2) * 0.4], [b, hb, -4.9 + ((i + 1) % 2) * 0.4], Math.round((b - a) * 2.2), 0.35);
  }

  // ---- rainbow arch at the back right, a slide, ring stacks, balls, balloons
  rainbowArch(ck, 6.2, -7.4, 3.0, 0.24);
  // slide: ladder and a striped chute
  kit.withT(4.4, -3.2, -0.3, () => {
    for (const s of [-0.3, 0.3]) ck.gloss.add(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 10), CANDY.grape, s, 0.95, -0.3);
    for (let k = 0; k < 6; k++) ck.gloss.add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), CANDY.sunshine, 0, 0.25 + k * 0.3, -0.3, { rz: Math.PI / 2 });
    ck.gloss.add(new THREE.BoxGeometry(0.75, 0.08, 0.7), CANDY.pink, 0, 1.9, -0.1);
    ck.gloss.add(new THREE.BoxGeometry(0.7, 0.06, 2.4, 1, 1, 12), (_x, _y, pz) => (Math.floor((pz + 5) * 4) % 2 ? CANDY.blue : CANDY.paper), 0, 1.0, 0.95, { rx: 0.72, perFace: true });
    for (const s of [-0.37, 0.37]) ck.gloss.add(new THREE.BoxGeometry(0.06, 0.18, 2.4), CANDY.aqua, s, 1.08, 0.95, { rx: 0.72 });
  });
  ringStack(ck, -2.6, -1.9, 1.0);
  ringStack(ck, 8.9, -3.0, 1.4);
  beachBall(ck, 2.6, 0, -2.0, 0.35, 0.4);
  beachBall(ck, -7.6, 0, -0.9, 0.3, 1.4);
  beachBall(ck, 6.0, 0, 1.4, 0.25, 2.2);
  const balloonCols = [CANDY.cherry, CANDY.sunshine, CANDY.blue, CANDY.pink, CANDY.grass, CANDY.grape, CANDY.tangerine];
  balloonCols.forEach((c, i) => balloon(ck, -1.0 + (i % 4) * 0.35 + r() * 0.2, 2.6 + (i % 3) * 0.35, -4.0 + (i % 2) * 0.3, c, 0.12));
  balloonCols.forEach((c, i) => balloon(ck, 9.4 + (i % 3) * 0.3, 2.2 + (i % 3) * 0.4, -2.8 + (i % 2) * 0.3, c));

  // ---- big puffy stars and hearts stuck into the grass, glossy solids around
  for (let i = 0; i < 10; i++) {
    const x = XL + 0.6 + i * 2.25 + r() * 0.8;
    const z = -2.6 - r() * 2.2;
    if (x > pit.x0 - 0.4 && x < pit.x1 + 0.4 && z > pit.z0 - 0.3) continue;
    puffyShape(ck, i % 2 ? 'heart' : 'star', x, 0.35 + r() * 0.2, z, 0.35 + r() * 0.2, pick(r, LOUD), { rz: (r() - 0.5) * 0.6, ry: (r() - 0.5) * 0.8 });
  }
  for (let i = 0; i < 16; i++) {
    const x = XL + r() * (XR - XL);
    const z = r() < 0.5 ? -2.0 - r() * 0.4 : 1.0 + r() * 1.5;
    if (Math.abs(x) < 3.2 && z > 0.8) continue; // keep the front of the play strip free
    const s = z > 0.8 ? 0.25 + r() * 0.15 : 0.35 + r() * 0.3;
    solid(ck, i, x, s * 0.5, z, s, pick(r, LOUD), { ry: r() * 3 });
  }
  // foreground: little blocks and stars at the frame edges
  for (const side of [-1, 1])
    for (let k = 0; k < 4; k++) block(ck, side * (4.2 + k * 0.7 + r() * 0.3), 0, 1.4 + r() * 1.6, 0.25 + r() * 0.15, { ry: r() * 2, seed: 500 + k + side * 10 });

  // foreground at the frame edges: giant daisies, mushrooms, a fallen crayon
  for (const side of [-1, 1]) {
    giantFlower(ck, side * 2.6, 1.5, 0.7, side < 0 ? CANDY.pink : CANDY.blue, side * 0.12);
    giantFlower(ck, side * 3.5, 1.1, 1.05, side < 0 ? CANDY.grape : CANDY.tangerine, -side * 0.1);
    giantFlower(ck, side * 5.2, 0.9, 1.3, side < 0 ? CANDY.sunshine : CANDY.cherry);
    mushroom(ck, side * 3.0, 1.9, 0.8, side < 0 ? CANDY.cherry : CANDY.grape);
    mushroom(ck, side * 4.3, 1.6, 1.1, side < 0 ? CANDY.aqua : CANDY.pink);
  }
  crayon(ck, 1.6, 0.12, 1.9, 1.3, 0.11, CANDY.cobalt, { rz: Math.PI / 2, ry: 0.4 });
  crayon(ck, -1.4, 0.12, 2.0, 1.2, 0.11, CANDY.magenta, { rz: -Math.PI / 2, ry: -0.3 });
  for (let i = 0; i < 50; i++) {
    const x = (r() - 0.5) * 16;
    const z = 0.8 + r() * 1.6;
    const c = pick(r, LOUD);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ck.vc.add(new THREE.SphereGeometry(0.035, 8, 6), c, x + Math.cos(a) * 0.04, 0.03, z + Math.sin(a) * 0.04, { sy: 0.4 });
    }
    ck.vc.add(new THREE.SphereGeometry(0.03, 8, 6), CANDY.sunshine, x, 0.04, z, { sy: 0.5 });
  }

  // ---- flower beds of every colour along the fence
  for (let i = 0; i < 70; i++) {
    const x = XL + r() * (XR - XL);
    const z = -5.6 + r() * 0.9;
    const c = pick(r, LOUD);
    ck.vc.add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), 0x3fbf5a, x, 0.15, z);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ck.vc.add(new THREE.SphereGeometry(0.05, 8, 6), c, x + Math.cos(a) * 0.06, 0.32 + Math.sin(a) * 0.06, z, { sz: 0.4 });
    }
    ck.vc.add(new THREE.SphereGeometry(0.04, 8, 6), CANDY.sunshine, x, 0.32, z + 0.02);
  }

  // ---- sky: painted backdrop, a 3D sun and clouds in front of it
  const skyMat = new THREE.MeshBasicMaterial({ map: skyBackdrop('day'), toneMapped: false, fog: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(52, 19.5), skyMat);
  sky.position.set(0, 7.0, SKY_Z);
  root.add(sky);
  sun(ck, 7.6, 5.4, SKY_Z + 2.0, 0.9);
  for (let i = 0; i < 7; i++) cloud(ck, -10 + i * 3.4 + r(), 3.6 + r() * 1.8, SKY_Z + 2 + r() * 1.5, 0.6 + r() * 0.5, i % 3 ? CANDY.paper : PASTEL[i % PASTEL.length]!);

  // ---- a mat with the app's task cards, stickers on the giant cube's neighbour sign
  ringRug(ck, 5.6, -0.4, 0.9);
  kit.withT(-1.2, -5.2, 0, () => {
    ck.gloss.add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10), CANDY.paper, 0, 0.8, 0);
    ck.gloss.add(new THREE.BoxGeometry(1.5, 0.9, 0.06), CANDY.grape, 0, 1.75, 0.0);
    ck.gloss.add(new THREE.BoxGeometry(1.36, 0.76, 0.02), CANDY.paper, 0, 1.75, 0.035);
  });
  stickerBomb(ck, -1.85, -0.55, 1.42, 2.08, -5.2 + 0.05, 16, { wrong: 0.08, min: 0.14, max: 0.26 });

  // ---- accent lights: pink and blue pools, a warm sun light
  kit.lamp('sunLight', { light: kit.pointLight(0xfff0c0, 4.5, 30, 6, 8, 2, 0.6), on: { day: 1, dim: 0.2, glitch: 0 } });
  kit.lamp('pinkPool', { light: kit.pointLight(CANDY.pink, 3, 9, -5, 2.5, -1.5, 1.2), on: ACCENT_ON });
  kit.lamp('bluePool', { light: kit.pointLight(CANDY.blue, 3, 9, 4, 2.5, -1.0, 1.2), on: ACCENT_ON });
  kit.lamp('codeLight', { light: kit.pointLight(0x39ff88, 4, 14, 0, 3, -2, 1.0), on: { day: 0, dim: 0, glitch: 1 } });

  // ---- moving layers
  const r2 = r;
  const fx: Fx[] = [
    floaters(kit, root, { x0: XL, x1: XR, y0: 2.4, y1: 4.6, z0: -6, z1: -2.5 }, low ? 30 : 45, r2),
    glitter(kit, root, { x0: XL, x1: XR, y0: 0.3, y1: 3.4, z0: -5, z1: 1.5 }, low ? 140 : 260, r2),
    glitchLayer(kit, root, { x0: XL + 2, x1: XR - 2, y0: 0.4, y1: 5, z: -5.6 }, 14, r2),
  ];
  confetti(kit, root, { x0: XL, x1: XR, z0: -2.1, z1: 2.5 }, low ? 300 : 520, r2, 0.012);

  kit.onState((s) => {
    skyMat.map = skyBackdrop(moodOf(s));
    skyMat.color.setHex(s === 'day' ? 0xffffff : s === 'dim' ? 0xd0c8dc : 0xb0a0c0);
    skyMat.needsUpdate = true;
  });
  flushCandy(ck, root);
  kit.flushBatches();
  kit.onState((s) => {
    kit.fog = s === 'day' ? new THREE.Fog(0xffd8f2, 26, 50) : s === 'dim' ? new THREE.Fog(0x8f8aa0, 1, 19) : new THREE.Fog(0x1a0c24, 7, 22);
  });

  return {
    kit,
    look: CANDY_LOOK,
    shots: {
      wide: { pos: [0, 1.75, 5.4], look: [0, 1.35, -2.4], fov: 50 },
      cube: { pos: [-3.6, 1.5, 2.2], look: [-5.6, 1.3, -3.0], fov: 46 },
      pit: { pos: [-1.2, 2.4, 1.8], look: [-1.3, 0.4, -3.4], fov: 46 },
      far: { pos: [0, 2.6, 8.0], look: [0, 2.0, -4], fov: 54 },
    },
    marks: {
      left: { x: -1.7, z: -0.6 },
      center: { x: 0, z: -0.5 },
      right: { x: 1.7, z: -0.6 },
      cube: { x: -4.6, z: -1.4, facing: 'right' },
      far: { x: 3.2, z: -4.6 },
    },
    walk: { minX: XL + 2, maxX: XR - 2, z: -0.5 },
    update(dt, t) {
      for (const f of fx) f.update(dt, t);
    },
  };
}

export const sandbox3D: LocationDef3D = {
  id: 'sandbox',
  states: [...CANDY_STATES],
  defaultState: 'day',
  build: (root, { low }) => buildSandbox(root, low),
};

export const sandboxDim3D: LocationDef3D = {
  id: 'sandbox-dim',
  states: [...CANDY_STATES],
  defaultState: 'dim',
  build: (root, { low }) => buildSandbox(root, low),
};
