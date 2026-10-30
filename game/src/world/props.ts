// Props the location kit does not have, built the kit's way (rounded boxes,
// cushions, drapes, canvas textures at ~1 texel per cm with nearest filtering).
// Shared by several locations: moving boxes, clothes piles, a desk monitor with a
// live screen, a bare bulb, curtains with folds, sticky notes, cables.
import * as THREE from 'three';
import { rgb, rng, TX, type LocationKit } from './kit/location-kit';

export const cardboardTex = (seed: number, label = '') =>
  TX(`cardboard-${seed}-${label}`, 48, 48, (ctx, w, h) => {
    const r = rng(seed);
    ctx.fillStyle = rgb(176 + r() * 10, 136 + r() * 8, 92 + r() * 6);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const v = (r() - 0.5) * 30;
      ctx.fillStyle = rgb(176 + v, 136 + v, 92 + v, 0.5);
      ctx.fillRect(r() * w, r() * h, 1, 1);
    }
    // corrugation shadows and a scuff
    for (let y = 2; y < h; y += 4) {
      ctx.fillStyle = 'rgba(90,60,30,0.08)';
      ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = 'rgba(70,45,20,0.25)';
    ctx.fillRect(r() * 30, 30 + r() * 10, 10 + r() * 8, 2);
    // packing tape across the middle
    ctx.fillStyle = 'rgba(214,196,150,0.85)';
    ctx.fillRect(w / 2 - 4, 0, 8, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(w / 2 - 3, 0, 1, h);
    if (label) {
      // marker handwriting: a few strokes, not real letters at this size
      ctx.fillStyle = '#2a2420';
      let x = 6;
      for (let i = 0; i < label.length; i++) {
        const hgt = 5 + Math.floor(r() * 2);
        ctx.fillRect(x, 12, 1, hgt);
        ctx.fillRect(x, 12 + Math.floor(r() * hgt), 2 + Math.floor(r() * 2), 1);
        ctx.fillRect(x + 2, 12, 1, Math.floor(hgt * r()) + 1);
        x += 4;
        if (x > w / 2 - 6 && x < w / 2 + 6) x = w / 2 + 6;
      }
    }
  });

/** A moving box with flaps; `open` leaves the flaps up and shows what is inside. Returns the top y. */
export function movingBox(
  kit: LocationKit,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  { seed = 1, ry = 0, open = false, label = '', inside = null as null | ((top: number) => void) } = {},
): number {
  const m = kit.texM(`box-${seed}-${label}`, cardboardTex(seed, label), { roughness: 0.95 });
  kit.withT(
    x,
    z,
    ry,
    () => {
      kit.rb(w, h, d, 0.012, m, 0, h / 2, 0);
      if (open) {
        // four flaps folded outward, slightly bent
        kit.rb(w, 0.006, d * 0.5, 0.002, m, 0, h + 0.05, -d / 2 - 0.12, { rx: -1.1 });
        kit.rb(w, 0.006, d * 0.5, 0.002, m, 0, h + 0.04, d / 2 + 0.1, { rx: 1.25 });
        kit.rb(w * 0.5, 0.006, d, 0.002, m, -w / 2 - 0.1, h + 0.05, 0, { rz: 1.2 });
        kit.rb(w * 0.5, 0.006, d, 0.002, m, w / 2 + 0.11, h + 0.04, 0, { rz: -1.3 });
        kit.rb(w - 0.02, 0.01, d - 0.02, 0.003, kit.M('boxInside', 0x5a4330, { roughness: 1 }), 0, h - 0.02, 0);
        inside?.(h);
      }
    },
    y,
  );
  return y + h;
}

/** A heap of clothes on the floor: puffed, overlapping lumps with one draped sleeve. */
export function clothesPile(kit: LocationKit, x: number, z: number, seed: number, colors: number[]): void {
  const r = rng(seed);
  kit.withT(x, z, r() * Math.PI, () => {
    colors.forEach((c, i) => {
      const m = kit.M(`cloth-${c}`, c, { roughness: 1, side: THREE.DoubleSide });
      const w = 0.34 + r() * 0.24;
      kit.cush(w, 0.05 + r() * 0.04, 0.24 + r() * 0.16, 0.03, m, (r() - 0.5) * 0.3, 0.03 + i * 0.035, (r() - 0.5) * 0.24, {
        ry: r() * Math.PI,
        rz: (r() - 0.5) * 0.3,
        puff: 0.7,
        seed: seed + i,
        lump: 0.012,
      });
    });
    const sleeve = kit.M(`cloth-${colors[0]}`, colors[0]!, { roughness: 1 });
    kit.tube(
      [
        [0.1, 0.12, 0],
        [0.3, 0.06, 0.12],
        [0.46, 0.02, 0.1],
      ],
      0.035,
      sleeve,
    );
  });
}

/** Folded curtain panel hanging from y0 down to y1, folds along x. */
export function curtain(kit: LocationKit, x0: number, x1: number, y0: number, y1: number, z: number, color: number, seed = 1): void {
  const r = rng(seed);
  const w = x1 - x0;
  const g = new THREE.PlaneGeometry(w, y0 - y1, Math.max(8, Math.round(w * 40)), 8);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const folds = 3 + Math.round(w * 6);
  const phase = r() * 6;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const u = (px + w / 2) / w;
    const hang = 1 - (py + (y0 - y1) / 2) / (y0 - y1); // 0 top … 1 bottom
    pos.setZ(i, Math.sin(u * folds * Math.PI * 2 + phase) * 0.035 * (0.6 + hang * 0.6) + 0.06);
  }
  g.computeVertexNormals();
  const m = kit.M(`curtain-${color}`, color, { roughness: 1, side: THREE.DoubleSide });
  // Two layers 1 cm apart so the panel has thickness from any angle.
  kit._add(g, m, (x0 + x1) / 2, (y0 + y1) / 2, z);
  kit._add(g.clone(), m, (x0 + x1) / 2, (y0 + y1) / 2, z + 0.012);
}

