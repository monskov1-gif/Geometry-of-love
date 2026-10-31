// «Системный раздел» (гл. 13, 'code-space'): «Технический коридор кончается
// лестницей вниз. Ступени становятся всё проще: сначала — нарисованное дерево,
// потом — серые прямоугольники, потом — просто линии. Внизу нет ни травы, ни
// неба. Только тёмное пространство и бегущие по нему строки.» Мимо проплывает
// «color.sky = PASTEL_BLUE»; от файлов к программе тянутся нити; у файлов
// пользователей написан владелец.
// Built as the code space of the brief: near-black, green lines and links,
// red-pink only for damage. A floating slab of tiles (the stage), a graph-paper
// grid far below, the stair coming down on the left (wood → grey → lines), file
// panels hanging in the dark on both sides with threads to the program core
// (a slowly turning wire polyhedron), glyph rain, drifting code lines, data
// towers in the distance for scale. 'glitch' = the damage after the unlinking:
// user_03/05/06 and world.map turn red, their threads too, a slow red pulse.
import * as THREE from 'three';
import { LocationKit, rng, TX } from '../kit/location-kit';
import type { LocationDef3D } from '../types';
import { CandyBatch } from '../candy/batch';
import type { Fx } from '../candy/fx';
import { CODE_CORRUPT, CODE_GREEN, driftingLines, glyphRain } from '../code/glyphs';
import { filePanel, PANEL_FRAME, type PanelHandle, type PanelSpec } from '../code/panels';
import { gridTex, tiledPlane, WireBatch } from '../code/wire';

const BG = 0x040806;
const XL = -7;
const XR = 7;
const Z0 = -2.4;
const Z1 = 1.8;
const CORE = new THREE.Vector3(0.6, 6.4, -17);

const AMBIENT = {
  night: { sky: 0x4a9a72, ground: 0x061008, hemi: 0.75, fill: 0xd8fff0, fillI: 0.55, bg: BG },
  glitch: { sky: 0x6a7a62, ground: 0x10060a, hemi: 0.6, fill: 0xffe0e8, fillI: 0.45, bg: 0x070406 },
};

/** Stage tile: dark glass with a bright green edge and a faint inner micro-grid. */
const tileTex = () =>
  TX('csTile', 64, 64, (ctx, w, h) => {
    const r = rng(5);
    ctx.fillStyle = '#0a120d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f1c14';
    for (let i = 8; i < w; i += 8) {
      ctx.fillRect(i, 0, 1, h);
      ctx.fillRect(0, i, w, 1);
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = r() < 0.5 ? '#123a22' : '#0c2a18';
      ctx.fillRect(Math.floor(r() * 7) * 8 + 1, Math.floor(r() * 7) * 8 + 1, 7, 7);
    }
    ctx.fillStyle = '#2fd878';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, 0, 1, h);
    ctx.fillStyle = '#1a7a44';
    ctx.fillRect(0, h - 1, w, 1);
    ctx.fillRect(w - 1, 0, 1, h);
    ctx.fillStyle = '#39ff88';
    for (const [x, y] of [[0, 0], [w - 2, 0], [0, h - 2], [w - 2, h - 2]] as const) ctx.fillRect(x, y, 2, 2);
  });

/** Painted wood of the first stair steps (the candy world's own wood). */
const paintedWood = () =>
  TX('csWood', 64, 32, (ctx, w, h) => {
    const r = rng(9);
    ctx.fillStyle = '#c89a6c';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      ctx.fillStyle = '#a87850';
      ctx.fillRect(0, y, w, 1);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = r() < 0.5 ? '#d8aa7a' : '#b88a5e';
        ctx.fillRect(Math.floor(r() * w), y + 2 + Math.floor(r() * 4), 6 + Math.floor(r() * 14), 1);
      }
    }
  });

