// Staging on the 3D stage: two characters never share a spot, and short figures
// (the erasers, the calculator, the compass) stand whole above the dialogue band.
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { installCanvasStub } from './canvas-stub';

let world: typeof import('../../game/src/world/world');

beforeAll(async () => {
  installCanvasStub();
  (globalThis as Record<string, unknown>).window ??= globalThis;
  world = await import('../../game/src/world/world');
});

describe('spreadMarks', () => {
  const walk = { minX: -5, maxX: 5 };
  it('moves a newcomer off a taken spot, alternating sides, inside the walk range', () => {
    const p = world.spreadMarks([{ x: 0, z: -0.6 }, { x: 0, z: -0.6 }, { x: 0.1, z: -0.6 }], walk);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) expect(Math.hypot(p[i]!.x - p[j]!.x, p[i]!.z - p[j]!.z)).toBeGreaterThanOrEqual(0.5);
    expect(p[0]).toEqual({ x: 0, z: -0.6 });
    expect(p[1]!.x).toBeCloseTo(0.6);
    const edge = world.spreadMarks([{ x: 5, z: 0 }, { x: 5, z: 0 }], walk);
    expect(edge[1]!.x).toBeGreaterThanOrEqual(-5);
    expect(edge[1]!.x).toBeLessThanOrEqual(5);
    expect(Math.abs(edge[1]!.x - 5)).toBeGreaterThanOrEqual(0.5);
  });
  it('keeps marks apart already as they are, and lets shared scenes share', () => {
    expect(world.spreadMarks([{ x: -1.7, z: -0.6 }, { x: 1.7, z: -0.6 }], walk)).toEqual([{ x: -1.7, z: -0.6 }, { x: 1.7, z: -0.6 }]);
    expect(world.spreadMarks([{ x: 0, z: 0 }, { x: 0, z: 0 }], walk, true)).toEqual([{ x: 0, z: 0 }, { x: 0, z: 0 }]);
  });
});

describe('castShot', () => {
  const ndcY = (shot: import('../../game/src/world/types').Shot, p: THREE.Vector3) => {
    const cam = new THREE.PerspectiveCamera(shot.fov ?? 40, 16 / 9, 0.05, 80);
    cam.position.set(...shot.pos);
    cam.lookAt(new THREE.Vector3(...shot.look));
    cam.updateMatrixWorld();
    return p.clone().project(cam).y;
  };
  it('puts short figures whole above the dialogue band and the tallest head in frame', () => {
    for (const [tallest, spread] of [
      [1.05, 3.4],
      [1.74, 3.4],
      [1.6, 1.7],
      [1.3, 0],
    ] as const) {
      const shot = world.castShot({ x: 0, z: -0.6, spread, tallest, shortest: 1.05 }, 5.2);
      // the band covers the bottom ~27% of the stage: NDC below -0.46
      expect(ndcY(shot, new THREE.Vector3(0, 0, -0.6)), `feet ${tallest}`).toBeGreaterThan(-0.46);
      expect(ndcY(shot, new THREE.Vector3(0, tallest, -0.6)), `head ${tallest}`).toBeLessThan(1);
    }
  });
});
