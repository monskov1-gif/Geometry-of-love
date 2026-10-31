// «Механическая дверь» (гл. 10, 'tech-door'): «Посреди прохода стоит дверь —
// огромная, механическая, совсем не пастельная. Шестерни размером с колесо
// грузовика, рычаги, заклёпки. Её здесь не было. Мелоди построила её за ночь.
// Дверь медленно опускается.» За ней — технический коридор к системным файлам;
// у оси шестерни Циркулёнок фиксирует механизм; под дверью пролезают, пачкая
// ладони в машинном масле.
// Built as the end of a faded pastel corridor (stripes, peeling stickers, a
// fallen star) blocked by a steel bulkhead: a riveted shutter lowered to knee
// height with hazard stripes, a gear the size of a truck wheel turning slowly on
// the right with a smaller gear above it, levers, pipes and cable bundles on the
// walls, caged amber lamps and one tired fluorescent that sags now and then
// (a slow dip, never a strobe). Through the gap — the technical corridor, dark,
// lit green, without a single star. 'glitch' = the later phase: the pastel
// greys out further, code light leaks from under the door.
import * as THREE from 'three';
import { LocationKit, rng, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { candyKit, flushCandy } from '../candy/candy-kit';
import { puffyShape } from '../candy/toys';
import { stickerBomb } from '../candy/decor';
import { stripeWall, checkerFloor } from '../candy/textures';
import { CANDY } from '../candy/palette';
import { CODE_GREEN } from '../code/glyphs';

const BACK = -2.6;
const H = 4.4;
const XL = -7.5;
const XR = 7.5;
const FRONT = 6;
const DOOR_W = 4.4;
const GAP = 0.95; // the shutter has come down to knee height … almost

const AMBIENT = {
  day: { sky: 0xc8c0cc, ground: 0x3a3238, hemi: 0.85, fill: 0xf0e8e0, fillI: 0.42, bg: 0x141216 },
  glitch: { sky: 0x80748a, ground: 0x140c18, hemi: 0.6, fill: 0xc0ffd8, fillI: 0.3, bg: 0x0a080c },
};

/** Riveted steel plate, 1 m: blue-grey with scratches, grime at the bottom, rivets on the seams. */
const steelTex = (key: string, base: [number, number, number], seed: number) =>
  TX(`steel-${key}`, 64, 64, (ctx, w, h) => {
    const r = rng(seed);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = (r() - 0.5) * 10 - (y / h) * 6;
        ctx.fillStyle = `rgb(${base[0] + n},${base[1] + n},${base[2] + n})`;
        ctx.fillRect(x, y, 1, 1);
      }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i < 16; i++) ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 4 + Math.floor(r() * 10), 1);
    ctx.fillStyle = 'rgba(90,60,40,0.35)';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2 + Math.floor(r() * 3), 3 + Math.floor(r() * 6));
    // seams and rivets
    ctx.fillStyle = 'rgba(10,12,16,0.7)';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, 0, 1, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 1, w, 1);
    for (let i = 4; i < w; i += 10)
      for (const [x, y] of [[i, 4], [4, i]] as const) {
        ctx.fillStyle = '#20242a';
        ctx.fillRect(x, y, 2, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x, y, 1, 1);
      }
  });

/** Yellow-black hazard chevrons (worn). */
const hazardTex = () =>
  TX('hazard', 32, 32, (ctx, w, h) => {
    const r = rng(3);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = Math.floor((x + y) / 8) % 2;
        const worn = r() < 0.06;
        ctx.fillStyle = k ? (worn ? '#4a4030' : '#1c1a18') : worn ? '#8a7a40' : '#e8b828';
        ctx.fillRect(x, y, 1, 1);
      }
  });

/** Diamond-plate floor grating with oil stains. */
const grateTex = () =>
  TX('grate', 32, 32, (ctx, w, h) => {
    const r = rng(8);
    ctx.fillStyle = '#4a4c52';
    ctx.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6)
      for (let x = (y / 6) % 2 ? 0 : 3; x < w; x += 6) {
        ctx.fillStyle = '#6a6c74';
        ctx.fillRect(x, y, 3, 1);
        ctx.fillStyle = '#2e3036';
        ctx.fillRect(x + 1, y + 1, 3, 1);
      }
    ctx.fillStyle = 'rgba(16,14,12,0.45)';
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.floor(r() * 24), Math.floor(r() * 24), 6 + Math.floor(r() * 6), 4 + Math.floor(r() * 5));
  });

