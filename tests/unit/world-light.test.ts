// Light must be a function of (location, state) only: re-sending a background,
// switching states back and forth or changing who stands on stage must never
// add light. (Chapter 9: the corridor brightened step by step to near-white.)
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { installCanvasStub } from './canvas-stub';
import type { LocationDef3D, LocationBuild } from '../../game/src/world/types';
import { DEFAULT_LOOK } from '../../game/src/world/types';

let locations3D: Record<string, LocationDef3D>;
let LookLayers: typeof import('../../game/src/world/kit/window-light').LookLayers;
let lightSubject: typeof import('../../game/src/world/world').lightSubject;

beforeAll(async () => {
  installCanvasStub();
  // three's examples (bloom) and the world module touch `window`/`document` on import
  (globalThis as Record<string, unknown>).window ??= globalThis;
  ({ locations3D } = await import('../../game/src/world/locations'));
  ({ LookLayers } = await import('../../game/src/world/kit/window-light'));
  ({ lightSubject } = await import('../../game/src/world/world'));
});

/** Everything the light of a place consists of, as plain numbers. */
function lightPrint(root: THREE.Object3D, build: LocationBuild): string {
  const out: string[] = [];
  const mats = new Set<THREE.Material>();
  root.traverse((o) => {
    const l = o as THREE.Light;
    if (l.isLight) out.push(`L ${l.type} ${l.intensity.toFixed(4)} ${l.color.getHexString()} ${l.visible}`);
    const m = (o as THREE.Mesh).material;
    if (m) for (const x of Array.isArray(m) ? m : [m]) mats.add(x);
    if ((o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite) out.push(`V ${o.visible} ${o.scale.x.toFixed(4)}`);
  });
  for (const m of mats) {
    const s = m as THREE.MeshStandardMaterial;
    out.push(`M ${s.opacity.toFixed(4)} ${s.emissiveIntensity?.toFixed(4) ?? '-'} ${s.color?.getHexString() ?? '-'} ${s.map?.uuid ?? '-'}`);
  }
  out.push(`B ${build.kit.background} F ${build.kit.fog ? `${build.kit.fog.near}-${build.kit.fog.far}` : 'none'}`);
  return out.join('\n');
}

describe('location light is a function of the state only', () => {
  it('switching states back and forth N times leaves every light, material and pool as it was', () => {
    for (const def of Object.values(locations3D)) {
      const root = new THREE.Group();
      const build = def.build(root, { low: false });
      const first: Record<string, string> = {};
      for (const s of def.states) {
        build.kit.setState(s);
        first[s] = lightPrint(root, build);
      }
      for (let n = 0; n < 6; n++)
        for (const s of [...def.states, ...[...def.states].reverse()]) {
          build.kit.setState(s);
          build.kit.setState(s); // the story re-sends the same background
          build.setVariant?.(null);
        }
      for (const s of def.states) {
        build.kit.setState(s);
        expect(lightPrint(root, build), `${def.id} / ${s}`).toBe(first[s]);
      }
    }
  }, 120_000);

  it('exposure layers do not accumulate', () => {
    const gl = { toneMappingExposure: DEFAULT_LOOK.exposure } as unknown as THREE.WebGLRenderer;
    const bloomPass = { strength: DEFAULT_LOOK.bloom };
    const look = new LookLayers(gl, { bloomPass });
    look.apply();
    const base = [gl.toneMappingExposure, bloomPass.strength];
    for (let i = 0; i < 20; i++) {
      look.setLayer('windowLight', { exposure: 0.3, bloom: 0.4 });
      look.apply();
      look.clearLayer('windowLight');
      look.apply();
    }
    expect([gl.toneMappingExposure, bloomPass.strength]).toEqual(base);
  });

  it('in dialogue the window light follows nobody (the cast does not change the exposure)', () => {
    expect(lightSubject(null).player).toBeNull();
    const p = new THREE.Vector3(1, 0, 0);
    expect(lightSubject({ position: p }).player?.position).toBe(p);
  });

  it('candy rooms keep their pastel walls under the bloom threshold', () => {
    for (const id of ['study-room', 'corridor', 'archive', 'sandbox', 'sandbox-dim', 'exit-level']) {
      const def = locations3D[id];
      expect(def, id).toBeDefined();
      const build = def!.build(new THREE.Group(), { low: false });
      expect(build.look?.threshold ?? DEFAULT_LOOK.threshold, id).toBeGreaterThanOrEqual(0.95);
    }
  }, 60_000);
});
