// «Из монитора внезапно появляется рука» (синопсис, гл. 3). Melody's arm — the
// navy blazer sleeve and white shirt cuff of her sprites, a pale hand with
// jointed fingers — first presses the CRT glass from inside (the picture bulges
// like a membrane, fingertips showing through), then breaks out with a ripple,
// reaches for the viewer (or an actor), closes its fingers and pulls back into
// the screen. The glass is a displaced copy of the screen picture laid over the
// tube; the arm is a tube rebuilt every frame along a curve from inside the
// monitor to the wrist.
import * as THREE from 'three';
import type { World3D } from './world';

const SKIN = 0xf4d8cf;
const NAIL = 0xf2b8c0;
const SLEEVE = 0x2c3470;
const CUFF = 0xf4f0f8;

/** Everything that animates. */
interface Pose {
  /** 0 = wrist at the glass, 1 = at the target. */
  reach: number;
  /** The hand pushing the glass from inside (0…1). */
  press: number;
  /** Fingers: 0 open, 1 closed fist. */
  curl: number;
  /** Fingers spread apart (0…1). */
  spread: number;
  /** Hand pitch: 0 flat (palm down), 1 palm toward the target, fingers up. */
  pitch: number;
  /** The glass stretched around the wrist after it broke through (0…1). */
  collar: number;
}

const FINGERS = [
  { x: -0.027, len: 0.074, r: 0.0088 },
  { x: -0.009, len: 0.082, r: 0.009 },
  { x: 0.009, len: 0.077, r: 0.0086 },
  { x: 0.026, len: 0.061, r: 0.0076 },
];
const PHALANX = [0.45, 0.31, 0.24];
const CURL = [1.25, 1.35, 0.9];

interface Finger {
  joints: THREE.Group[];
  spreadSign: number;
}

/** A pale right hand in its own frame: fingers along +Z, palm facing -Y, thumb on -X. */
function buildHand(skin: THREE.Material, nail: THREE.Material): { group: THREE.Group; fingers: Finger[]; thumb: THREE.Group[] } {
  const group = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), skin);
  palm.scale.set(0.041, 0.016, 0.05);
  palm.position.set(0, 0, 0.045);
  const heel = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
  heel.scale.set(0.032, 0.017, 0.03);
  heel.position.set(-0.004, -0.002, 0.012);
  group.add(palm, heel);
  const fingers: Finger[] = FINGERS.map((f, i) => {
    const joints: THREE.Group[] = [];
    let parent: THREE.Object3D = group;
    let z = 0.088 - Math.abs(f.x) * 0.25;
    PHALANX.forEach((part, k) => {
      const len = f.len * part;
      const j = new THREE.Group();
      j.position.set(k === 0 ? f.x : 0, k === 0 ? 0.002 : 0, z);
      const bone = new THREE.Mesh(new THREE.CapsuleGeometry(f.r * (1 - k * 0.08), len, 3, 8), skin);
      bone.rotation.x = Math.PI / 2;
      bone.position.z = len / 2;
      j.add(bone);
      if (k === 2) {
        const n = new THREE.Mesh(new THREE.BoxGeometry(f.r * 1.3, 0.002, len * 0.7), nail);
        n.position.set(0, f.r * 0.85, len * 0.55);
        j.add(n);
      }
      parent.add(j);
      joints.push(j);
      parent = j;
      z = len;
    });
    return { joints, spreadSign: i - 1.5 };
  });
  // thumb: two segments from the side of the palm
  const thumb: THREE.Group[] = [];
  let parent: THREE.Object3D = group;
  [
    { len: 0.036, r: 0.0105, at: new THREE.Vector3(-0.036, -0.006, 0.026) },
    { len: 0.03, r: 0.0098, at: new THREE.Vector3(0, 0, 0.036) },
  ].forEach((s, k) => {
    const j = new THREE.Group();
    j.position.copy(s.at);
    const bone = new THREE.Mesh(new THREE.CapsuleGeometry(s.r, s.len, 3, 8), skin);
    bone.rotation.x = Math.PI / 2;
    bone.position.z = s.len / 2;
    j.add(bone);
    if (k === 1) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(s.r * 1.3, 0.002, s.len * 0.6), nail);
      n.position.set(0, s.r * 0.85, s.len * 0.6);
      j.add(n);
    }
    parent.add(j);
    thumb.push(j);
    parent = j;
  });
  return { group, fingers, thumb };
}

