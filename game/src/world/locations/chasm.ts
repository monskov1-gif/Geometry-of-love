// «Пропасть у архивов» (гл. 11, 'chasm'): «За технической дверью — старые
// архивы игры… целый мир из серых блоков, недорисованных лестниц и уровней,
// которые так и не вышли в релиз. Путь перекрыт огромной пропастью между двумя
// платформами. Внизу нет дна. Только сетка — серая, бесконечная, как
// миллиметровка, уходящая в темноту. На той стороне виден вход в узкий коридор
// без единой звёздочки.» Двенадцать метров; края платформ крошатся; Мелоди
// падает «на нижние платформы»; «окружность на стене архива».
// Built side-on with the gap running across the frame behind the stage: the
// near ledge (faded candy grass over rainbow sprinkle strata, its edge breaking
// into chunks), the void (grey graph-paper grids going down into the dark, lower
// platforms, slowly falling crumbs, a few dim code glyphs at the very bottom),
// and 12 m away the far cliff with the archive: grey blocks, shelves of faded
// binders, half-drawn stairs that turn into outlines, unreleased test levels,
// a circle on the archive wall and the narrow corridor's dark mouth. Matches the
// 'ruler-bridge' mini-game's look (candy cliffs, archive behind, code below).
// 'glitch' = after the bridge falls: plum dark, glitch light, the circle wrong.
import * as THREE from 'three';
import { LocationKit, rng, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { candyKit, flushCandy, pick } from '../candy/candy-kit';
import { block, blockPile, puffyShape, solid } from '../candy/toys';
import { binderRow, cabinet, folderStack } from '../candy/decor';
import { glitter, type Fx } from '../candy/fx';
import { candyGrass, skyBackdrop } from '../candy/textures';
import { CANDY, PASTEL, RAINBOW } from '../candy/palette';
import { CANDY_LOOK } from '../candy/look';
import { CODE_GREEN, glyphRain } from '../code/glyphs';
import { gridTex, tiledPlane, WireBatch } from '../code/wire';

const EDGE = -1.5; // the near ledge ends here
const FAR = -13.5; // the far cliff starts here (12 m)
const FAR_Y = -0.9; // the far side sits lower: Melody looks up at the bridge from there
const XL = -12;
const XR = 12;

const AMBIENT = {
  day: { sky: 0xd8cce8, ground: 0x4a4058, hemi: 0.95, fill: 0xf4e8f0, fillI: 0.55, bg: 0x6e6488 },
  glitch: { sky: 0x8a6aa8, ground: 0x180c20, hemi: 0.65, fill: 0xc0ffd8, fillI: 0.32, bg: 0x1a0c24 },
};

/** Rainbow sprinkle strata of a cliff face, faded: 1 texel ≈ 2 cm, bands with crumbs. */
const strataTex = () =>
  TX('chasmStrata', 64, 64, (ctx, w, h) => {
    const r = rng(41);
    const bands = [0xd88a98, 0xe0a878, 0xe0cc80, 0x9cc488, 0x88b4d0, 0x9890c8, 0xb898c8, 0xd8b8a0];
    let y = 0;
    let i = 0;
    while (y < h) {
      const bh = 5 + Math.floor(r() * 5);
      const c = bands[i++ % bands.length]!;
      for (let yy = y; yy < Math.min(h, y + bh); yy++)
        for (let x = 0; x < w; x++) {
          const n = (r() - 0.5) * 18;
          ctx.fillStyle = `rgb(${((c >> 16) & 255) + n},${((c >> 8) & 255) + n},${(c & 255) + n})`;
          ctx.fillRect(x, yy, 1, 1);
        }
      ctx.fillStyle = 'rgba(255,249,253,0.4)';
      ctx.fillRect(0, y, w, 1);
      y += bh;
    }
    for (let k = 0; k < 120; k++) {
      ctx.fillStyle = r() < 0.4 ? '#fff9fd' : r() < 0.5 ? '#5a4a62' : '#' + RAINBOW[k % RAINBOW.length]!.toString(16).padStart(6, '0');
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), r() < 0.5 ? 2 : 1, 1);
    }
    // cracks
    ctx.fillStyle = '#3a2e44';
    for (let k = 0; k < 5; k++) {
      let x = Math.floor(r() * w);
      for (let yy = Math.floor(r() * 30); yy < h && r() < 0.96; yy++) {
        ctx.fillRect(x, yy, 1, 1);
        if (r() < 0.3) x += r() < 0.5 ? -1 : 1;
      }
    }
  });

