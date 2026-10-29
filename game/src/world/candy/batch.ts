// Vertex-coloured batching for the candy world. The kit batches one mesh per
// material, so a motley place would need dozens of materials; here every toy,
// stripe and sticker carries its colour in the vertices and a whole location
// is drawn with a handful of meshes (cheap on a software rasteriser too).
// Optional atlas: a geometry's 0…1 uvs are remapped into one tile of a texture
// atlas (alphabet-block faces, stickers).
import * as THREE from 'three';
import type { LocationKit } from '../kit/location-kit';

/** Colour of a vertex from its position in the piece's own frame (before the transform). */
export type ColorFn = (x: number, y: number, z: number, i: number) => number;

export interface Placement {
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Atlas tile for the whole piece, or a function of the face index (BoxGeometry-like pieces). */
  tile?: number | ((face: number) => number);
  /** Number of faces for `tile(face)`: vertices are split evenly into this many groups. */
  faces?: number;
  /** Colour each triangle by its centre (crisp candy stripes instead of blended vertex colours). */
  perFace?: boolean;
}

/** Shared frame stack: pieces built inside `withFrame` are moved by its matrix (tilted toys). */
const frames: THREE.Matrix4[] = [];

/** Builds `fn` inside a local frame (position + rotation + uniform scale) for every candy batch. */
export function withFrame(x: number, y: number, z: number, rot: { rx?: number; ry?: number; rz?: number }, fn: () => void, s = 1): void {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.rx ?? 0, rot.ry ?? 0, rot.rz ?? 0)),
    new THREE.Vector3(s, s, s),
  );
  const top = frames[frames.length - 1];
  frames.push(top ? top.clone().multiply(m) : m);
  try {
    fn();
  } finally {
    frames.pop();
  }
}

const tmp = new THREE.Color();
const euler = new THREE.Euler();
const mat4 = new THREE.Matrix4();

export class CandyBatch {
  private readonly geos: THREE.BufferGeometry[] = [];

  constructor(
    private readonly kit: LocationKit,
    private readonly atlas: { cols: number; rows: number } | null = null,
  ) {}

  /** Adds a fresh (or cloned) geometry, coloured, in the kit's current local frame (withT). */
  add(geo: THREE.BufferGeometry, color: number | ColorFn, x = 0, y = 0, z = 0, o: Placement = {}): THREE.BufferGeometry {
    if (o.perFace && geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (typeof color === 'number') tmp.setHex(color);
      else if (o.perFace) {
        const t = i - (i % 3);
        const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
        const cy = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
        const cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
        tmp.setHex(color(cx, cy, cz, t / 3));
      } else tmp.setHex(color(pos.getX(i), pos.getY(i), pos.getZ(i), i));
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (this.atlas) this.remapUV(geo, o);
    if (o.sx || o.sy || o.sz) geo.scale(o.sx || 1, o.sy || 1, o.sz || 1);
    if (o.rx || o.ry || o.rz) geo.applyMatrix4(mat4.makeRotationFromEuler(euler.set(o.rx || 0, o.ry || 0, o.rz || 0)));
    geo.translate(x, y, z);
    const F = frames[frames.length - 1];
    if (F) geo.applyMatrix4(F);
    const T = (this.kit as unknown as { T: THREE.Matrix4 | null }).T;
    if (T) geo.applyMatrix4(T);
    this.geos.push(geo);
    return geo;
  }

  private remapUV(geo: THREE.BufferGeometry, o: Placement): void {
    const uv = geo.attributes.uv as THREE.BufferAttribute | undefined;
    if (!uv || o.tile === undefined || !this.atlas) return;
    const { cols, rows } = this.atlas;
    const per = Math.max(1, Math.floor(uv.count / (o.faces ?? 1)));
    // a hair inside the tile, so nearest sampling never bleeds into the neighbour
    const e = 0.02;
    for (let i = 0; i < uv.count; i++) {
      const t = typeof o.tile === 'function' ? o.tile(Math.floor(i / per)) : o.tile;
      const cx = t % cols;
      const cy = Math.floor(t / cols);
      const u = e + Math.min(1, Math.max(0, uv.getX(i))) * (1 - 2 * e);
      const v = e + Math.min(1, Math.max(0, uv.getY(i))) * (1 - 2 * e);
      uv.setXY(i, (cx + u) / cols, 1 - (cy + 1 - v) / rows);
    }
  }

  get size(): number {
    return this.geos.length;
  }

  /** Merges everything into one mesh with `material` (which must have vertexColors). */
  flush(root: THREE.Object3D, material: THREE.Material): THREE.Mesh | null {
    if (!this.geos.length) return null;
    const mesh = new THREE.Mesh(mergeColoured(this.geos), material);
    if (material.transparent) mesh.renderOrder = 1;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    root.add(mesh);
    this.geos.length = 0;
    return mesh;
  }
}

/** Merge (indexed or not) geometries with position, normal, uv, color into one indexed geometry. */
export function mergeColoured(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let nv = 0;
  let ni = 0;
  for (const g of geos) {
    nv += g.attributes.position!.count;
    ni += g.index ? g.index.count : g.attributes.position!.count;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const col = new Float32Array(nv * 3);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position as THREE.BufferAttribute;
    pos.set(p.array as Float32Array, vo * 3);
    nor.set(g.attributes.normal!.array as Float32Array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, vo * 2);
    col.set(g.attributes.color!.array as Float32Array, vo * 3);
    if (g.index) {
      const a = g.index.array;
      for (let i = 0; i < a.length; i++) idx[io + i] = a[i]! + vo;
      io += a.length;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

export interface ScatterItem {
  x: number;
  y: number;
  z: number;
  s: number;
  color: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

/** Many copies of one small shape (confetti, glitter, floating toys) in one instanced draw call. */
export function scatter(root: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, items: ScatterItem[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  items.forEach((it, i) => {
    q.setFromEuler(euler.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0));
    mat4.compose(v.set(it.x, it.y, it.z), q, s.setScalar(it.s));
    mesh.setMatrixAt(i, mat4);
    mesh.setColorAt(i, tmp.setHex(it.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  root.add(mesh);
  return mesh;
}
