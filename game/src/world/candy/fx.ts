// Moving layers of the candy world, each one instanced draw call: shapes that
// float and slowly turn overhead, glitter that twinkles (slowly — no flashing),
// confetti on the floor, and the glitch slices that only show in the later
// phases ('glitch' state). `update(dt, t)` is called by the location.
import * as THREE from 'three';
import type { LocationKit } from '../kit/location-kit';
import { scatter, type ScatterItem } from './batch';
import { LOUD } from './palette';
import { puffyGeometry } from './toys';
import { glitchSlices } from './textures';

export interface Fx {
  update(dt: number, t: number): void;
}

interface Floater extends ScatterItem {
  ph: number;
  spin: number;
}

/** Big glossy shapes hovering in the air: stars, hearts, polyhedra, rings. */
export function floaters(kit: LocationKit, root: THREE.Object3D, box: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }, n: number, r: () => number): Fx {
  const geos = [puffyGeometry('star', 0.22), puffyGeometry('heart', 0.2), new THREE.IcosahedronGeometry(0.18, 0), new THREE.TorusGeometry(0.16, 0.06, 10, 24), new THREE.OctahedronGeometry(0.2, 0)];
  const mat = kit.mat('candyFloat', { color: 0xffffff, roughness: 0.25, emissive: 0x201420, toneMapped: false });
  const groups = geos.map((g) => {
    const items: Floater[] = [];
    for (let i = 0; i < Math.ceil(n / geos.length); i++)
      items.push({
        x: box.x0 + r() * (box.x1 - box.x0),
        y: box.y0 + r() * (box.y1 - box.y0),
        z: box.z0 + r() * (box.z1 - box.z0),
        s: 0.7 + r() * 0.9,
        color: LOUD[Math.floor(r() * LOUD.length)]!,
        rx: r() * 6,
        ry: r() * 6,
        rz: (r() - 0.5) * 0.6,
        ph: r() * 6,
        spin: (r() - 0.5) * 0.8,
      });
    return { mesh: scatter(root, g, mat, items), items };
  });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  return {
    update(_dt, t) {
      for (const { mesh, items } of groups) {
        items.forEach((it, i) => {
          q.setFromEuler(e.set(it.rx ?? 0, (it.ry ?? 0) + t * it.spin, it.rz ?? 0));
          m.compose(v.set(it.x, it.y + Math.sin(t * 0.8 + it.ph) * 0.12, it.z), q, s.setScalar(it.s));
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/** Glitter specks that slowly grow and shrink (a twinkle every few seconds, never a strobe). */
export function glitter(kit: LocationKit, root: THREE.Object3D, box: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }, n: number, r: () => number): Fx {
  const mat = kit.mat('candyGlitter', { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.3 });
  const items: Floater[] = Array.from({ length: n }, () => ({
    x: box.x0 + r() * (box.x1 - box.x0),
    y: box.y0 + r() * (box.y1 - box.y0),
    z: box.z0 + r() * (box.z1 - box.z0),
    s: 1,
    color: r() < 0.4 ? 0xffffff : LOUD[Math.floor(r() * LOUD.length)]!,
    ph: r() * 6,
    spin: 0.6 + r() * 0.8,
  }));
  const mesh = scatter(root, new THREE.OctahedronGeometry(0.025, 0), mat, items);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  return {
    update(_dt, t) {
      items.forEach((it, i) => {
        const k = 0.6 + 0.6 * Math.max(0, Math.sin(t * it.spin + it.ph));
        q.setFromEuler(e.set(0, t * it.spin, 0.6));
        m.compose(v.set(it.x, it.y + Math.sin(t * 0.5 + it.ph) * 0.05, it.z), q, s.setScalar(k));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/** Confetti flakes lying on the floor (static). */
export function confetti(kit: LocationKit, root: THREE.Object3D, area: { x0: number; x1: number; z0: number; z1: number }, n: number, r: () => number, y = 0.004): void {
  const mat = kit.mat('candyConfetti', { color: 0xffffff, roughness: 0.6, toneMapped: false });
  const g = new THREE.PlaneGeometry(0.06, 0.03);
  g.rotateX(-Math.PI / 2);
  scatter(
    root,
    g,
    mat,
    Array.from({ length: n }, (_, i) => ({ x: area.x0 + r() * (area.x1 - area.x0), y: y + (i % 7) * 0.0004, z: area.z0 + r() * (area.z1 - area.z0), s: 0.7 + r() * 0.9, color: LOUD[i % LOUD.length]!, ry: r() * 6 })),
  );
}

/**
 * Glitch slices for the later phases: transparent planes of RGB-shifted bars in front of
 * the back wall, visible only in the 'glitch' state; they jump to a new place twice a second.
 */
export function glitchLayer(kit: LocationKit, root: THREE.Object3D, box: { x0: number; x1: number; y0: number; y1: number; z: number }, n: number, r: () => number): Fx {
  const mat = new THREE.MeshBasicMaterial({ map: glitchSlices(), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
  const planes: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6 + r() * 1.6, 0.2 + r() * 0.6), mat);
    p.renderOrder = 2;
    root.add(p);
    planes.push(p);
  }
  const place = () => {
    for (const p of planes) p.position.set(box.x0 + r() * (box.x1 - box.x0), box.y0 + r() * (box.y1 - box.y0), box.z + 0.03 + r() * 0.05);
  };
  place();
  let on = false;
  kit.onState((s) => {
    on = s === 'glitch';
    for (const p of planes) p.visible = on;
  });
  let next = 0;
  return {
    update(_dt, t) {
      if (!on || t < next) return;
      next = t + 0.5;
      place();
    },
  };
}