/** Untextured archive grey: block faces with a pencil outline and a faint construction grid. */
const archiveGrey = (key: string, base: string, seed: number) =>
  TX(`chasmGrey-${key}`, 32, 32, (ctx, w, h) => {
    const r = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 4; i < w; i += 4) {
      ctx.fillRect(i, 0, 1, h);
      ctx.fillRect(0, i, w, 1);
    }
    ctx.fillStyle = 'rgba(40,36,48,0.55)';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, 0, 1, h);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2 + Math.floor(r() * 4), 1);
    }
  });

export const chasm3D: LocationDef3D = {
  id: 'chasm',
  states: ['day', 'glitch'],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: AMBIENT });
    kit.setupLights();
    const ck = candyKit(kit, 1111);
    const { r } = ck;
    const nt = { toneMapped: false };
    const strata = kit.texM('chasmStrata', strataTex(), { roughness: 1, ...nt });
    const grass = kit.texM('chasmGrass', candyGrass('chasm', true), { roughness: 0.95, ...nt });
    const greyA = kit.texM('chasmGreyA', archiveGrey('a', '#a8a4b0', 3), { roughness: 0.95 });
    const greyB = kit.texM('chasmGreyB', archiveGrey('b', '#8c8896', 7), { roughness: 0.95 });
    const greyC = kit.texM('chasmGreyC', archiveGrey('c', '#c0bcc4', 11), { roughness: 0.95 });

    // ---- near ledge: grass on a thick crust, ragged broken edge of strata chunks
    kit.floorRect(XL - 4, XR + 4, EDGE + 0.3, 7, grass, { tile: 1.2 });
    for (let x = XL - 4; x < XR + 4; x += 0.55) {
      const bite = Math.sin(x * 1.3) * 0.18 + r() * 0.2;
      const d = 0.9 + r() * 1.6;
      // the broken lip: a strata block, grass cap on top, some lean outward
      const lean = r() < 0.2 ? 0.12 + r() * 0.15 : 0;
      kit.rb(0.56, d, 0.7, 0.04, strata, x + 0.27, -d / 2 + 0.0, EDGE + 0.35 - bite, { rx: -lean, uv: [0.9, 0.9] });
      kit.rb(0.58, 0.08, 0.72, 0.03, grass, x + 0.27, 0.0, EDGE + 0.35 - bite, { rx: -lean, uv: [1.2, 1.2] });
    }
    // chunks breaking off and hanging under the lip, the deeper strata of the near cliff
    for (let i = 0; i < 26; i++) {
      const x = XL + r() * (XR - XL);
      const s = 0.25 + r() * 0.45;
      kit.rb(s, s * (0.7 + r() * 0.6), s, 0.03, strata, x, -1.4 - r() * 2.2, EDGE - 0.2 - r() * 0.6, { rx: r(), ry: r() * 3, rz: r(), uv: [0.9, 0.9] });
    }

    // ---- the far cliff: a torn-off slab of strata 12 m away, lower than the near side,
    // its ragged underside hanging over the void; its top is the archive's floor
    const far = new THREE.Group();
    let ring = null as unknown as THREE.Mesh;
    far.position.y = FAR_Y;
    root.add(far);
    kit.withT(0, 0, 0, () => {
      const cliffFace = new THREE.PlaneGeometry(XR - XL + 30, 1.8, 60, 3);
      const p = cliffFace.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, Math.sin(x * 0.7) * 0.25 + Math.sin(x * 2.3 + y) * 0.12);
        if (y > 0.8) p.setY(i, y - (Math.abs(Math.sin(x * 1.7)) * 0.2 + 0.04));
        if (y < -0.8) p.setY(i, y - Math.abs(Math.sin(x * 0.9) * 0.5 + Math.sin(x * 3.1) * 0.3));
      }
      cliffFace.computeVertexNormals();
      kit._add(cliffFace, strata, 0, -0.9, FAR, { uv: [1.6, 1.6] });
      // the underside: chunks hanging off the slab like broken teeth
      for (let x = XL - 10; x < XR + 10; x += 0.9 + r() * 0.8) {
        const h = 0.3 + r() * 1.1;
        kit.rb(0.5 + r() * 0.6, h, 0.6, 0.05, strata, x, -1.7 - h / 2 + r() * 0.3, FAR - 0.4 - r() * 0.6, { rz: (r() - 0.5) * 0.3, uv: [0.9, 0.9] });
      }
      kit.floorRect(XL - 18, XR + 18, FAR - 14, FAR, kit.texM('chasmFarGround', archiveGrey('ground', '#9a96a2', 19), { roughness: 1 }), { tile: 1.0, y: 0 });
      // a candy strip of grass still clinging to the far edge, then grey
      kit.floorRect(XL - 18, XR + 18, FAR - 0.9, FAR, grass, { tile: 1.2, y: 0.01 });
      for (let x = XL - 14; x < XR + 14; x += 0.7) kit.rb(0.7, 0.4 + r() * 0.5, 0.4, 0.04, strata, x + 0.35, -0.3, FAR + 0.1 + r() * 0.15, { uv: [0.9, 0.9] });
    }, FAR_Y);
    // the side walls of the gap: crumbling ledges at both frame edges
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const z = EDGE - 1.6 - k * 1.9;
        const w = 1.6 + r() * 1.8 - k * 0.12;
        kit.rb(w, 1.2 + r() * 2.5, 1.8, 0.06, strata, s * (XR - 1.2 + w / 2 - r() * 0.4), -0.9 - r() * 0.9, z, { uv: [0.9, 0.9] });
        kit.rb(w + 0.04, 0.08, 1.82, 0.03, grass, s * (XR - 1.2 + w / 2), 0.2 - r() * 0.6, z, { uv: [1.2, 1.2] });
      }
    }

    // ---- the void: grey graph-paper grids stepping down into the dark
    const gridMats = [
      new THREE.MeshBasicMaterial({ map: gridTex('chasmA', null, '#24222a', '#5c5866', 6, true), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
      new THREE.MeshBasicMaterial({ map: gridTex('chasmB', null, '#18171d', '#3a3842', 5, true), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    ];
    const voidFill = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ color: 0x0c0a12, toneMapped: false, fog: false }));
    voidFill.rotation.x = -Math.PI / 2;
    voidFill.position.set(0, -22, -10);
    root.add(voidFill);
    // a dark wall under the far slab and at both sides: every look into the gap ends in the dark
    const voidWall = new THREE.Mesh(new THREE.PlaneGeometry(120, 26), voidFill.material);
    voidWall.position.set(0, -15.8, FAR - 1.2);
    root.add(voidWall);
    [-6, -11, -17].forEach((y, i) => {
      const g = tiledPlane(root, gridMats[i % 2]!, 90, 40, i === 0 ? 3 : 5);
      g.rotation.x = -Math.PI / 2;
      g.position.set(0, y, (EDGE + FAR) / 2);
      g.renderOrder = 1;
    });
    // a vertical sheet of graph paper hanging under the far cliff (the "page" of the void)
    tiledPlane(root, gridMats[1]!, 90, 16, 3).position.set(0, -14, FAR - 3);
    // lower platforms (where Melody falls): grey and faded candy tiles floating at different depths
    const plat = (x: number, y: number, z: number, w: number, d: number, top: THREE.Material) => {
      kit.rb(w, 0.35, d, 0.04, greyB, x, y - 0.18, z);
      kit.rb(w + 0.02, 0.06, d + 0.02, 0.02, top, x, y + 0.02, z, { uv: [1.2, 1.2] });
    };
    plat(-3.4, -4.6, -6.4, 2.4, 1.6, grass);
    plat(2.6, -5.8, -8.6, 3.2, 1.8, greyC);
    plat(-7.2, -7.4, -9.8, 2.0, 1.4, greyA);
    plat(6.8, -3.2, -10.6, 1.6, 1.2, grass);
    plat(0.2, -8.6, -5.4, 1.4, 1.2, greyC);
    for (let i = 0; i < 18; i++) {
      const s = 0.3 + r() * 0.7;
      kit.rb(s, s * 0.5, s, 0.03, pick(r, [greyA, greyB, strata]), -9 + r() * 18, -2.5 - r() * 9, EDGE - 2 - r() * 10, { rx: r() * 2, ry: r() * 3, rz: r() * 2, uv: [0.9, 0.9] });
    }
    // the debris of the doomed attempts: a plank from the unfinished stair, grey blocks
    kit.rb(3.2, 0.08, 0.3, 0.02, kit.M('chasmPlank', 0xc89a6c, { roughness: 0.9 }), -1.2, -6.9, -7.6, { rz: 0.5, ry: 0.3 });
    for (let i = 0; i < 3; i++) kit.rb(0.6, 0.6, 0.6, 0.04, greyA, 3.6 + i * 0.7, -9 - i * 1.4, -6.6 - i, { rx: i, ry: i * 0.7 });

    // ---- the archive on the far side (built in the far slab's frame)
    kit.withT(0, 0, 0, () => {
    const AZ = FAR - 1.2;
    // a long grey back wall with the circle and the corridor's mouth
    kit.wall(XL - 18, XR + 18, 7, FAR - 9, greyB, [], { tile: 1 });
    // shelves of binders (faded), grey blocks stacked like an unfinished city
    for (let s = 0; s < 6; s++) {
      const sx = -10.5 + s * 3.3 + (s > 2 ? 1.6 : 0);
      if (Math.abs(sx - 2.6) < 1.8) continue;
      kit.withT(sx, AZ - 2.2, 0, () => {
        const c = [0xb8a8c8, 0xc8b8a8, 0xa8b8c0][s % 3]!;
        for (const side of [-1.05, 1.05]) ck.gloss.add(new THREE.BoxGeometry(0.07, 3.6, 0.42), c, side, 1.8, 0.21);
        for (let k = 0; k < 8; k++) {
          ck.gloss.add(new THREE.BoxGeometry(2.1, 0.05, 0.42), c, 0, 0.1 + k * 0.48, 0.21);
          if (k < 7 && (s + k) % 5 !== 2) binderRow(ck, -1.0, 0.12 + k * 0.48, 0, 2.0, 21 + s * 13 + k * 7);
        }
      });
    }
    // the dark mouth of the narrow corridor: a grey block portal, no star anywhere
    kit.withT(2.6, AZ - 2.0, 0, () => {
      kit.rb(3.0, 3.4, 1.2, 0.04, greyA, 0, 1.7, -0.6);
      kit.rb(1.1, 2.3, 0.02, 0.005, kit.M('chasmMouth', 0x07060a, { roughness: 1 }), 0, 1.15, 0.01);
      kit.rb(1.3, 0.12, 0.2, 0.02, greyC, 0, 2.36, 0.08);
      for (const s of [-1, 1]) kit.rb(0.12, 2.3, 0.2, 0.02, greyC, s * 0.62, 1.15, 0.08);
    });
    kit.lamp('chasmMouth', { light: kit.pointLight(CODE_GREEN, 1.4, 4, 2.6, 1.0, AZ - 1.6, 1.4), on: { day: 0.4, glitch: 1 } });
    // the circle on the archive wall (a ring of blocks in relief) — wrong in 'glitch'
    const circle = new THREE.Group();
    far.add(circle);
    const ringMat = kit.M('chasmRing', 0xd8d4dc, { roughness: 0.8 });
    ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 10, 48), ringMat);
    ring.position.set(-4.2, 4.4, FAR - 8.9);
    circle.add(ring);
    // grey blocks, unreleased levels: block towers, stairs that turn into outlines, cut-out test platforms
    const wires = new WireBatch();
    for (let i = 0; i < 16; i++) {
      const x = XL - 6 + i * 2.2 + r() * 1.2;
      if (Math.abs(x - 2.6) < 2) continue;
      const h = 0.6 + r() * 2.8;
      const w = 0.8 + r() * 1.2;
      kit.rb(w, h, w, 0.03, pick(r, [greyA, greyB, greyC]), x, h / 2, AZ - 4.2 - r() * 3.5, { ry: (r() - 0.5) * 0.3 });
    }
    const stair = (x0: number, z: number, n: number, dir: number) => {
      for (let k = 0; k < n; k++) {
        const x = x0 + dir * k * 0.42;
        const y = 0.2 + k * 0.32;
        if (k < n * 0.55) kit.rb(0.42, 0.12, 1.0, 0.01, greyC, x, y, z);
        else wires.add(new THREE.BoxGeometry(0.42, 0.12, 1.0), 0xdcd8e4, x, y, z, { k: 0.8 - (k / n) * 0.5 });
      }
    };
    stair(-8.8, AZ - 0.6, 12, 1);
    stair(9.6, AZ - 0.4, 10, -1);
    // an unfinished level hanging in the air: a frame of a platformer stage drawn in lines
    wires.add(new THREE.BoxGeometry(4, 0.4, 1.2, 8, 1, 2), 0xdcd8e4, -2.4, 3.6, AZ - 5, { k: 0.5 });
    wires.add(new THREE.BoxGeometry(2.4, 0.4, 1.2, 4, 1, 2), 0xdcd8e4, 1.4, 4.8, AZ - 6, { k: 0.4 });
    wires.add(new THREE.BoxGeometry(1.2, 1.2, 1.2), 0xdcd8e4, 7.4, 3.4, AZ - 4, { k: 0.5, ry: 0.4 });
    wires.add(new THREE.SphereGeometry(0.8, 10, 6), 0xdcd8e4, -7.6, 4.6, AZ - 6, { k: 0.35 });
    wires.flush(far, { additive: false, opacity: 0.85 });
    // the far edge clutter: cabinets, folder stacks, a pastel cube left behind
    cabinet(ck, -6.4, AZ - 0.2, 0xb8a8b8);
    cabinet(ck, -5.8, AZ - 0.2, 0xa8b0b8, 3, 1.05);
    cabinet(ck, 6.2, AZ - 0.1, 0xb8b0a0);
    for (let i = 0; i < 7; i++) folderStack(ck, -10 + i * 3.3 + r(), 0, AZ + 0.2 + r() * 0.4, 3 + Math.floor(r() * 6));
    blockPile(ck, 5.0, AZ + 0.1, 3, 0.4, 333);
    block(ck, -2.0, 0, AZ + 0.3, 0.6, { ry: 0.4, seed: 71 });
    }, FAR_Y);

    // ---- the near side: what the group tried — grey blocks pushed to the edge, a plank, the candy fading
    for (let i = 0; i < 3; i++) kit.rb(0.6, 0.6, 0.6, 0.04, greyA, -5.4 + i * 0.66, 0.3, -1.0 + (i % 2) * 0.1, { ry: i * 0.2 });
    kit.rb(0.6, 0.6, 0.6, 0.04, greyC, -5.1, 0.9, -0.95, { ry: 0.5 });
    kit.rb(2.8, 0.08, 0.28, 0.02, kit.M('chasmPlank', 0xc89a6c, { roughness: 0.9 }), 4.8, 0.05, -0.9, { ry: 0.15 });
    puffyShape(ck, 'star', 3.4, 0.1, 1.2, 0.3, 0xd8c890, { rx: -Math.PI / 2 + 0.2 });
    solid(ck, 3, -3.6, 0.2, 1.6, 0.4, 0xc0a0c0, { ry: 0.6 });
    for (let i = 0; i < 40; i++) {
      // faded flowers along the frame edges of the ledge
      const x = (r() < 0.5 ? -1 : 1) * (4 + r() * 6);
      const z = -1.0 + r() * 3.5;
      const c = pick(r, PASTEL);
      ck.vc.add(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 5), 0x6c9a7c, x, 0.12, z);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ck.vc.add(new THREE.SphereGeometry(0.04, 8, 6), c, x + Math.cos(a) * 0.05, 0.26 + Math.sin(a) * 0.05, z, { sz: 0.4 });
      }
    }

    // ---- sky: the candy sky gone dusky; a few pale clouds of blocks
    const skyMat = new THREE.MeshBasicMaterial({ map: skyBackdrop('dim'), toneMapped: false, fog: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(110, 40), skyMat);
    sky.position.set(0, 14, FAR - 16);
    root.add(sky);

    // ---- moving layers: crumbs falling from the lips, dim code at the very bottom, dust glitter
    const crumbGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
    const crumbMat = kit.mat('chasmCrumb', { color: 0xffffff, roughness: 1, ...nt });
    const crumbN = low ? 60 : 110;
    const crumbs = new THREE.InstancedMesh(crumbGeo, crumbMat, crumbN);
    const cdata = Array.from({ length: crumbN }, (_, i) => ({
      x: XL + r() * (XR - XL),
      z: i % 3 ? EDGE - 0.1 - r() * 0.3 : FAR + 0.2 + r() * 0.3,
      y: -r() * 10,
      v: 0.4 + r() * 0.8,
      rot: r() * 6,
    }));
    const cc = new THREE.Color();
    cdata.forEach((_, i) => crumbs.setColorAt(i, cc.setHex(RAINBOW[i % RAINBOW.length]!).lerp(new THREE.Color(0xd8d0d8), 0.5)));
    root.add(crumbs);
    const rain = glyphRain(root, { x0: -14, x1: 14, y0: -21, y1: -12, z0: FAR + 1, z1: EDGE - 2 }, low ? 24 : 40, 6, r, { size: 0.3, speed: 0.6 });
    (rain.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
    const fx: Fx[] = [rain, glitter(kit, root, { x0: XL, x1: XR, y0: 0.4, y1: 4, z0: -12, z1: 1.5 }, low ? 50 : 90, r)];

    // ---- light: dusky sky light from above-front, a cool bounce from the void, pink accent on the near lip
    kit.lamp('chasmSky', { light: kit.pointLight(0xfff0f4, 5, 30, 2, 9, 3, 0.7), on: { day: 1, glitch: 0.3 } });
    kit.lamp('chasmFar', { light: kit.pointLight(0xe8e0f0, 6, 22, 0, 6, FAR - 1, 0.9), on: { day: 1, glitch: 0.35 } });
    kit.lamp('chasmPink', { light: kit.pointLight(CANDY.pink, 1.6, 8, -4, 2, 0.5, 1.2), on: { day: 0.6, glitch: 0.4 } });
    kit.lamp('chasmVoid', { light: kit.pointLight(0x9aa8d8, 3, 16, 0, -6, -7, 1.0), on: { day: 0.8, glitch: 0.2 } });
    kit.lamp('chasmCode', { light: kit.pointLight(CODE_GREEN, 4, 16, 0, -4, -7, 1.0), on: { day: 0, glitch: 1 } });

    flushCandy(ck, root);
    kit.flushBatches();
    let glitch = false;
    kit.onState((s) => {
      glitch = s === 'glitch';
      skyMat.map = skyBackdrop(glitch ? 'glitch' : 'dim');
      skyMat.color.setHex(glitch ? 0xb0a0c0 : 0xb8b0c4);
      skyMat.needsUpdate = true;
      kit.fog = glitch ? new THREE.Fog(0x1a0c24, 8, 34) : new THREE.Fog(0x7a7090, 12, 46);
      if (!glitch) ring.scale.set(1, 1, 1);
    });
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    return {
      kit,
      look: { ...CANDY_LOOK },
      shots: {
        wide: { pos: [0, 3.4, 3.6], look: [0, -1.2, -7.5], fov: 54 },
        edge: { pos: [1.6, 1.4, 2.2], look: [-0.6, -1.2, -6], fov: 50 },
        down: { pos: [0, 2.8, 0.6], look: [0, -8, -7], fov: 56 },
        far: { pos: [0.8, 1.9, 3.0], look: [2.2, 1.4, FAR - 2.5], fov: 40 },
      },
      marks: {
        left: { x: -1.8, z: -0.4 },
        center: { x: 0, z: -0.5 },
        right: { x: 1.8, z: -0.4 },
        edge: { x: 0.4, z: EDGE + 0.4, facing: 'back' },
        blocks: { x: -4.2, z: -0.4, facing: 'left' },
      },
      walk: { minX: -8, maxX: 8, z: -0.4 },
      update(dt, t) {
        for (const f of fx) f.update(dt, t);
        cdata.forEach((c, i) => {
          c.y -= c.v * dt;
          if (c.y < -14) c.y = -0.2;
          m4.compose(v.set(c.x, c.y, c.z), q.setFromEuler(e.set(c.rot + t * 0.5, c.rot, 0)), one);
          crumbs.setMatrixAt(i, m4);
        });
        crumbs.instanceMatrix.needsUpdate = true;
        // 'glitch': the circle stops being round (slowly, a breathing ellipse)
        if (glitch) ring.scale.set(1 + Math.sin(t * 0.7) * 0.25, 1 - Math.sin(t * 0.7) * 0.18, 1);
      },
    };
  },
};