/** Paper stuck to a wall: sticky notes, a calendar page, a print-out. */
export function wallPaper(kit: LocationKit, x: number, y: number, z: number, w: number, h: number, key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, rz = 0): void {
  const t = TX(`paper-${key}`, Math.round(w * 100), Math.round(h * 100), draw);
  kit.rb(w, h, 0.003, 0.001, kit.texM(`paper-${key}`, t, { roughness: 0.9 }), x, y, z + 0.006, { rz });
}

type ScreenDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

/** Screen canvas for a desk monitor: the texture, a redraw and a way to change what it shows. */
export function screenTexture(initial: ScreenDraw, w = 96, h = 56) {
  let draw = initial;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  const redraw = (t: number) => {
    draw(ctx, w, h, t);
    tex.needsUpdate = true;
  };
  redraw(0);
  const setDraw = (next: ScreenDraw) => {
    draw = next;
    redraw(0);
  };
  return { tex, redraw, setDraw };
}

/** LCD monitor on a stand (screen is a separate, unbatched mesh so it can change). */
export function monitor(kit: LocationKit, x: number, y: number, z: number, screen: THREE.Texture, { w = 0.56, h = 0.34, ry = 0 } = {}): THREE.Mesh {
  const body = kit.M('monitorBody', 0x1c1c20, { roughness: 0.45 });
  let mesh!: THREE.Mesh;
  kit.withT(x, z, ry, () => {
    kit.rb(0.22, 0.015, 0.16, 0.006, body, 0, y + 0.008, 0.1);
    kit.rb(0.05, 0.2, 0.03, 0.01, body, 0, y + 0.1, 0.05);
    kit.rb(w + 0.03, h + 0.03, 0.035, 0.008, body, 0, y + 0.2 + h / 2, 0.07);
    const mat = new THREE.MeshBasicMaterial({ map: screen, toneMapped: false });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.copy(kit.P(0, y + 0.2 + h / 2, 0.0885));
    mesh.rotation.y = ry;
    kit.root.add(mesh);
    // power LED
    kit.sph(0.004, kit.M('led', 0x40ff80, { emissive: 0x40ff80, emissiveIntensity: 1 }), w / 2 - 0.02, y + 0.208, 0.089, { ws: 8, hs: 6 });
  });
  return mesh;
}

