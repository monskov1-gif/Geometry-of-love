// «Разрушающийся мир» — последний уровень (гл. 13–15). Long side-on strip
// along x: the pastel Sandbox at the start, losing its textures; then grey
// untextured shapes and wireframes; then a black void of green code with floor
// tiles hanging in it, and the bright back of the monitor at the very end.
// Синопсис: «сначала исчезают текстуры, затем лица персонажей, после чего
// остаются только контуры, сетки и геометрические примитивы».
// Animated: code rain, falling tiles behind the runner, flickering wireframes.
import * as THREE from 'three';
import { LocationKit, rgb, rng, TX } from '../kit/location-kit';
import type { LocationBuild, LocationDef3D, Mark, Shot } from '../types';

export const RUN_LENGTH = 200;
/** Where the run and the car ride end (chase-logic CONFIGS lengths, a little short of them). */
const END_RUN = 162;
const END_CAR = 186;
const Z0 = -2.2;
const Z1 = 1.4;

/** 0 = Sandbox, 1 = code void, along the run. */
const decay = (x: number) => Math.max(0, Math.min(1, (x - 30) / 110));

function glyphAtlas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 128, 128);
  ctx.font = '14px Tiny5, monospace';
  ctx.textBaseline = 'top';
  const glyphs = '01∠πΔ=+−×√°∑≠∞<>{};x²y³';
  for (let i = 0; i < 64; i++) {
    ctx.fillStyle = i % 5 === 0 ? '#ff6cc5' : '#39ff88';
    ctx.fillText(glyphs[i % glyphs.length]!, (i % 8) * 16 + 3, Math.floor(i / 8) * 16 + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

export const collapse3D: LocationDef3D = {
  id: 'collapse',
  states: ['night'],
  defaultState: 'night',
  build(root, { low }) {
    const kit = new LocationKit(root, {
      low,
      ambient: { night: { sky: 0xb8a8d8, ground: 0x201828, hemi: 0.75, fill: 0xffe0f0, fillI: 0.5, bg: 0x0a0812 } },
    });
    kit.setupLights();
    const r = rng(77);

    // ---- floor: 1 m tiles, pastel at first, then grey, then floating fragments in the void
    const tileTex = TX('collapseTile', 32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#fff2fa';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd6ef';
      for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = '#e8b8d8';
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
    });
    const tilePastel = kit.texM('collapseTile', tileTex, { roughness: 0.7 });
    const tileGrey = kit.M('collapseGrey', 0x8a8a96, { roughness: 0.9 });
    const tileVoid = kit.M('collapseVoid', 0x121a16, { roughness: 1, emissive: 0x0a2a18 });
    const fallers: { mesh: THREE.Mesh; x: number; v: number }[] = [];
    for (let x = -12; x < RUN_LENGTH + 12; x++) {
      const k = decay(x);
      const mat = k < 0.3 ? tilePastel : k < 0.7 ? tileGrey : tileVoid;
      for (let z = Z0; z < Z1; z += 1.2) {
        // in the void some tiles are already gone (but never on the running line)
        const onLine = z < 0.4 && z + 1.2 > -0.6;
        if (k > 0.75 && !onLine && r() < 0.45) continue;
        if (onLine && x > 8) {
          // tiles the runner crosses are separate meshes: they fall away behind him
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 1.18), mat);
          m.position.set(x + 0.5, -0.06, z + 0.6);
          root.add(m);
          fallers.push({ mesh: m, x: x + 0.5, v: 0 });
        } else kit.rb(0.98, 0.12, 1.18, 0.01, mat, x + 0.5, -0.06 - (k > 0.7 ? r() * 0.3 : 0), z + 0.6);
      }
    }

    // ---- Sandbox remnants: alphabet blocks, giant pencils, a ruler, a slide — losing their colours
    const blockTex = (ch: string, c: string) =>
      TX(`abc-${ch}`, 16, 16, (ctx, w, h) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff9fd';
        ctx.font = '12px Tiny5, monospace';
        ctx.fillText(ch, 4, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, h - 1, w, 1);
      });
    const colours = ['#ff6cc5', '#55c9f5', '#8ad86a', '#f8d048', '#b78cff'];
    for (let i = 0; i < 26; i++) {
      const x = -6 + i * 4.2 + r() * 2;
      const k = decay(x);
      const size = 0.6 + r() * 0.9;
      const z = Z0 + 0.2 + r() * 0.6;
      const mat =
        k < 0.35
          ? kit.texM(`abc-${i % 10}`, blockTex('АБВГДЕЖЗИК'[i % 10]!, colours[i % colours.length]!), { roughness: 0.6 })
          : k < 0.7
            ? kit.M('greyBlock', 0xa0a0ac, { roughness: 0.9 })
            : kit.M('wireDark', 0x1a2a20, { roughness: 1 });
      kit.rb(size, size, size, 0.04, mat, x, size / 2 + (k > 0.7 ? 0.4 + r() * 1.5 : 0), z, { ry: r() * 0.6, rz: k > 0.7 ? r() : 0 });
    }
    // pencils leaning on the back of the level
    for (let i = 0; i < 6; i++) {
      const x = 2 + i * 9 + r() * 3;
      const len = 3 + r() * 2;
      kit.cy(0.18, 0.18, len, kit.M(`pencil-${i % 3}`, [0xf8d048, 0xff6cc5, 0x55c9f5][i % 3]!, { roughness: 0.5 }), x, len / 2 - 0.2, Z0 - 0.4, { rz: 0.25 - r() * 0.5, seg: 6 });
    }

    // ---- wireframes of what used to be solid (middle of the run)
    const wireMat = new THREE.LineBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.7 });
    const wires: THREE.LineSegments[] = [];
    for (let i = 0; i < 16; i++) {
      const x = 60 + i * 8 + r() * 4;
      const geo = [new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.IcosahedronGeometry(0.9, 0), new THREE.CylinderGeometry(0.6, 0.6, 2, 6), new THREE.TorusGeometry(0.8, 0.25, 6, 12)][i % 4]!;
      const w = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wireMat);
      w.position.set(x, 1.2 + r() * 2.5, Z0 - 0.6 - r() * 1.5);
      w.rotation.set(r(), r(), r());
      root.add(w);
      wires.push(w);
    }
    // grid wall far behind
    const grid = new THREE.GridHelper(RUN_LENGTH + 40, (RUN_LENGTH + 40) / 2, 0x39ff88, 0x1a5a34);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(RUN_LENGTH / 2, 0, -9);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    root.add(grid);

    // ---- sky: a long gradient plane from pastel pink to black
    const skyTex = TX('collapseSky', 256, 8, (ctx, w, h) => {
      for (let x = 0; x < w; x++) {
        const k = Math.max(0, Math.min(1, (x / w - 0.12) / 0.6));
        ctx.fillStyle = rgb(255 * (1 - k) + 6 * k, 201 * (1 - k) + 8 * k, 246 * (1 - k) + 10 * k);
        ctx.fillRect(x, 0, 1, h);
      }
    });
    skyTex.magFilter = THREE.LinearFilter;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(RUN_LENGTH + 80, 40), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false }));
    sky.position.set(RUN_LENGTH / 2, 8, -14);
    root.add(sky);

    // ---- the exit at the end: the back of the monitor, bright
    const exitMat = new THREE.MeshBasicMaterial({ color: 0xfff4fb, toneMapped: false });
    const exit = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), exitMat);
    exit.position.set(RUN_LENGTH + 2, 2.2, -0.5);
    root.add(exit);
    kit.lamp('exitGlow', { light: kit.pointLight(0xfff0f8, 8, 14, RUN_LENGTH + 1, 2.2, 0.5, 1.2), glows: [kit.halo(0xffffff, 6, 0.45, RUN_LENGTH + 1.8, 2.2, -0.3)], on: { night: 1 } });

    // ---- code rain: instanced glyph quads falling in front of and behind the strip
    const atlas = glyphAtlas();
    const rainN = low ? 260 : 700;
    const glyphGeo = new THREE.PlaneGeometry(0.32, 0.32);
    const uv = glyphGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8, uv.getY(i) / 8);
    const rainMat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const rain = new THREE.InstancedMesh(glyphGeo, rainMat, rainN);
    const drops = Array.from({ length: rainN }, () => ({
      x: 40 + r() * (RUN_LENGTH - 20),
      y: r() * 9,
      z: r() < 0.5 ? Z0 - 1 - r() * 6 : Z1 + 0.5 + r() * 2,
      v: 1.5 + r() * 3,
      g: Math.floor(r() * 64),
    }));
    // per-instance atlas offset through a uv attribute
    const offsets = new Float32Array(rainN * 2);
    drops.forEach((d, i) => {
      offsets[i * 2] = (d.g % 8) / 8;
      offsets[i * 2 + 1] = 1 - (Math.floor(d.g / 8) + 1) / 8;
    });
    glyphGeo.setAttribute('glyphOffset', new THREE.InstancedBufferAttribute(offsets, 2));
    rainMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 glyphOffset;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vMapUv + glyphOffset;\n#endif');
    };
    root.add(rain);
    const m4 = new THREE.Matrix4();

    kit.flushBatches();
    kit.fog = new THREE.Fog(0x0a0812, 18, 46);

    let runnerX = 0;
    // After a chase the talk happens where the run ended, not back at the start:
    // variant 'end' / 'end-car' moves every shot and mark to the finish.
    const baseShots: Record<string, Shot> = {
      wide: { pos: [4, 1.8, 7.5], look: [4, 1.5, 0], fov: 46 },
      start: { pos: [1.5, 1.6, 5.2], look: [0.5, 1.4, -0.2], fov: 44 },
      rise: { pos: [-1.5, 2.6, 9.5], look: [-1.0, 2.4, -0.5], fov: 52 },
    };
    const baseMarks: Record<string, Mark> = {
      left: { x: -1.2, z: -0.4 },
      center: { x: 0.4, z: -0.2 },
      right: { x: 2.0, z: -0.4 },
      start: { x: 1.2, z: -0.1, facing: 'right' },
      melody: { x: -1.2, z: -0.2, facing: 'right' },
    };
    const shots = structuredClone(baseShots) as LocationBuild['shots'];
    const marks = structuredClone(baseMarks) as LocationBuild['marks'];
    const placeAt = (dx: number) => {
      for (const [k, b] of Object.entries(baseShots)) {
        shots[k] = { ...b, pos: [b.pos[0] + dx, b.pos[1], b.pos[2]], look: [b.look[0] + dx, b.look[1], b.look[2]] };
      }
      for (const [k, b] of Object.entries(baseMarks)) marks[k] = { ...b, x: b.x + dx };
    };
    return {
      kit,
      shots,
      marks,
      setVariant(v) {
        placeAt(v === 'end' ? END_RUN : v === 'end-car' ? END_CAR : 0);
      },
      walk: { minX: -8, maxX: RUN_LENGTH + 2, z: -0.1 },
      update(dt, t) {
        // tiles drop away a few metres behind whoever runs (or the camera)
        for (const f of fallers) {
          if (f.x < runnerX - 9 + Math.sin(f.x * 3.1) * 2 || f.v > 0) {
            f.v += dt * 9;
            f.mesh.position.y -= f.v * dt;
            f.mesh.rotation.x += dt * f.v * 0.2;
            if (f.mesh.position.y < -30) f.mesh.visible = false;
          }
        }
        for (const w of wires) {
          w.rotation.y += dt * 0.3;
          w.visible = Math.sin(t * 7 + w.position.x) > -0.7;
        }
        for (let i = 0; i < rainN; i++) {
          const d = drops[i]!;
          d.y -= d.v * dt;
          if (d.y < -1) d.y = 9;
          m4.makeTranslation(d.x, d.y, d.z);
          rain.setMatrixAt(i, m4);
        }
        rain.instanceMatrix.needsUpdate = true;
      },
      track(x) {
        runnerX = x;
      },
    };
  },
};