/** The tube's glass as a soft membrane: same picture, same curvature, then displaced. */
class Membrane {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.PlaneGeometry;
  private readonly uv0: Float32Array;
  constructor(
    private readonly corners: THREE.Vector3[],
    private readonly normal: THREE.Vector3,
    texture: THREE.Texture,
  ) {
    this.geo = new THREE.PlaneGeometry(1, 1, 36, 28);
    this.uv0 = Float32Array.from(this.geo.attributes.uv!.array as Float32Array);
    const mat = new THREE.MeshPhongMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: texture, specular: 0x9a8aa0, shininess: 70, toneMapped: false });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /**
   * `bump(u, v)` returns the outward displacement (metres) at a point of the
   * screen (u →, v ↓, 0…1). Also bends the picture like a lens over the bulge.
   */
  shape(bump: (u: number, v: number) => number): void {
    const [tl, tr, , bl] = this.corners as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
    const ex = new THREE.Vector3().subVectors(tr, tl);
    const ey = new THREE.Vector3().subVectors(bl, tl);
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    const uv = this.geo.attributes.uv as THREE.BufferAttribute;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const u = this.uv0[i * 2]!;
      const v = 1 - this.uv0[i * 2 + 1]!;
      const cu = u * 2 - 1;
      const cv = v * 2 - 1;
      // the tube's own curvature (props.ts crtGlass), measured from the corner plane
      const glass = -0.008 + 0.018 * (1 - cu * cu) * (1 - cv * cv) + 0.003;
      const d = bump(u, v);
      p.copy(tl).addScaledVector(ex, u).addScaledVector(ey, v).addScaledVector(this.normal, glass + d);
      pos.setXYZ(i, p.x, p.y, p.z);
      // lens: the picture swells with the bulge
      const k = Math.min(0.35, d * 4);
      uv.setXY(i, 0.5 + (u - 0.5) * (1 - k * 0.6), 1 - (0.55 + (v - 0.55) * (1 - k * 0.6)));
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  dispose(): void {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class MonitorHand {
  private readonly group = new THREE.Group();
  private readonly arm: THREE.Mesh;
  private readonly cuff: THREE.Mesh;
  private readonly wrist: THREE.Mesh;
  private readonly hand: ReturnType<typeof buildHand>;
  private readonly membrane: Membrane | null;
  private readonly glow: THREE.PointLight;
  private readonly materials: THREE.Material[];
  private readonly origin: THREE.Vector3;
  private readonly normal: THREE.Vector3;
  private readonly screenW: number;
  private readonly screenH: number;
  private pose: Pose = { reach: 0, press: 0, curl: 0.35, spread: 0, pitch: 0, collar: 0 };
  private anim: { from: Pose; to: Pose; t: number; dur: number; resolve: () => void } | null = null;
  private tip = new THREE.Vector3();
  private target = new THREE.Vector3();
  /** What the hand reaches for: a point, an actor, or the camera (first person). */
  private aim: { kind: 'point' } | { kind: 'actor'; id: string } | { kind: 'camera' } = { kind: 'point' };
  private carry: string | null = null;
  private broke = -1;
  private t = 0;

  constructor(private readonly world: World3D) {
    const screen = world.current?.screen;
    if (!screen) throw new Error('[hand] this location has no screen');
    const c = screen.corners;
    this.normal = new THREE.Vector3().subVectors(c[1]!, c[0]!).cross(new THREE.Vector3().subVectors(c[3]!, c[0]!)).normalize();
    if (this.normal.z < 0) this.normal.negate();
    this.screenW = c[0]!.distanceTo(c[1]!);
    this.screenH = c[0]!.distanceTo(c[3]!);
    // the arm leaves the glass a little below its centre
    this.origin = new THREE.Vector3()
      .copy(c[0]!)
      .addScaledVector(new THREE.Vector3().subVectors(c[1]!, c[0]!), 0.5)
      .addScaledVector(new THREE.Vector3().subVectors(c[3]!, c[0]!), 0.55);
    const skin = new THREE.MeshLambertMaterial({ color: SKIN, emissive: 0x3a2a2c });
    const nail = new THREE.MeshLambertMaterial({ color: NAIL, emissive: 0x2a1418 });
    const sleeve = new THREE.MeshLambertMaterial({ color: SLEEVE, emissive: 0x0c0e1e });
    const cuff = new THREE.MeshLambertMaterial({ color: CUFF, emissive: 0x302c34 });
    this.materials = [skin, nail, sleeve, cuff];
    this.arm = new THREE.Mesh(new THREE.BufferGeometry(), sleeve);
    this.cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, 0.03, 14, 1, true), cuff);
    this.wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.05, 12), skin);
    this.hand = buildHand(skin, nail);
    this.membrane = new Membrane(c, this.normal, screen.app.texture);
    // the screen's glow on the palm: without it the hand would be a silhouette against the tube
    this.glow = new THREE.PointLight(0xffd6ee, 0.9, 0.7, 1.5);
    this.group.add(this.arm, this.cuff, this.wrist, this.hand.group, this.glow);
    this.group.visible = false;
    world.sceneRoot.add(this.group, this.membrane.mesh);
    this.target.copy(this.origin).addScaledVector(this.normal, 0.3);
  }

  /** press → emerge → reach (target: 'camera' or an actor) → grab → pull → hide. Resolves when the move ends. */
  act(action: string, dur: number, target?: string): Promise<void> {
    if (target === 'camera') this.aim = { kind: 'camera' };
    else if (target) this.aim = { kind: 'actor', id: target };
    switch (action) {
      case 'press':
        this.membrane!.mesh.visible = true;
        return this.tween({ press: 1, curl: 0.15, spread: 0.6, pitch: 0.9 }, dur);
      case 'emerge':
        this.membrane!.mesh.visible = true;
        this.group.visible = true;
        this.broke = this.t;
        this.pose.reach = 0;
        return this.tween({ press: 0, collar: 1, reach: 0.28, curl: 0.3, spread: 0.2, pitch: 0.2 }, dur);
      case 'reach':
        return this.tween({ reach: 1, curl: 0.05, spread: 1, pitch: 1, collar: 0.8 }, dur);
      case 'grab':
        if (this.aim.kind === 'actor') this.carry = this.aim.id;
        return this.tween({ curl: 1, spread: 0.1, pitch: 0.7 }, dur);
      case 'pull':
        // holding the camera, the hand stays in front of the lens while the camera follows it in
        return this.aim.kind === 'camera' ? this.tween({ collar: 1 }, dur) : this.tween({ reach: 0 }, dur);
      case 'hide':
        this.group.visible = false;
        if (this.membrane) this.membrane.mesh.visible = false;
        this.carry = null;
        this.anim?.resolve();
        this.anim = null;
        return Promise.resolve();
      default:
        return Promise.reject(new Error(`[hand] unknown action "${action}"`));
    }
  }

  private tween(to: Partial<Pose>, dur: number): Promise<void> {
    this.anim?.resolve();
    this.anim = null;
    const target = { ...this.pose, ...to };
    return new Promise((resolve) => {
      if (dur <= 0) {
        this.pose = target;
        this.rebuild();
        resolve();
        return;
      }
      this.anim = { from: { ...this.pose }, to: target, t: 0, dur, resolve };
    });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      for (const key of Object.keys(a.to) as (keyof Pose)[]) this.pose[key] = a.from[key] + (a.to[key] - a.from[key]) * e;
      if (k >= 1) {
        this.anim = null;
        a.resolve();
      }
    }
    if (this.group.visible || this.membrane?.mesh.visible) this.rebuild();
  }

  private aimPoint(): THREE.Vector3 {
    if (this.aim.kind === 'camera') {
      const cam = this.world.camera;
      const fwd = new THREE.Vector3();
      cam.getWorldDirection(fwd);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      this.target.copy(cam.position).addScaledVector(fwd, 0.24).addScaledVector(up, -0.075);
    } else if (this.aim.kind === 'actor') {
      const a = this.world.actor(this.aim.id);
      if (a && !this.carry) this.target.set(a.position.x + 0.12, a.height * 0.5, a.position.z + 0.05);
    }
    return this.target;
  }

  private rebuild(): void {
    const P = this.pose;
    this.shapeGlass();
    if (!this.group.visible) return;
    const aim = this.aimPoint();
    // the wrist: from behind the glass (hidden by it), out, then along the way to the target
    const exit = this.origin.clone().addScaledVector(this.normal, -0.14);
    const reach = Math.max(0, P.reach);
    this.tip.lerpVectors(exit, aim, reach);
    // the arm bows a little and wavers: it is not quite a human arm
    const mid = new THREE.Vector3().lerpVectors(this.origin, this.tip, 0.55);
    mid.y += 0.06 * reach + Math.sin(this.t * 6) * 0.012 * reach;
    mid.x += Math.sin(this.t * 4.3) * 0.015 * reach;
    const inside = this.origin.clone().addScaledVector(this.normal, -0.25);
    const depth = this.tip.clone().sub(this.origin).dot(this.normal);
    const curve = new THREE.CatmullRomCurve3(
      depth < 0.08
        ? [inside, this.tip] // still (mostly) behind the glass: straight out along the tube
        : [inside, this.origin.clone().addScaledVector(this.normal, -0.05), this.origin.clone().addScaledVector(this.normal, 0.02), mid, this.tip],
    );
    this.arm.geometry.dispose();
    this.arm.geometry = new THREE.TubeGeometry(curve, 48, 0.037, 12, false);
    const dir = curve.getTangent(1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const along = (obj: THREE.Object3D, at: THREE.Vector3) => {
      obj.position.copy(at);
      obj.quaternion.setFromUnitVectors(up, dir);
    };
    along(this.cuff, this.tip.clone().addScaledVector(dir, 0.012));
    along(this.wrist, this.tip.clone().addScaledVector(dir, 0.035));
    // the hand: +Z along the arm, then pitched so the palm turns to what it wants
    const h = this.hand.group;
    h.position.copy(this.tip).addScaledVector(dir, 0.055);
    h.up.set(0, 1, 0);
    h.lookAt(h.position.clone().add(dir));
    h.rotateX(-0.95 * P.pitch);
    h.rotateZ(0.25 * P.pitch);
    // the light sits between the hand and whatever it reaches for
    this.glow.position.copy(h.position).addScaledVector(dir, 0.16).add(new THREE.Vector3(0, 0.05, 0));
    this.glow.intensity = 0.9 * Math.min(1, reach * 2);
    for (const f of this.hand.fingers) {
      f.joints.forEach((j, k) => {
        j.rotation.x = CURL[k]! * P.curl + (k === 0 ? 0.08 : 0.05) + Math.sin(this.t * 3 + f.spreadSign + k) * 0.03;
        if (k === 0) j.rotation.y = f.spreadSign * 0.11 * P.spread;
      });
    }
    const [t1, t2] = this.hand.thumb as [THREE.Group, THREE.Group];
    t1.rotation.set(0.25 + P.curl * 0.55, -0.75 + P.curl * 0.75 - P.spread * 0.2, 0);
    t2.rotation.set(0.2 + P.curl * 0.7, 0, 0);
    // a held actor is dragged along with the hand
    if (this.carry && this.anim && this.anim.to.reach < this.anim.from.reach) {
      const a = this.world.actor(this.carry);
      if (a) {
        a.position.x = this.tip.x - 0.12;
        a.position.z = this.tip.z - 0.05;
        a.group.scale.setScalar(Math.max(0.02, reach));
        a.position.y = Math.max(0, this.tip.y - a.height * 0.5 * reach);
      }
    }
  }

  /** The glass: a hand-shaped bulge while it presses, then a collar and rings once it is through. */
  private shapeGlass(): void {
    const m = this.membrane;
    if (!m?.mesh.visible) return;
    const P = this.pose;
    const W = this.screenW;
    const H = this.screenH;
    const age = this.broke < 0 ? -1 : this.t - this.broke;
    const g = (dx: number, dy: number, sx: number, sy: number) => Math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2));
    m.shape((u, v) => {
      const dx = (u - 0.5) * W;
      const dy = (v - 0.55) * H; // + is down
      let d = 0;
      if (P.press > 0) {
        const p = P.press;
        // palm, then four fingertips above it, the thumb to the side
        d += p * 0.05 * g(dx, dy, 0.06, 0.055);
        FINGERS.forEach((f, i) => (d += p * 0.022 * g(dx - f.x * 1.3, dy + 0.07 + (i === 1 || i === 2 ? 0.008 : 0), 0.011, 0.02)));
        d += p * 0.018 * g(dx + 0.06, dy + 0.005, 0.014, 0.014);
        d += Math.sin(this.t * 9) * 0.002 * p;
      }
      if (P.collar > 0) {
        const r = Math.hypot(dx, dy);
        d += P.collar * 0.03 * g(r, 0, 0.055, 1);
        if (age >= 0) d += 0.012 * Math.exp(-age * 1.4) * Math.sin(r * 95 - age * 16) * Math.exp(-r * 5);
      }
      return Math.max(-0.01, d);
    });
  }

  dispose(): void {
    this.anim?.resolve();
    this.world.sceneRoot.remove(this.group);
    if (this.membrane) {
      this.world.sceneRoot.remove(this.membrane.mesh);
      this.membrane.dispose();
    }
    this.arm.geometry.dispose();
    this.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    for (const m of this.materials) m.dispose();
  }
}