/** A bare bulb on a cord: the light of a flat nobody has furnished yet. */
export function bareBulb(kit: LocationKit, id: string, x: number, ceiling: number, z: number, drop: number, on: Record<string, number>) {
  const y = ceiling - drop;
  kit.rod([x, ceiling, z], [x, y + 0.06, z], 0.004, kit.M('cord', 0x2a2420));
  kit.cy(0.016, 0.016, 0.05, kit.M('socket', 0x2a2826, { roughness: 0.6 }), x, y + 0.05, z, { seg: 16 });
  const glass = kit.glowM(`bulb-${id}`, 0xf8f0dc, 0xffd8a0, { roughness: 0.2 });
  kit.sph(0.035, glass, x, y, z, { ws: 18, hs: 14 });
  return kit.lamp(id, {
    light: kit.pointLight(0xffc888, 3.2, 8, x, y - 0.08, z + 0.1, 1.2),
    glows: [kit.halo(0xffd8a0, 0.7, 0.32, x, y, z)],
    mats: [[glass, 1.3]],
    on,
    flare: { pos: kit.P(x, y, z) },
  });
}

/**
 * Instant noodle cup, energy can, crumpled paper — the desk's story.
 * The cup is a real vessel: a closed wall (outside in the brand colour, a white
 * paper inside down to a bottom), a rolled rim, cold broth with noodles in it and
 * the foil lid torn half off. A single open cone used to show only its outer
 * faces, so from above the far wall vanished and the cups looked see-through.
 */
export function noodleCup(kit: LocationKit, x: number, y: number, z: number, seed: number): void {
  const r = rng(seed);
  const c = [0xd83a2a, 0xe8c040, 0x2a8ac8][Math.floor(r() * 3)]!;
  const outside = kit.M(`cup-${c}`, c, { roughness: 0.6 });
  const inside = kit.M('cupInside', 0xece6d8, { roughness: 0.85 });
  // outside: the base from the axis, the tapered wall, the rolled rim
  kit.lathe(
    [
      [0.001, 0],
      [0.034, 0],
      [0.036, 0.004],
      [0.046, 0.1],
      [0.049, 0.103],
      [0.049, 0.108],
    ],
    outside,
    x,
    y,
    z,
    { seg: 24 },
  );
  // inside: from the rim down to the bottom (normals toward the axis: seen from above)
  const wall = new THREE.LatheGeometry(
    [
      [0.049, 0.108],
      [0.045, 0.106],
      [0.043, 0.098],
      [0.034, 0.012],
      [0.001, 0.012],
    ].map(([px, py]) => new THREE.Vector2(px, py)),
    24,
  );
  kit._add(wall, inside, x, y, z);
  // cold broth and a tangle of noodles, a little below the rim
  kit.cy(0.041, 0.041, 0.004, kit.M('broth', 0xb87a3a, { roughness: 0.25 }), x, y + 0.078, z, { seg: 20 });
  const noodle = kit.M('noodle', 0xe8d49a, { roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2;
    kit.torus(0.012 + r() * 0.008, 0.0025, noodle, x + Math.cos(a) * 0.014, y + 0.081, z + Math.sin(a) * 0.014, { rx: Math.PI / 2, ts: 14, rs: 5 });
  }
  // the foil lid, torn back and standing up at the far edge
  const lid = kit.M(`cupLid-${c}`, 0xf2eee6, { roughness: 0.4, metalness: 0.2 });
  const ry = r() * Math.PI * 2;
  kit.withT(x, z, ry, () => kit.cy(0.05, 0.05, 0.002, lid, 0, y + 0.154, -0.069, { rx: 1.15, seg: 20 }));
  if (r() < 0.6) kit.cy(0.002, 0.002, 0.2, kit.M('chopstick', 0xd8c090), x + 0.01, y + 0.13, z, { rz: 0.3 + r() * 0.3, seg: 6 });
}

export function can(kit: LocationKit, x: number, y: number, z: number, color: number, fallen = false): void {
  const m = kit.M(`can-${color}`, color, { roughness: 0.3, metalness: 0.6 });
  if (fallen) kit.cy(0.033, 0.033, 0.12, m, x, y + 0.033, z, { rz: Math.PI / 2, seg: 18 });
  else kit.cy(0.033, 0.033, 0.12, m, x, y + 0.06, z, { seg: 18 });
}

export function crumpled(kit: LocationKit, x: number, y: number, z: number, seed: number): void {
  const g = new THREE.IcosahedronGeometry(0.035, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  // Displace by position (not by vertex index): the geometry is non-indexed, so shared
  // corners must move together or the ball cracks.
  const k = (x: number, y: number, z: number) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.3) * 43758.5;
    return 0.75 + (v - Math.floor(v)) * 0.5;
  };
  for (let i = 0; i < pos.count; i++) {
    const f = k(pos.getX(i), pos.getY(i), pos.getZ(i));
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * 0.85, pos.getZ(i) * f);
  }
  g.computeVertexNormals();
  kit._add(g, kit.M('crumpled', 0xece8dc, { roughness: 1, flatShading: true }), x, y + 0.03, z);
}

