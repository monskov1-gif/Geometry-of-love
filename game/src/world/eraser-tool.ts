// «И достаёт из-за спины инструмент стирания. Он похож на школьный ластик —
// большой, белый, новый, с ещё острыми краями» (гл. 9). A plain white block
// with sharp edges that Melody holds and moves across the victim: one short
// stroke per stage of the erasure, then a scrub over what is left. A prop of
// the Cutscene Director (ui/cutscene-host.ts); the figure's own losses are the
// actor's erase effects, played in parallel.
import * as THREE from 'three';
import type { Actor } from './actor';
import type { World3D } from './world';

type Region = 'details' | 'face' | 'limbs';

/** Height of each region over the floor, as a share of the figure's height. Erasers are short and stand low in their sprite. */
const REGION: Record<'eraser' | 'person', Record<Region, number>> = {
  eraser: { details: 0.25, face: 0.31, limbs: 0.06 },
  person: { details: 0.55, face: 0.83, limbs: 0.25 },
};

interface Move {
  t: number;
  dur: number;
  at: (k: number) => THREE.Vector3;
  resolve: () => void;
}

export class EraserTool {
  private readonly mesh: THREE.Mesh;
  private holder: string | null = null;
  private victim: string | null = null;
  private move: Move | null = null;
  private readonly last = new THREE.Vector3();

  constructor(private readonly world: World3D) {
    const geo = new THREE.BoxGeometry(0.12, 0.045, 0.065);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf7f6f2, emissive: 0x4a4a48 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.visible = false;
    world.sceneRoot.add(this.mesh);
  }

  private actor(id: string | null): Actor {
    const a = id ? this.world.actor(id) : undefined;
    if (!a) throw new Error(`[eraser] no actor "${id}" on stage`);
    return a;
  }

  /** In the holder's hand, on the side of the victim. */
  private hand(): THREE.Vector3 {
    const h = this.actor(this.holder);
    const v = this.victim ? this.world.actor(this.victim) : undefined;
    const dir = v && v.position.x < h.position.x ? -1 : 1;
    return new THREE.Vector3(h.position.x + dir * 0.26, h.height * 0.5, h.position.z + 0.18);
  }

  /** A point on the victim's body: `y` share of the height, `x` across the body (−1…1). */
  private body(region: Region | number, x: number): THREE.Vector3 {
    const v = this.actor(this.victim);
    const kind = v.id.startsWith('eraser') ? 'eraser' : 'person';
    const share = typeof region === 'number' ? region : REGION[kind][region];
    const half = kind === 'eraser' ? 0.16 : 0.22;
    return new THREE.Vector3(v.position.x + x * half, v.height * share, v.position.z + 0.14);
  }

  /**
   * draw (target "holder:victim") → stroke-details / stroke-face / stroke-limbs →
   * scrub → back → hide. Resolves when the move ends.
   */
  act(action: string, dur: number, target?: string): Promise<void> {
    switch (action) {
      case 'draw': {
        const [holder, victim] = (target ?? '').split(':');
        this.holder = holder || null;
        this.victim = victim || null;
        const hand = this.hand();
        this.mesh.visible = true;
        return this.go(dur, (k) => hand.clone().setY(hand.y - (1 - k) * 0.25));
      }
      case 'stroke-details':
      case 'stroke-face':
      case 'stroke-limbs': {
        const region = action.slice('stroke-'.length) as Region;
        const from = this.last.clone();
        const a = this.body(region, 1.2);
        const b = this.body(region, -1.2);
        // approach, one short, neat stroke across, and hold beside the body
        return this.go(dur, (k) => {
          if (k < 0.3) return from.clone().lerp(a, ease(k / 0.3));
          if (k < 0.8) return a.clone().lerp(b, ease((k - 0.3) / 0.5));
          return b.clone().lerp(this.body(region, -1.5), (k - 0.8) / 0.2);
        });
      }
      case 'scrub': {
        const from = this.last.clone();
        const top = this.body(this.actor(this.victim).id.startsWith('eraser') ? 0.38 : 0.95, 0);
        const bottom = this.body(0.02, 0);
        return this.go(dur, (k) => {
          if (k < 0.15) return from.clone().lerp(bottom, k / 0.15);
          // short strokes back and forth, working up the body
          const u = (k - 0.15) / 0.85;
          const p = bottom.clone().lerp(top, u);
          p.x += Math.sin(u * Math.PI * 14) * 0.15;
          return p;
        });
      }
      case 'back': {
        const from = this.last.clone();
        return this.go(dur, (k) => from.clone().lerp(this.hand(), ease(k)));
      }
      case 'hide':
        this.move?.resolve();
        this.move = null;
        this.mesh.visible = false;
        return Promise.resolve();
      default:
        throw new Error(`[eraser] unknown action "${action}"`);
    }
  }

  private go(dur: number, at: (k: number) => THREE.Vector3): Promise<void> {
    this.move?.resolve();
    if (dur <= 0) {
      this.place(at(1), 0);
      this.move = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.move = { t: 0, dur, at, resolve };
    });
  }

  private place(p: THREE.Vector3, dt: number): void {
    // tilt with the stroke, like a hand rubbing
    const vx = dt > 0 ? (p.x - this.last.x) / dt : 0;
    this.mesh.rotation.z = Math.max(-0.5, Math.min(0.5, -vx * 0.25));
    this.mesh.position.copy(p);
    this.last.copy(p);
  }

  update(dt: number): void {
    const m = this.move;
    if (!m) return;
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    this.place(m.at(k), dt);
    if (k >= 1) {
      this.move = null;
      m.resolve();
    }
  }

  dispose(): void {
    this.move?.resolve();
    this.world.sceneRoot.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
