// The code layer of the game world (chasm void, the system partition, glitch
// light): a pixel glyph atlas, instanced glyph rain in columns (one draw call),
// and flat strips of code text that drift in the air. Green is the code colour
// (`--code-green`); red-pink (`--code-corruption`) only marks damage.
// Art inside the picture — UI text is never drawn this way.
import * as THREE from 'three';
import { TX } from '../kit/location-kit';
import { pixelText } from '../candy/shapes';
import type { Fx } from '../candy/fx';

export const CODE_GREEN = 0x39ff88;
export const CODE_DEEP = 0x0f5a32;
export const CODE_BLACK = 0x080d0a;
export const CODE_CORRUPT = 0xf04b67;

const GLYPHS = '01{}[]()<>=+-*/;:.#&%$?!λπΔ∑√∞≠≤≥xyzif01';
export const GLYPH_COLS = 8;

/** 8×8 white glyphs, 16 px cells, hard pixel edges (tinted per instance). */
export const glyphAtlas = () =>
  TX('codeGlyphs', 128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 64; i++) pixelText(ctx, GLYPHS[i % GLYPHS.length]!, (i % 8) * 16 + 8, Math.floor(i / 8) * 16 + 1, 12, '#ffffff', { align: 'center', font: 'monospace' });
  }, { color: false });

export interface RainBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/**
 * Glyph rain: `cols` columns of `len` glyphs falling slowly; the head of each
 * column is bright, the tail fades. A few glyphs change every few frames (never
 * a strobe). `corrupt` = share of columns drawn in the corruption colour, shown
 * only while `setCorrupt(true)`.
 */
export function glyphRain(root: THREE.Object3D, box: RainBox, cols: number, len: number, r: () => number, { size = 0.22, speed = 1, corrupt = 0 } = {}): Fx & { setCorrupt(on: boolean): void; mesh: THREE.InstancedMesh } {
  const n = cols * len;
  const geo = new THREE.PlaneGeometry(size, size);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / GLYPH_COLS, uv.getY(i) / GLYPH_COLS);
  const offsets = new Float32Array(n * 2);
  const setGlyph = (i: number, g: number) => {
    offsets[i * 2] = (g % GLYPH_COLS) / GLYPH_COLS;
    offsets[i * 2 + 1] = 1 - (Math.floor(g / GLYPH_COLS) + 1) / GLYPH_COLS;
  };
  for (let i = 0; i < n; i++) setGlyph(i, Math.floor(r() * 64));
  const offAttr = new THREE.InstancedBufferAttribute(offsets, 2);
  geo.setAttribute('glyphOffset', offAttr);
  const mat = new THREE.MeshBasicMaterial({ map: glyphAtlas(), transparent: true, alphaTest: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 glyphOffset;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vMapUv + glyphOffset;\n#endif');
  };
  mat.customProgramCacheKey = () => 'codeGlyphRain';
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const columns = Array.from({ length: cols }, () => ({
    x: box.x0 + r() * (box.x1 - box.x0),
    z: box.z0 + r() * (box.z1 - box.z0),
    y: box.y0 + r() * (box.y1 - box.y0),
    v: (0.5 + r() * 0.9) * speed,
    bad: r() < corrupt,
    k: 0.55 + r() * 0.45,
  }));
  const c = new THREE.Color();
  const paint = (on: boolean) => {
    columns.forEach((col, ci) => {
      for (let j = 0; j < len; j++) {
        const fade = j === 0 ? 1 : Math.pow(1 - j / len, 1.6) * 0.75;
        c.setHex(col.bad && on ? CODE_CORRUPT : j === 0 ? 0xc8ffe0 : CODE_GREEN).multiplyScalar(fade * col.k * (col.bad && on ? 0.9 : 1));
        mesh.setColorAt(ci * len + j, c);
      }
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  paint(false);
  root.add(mesh);
  const m4 = new THREE.Matrix4();
  let tick = 0;
  const update = (dt: number) => {
    const h = box.y1 - box.y0;
    columns.forEach((col, ci) => {
      col.y -= col.v * dt;
      if (col.y < box.y0) col.y += h + len * size;
      for (let j = 0; j < len; j++) {
        m4.makeTranslation(col.x, col.y + j * size * 1.05, col.z);
        mesh.setMatrixAt(ci * len + j, m4);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    tick += dt;
    if (tick > 0.12) {
      tick = 0;
      for (let k = 0; k < Math.max(1, n / 40); k++) setGlyph(Math.floor(r() * n), Math.floor(r() * 64));
      offAttr.needsUpdate = true;
    }
  };
  update(0);
  return { update, setCorrupt: paint, mesh };
}

/** A strip of code text (one line) as a pixel texture: green on transparent. */
export const codeLineTex = (key: string, text: string, color = '#39ff88') => {
  const w = Math.max(32, text.length * 7 + 8);
  return TX(`codeLine-${key}`, w, 14, (ctx) => {
    ctx.clearRect(0, 0, w, 14);
    pixelText(ctx, text, 3, 1, 10, color, { font: 'monospace', bold: false });
  }, { color: false });
};

/** Drifting code lines in the air: flat strips that float sideways and bob a little. */
export function driftingLines(root: THREE.Object3D, lines: { text: string; x: number; y: number; z: number; h?: number; v?: number; color?: number }[], span: [number, number]): Fx {
  const items = lines.map((l, i) => {
    const tex = codeLineTex(`drift${i}`, l.text);
    const img = tex.image as HTMLCanvasElement;
    const h = l.h ?? 0.16;
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: l.color ?? 0xffffff, transparent: true, alphaTest: 0.4, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry((h * img.width) / img.height, h), mat);
    m.position.set(l.x, l.y, l.z);
    m.renderOrder = 3;
    root.add(m);
    return { m, l, ph: i * 1.7 };
  });
  return {
    update(dt, t) {
      for (const { m, l, ph } of items) {
        m.position.x += (l.v ?? 0.12) * dt;
        if (m.position.x > span[1]) m.position.x = span[0];
        m.position.y = l.y + Math.sin(t * 0.6 + ph) * 0.06;
      }
    },
  };
}