/** A toothed gear outline (with a hub hole) extruded `depth` thick. */
function gearGeo(R: number, teeth: number, depth: number, hole: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const r0 = R * 0.86;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const da = (Math.PI * 2) / teeth;
    const pts: [number, number][] = [
      [r0, a],
      [R, a + da * 0.15],
      [R, a + da * 0.45],
      [r0, a + da * 0.6],
    ];
    pts.forEach(([rr, aa], k) => (i === 0 && k === 0 ? s.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : s.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr)));
  }
  s.closePath();
  // spokes: six windows in the web
  for (let k = 0; k < 6; k++) {
    const p = new THREE.Path();
    const a0 = (k / 6) * Math.PI * 2 + 0.12;
    const a1 = ((k + 1) / 6) * Math.PI * 2 - 0.12;
    const ri = hole * 1.9;
    const ro = r0 * 0.78;
    p.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
    p.absarc(0, 0, ro, a0, a1, false);
    p.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
    p.absarc(0, 0, ri, a1, a0, true);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export const techDoor3D: LocationDef3D = {
  id: 'tech-door',
  states: ['day', 'glitch'],
  defaultState: 'day',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: AMBIENT });
    kit.setupLights();
    const ck = candyKit(kit, 1010);
    const { r } = ck;
    const nt = { toneMapped: false };

    // ---- the corridor shell: faded pastel up to the bulkhead
    const pastelWall = kit.texM('tdWall', stripeWall('techdoor', 0xc8bcc8, 0xd8d0c0, [0xa88aa0, 0x8a9ab0, 0xb0a070]), { roughness: 0.95, ...nt });
    const steel = kit.texM('tdSteel', steelTex('wall', [92, 98, 108], 4), { roughness: 0.55, metalness: 0.35 });
    const doorSteel = kit.texM('tdDoor', steelTex('door', [104, 108, 112], 9), { roughness: 0.45, metalness: 0.45 });
    const hazard = kit.texM('tdHazard', hazardTex(), { roughness: 0.7 });
    const iron = kit.M('tdIron', 0x2c2e34, { roughness: 0.45, metalness: 0.6 });
    const brass = kit.M('tdBrass', 0x8a7444, { roughness: 0.35, metalness: 0.7 });
    const pipeM = kit.M('tdPipe', 0x5a6068, { roughness: 0.4, metalness: 0.5 });
    const pipeG = kit.M('tdPipeG', 0x4a5a4c, { roughness: 0.5, metalness: 0.35 });
    const cable = kit.M('tdCable', 0x18181c, { roughness: 0.7 });
    const pastelFloor = kit.texM('tdFloor', checkerFloor('techdoor', 0xc0b8c4, 0xd4ccbc, [0x9a8090, 0x8090a8, 0xa89a68, 0x88a088]), { roughness: 0.7, ...nt });

    kit.floorRect(XL, XR, -0.4, FRONT, pastelFloor, { tile: 1.0 });
    kit.floorRect(XL, XR, BACK, -0.4, kit.texM('tdGrate', grateTex(), { roughness: 0.6, metalness: 0.3 }), { tile: 0.64 });
    // hazard band on the floor where the shutter lands
    kit.rb(DOOR_W + 0.6, 0.02, 0.5, 0.005, hazard, 0, 0.01, BACK + 0.55, { uv: [0.64, 0.64] });
    // back wall: pastel on the sides, a steel bulkhead in the middle
    kit.wall(XL, -4.2, H, BACK, pastelWall, [], { tile: 1.0 });
    kit.wall(4.2, XR, H, BACK, pastelWall, [], { tile: 1.0 });
    kit.wall(-4.2, 4.2, H, BACK + 0.02, steel, [{ x0: -DOOR_W / 2, x1: DOOR_W / 2, y0: 0, y1: 3.6 }], { tile: 1.0 });
    kit.sideWall(XL, BACK, FRONT, H, pastelWall, 1, { tile: 1.0 });
    kit.sideWall(XR, BACK, FRONT, H, pastelWall, -1, { tile: 1.0 });
    kit.ceilingPoly([[XL, BACK], [XR, BACK], [XR, FRONT], [XL, FRONT]], H, kit.M('tdCeil', 0x3a3640, { roughness: 1 }));
    // skirting: the corridor's old candy rail, cut off by the bulkhead
    for (const [a, b] of [[XL, -4.25], [4.25, XR]] as const) {
      ck.gloss.add(new THREE.BoxGeometry(b - a, 0.12, 0.05), 0xb898b0, (a + b) / 2, 0.06, BACK + 0.03);
      ck.gloss.add(new THREE.BoxGeometry(b - a, 0.06, 0.05), 0xa8b8c8, (a + b) / 2, 1.0, BACK + 0.03);
    }

    // ---- bulkhead frame: thick steel jambs and lintel, hazard-striped edges, rivets
    for (const s of [-1, 1]) {
      kit.rb(0.5, 3.9, 0.5, 0.03, iron, s * (DOOR_W / 2 + 0.25), 1.95, BACK + 0.25);
      kit.rb(0.12, 3.6, 0.04, 0.005, hazard, s * (DOOR_W / 2 + 0.06), 1.8, BACK + 0.51, { uv: [0.64, 0.64] });
      // guide rails the shutter runs in
      kit.rb(0.1, 3.6, 0.12, 0.01, pipeM, s * (DOOR_W / 2 - 0.02), 1.8, BACK + 0.36);
    }
    kit.rb(DOOR_W + 1.0, 0.6, 0.55, 0.03, iron, 0, 3.9, BACK + 0.27);
    kit.rb(DOOR_W + 0.8, 0.14, 0.04, 0.005, hazard, 0, 3.66, BACK + 0.56, { uv: [0.64, 0.64] });
    for (let i = 0; i < 18; i++) kit.sph(0.025, iron, -DOOR_W / 2 - 0.4 + i * ((DOOR_W + 0.8) / 17), 4.1, BACK + 0.555, { ws: 10, hs: 8 });
    for (const s of [-1, 1]) for (let k = 0; k < 12; k++) kit.sph(0.022, iron, s * (DOOR_W / 2 + 0.25), 0.25 + k * 0.3, BACK + 0.505, { ws: 10, hs: 8 });

    // ---- the shutter: heavy riveted slab, down to knee height, hazard band on its lower edge
    const shutterH = 3.6 - GAP;
    const sh = GAP + shutterH / 2;
    kit.rb(DOOR_W, shutterH, 0.22, 0.02, doorSteel, 0, sh, BACK + 0.36, { uv: [1, 1] });
    kit.rb(DOOR_W - 0.02, 0.26, 0.04, 0.005, hazard, 0, GAP + 0.16, BACK + 0.48, { uv: [0.64, 0.64] });
    // horizontal ribs and a stencilled plate
    for (let k = 1; k < 5; k++) kit.rb(DOOR_W - 0.1, 0.07, 0.06, 0.01, iron, 0, GAP + 0.3 + k * (shutterH / 5), BACK + 0.49);
    const plate = TX('tdPlate', 64, 24, (ctx, w, h) => {
      ctx.fillStyle = '#c8c0a8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a2622';
      ctx.fillRect(1, 1, w - 2, 1);
      ctx.fillRect(1, h - 2, w - 2, 1);
      // a stencil code, not story text: section and load
      for (const [x, ww] of [[5, 6], [13, 4], [19, 9], [32, 3], [37, 8], [47, 11]] as const) ctx.fillRect(x, 8, ww, 8);
    });
    kit.pl(0.7, 0.26, kit.texM('tdPlate', plate, { roughness: 0.8 }), -1.2, GAP + shutterH * 0.62, BACK + 0.525);

    // ---- through the gap: the technical corridor — dark, green emergency light, pipes
    kit.floorRect(-DOOR_W / 2, DOOR_W / 2, BACK - 4, BACK + 0.25, kit.texM('tdGrate', grateTex(), { roughness: 0.6, metalness: 0.3 }), { tile: 0.64 });
    kit.wall(-DOOR_W / 2 - 0.5, DOOR_W / 2 + 0.5, 2, BACK - 4, kit.M('tdDeep', 0x101614, { roughness: 1 }));
    for (const s of [-1, 1]) kit.sideWall(s * (DOOR_W / 2), BACK - 4, BACK, 3, kit.M('tdDeepSide', 0x18201c, { roughness: 1 }), -s as 1 | -1);
    for (let k = 0; k < 3; k++) kit.cy(0.06, 0.06, 4, pipeG, -DOOR_W / 2 + 0.25 + k * 0.16, 0.6 - k * 0.12, BACK - 2, { rx: Math.PI / 2, seg: 12 });
    const exitGlow = kit.glowM('tdDeepLamp', 0x103020, CODE_GREEN, { roughness: 0.4 });
    kit.rb(0.4, 0.1, 0.1, 0.02, exitGlow, 0.8, 0.75, BACK - 3.9);
    kit.lamp('tdBeyond', { light: kit.pointLight(CODE_GREEN, 2.4, 6, 0.4, 0.5, BACK - 2.2, 1.3), mats: [[exitGlow, 0.9]], on: { day: 0.7, glitch: 1 } });

    // ---- the gears: one the size of a truck wheel, one above it, an axle with a hub
    const GX = DOOR_W / 2 + 1.55;
    const bigGear = new THREE.Mesh(gearGeo(1.05, 24, 0.16, 0.12), iron);
    bigGear.position.set(GX, 1.75, BACK + 0.42);
    const smallGear = new THREE.Mesh(gearGeo(0.5, 12, 0.12, 0.08), brass);
    smallGear.position.set(GX - 0.95, 3.0, BACK + 0.36);
    root.add(bigGear, smallGear);
    kit.cy(0.12, 0.12, 0.5, brass, GX, 1.75, BACK + 0.4, { rx: Math.PI / 2, seg: 20 });
    kit.cy(0.2, 0.2, 0.06, iron, GX, 1.75, BACK + 0.62, { rx: Math.PI / 2, seg: 20 });
    kit.cy(0.08, 0.08, 0.4, brass, GX - 0.95, 3.0, BACK + 0.32, { rx: Math.PI / 2, seg: 16 });
    // a back plate for the gear train and a chain down to the shutter's drum
    kit.rb(2.6, 3.2, 0.06, 0.02, steel, GX - 0.3, 2.1, BACK + 0.06);
    for (let k = 0; k < 28; k++) kit.torus(0.035, 0.009, iron, GX - 1.48, 3.6 - k * 0.08, BACK + 0.32, { rx: k % 2 ? Math.PI / 2 : 0, rs: 6, ts: 10 });
    // levers on the left jamb: a quadrant with two handles
    kit.withT(-DOOR_W / 2 - 1.2, BACK + 0.1, 0, () => {
      kit.rb(0.7, 1.0, 0.12, 0.02, steel, 0, 1.4, 0.06);
      kit.torus(0.3, 0.02, iron, 0, 1.2, 0.14, { arc: Math.PI, rs: 8, ts: 20 });
      kit.rod([0, 1.2, 0.16], [-0.18, 1.62, 0.2], 0.022, iron);
      kit.sph(0.05, kit.M('tdKnobY', 0xe8b828, { roughness: 0.4 }), -0.18, 1.64, 0.2, { ws: 14, hs: 10 });
      kit.rod([0.12, 1.2, 0.16], [0.28, 1.58, 0.2], 0.022, iron);
      kit.sph(0.05, kit.M('tdKnobK', 0x1c1a18, { roughness: 0.4 }), 0.28, 1.6, 0.2, { ws: 14, hs: 10 });
      kit.rb(0.5, 0.14, 0.03, 0.005, hazard, 0, 1.78, 0.13, { uv: [0.64, 0.64] });
    });

    // ---- pipes and cables over the pastel: the bulkhead's guts spilling into the corridor
    for (const [y, rr, m] of [[4.1, 0.09, pipeM], [3.85, 0.06, pipeG], [4.25, 0.05, pipeM]] as const) {
      kit.cy(rr, rr, XR - XL, m, 0, y, BACK + 0.35 + rr, { rz: Math.PI / 2, seg: 14 });
      for (let x = XL + 0.8; x < XR; x += 1.6) kit.cy(rr + 0.02, rr + 0.02, 0.06, iron, x, y, BACK + 0.35 + rr, { rz: Math.PI / 2, seg: 14 });
    }
    for (const x of [-DOOR_W / 2 - 0.75, DOOR_W / 2 + 0.75 + 1.9]) {
      kit.cy(0.07, 0.07, 4.2, pipeM, x, 2.1, BACK + 0.12, { seg: 14 });
      kit.torus(0.08, 0.035, pipeM, x, 4.12, BACK + 0.2, { arc: Math.PI / 2, rs: 8, ts: 10, rz: Math.PI });
    }
    // a valve wheel on the left pipe
    kit.torus(0.16, 0.02, kit.M('tdValve', 0x6a8a6a, { roughness: 0.5 }), -DOOR_W / 2 - 0.75, 1.5, BACK + 0.24, { rs: 8, ts: 24 });
    // sagging cable bundles across the pastel walls
    for (let k = 0; k < 4; k++) {
      const y0 = 3.5 - k * 0.12;
      kit.tube([[XL, y0, BACK + 0.08], [-6.0, y0 - 0.5 - k * 0.1, BACK + 0.1], [-4.3, y0 - 0.1, BACK + 0.12], [-3.0, 3.75, BACK + 0.6]], 0.025 + (k % 2) * 0.01, cable, { seg: 30 });
      kit.tube([[XR, y0 + 0.1, BACK + 0.08], [6.2, y0 - 0.6 - k * 0.08, BACK + 0.1], [4.6, y0 - 0.2, BACK + 0.12], [3.0, 3.75, BACK + 0.6]], 0.022 + (k % 2) * 0.01, cable, { seg: 30 });
    }
    // cable trays on brackets over the left wall
    for (let x = XL + 0.6; x < -4.4; x += 0.9) kit.rod([x, 2.9, BACK], [x, 2.9, BACK + 0.25], 0.012, iron);
    kit.rb(-4.4 - XL, 0.04, 0.25, 0.01, iron, (XL - 4.4) / 2, 2.92, BACK + 0.13);

    // ---- what is left of the candy corridor: faded stickers, a fallen star, a rainbow cut off by steel
    stickerBomb(ck, XL + 0.3, -4.6, 0.3, 2.7, BACK + 0.01, 26, { tint: 0xc8c0c8, wrong: 0.05, min: 0.12, max: 0.26 });
    stickerBomb(ck, 6.2, XR - 0.3, 0.3, 2.7, BACK + 0.01, 10, { tint: 0xc8c0c8, wrong: 0.05, min: 0.12, max: 0.26 });
    stickerBomb(ck, XL + 0.3, -4.6, 0.3, 2.6, BACK + 0.02, 10, { late: true, min: 0.12, max: 0.24 });
    [0xc89aa8, 0xd0b48a, 0xc8c88a, 0x9ab89a, 0x8aa8c0, 0xa898c0].forEach((c, i) => ck.gloss.add(new THREE.TorusGeometry(1.6 - i * 0.1, 0.05, 8, 30, Math.PI / 2.2), c, -4.4, 0.4, BACK + 0.06 + i * 0.002, { rz: Math.PI / 2 - 0.1 }));
    puffyShape(ck, 'star', -5.6, 0.1, -1.2, 0.3, 0xc8b878, { rx: -Math.PI / 2 + 0.25, rz: 0.4 });
    puffyShape(ck, 'heart', 5.4, 0.08, -1.6, 0.22, 0xc898b0, { rx: -Math.PI / 2 + 0.15 });
    // oil: dark puddles by the gap, smudged hand prints of black on the grating
    const oil = kit.mat('tdOil', { color: 0x0e0c0a, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.85, depthWrite: false });
    for (const [x, z, s] of [[0.6, BACK + 0.85, 0.9], [-1.1, BACK + 1.1, 0.6], [GX - 0.1, BACK + 0.9, 0.7]] as const) {
      const g = new THREE.CircleGeometry(s * 0.5, 18);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 1; i < p.count; i++) p.setXY(i, p.getX(i) * (0.8 + r() * 0.5), p.getY(i) * (0.5 + r() * 0.3));
      kit._add(g, oil, x, 0.012, z, { rx: -Math.PI / 2 });
    }
    // a dropped spanner and bolts
    kit.rb(0.5, 0.025, 0.05, 0.01, iron, 1.9, 0.02, BACK + 1.2, { ry: 0.5 });
    for (let i = 0; i < 6; i++) kit.cy(0.02, 0.02, 0.03, brass, 1.4 + r() * 1.2, 0.015, BACK + 0.9 + r() * 0.8, { seg: 6 });

    // ---- light: caged amber bulkhead lamps, one tired fluorescent, a cold fill, green under the door
    const cage = kit.M('tdCage', 0x2a2a2e, { roughness: 0.5, metalness: 0.5 });
    const amberLamps: ReturnType<LocationKit['lamp']>[] = [];
    for (const x of [-DOOR_W / 2 - 0.7, DOOR_W / 2 + 0.7]) {
      const glass = kit.glowM(`tdAmber${x}`, 0xf0c070, 0xffa840, { roughness: 0.2 });
      kit.sph(0.1, glass, x, 3.35, BACK + 0.24, { ws: 16, hs: 12, sy: 1.2 });
      for (let k = 0; k < 4; k++) kit.torus(0.105, 0.008, cage, x, 3.35, BACK + 0.24, { ry: (k * Math.PI) / 4, rs: 4, ts: 16 });
      amberLamps.push(
        kit.lamp(`tdAmber${x}`, {
          light: kit.pointLight(0xffa850, 2.6, 6, x, 3.2, BACK + 0.7, 1.3),
          glows: [kit.halo(0xffb060, 0.8, 0.28, x, 3.35, BACK + 0.3)],
          mats: [[glass, 1.0]],
          on: { day: 1, glitch: 0.6 },
        }),
      );
    }
    const tube = kit.glowM('tdTube', 0xe8f0f0, 0xdff0ff, { roughness: 0.3 });
    kit.rb(1.4, 0.06, 0.12, 0.02, kit.M('tdTubeBox', 0x8a8c90, { roughness: 0.5 }), -0.2, H - 0.05, -0.6);
    kit.cy(0.025, 0.025, 1.3, tube, -0.2, H - 0.11, -0.6, { rz: Math.PI / 2, seg: 10 });
    const tubeLamp = kit.lamp('tdTube', { light: kit.pointLight(0xdfeaff, 4, 9, -0.2, H - 0.4, -0.4, 1.2), mats: [[tube, 1.0]], on: { day: 1, glitch: 0.35 } });
    kit.lamp('tdFill', { light: kit.pointLight(0xfff0f0, 3.2, 14, 0, 2.6, 3.5, 0.9), on: { day: 1, glitch: 0.4 } });
    kit.lamp('tdPastel', { light: kit.pointLight(CANDY.pink, 1.2, 7, -6, 2.2, -1, 1.2), on: { day: 0.6, glitch: 0.1 } });
    kit.lamp('tdCode', { light: kit.pointLight(CODE_GREEN, 2.4, 7, 0, 0.4, BACK + 1.0, 1.2), on: { day: 0.35, glitch: 1 } });

    flushCandy(ck, root);
    kit.flushBatches();
    kit.onState((s) => {
      kit.fog = new THREE.Fog(s === 'glitch' ? 0x0a080c : 0x1a161c, 9, 22);
    });

    // the tired fluorescent: mostly steady, a slow sag every few seconds (no strobe)
    let sagT = 3;
    let sag = 0;
    return {
      kit,
      look: { exposure: 1.0, bloom: 0.35, threshold: 0.9 },
      shots: {
        wide: { pos: [0, 1.8, 5.2], look: [0, 1.7, -1.8], fov: 52 },
        door: { pos: [0, 1.2, 2.2], look: [0, 1.4, BACK], fov: 50 },
        gear: { pos: [2.6, 1.7, 1.2], look: [GX, 1.8, BACK], fov: 46 },
        gap: { pos: [0.3, 0.55, 1.2], look: [0.2, 0.5, BACK - 2], fov: 50 },
      },
      marks: {
        left: { x: -1.8, z: -0.6 },
        center: { x: 0, z: -0.5 },
        right: { x: 1.8, z: -0.6 },
        gear: { x: GX - 0.4, z: -1.6, facing: 'back' },
        gap: { x: 0, z: -1.7, facing: 'back' },
      },
      walk: { minX: XL + 1, maxX: XR - 1, z: -0.6 },
      update(dt, t) {
        bigGear.rotation.z = t * 0.05;
        smallGear.rotation.z = -t * 0.105 + 0.13;
        sagT -= dt;
        if (sagT < 0) {
          sag = 1;
          sagT = 4 + Math.sin(t * 13.7) * 2 + 2;
        }
        sag = Math.max(0, sag - dt * 1.4);
        const k = 1 - 0.45 * Math.sin(Math.PI * sag);
        const base = tubeLamp.on[kit.state] ?? 1;
        kit.applyLamp(tubeLamp, base * k);
        for (const L of amberLamps) {
          const b = L.on[kit.state] ?? 1;
          kit.applyLamp(L, b * (0.92 + 0.08 * Math.sin(t * 2.1 + L.id.length)));
        }
      },
    };
  },
};