// ---------------------------------------------------------------- retro computer corner

const BEIGE = 0xd9cfb4;

/** Curved CRT glass: a plane bulged toward the viewer, so reflections and the picture read as glass. */
function crtGlass(w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h, 16, 12);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (w / 2);
    const v = pos.getY(i) / (h / 2);
    pos.setZ(i, 0.018 * (1 - u * u) * (1 - v * v));
  }
  g.computeVertexNormals();
  return g;
}

export interface CrtHandle {
  /** The picture (unbatched, MeshBasic: the screen emits its own light). */
  screen: THREE.Mesh;
  /** Screen corners in world space: top-left, top-right, bottom-right, bottom-left. */
  corners: THREE.Vector3[];
}

/**
 * A 1990s CRT monitor (beige, deep back) on a desktop case, the way old family
 * computers stood. `y` is the desk top. Returns the screen mesh and its corners.
 */
export function crtComputer(kit: LocationKit, x: number, y: number, z: number, screenTex: THREE.Texture, { ry = 0 } = {}): CrtHandle {
  const beige = kit.M('beige', BEIGE, { roughness: 0.55 });
  const beigeDark = kit.M('beigeDark', 0xb8ae94, { roughness: 0.6 });
  const black = kit.M('crtBlack', 0x141416, { roughness: 0.3 });
  const W = 0.44;
  const SH = 0.27; // visible picture height
  const SW = 0.35;
  let screen!: THREE.Mesh;
  const corners: THREE.Vector3[] = [];
  kit.withT(x, z, ry, () => {
    // desktop case under the monitor: floppy + CD drive, power button, LED
    kit.rb(0.46, 0.14, 0.42, 0.012, beige, 0, y + 0.07, 0.22);
    kit.rb(0.14, 0.012, 0.004, 0.002, black, -0.1, y + 0.1, 0.432);
    kit.rb(0.16, 0.03, 0.004, 0.003, beigeDark, 0.1, y + 0.1, 0.432);
    kit.rb(0.12, 0.004, 0.004, 0.001, black, 0.1, y + 0.1, 0.4345);
    kit.cy(0.012, 0.012, 0.01, beigeDark, -0.17, y + 0.045, 0.43, { rx: Math.PI / 2, seg: 14 });
    kit.sph(0.004, kit.M('caseLed', 0xffa040, { emissive: 0xffa040, emissiveIntensity: 1.2 }), -0.12, y + 0.045, 0.432, { ws: 8, hs: 6 });
    for (let i = 0; i < 6; i++) kit.rb(0.3, 0.004, 0.004, 0.001, beigeDark, 0.0, y + 0.02 + i * 0.012, -0.002 + 0.0); // vents at the back
    const my = y + 0.14;
    // monitor: swivel foot, deep tapered back, front bezel
    kit.cy(0.13, 0.15, 0.03, beige, 0, my + 0.015, 0.2, { seg: 24 });
    kit.rb(0.36, 0.3, 0.28, 0.06, beige, 0, my + 0.21, 0.12, { seg: 3 });
    kit.rb(0.3, 0.24, 0.12, 0.05, beigeDark, 0, my + 0.21, -0.03, { seg: 3 });
    kit.rb(W, 0.38, 0.07, 0.02, beige, 0, my + 0.23, 0.29);
    kit.rb(SW + 0.03, SH + 0.03, 0.01, 0.006, black, 0, my + 0.24, 0.326);
    // badge and power button on the bezel
    kit.rb(0.06, 0.012, 0.003, 0.002, beigeDark, -0.14, my + 0.065, 0.327);
    kit.cy(0.01, 0.01, 0.01, beigeDark, 0.16, my + 0.065, 0.327, { rx: Math.PI / 2, seg: 12 });
    screen = new THREE.Mesh(crtGlass(SW, SH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
    screen.position.copy(kit.P(0, my + 0.24, 0.332));
    screen.rotation.y = ry;
    kit.root.add(screen);
    for (const [cx, cy] of [
      [-SW / 2, SH / 2],
      [SW / 2, SH / 2],
      [SW / 2, -SH / 2],
      [-SW / 2, -SH / 2],
    ] as const)
      corners.push(kit.P(cx, my + 0.24 + cy, 0.34));
  });
  return { screen, corners };
}

/** Beige keyboard with key rows, slightly tilted. */
export function retroKeyboard(kit: LocationKit, x: number, y: number, z: number, ry = 0): void {
  const keys = TX('retroKeys', 46, 16, (ctx, w, h) => {
    ctx.fillStyle = '#b8ae94';
    ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 15; i++) {
        if (j === 4 && i > 3 && i < 11) continue;
        ctx.fillStyle = i > 12 || (j === 0 && i < 1) ? '#9a927c' : '#e6dec6';
        ctx.fillRect(1 + i * 3, 1 + j * 3, 2, 2);
      }
    ctx.fillStyle = '#e6dec6';
    ctx.fillRect(13, 13, 20, 2);
  });
  kit.withT(x, z, ry, () => {
    kit.rb(0.46, 0.035, 0.17, 0.01, kit.M('beige', BEIGE, { roughness: 0.55 }), 0, y + 0.02, 0, { rx: 0.06 });
    kit.rb(0.43, 0.004, 0.14, 0.002, kit.texM('retroKeys', keys, { roughness: 0.6 }), 0, y + 0.04, 0.0, { rx: 0.06 });
  });
}

/** Ball mouse on a mat, with a cable to the case. */
export function retroMouse(kit: LocationKit, x: number, y: number, z: number): void {
  kit.rb(0.22, 0.004, 0.18, 0.002, kit.M('mousepad', 0x2a3a6a, { roughness: 0.9 }), x, y + 0.002, z);
  kit.cush(0.06, 0.03, 0.1, 0.02, kit.M('beige', BEIGE, { roughness: 0.55 }), x + 0.02, y + 0.018, z, { puff: 0.6, seed: 3 });
}

/** White architect lamp clamped to the desk: two arms, a cone shade, a warm spot down. */
export function architectLamp(kit: LocationKit, id: string, x: number, y: number, z: number, on: Record<string, number>, { reach = 0.45, ry = 0 } = {}) {
  const white = kit.M('lampWhite', 0xe8e4dc, { roughness: 0.35 });
  const metal = kit.M('lampMetal', 0x9a9a9c, { metalness: 0.7, roughness: 0.35 });
  const shade = kit.glowM(`archShade-${id}`, 0xece8e0, 0xffd8a0, { side: THREE.DoubleSide, roughness: 0.4 });
  let head!: THREE.Vector3;
  let spotPos!: THREE.Vector3;
  kit.withT(x, z, ry, () => {
    kit.rb(0.05, 0.06, 0.08, 0.01, white, 0, y + 0.03, 0);
    const a = [0, y + 0.06, 0] as [number, number, number];
    const b = [0.05, y + 0.48, reach * 0.35] as [number, number, number];
    const c = [0.08, y + 0.62, reach] as [number, number, number];
    kit.rod(a, b, 0.008, white);
    kit.rod(b, c, 0.008, white);
    kit.rod([a[0] + 0.02, a[1] + 0.05, a[2]], [b[0] + 0.02, b[1] - 0.05, b[2] - 0.02], 0.002, metal);
    kit.sph(0.014, metal, ...b, { ws: 12, hs: 10 });
    kit.lathe(
      [
        [0.02, 0.1],
        [0.04, 0.07],
        [0.1, 0.0],
        [0.11, -0.01],
      ],
      shade,
      c[0],
      c[1] - 0.09,
      c[2] + 0.04,
      { rx: 0.5, seg: 24 },
    );
    head = kit.P(c[0], c[1] - 0.1, c[2] + 0.08);
    spotPos = kit.P(c[0], c[1] - 0.12, c[2] + 0.1);
  });
  const spot = new THREE.SpotLight(0xffd0a0, 6, 3.2, 0.75, 0.6, 1.3);
  spot.position.copy(spotPos);
  spot.target.position.copy(spotPos.clone().add(new THREE.Vector3(0, -1, 0.35)));
  return kit.lamp(id, { light: spot, glows: [kit.halo(0xffd8a0, 0.35, 0.3, head.x, head.y, head.z)], mats: [[shade, 1.0]], on, flare: { pos: head } });
}

/** Office swivel chair: five-star base on casters, gas lift, padded seat and back. */
export function officeChair(kit: LocationKit, x: number, z: number, ry: number, color = 0x2a2a30): void {
  const black = kit.M('chairPlastic', 0x1a1a1c, { roughness: 0.5 });
  const fabric = kit.M(`chairFabric-${color}`, color, { roughness: 0.95 });
  kit.withT(x, z, ry, () => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      kit.rod([0, 0.08, 0], [Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3], 0.018, black);
      kit.sph(0.025, black, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, { ws: 12, hs: 10 });
    }
    kit.cy(0.025, 0.025, 0.36, kit.M('gasLift', 0x6a6a6c, { metalness: 0.7, roughness: 0.3 }), 0, 0.26, 0, { seg: 14 });
    kit.cush(0.48, 0.09, 0.46, 0.04, fabric, 0, 0.48, 0, { puff: 0.35, seed: 5 });
    kit.rb(0.06, 0.32, 0.04, 0.015, black, 0, 0.62, -0.22);
    kit.cush(0.44, 0.5, 0.08, 0.04, fabric, 0, 0.92, -0.25, { puff: 0.35, seed: 6, rx: -0.12 });
    for (const s of [-1, 1]) {
      kit.rb(0.03, 0.2, 0.03, 0.01, black, s * 0.24, 0.6, -0.02);
      kit.rb(0.06, 0.025, 0.26, 0.01, black, s * 0.24, 0.71, 0.0);
    }
  });
}

