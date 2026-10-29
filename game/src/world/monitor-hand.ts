// «Из монитора внезапно появляется рука» (синопсис, гл. 3). Melody's arm in its
// navy sleeve pushes out through the CRT glass, stretches impossibly long across
// the room, closes on Dameo's wrist and pulls back into the screen. The arm is a
// tube rebuilt every frame along a curve from the screen to the hand.
import * as THREE from 'three';
import type { World3D } from './world';

const SKIN = 0xf6d2c2;
const SLEEVE = 0x2c3470;
const CUFF = 0xf4f0f8;

function handMesh(): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: SKIN, emissive: 0x3a2a26 });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), skin);
  palm.scale.set(1, 0.55, 1.2);
  g.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.05 + (i === 1 || i === 2 ? 0.012 : 0), 4, 8), skin);
    f.rotation.x = Math.PI / 2 - 0.35; // curled forward, ready to grab
    f.position.set(-0.03 + i * 0.02, -0.008, 0.07);
    g.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), skin);
  thumb.rotation.set(Math.PI / 2, 0, 0.9);
  thumb.position.set(0.05, -0.01, 0.02);
  g.add(thumb);
  return g;
}

export class MonitorHand {
  private readonly group = new THREE.Group();
  private readonly arm: THREE.Mesh;
  private readonly cuff: THREE.Mesh;
  private readonly hand = handMesh();
  private readonly origin: THREE.Vector3;
  private readonly normal: THREE.Vector3;
  /** 0 = inside the screen; 1 = at the target. */
  private reach = 0;
  private tip = new THREE.Vector3();
  private target = new THREE.Vector3();
  private carry: string | null = null;
  private anim: { from: number; to: number; t: number; dur: number; resolve: () => void } | null = null;
  private t = 0;

  constructor(private readonly world: World3D) {
    const screen = world.current?.screen;
    if (!screen) throw new Error('[hand] this location has no screen');
    const c = screen.corners;
    this.origin = c.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(0.25);
    this.normal = new THREE.Vector3().subVectors(c[1]!, c[0]!).cross(new THREE.Vector3().subVectors(c[3]!, c[0]!)).normalize();
    if (this.normal.z < 0) this.normal.negate();
    this.arm = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: SLEEVE, emissive: 0x0c0e1e }));
    this.cuff = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 6, 16), new THREE.MeshLambertMaterial({ color: CUFF, emissive: 0x302c34 }));
    this.group.add(this.arm, this.cuff, this.hand);
    this.group.visible = false;
    world.sceneRoot.add(this.group);
    this.target.copy(this.origin).addScaledVector(this.normal, 0.5);
  }

  /** emerge → reach (target actor) → grab → pull → hide. Resolves when the move ends. */
  act(action: string, dur: number, targetActor?: string): Promise<void> {
    if (targetActor) {
      const a = this.world.actor(targetActor);
      if (a) this.target.set(a.position.x + 0.12, a.height * 0.5, a.position.z + 0.05);
    }
    switch (action) {
      case 'emerge':
        this.group.visible = true;
        this.target.copy(this.origin).addScaledVector(this.normal, 0.35);
        return this.tween(0, 1, dur);
      case 'reach':
        return this.tween(0.35, 1, dur);
      case 'grab':
        this.carry = targetActor ?? null;
        return this.tween(1, 1, dur);
      case 'pull':
        return this.tween(1, 0, dur);
      case 'hide':
        this.group.visible = false;
        this.carry = null;
        return Promise.resolve();
      default:
        return Promise.reject(new Error(`[hand] unknown action "${action}"`));
    }
  }

  private tween(from: number, to: number, dur: number): Promise<void> {
    this.anim?.resolve();
    return new Promise((resolve) => {
      if (dur <= 0) {
        this.reach = to;
        this.rebuild();
        resolve();
        return;
      }
      this.anim = { from, to, t: 0, dur, resolve };
    });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.anim) {
      this.anim.t += dt;
      const k = Math.min(1, this.anim.t / this.anim.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      this.reach = this.anim.from + (this.anim.to - this.anim.from) * e;
      if (k >= 1) {
        const r = this.anim.resolve;
        this.anim = null;
        r();
      }
    }
    if (this.group.visible) this.rebuild();
  }

  private rebuild(): void {
    const r = this.reach;
    this.tip.lerpVectors(this.origin, this.target, r);
    // the arm bows upward and wavers: it is not a human arm
    const mid = new THREE.Vector3().lerpVectors(this.origin, this.tip, 0.5);
    mid.y += 0.25 * r + Math.sin(this.t * 7) * 0.02 * r;
    mid.x += Math.sin(this.t * 5) * 0.03 * r;
    const start = this.origin.clone().addScaledVector(this.normal, -0.05);
    const curve = new THREE.CatmullRomCurve3([start, this.origin.clone().addScaledVector(this.normal, 0.02), mid, this.tip]);
    this.arm.geometry.dispose();
    this.arm.geometry = new THREE.TubeGeometry(curve, 40, 0.028, 10, false);
    const tangent = curve.getTangent(1);
    this.hand.position.copy(this.tip).addScaledVector(tangent, 0.03);
    this.hand.lookAt(this.hand.position.clone().add(tangent));
    this.cuff.position.copy(this.tip);
    this.cuff.lookAt(this.tip.clone().add(tangent));
    // a held actor is dragged along with the hand
    if (this.carry && this.anim && this.anim.to < this.anim.from) {
      const a = this.world.actor(this.carry);
      if (a) {
        a.position.x = this.tip.x - 0.12;
        a.position.z = this.tip.z - 0.05;
        a.group.scale.setScalar(Math.max(0.02, r));
        a.position.y = Math.max(0, this.tip.y - a.height * 0.5 * r);
      }
    }
  }

  dispose(): void {
    this.anim?.resolve();
    this.world.sceneRoot.remove(this.group);
    this.arm.geometry.dispose();
  }
}
