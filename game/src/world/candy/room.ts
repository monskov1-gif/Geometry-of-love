// Shell of a candy interior (study room, corridor, archive): floor, back wall
// with windows and door holes, side walls running past the camera, ceiling,
// a rainbow skirting and a striped crown, and windows that look out on the
// painted candy sky. Built the kit's way (world-space UVs, batched).
import * as THREE from 'three';
import type { LocationKit } from '../kit/location-kit';
import type { CandyKit } from './candy-kit';
import { CANDY, RAINBOW } from './palette';
import { moodOf } from './states';
import { skyBackdrop } from './textures';

export interface RoomSpec {
  XL: number;
  XR: number;
  BACK: number;
  H: number;
  FRONT: number;
  wall: THREE.Material;
  side: THREE.Material;
  floor: THREE.Material;
  ceiling: THREE.Material;
  /** Window openings [x0, x1] at y 1.0…2.3. */
  windows?: [number, number][];
  /** Door openings [x0, x1] (from the floor up to `doorH`). */
  doors?: [number, number][];
  doorH?: number;
  frameColor?: number;
  floorTile?: number;
}

export function candyRoom(kit: LocationKit, ck: CandyKit, root: THREE.Object3D, s: RoomSpec): void {
  const { XL, XR, BACK, H, FRONT } = s;
  const doorH = s.doorH ?? 2.2;
  const holes = [...(s.windows ?? []).map(([x0, x1]) => ({ x0, x1, y0: 1.0, y1: 2.3 })), ...(s.doors ?? []).map(([x0, x1]) => ({ x0, x1, y0: 0, y1: doorH }))];
  kit.floorRect(XL, XR, BACK, FRONT, s.floor, { tile: s.floorTile ?? 1.0 });
  kit.wall(XL, XR, H, BACK, s.wall, holes, { tile: 1.0 });
  kit.sideWall(XL, BACK, FRONT, H, s.side, 1, { tile: 1.0 });
  kit.sideWall(XR, BACK, FRONT, H, s.side, -1, { tile: 1.0 });
  kit.ceilingPoly(
    [
      [XL, BACK],
      [XR, BACK],
      [XR, FRONT],
      [XL, FRONT],
    ],
    H,
    s.ceiling,
    { tile: 2.2 },
  );
  // rainbow skirting and a candy-stripe crown along the back wall, skipping door holes
  const spans: [number, number][] = [];
  let x = XL;
  for (const [x0, x1] of [...(s.doors ?? [])].sort((a, b) => a[0] - b[0])) {
    spans.push([x, x0]);
    x = x1;
  }
  spans.push([x, XR]);
  for (const [a, b] of spans) {
    if (b - a < 0.05) continue;
    ck.gloss.add(new THREE.BoxGeometry(b - a, 0.16, 0.04, Math.max(1, Math.round((b - a) * 5)), 1, 1), (px) => RAINBOW[Math.floor((px + 50) * 2.5) % RAINBOW.length]!, (a + b) / 2, 0.08, BACK + 0.02, { perFace: true });
  }
  ck.gloss.add(new THREE.BoxGeometry(XR - XL, 0.12, 0.06, Math.round((XR - XL) * 6), 1, 1), (px) => (Math.floor((px + 50) * 3) % 2 ? CANDY.pink : CANDY.paper), (XL + XR) / 2, H - 0.06, BACK + 0.03, { perFace: true });
  for (const sx of [XL, XR]) {
    const dir = sx === XL ? 1 : -1;
    ck.gloss.add(new THREE.BoxGeometry(0.04, 0.16, FRONT - BACK, 1, 1, Math.round((FRONT - BACK) * 5)), (_x, _y, pz) => RAINBOW[Math.floor((pz + 50) * 2.5) % RAINBOW.length]!, sx + dir * 0.02, 0.08, (BACK + FRONT) / 2, { perFace: true });
  }
  // windows onto the candy sky
  const frame = s.frameColor ?? CANDY.pink;
  for (const [x0, x1] of s.windows ?? []) {
    kit.withT((x0 + x1) / 2, BACK, 0, () => kit.windowUnit(x1 - x0, 1.0, 2.3, { kind: 'double', muntins: [2, 1], frameColor: frame }));
    const skyMat = new THREE.MeshBasicMaterial({ map: skyBackdrop('day'), toneMapped: false, fog: false });
    const view = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), skyMat);
    view.position.set((x0 + x1) / 2, 1.9, BACK - 1.6);
    root.add(view);
    kit.onState((st) => {
      skyMat.map = skyBackdrop(moodOf(st));
      skyMat.needsUpdate = true;
    });
    // flower box under the window
    ck.gloss.add(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.16, 0.2), CANDY.grass, (x0 + x1) / 2, 0.92, BACK + 0.12);
    for (let i = 0; i < 6; i++) {
      const fx = x0 + 0.1 + (i / 5) * (x1 - x0 - 0.2);
      ck.gloss.add(new THREE.SphereGeometry(0.06, 10, 8), RAINBOW[(i * 2) % RAINBOW.length]!, fx, 1.08 + (i % 2) * 0.05, BACK + 0.14);
    }
  }
}