/** Poster on the wall: an original pixel picture drawn by `draw`, curled corner, tape. */
export function poster(kit: LocationKit, x: number, y: number, z: number, w: number, h: number, key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, rz = 0): void {
  const t = TX(`poster-${key}`, Math.round(w * 80), Math.round(h * 80), draw);
  kit.rb(w, h, 0.002, 0.0008, kit.texM(`poster-${key}`, t, { roughness: 0.7 }), x, y, z + 0.004, { rz });
  const tape = kit.M('tapeStrip', 0xe8dcb0, { roughness: 0.8 });
  for (const [sx, sy] of [
    [-1, 1],
    [1, 1],
  ] as const)
    kit.rb(0.06, 0.02, 0.002, 0.0006, tape, x + sx * (w / 2 - 0.02), y + sy * (h / 2 - 0.01), z + 0.007, { rz: sx * 0.6 + rz });
}

/** Small anime figures on a shelf: base disc, body, big head, hair colour. */
export function figurine(kit: LocationKit, x: number, y: number, z: number, hair: number, outfit: number, s = 1): void {
  kit.cy(0.035 * s, 0.035 * s, 0.008, kit.M('figBase', 0x1a1a22, { roughness: 0.3 }), x, y + 0.004, z, { seg: 16 });
  kit.lathe(
    [
      [0.03 * s, 0],
      [0.022 * s, 0.05 * s],
      [0.014 * s, 0.09 * s],
      [0.004 * s, 0.1 * s],
    ],
    kit.M(`figOutfit-${outfit}`, outfit, { roughness: 0.4 }),
    x,
    y + 0.008,
    z,
    { seg: 14 },
  );
  kit.sph(0.026 * s, kit.M('figSkin', 0xf4d8c8, { roughness: 0.5 }), x, y + 0.125 * s, z, { ws: 14, hs: 10 });
  kit.sph(0.03 * s, kit.M(`figHair-${hair}`, hair, { roughness: 0.4 }), x, y + 0.135 * s, z - 0.006, { ws: 14, hs: 10, sy: 1.05 });
}

/** Pizza box on the floor, lid ajar. */
export function pizzaBox(kit: LocationKit, x: number, z: number, ry: number): void {
  const t = TX('pizzaBox', 40, 40, (ctx, w, h) => {
    ctx.fillStyle = '#d8c8a8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b83a2a';
    ctx.fillRect(8, 14, 24, 8);
    ctx.fillStyle = 'rgba(120,80,30,0.3)';
    ctx.fillRect(24, 26, 10, 7);
  });
  const m = kit.texM('pizzaBox', t, { roughness: 0.9 });
  kit.withT(x, z, ry, () => {
    kit.rb(0.36, 0.04, 0.36, 0.004, m, 0, 0.02, 0);
    kit.rb(0.36, 0.006, 0.36, 0.002, m, 0, 0.1, -0.17, { rx: -0.45 });
  });
}