export const codeSpace3D: LocationDef3D = {
  id: 'code-space',
  states: ['night', 'glitch'],
  defaultState: 'night',
  build(root, { low }) {
    const kit = new LocationKit(root, { low, ambient: AMBIENT });
    kit.setupLights();
    const r = rng(1313);
    const vc = new CandyBatch(kit);

    // ---- the stage: a floating slab of 1 m tiles, ragged at the edges
    const tileMat = kit.texM('csTile', tileTex(), { roughness: 0.35, emissive: 0xffffff, emissiveMap: tileTex(), emissiveIntensity: 0.55 });
    const edge = new Set<string>();
    for (let x = XL; x < XR; x++)
      for (let z = Z0; z < Z1 - 0.01; z += 1.05) {
        const atEdge = x === XL || x === XR - 1 || z === Z0;
        if (atEdge && r() < 0.3) {
          // a loose tile drifting a little below its place
          edge.add(`${x}`);
          kit.rb(0.98, 0.14, 1.0, 0.01, tileMat, x + 0.5 + (r() - 0.5) * 0.4, -0.6 - r() * 1.6, z + 0.5, { rx: (r() - 0.5) * 0.5, rz: (r() - 0.5) * 0.6 });
          continue;
        }
        kit.rb(0.98, 0.14, 1.0, 0.01, tileMat, x + 0.5, -0.07, z + 0.5);
      }
    // the slab's underside: stepped dark blocks thinning downwards, green seams
    for (let x = XL + 0.5; x < XR; x += 1) {
      const d = 0.5 + r() * 1.4;
      vc.add(new THREE.BoxGeometry(0.96, d, 3.6), (_x, y) => (y > d / 2 - 0.03 ? 0x1a6a3e : 0x0a120e), x, -0.14 - d / 2, -0.4);
    }

    // ---- far below: graph-paper grid into the dark
    const gridMat = new THREE.MeshBasicMaterial({ map: gridTex('csFloor', null, '#0b2e1b', '#1a8048', 8, true), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const floor = tiledPlane(root, gridMat, 160, 90, 4);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -6, -30);
    // a vertical grid wall at the far end, very dim (scale)
    const wallMat = new THREE.MeshBasicMaterial({ map: gridTex('csWall', null, '#07200f', '#0f4a28', 8, true), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    tiledPlane(root, wallMat, 180, 60, 6).position.set(0, 14, -60);

    // ---- the stair down from the technical corridor: wood → grey → lines
    const wood = kit.texM('csWood', paintedWood(), { roughness: 0.9 });
    const grey = kit.M('csGrey', 0x77737a, { roughness: 1 });
    const wires = new WireBatch();
    const stepN = 15;
    for (let i = 0; i < stepN; i++) {
      const x = -9.4 + i * 0.36;
      const y = 5.2 - i * 0.35;
      const z = -1.9;
      if (i < 6) {
        kit.rb(0.4, 0.12, 1.3, 0.015, wood, x, y, z);
        kit.rb(0.04, 0.35, 1.3, 0.01, wood, x + 0.18, y - 0.18, z);
      } else if (i < 11) kit.rb(0.4, 0.12, 1.3, 0.004, grey, x, y, z);
      else wires.add(new THREE.BoxGeometry(0.4, 0.12, 1.3), CODE_GREEN, x, y, z, { k: 0.9 - (i - 11) * 0.12 });
    }
    // the landing at the top: the end of the technical corridor, a warm doorway left behind
    kit.rb(2.6, 0.3, 1.6, 0.02, wood, -10.9, 5.1, -1.9);
    kit.rb(0.25, 2.6, 1.6, 0.02, grey, -12.1, 6.5, -1.9);
    kit.rb(2.6, 0.25, 1.6, 0.02, grey, -10.9, 7.8, -1.9);
    const doorGlow = kit.glowM('csDoorway', 0x2a2018, 0xffb070, { roughness: 0.6 });
    kit.rb(1.0, 2.0, 0.05, 0.01, doorGlow, -11.4, 6.25, -2.7);
    kit.lamp('csDoorway', { light: kit.pointLight(0xffb070, 1.6, 5, -11, 6.3, -1.6, 1.4), mats: [[doorGlow, 0.5]], on: { night: 1, glitch: 0.6 } });
    // banister: wooden posts, then a grey rail, then a single line
    for (let i = 0; i < 6; i++) kit.cy(0.025, 0.025, 0.9, wood, -9.4 + i * 0.36, 5.2 - i * 0.35 + 0.5, -1.3, { seg: 10 });
    kit.rod([-9.4, 6.1, -1.3], [-7.6, 4.35, -1.3], 0.03, wood);
    kit.rod([-7.24, 4.0, -1.3], [-5.8, 2.6, -1.3], 0.02, grey);
    wires.line([-5.4, 2.2, -1.3], [-4.36, 1.15, -1.3], CODE_GREEN, 0.7);

    // ---- file panels: users on the left, world components on the right; the centre stays calm
    const frameMat = kit.M('csFrame', PANEL_FRAME, { roughness: 0.4, emissive: 0x06140c });
    const specs: PanelSpec[] = [
      { name: 'user_07.usr', kind: 'user', x: -3.6, y: 2.3, z: -3.6, w: 1.62, ry: 0.25, seed: 7 },
      { name: 'user_06.usr', kind: 'user', x: -5.6, y: 3.2, z: -4.6, w: 1.43, ry: 0.35, rz: 0.04, broken: true, seed: 6 },
      { name: 'user_05.usr', kind: 'user', x: -4.6, y: 4.5, z: -6.2, w: 1.3, ry: 0.2, rz: -0.05, broken: true, seed: 5 },
      { name: 'user_03.usr', kind: 'user', x: -7.4, y: 2.0, z: -6.4, w: 1.43, ry: 0.4, broken: true, seed: 3 },
      { name: 'user_01.usr', kind: 'user', x: -8.6, y: 4.6, z: -8.5, w: 1.3, ry: 0.4, rz: 0.06, seed: 1 },
      { name: 'world.map', kind: 'system', x: 3.9, y: 2.5, z: -4.0, w: 1.95, ry: -0.25, broken: true, seed: 11 },
      { name: 'sky.cfg', kind: 'system', x: 6.0, y: 3.6, z: -5.0, w: 1.43, ry: -0.35, rz: -0.04, seed: 12 },
      { name: 'grass.fn', kind: 'system', x: 5.2, y: 1.6, z: -6.2, w: 1.3, ry: -0.3, seed: 13 },
      { name: 'sandbox.lvl', kind: 'system', x: 8.2, y: 2.4, z: -7.6, w: 1.69, ry: -0.4, rz: 0.03, seed: 14 },
      { name: 'physics.sys', kind: 'system', x: 4.4, y: 5.0, z: -8.0, w: 1.56, ry: -0.2, seed: 15 },
      { name: 'archive.dat', kind: 'system', x: 9.6, y: 5.2, z: -10, w: 1.56, ry: -0.4, seed: 16 },
      { name: 'render.sys', kind: 'system', x: -2.6, y: 6.6, z: -10, w: 1.69, ry: 0.1, seed: 17 },
    ];
    const panels: PanelHandle[] = specs.map((s) => filePanel(kit, root, s, frameMat));
    // threads to the program core; damaged ones in their own batch (they turn red)
    const brokenThreads = new WireBatch();
    for (const p of panels) {
      const a: [number, number, number] = [p.anchor.x, p.anchor.y, p.anchor.z];
      const b: [number, number, number] = [CORE.x + (r() - 0.5) * 0.8, CORE.y - 0.6 + (r() - 0.5) * 0.8, CORE.z + 1];
      for (let k = 0; k < 3; k++) (p.spec.broken ? brokenThreads : wires).thread(a, [b[0] + k * 0.15, b[1] - k * 0.1, b[2]], 0.6 + k * 0.25, p.spec.broken ? 0xffffff : CODE_GREEN, 14, p.spec.name === 'user_07.usr' ? 0.9 : 0.32);
    }

    // ---- the program core: a wire polyhedron in rings, a dim solid heart
    const coreMat = kit.glowM('csCore', 0x0a2a18, CODE_GREEN, { roughness: 0.3 });
    kit.sph(0.9, coreMat, CORE.x, CORE.y, CORE.z, { ws: 24, hs: 18 });
    kit.lamp('csCoreGlow', { mats: [[coreMat, 0.35]], glows: [kit.halo(CODE_GREEN, 5, 0.18, CORE.x, CORE.y, CORE.z + 0.5)], on: { night: 1, glitch: 0.6 } });
    const coreWire = new WireBatch();
    coreWire.add(new THREE.IcosahedronGeometry(2.6, 1), CODE_GREEN, 0, 0, 0, { k: 0.55 });
    coreWire.add(new THREE.IcosahedronGeometry(1.5, 0), 0xb8ffd8, 0, 0, 0, { k: 0.4 });
    const coreLines = coreWire.flush(root);
    coreLines.position.copy(CORE);
    const ringWire = new WireBatch();
    for (let k = 0; k < 3; k++) ringWire.add(new THREE.TorusGeometry(3.2 + k * 0.6, 0.01, 3, 64), CODE_GREEN, 0, 0, 0, { rx: Math.PI / 2 + k * 0.35, ry: k * 0.8, k: 0.28, angle: 1 });
    const rings = ringWire.flush(root);
    rings.position.copy(CORE);

    // ---- scale: data towers and big outlines in the distance
    for (let i = 0; i < 26; i++) {
      const x = -40 + i * 3.2 + r() * 2;
      if (Math.abs(x - CORE.x) < 6) continue;
      const h = 8 + r() * 22;
      const w = 1.5 + r() * 2.5;
      const z = -24 - r() * 22;
      wires.add(new THREE.BoxGeometry(w, h, w, 1, Math.max(1, Math.round(h / 3)), 1), CODE_GREEN, x, -6 + h / 2, z, { k: 0.1 + r() * 0.12, angle: 1 });
    }
    for (let i = 0; i < 5; i++) wires.add(new THREE.SphereGeometry(2 + r() * 2, 12, 8), CODE_GREEN, -24 + i * 12 + r() * 4, 9 + r() * 6, -34 - r() * 8, { k: 0.14, angle: 1 });
    const staticWires = wires.flush(root);
    const broken = brokenThreads.flush(root);

    // ---- drifting wire primitives near the stage (each its own mesh: they turn)
    const drift = new THREE.Group();
    root.add(drift);
    const prims: THREE.LineSegments[] = [];
    const primGeos = [new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.OctahedronGeometry(0.5), new THREE.TorusGeometry(0.45, 0.14, 6, 14), new THREE.DodecahedronGeometry(0.5), new THREE.ConeGeometry(0.4, 0.8, 6), new THREE.TetrahedronGeometry(0.5)];
    const primMat = new THREE.LineBasicMaterial({ color: CODE_GREEN, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    primGeos.forEach((g, i) => {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), primMat);
      g.dispose();
      const side = i % 2 ? 1 : -1;
      l.position.set(side * (3 + r() * 4.5), 3.2 + r() * 2.2, -2.8 - r() * 3);
      l.rotation.set(r() * 3, r() * 3, 0);
      drift.add(l);
      prims.push(l);
    });

    // ---- glyph rain behind and to the sides; drifting lines of the world's code
    const rain = glyphRain(root, { x0: -16, x1: 16, y0: -6, y1: 10, z0: -16, z1: -4 }, low ? 46 : 80, 10, r, { size: 0.24, speed: 0.9, corrupt: 0.18 });
    const nearRain = glyphRain(root, { x0: -9, x1: 9, y0: -3, y1: 7, z0: -3.6, z1: -2.8 }, low ? 8 : 14, 7, r, { size: 0.16, speed: 0.6 });
    const fx: Fx[] = [
      rain,
      nearRain,
      driftingLines(
        root,
        [
          { text: 'color.sky = PASTEL_BLUE;', x: -6, y: 2.9, z: -2.7, h: 0.15, v: 0.16 },
          { text: 'grass = drawGrass(0, 0, W, H);', x: 2, y: 3.8, z: -4.4, h: 0.17, v: 0.1 },
          { text: 'for (s = 0; s < stars; s++) star(s);', x: -9, y: 5.4, z: -6, h: 0.2, v: 0.08 },
          { text: 'world.map.link(user_07);', x: -2, y: 1.2, z: -5.2, h: 0.14, v: 0.12 },
          { text: 'sandbox.gravity = 9.8;', x: 5, y: 6.2, z: -7.5, h: 0.2, v: 0.07 },
          { text: 'smile.width = 1.0;', x: -12, y: 7, z: -9, h: 0.24, v: 0.06 },
        ],
        [-14, 14],
      ),
    ];

    // ---- light: cold green from the core, a pale work light over the stage, a slow red pulse in 'glitch'
    kit.lamp('csCore', { light: kit.pointLight(CODE_GREEN, 6, 26, CORE.x, CORE.y, CORE.z + 3, 1.0), on: { night: 1, glitch: 0.5 } });
    kit.lamp('csStage', { light: kit.pointLight(0xd8ffe8, 6.5, 12, 0, 3.8, 1.6, 1.2), on: { night: 1, glitch: 0.8 } });
    kit.lamp('csLeft', { light: kit.pointLight(CODE_GREEN, 2.5, 8, -4.5, 2.5, -2.2, 1.2), on: { night: 1, glitch: 0.4 } });
    const red = kit.pointLight(CODE_CORRUPT, 0, 14, -4.5, 3.5, -3.5, 1.1);
    root.add(red);
    vc.flush(root, kit.mat('csVc', { vertexColors: true, color: 0xffffff, roughness: 0.6 }));
    kit.flushBatches();

    let glitch = false;
    const brokenMat = broken.material as THREE.LineBasicMaterial;
    kit.onState((s) => {
      glitch = s === 'glitch';
      for (const p of panels) if (p.bad) p.face.material = glitch ? p.bad : p.ok;
      brokenMat.color.setHex(glitch ? CODE_CORRUPT : CODE_GREEN).multiplyScalar(glitch ? 0.9 : 0.55);
      rain.setCorrupt(glitch);
      kit.fog = new THREE.Fog(glitch ? 0x070406 : BG, 16, 58);
    });
    const staticMat = staticWires.material as THREE.LineBasicMaterial;
    return {
      kit,
      look: { exposure: 1.0, bloom: 0.55, threshold: 0.55 },
      shots: {
        wide: { pos: [0, 2.0, 6.4], look: [0, 1.7, -2], fov: 52 },
        files: { pos: [-1.8, 2.0, 1.6], look: [-4.4, 2.6, -4.2], fov: 46 },
        world: { pos: [2.2, 2.0, 1.4], look: [4.6, 2.6, -4.6], fov: 46 },
        core: { pos: [0.2, 1.2, 3.5], look: [CORE.x, CORE.y - 0.8, CORE.z], fov: 50 },
        stairs: { pos: [-3.2, 2.2, 4.2], look: [-6.8, 2.4, -1.9], fov: 50 },
      },
      marks: {
        left: { x: -1.7, z: -0.6 },
        center: { x: 0, z: -0.6 },
        right: { x: 1.7, z: -0.6 },
        stairs: { x: -4.6, z: -1.6, facing: 'right' },
        files: { x: -3.4, z: -1.8, facing: 'back' },
        edge: { x: 5.6, z: -0.4, facing: 'right' },
      },
      walk: { minX: XL + 1, maxX: XR - 1, z: -0.6 },
      update(dt, t) {
        for (const f of fx) f.update(dt, t);
        coreLines.rotation.y += dt * 0.12;
        coreLines.rotation.x = Math.sin(t * 0.1) * 0.2;
        rings.rotation.y -= dt * 0.05;
        for (const [i, p] of prims.entries()) {
          p.rotation.x += dt * (0.12 + i * 0.02);
          p.rotation.y += dt * 0.18;
          p.position.y += Math.sin(t * 0.5 + i) * dt * 0.05;
        }
        // a slow breath of the code light; in 'glitch' a slow red pulse (≈ 0.25 Hz, never a flash)
        staticMat.opacity = 0.85 + Math.sin(t * 0.7) * 0.1;
        red.intensity = glitch ? 2.2 + Math.sin(t * 1.6) * 1.2 : 0;
      },
    };
  },
};
