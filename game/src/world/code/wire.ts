// Wireframes and graph-paper grids of the code layer. Static wire shapes are
// merged into one LineSegments per call site (vertex colours), so a whole sky
// of outlines is a single draw call; grids are pixel textures on big planes.
import * as THREE from 'three';
import { canvasTexture, TX } from '../kit/location-kit';

/** Collects edge outlines of many shapes, then makes one LineSegments. */
export class WireBatch {
  private readonly pos: number[] = [];
  private readonly col: number[] = [];
  private readonly c = new THREE.Color();

  /** Adds the outline of `geo` (edges sharper than `angle` degrees), placed by position / rotation / scale. */
  add(geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, { rx = 0, ry = 0, rz = 0, s = 1, sx = 1, sy = 1, sz = 1, angle = 20, k = 1 } = {}): void {
    const edges = new THREE.EdgesGeometry(geo, angle);
    geo.dispose();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s * sx, s * sy, s * sz));
    edges.applyMatrix4(m);
    const p = edges.attributes.position as THREE.BufferAttribute;
    this.c.setHex(color).multiplyScalar(k);
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.col.push(this.c.r, this.c.g, this.c.b);
    }
    edges.dispose();
  }

  /** A straight segment (threads, scan lines). */
  line(a: [number, number, number], b: [number, number, number], color: number, k = 1): void {
    this.c.setHex(color).multiplyScalar(k);
    this.pos.push(...a, ...b);
    this.col.push(this.c.r, this.c.g, this.c.b, this.c.r, this.c.g, this.c.b);
  }

  /** A sagging thread between two points, as `n` segments. */
  thread(a: [number, number, number], b: [number, number, number], sag: number, color: number, n = 10, k = 1): void {
    let prev = a;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const p: [number, number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag, a[2] + (b[2] - a[2]) * t];
      this.line(prev, p, color, k);
      prev = p;
    }
  }

  get empty(): boolean {
    return this.pos.length === 0;
  }

  flush(root: THREE.Object3D, { opacity = 1, additive = true } = {}): THREE.LineSegments {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: opacity < 1 || additive, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: false });
    const l = new THREE.LineSegments(g, mat);
    l.renderOrder = 2;
    root.add(l);
    this.pos.length = 0;
    this.col.length = 0;
    return l;
  }
}

/**
 * Graph-paper grid tile (64 px = one major cell of 10 minor lines): thin minor
 * lines, brighter major lines. Colours are CSS strings; the background may be
 * transparent (lines only, for additive planes).
 */
export const gridTex = (key: string, bg: string | null, minor: string, major: string, cells = 8, smooth = false) =>
  (smooth ? canvasTexture : TX)(`grid-${key}`, 64, 64, (ctx, w, h) => {
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    } else ctx.clearRect(0, 0, w, h);
    const step = w / cells;
    ctx.fillStyle = minor;
    for (let i = 1; i < cells; i++) {
      ctx.fillRect(Math.round(i * step), 0, 1, h);
      ctx.fillRect(0, Math.round(i * step), w, 1);
    }
    ctx.fillStyle = major;
    ctx.fillRect(0, 0, w, 1);
    ctx.fillRect(0, 0, 1, h);
  }, smooth ? { color: !!bg, aniso: 4 } : { color: !!bg });

/** A flat plane with a repeating texture, `tile` metres per repeat (no stretching). */
export function tiledPlane(root: THREE.Object3D, mat: THREE.Material & { map?: THREE.Texture | null }, w: number, h: number, tile: number): THREE.Mesh {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  const m = new THREE.Mesh(g, mat);
  root.add(m);
  return m;
}
