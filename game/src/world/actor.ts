// A character inside a 3D location: the pixel sprite on a plane that stands on
// the floor, turns to the camera around the vertical axis (cylindrical
// billboard), is lit by the location's lamps (Lambert) and drops a soft contact
// shadow. Animation states: idle (breathing), walk (4-frame cycle, side view,
// mirrored for the other direction), turn, talk (mouth flaps) and emotion.
import * as THREE from 'three';
import { hdScale, spriteFrameHD, spriteSize, type Emotion } from '../render/sprites';
import { drawErasure, erasureKey, noErasure, type Erasure } from './erasure';

export type ActorFacing = 'front' | 'left' | 'right' | 'back';

/** Body height in metres for each sprite id (the sprite canvas is 24×48 for everyone). */
const HEIGHTS: Record<string, number> = {
  dameo: 1.74,
  melody: 1.6,
  satsuki: 1.62,
  calculator: 1.25,
  ruler: 1.7,
  compass: 1.3,
  'eraser-1': 1.05,
  'eraser-2': 1.05,
  'eraser-3': 1.05,
};

let shadowTex: THREE.Texture | null = null;
function contactShadow(): THREE.Texture {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

export class Actor {
  readonly group = new THREE.Group();
  private readonly plane: THREE.Mesh;
  private readonly material: THREE.MeshLambertMaterial;
  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private frameKey = '';
  private walkPhase = 0;
  private breathT = Math.random() * 3;
  private mouthT = 0;
  private turnT = 0;
  private target: { x: number; z: number; speed: number; resolve: () => void } | null = null;
  private readonly clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  readonly height: number;
  emotion: Emotion = 'neutral';
  facing: ActorFacing = 'front';
  talking = false;
  /** Running instead of walking (faster cycle). */
  running = false;
  /** 0..1 erase/fade used by cutscenes (deaths). */
  fade = 1;
  /** What the eraser has already taken from the figure (ch09); kept between scenes of the same stage. */
  readonly erasure: Erasure = noErasure();
  /** 0…1 the figure is warped (her anger, ch08): jerks, skews and stretches every frame. */
  warp = 0;
  private warpT = 0;

  constructor(readonly id: string) {
    this.height = HEIGHTS[id] ?? 1.6;
    this.canvas = document.createElement('canvas');
    const size = spriteSize(id);
    this.canvas.width = size.w * hdScale(id);
    this.canvas.height = size.h * hdScale(id);
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    // A little self-light keeps faces readable in dark rooms; the scene's lamps still tint them.
    this.material = new THREE.MeshLambertMaterial({
      map: this.texture,
      emissiveMap: this.texture,
      emissive: 0x3a3a3a,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    const w = this.height * (size.w / size.h);
    const geo = new THREE.PlaneGeometry(w, this.height);
    geo.translate(0, this.height / 2, 0);
    this.plane = new THREE.Mesh(geo, this.material);
    this.shadowMaterial = new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, w * 0.45), this.shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.006;
    shadow.renderOrder = 1;
    this.group.add(shadow, this.plane);
    this.redraw();
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  place(x: number, z: number, facing: ActorFacing = 'front'): void {
    this.driven = null;
    this.target?.resolve();
    this.target = null;
    this.group.position.set(x, 0, z);
    this.facing = facing;
  }

  /** Mini-games drive the figure directly: position (y = height above the floor), run cycle, crouch. */
  drive(x: number, y: number, z: number, running: boolean, crouching: boolean, dt: number): void {
    this.target?.resolve();
    this.target = null;
    this.group.position.set(x, y, z);
    this.facing = 'right';
    this.driven = { running, crouching };
    if (running && y === 0) this.walkPhase += dt * 11;
  }

  private driven: { running: boolean; crouching: boolean } | null = null;

  /** Walks (or runs) to a floor point; resolves on arrival. */
  moveTo(x: number, z: number, speed = 1.3): Promise<void> {
    this.target?.resolve();
    return new Promise((resolve) => {
      this.target = { x, z, speed, resolve };
    });
  }

  /** Where the actor is going (or stands): framing uses the destination, not the walk. */
  get targetX(): number {
    return this.target?.x ?? this.group.position.x;
  }

  get targetZ(): number {
    return this.target?.z ?? this.group.position.z;
  }

  get moving(): boolean {
    return this.target !== null;
  }

  turn(facing: ActorFacing): void {
    if (facing === this.facing) return;
    this.facing = facing;
    this.turnT = 0.12; // one in-between frame
  }

  update(dt: number, camera: THREE.Camera): void {
    this.breathT += dt;
    if (this.target) {
      const p = this.group.position;
      const dx = this.target.x - p.x;
      const dz = this.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      const step = this.target.speed * (this.running ? 2.2 : 1) * dt;
      if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 'right' : 'left';
      if (dist <= step) {
        p.set(this.target.x, 0, this.target.z);
        const done = this.target.resolve;
        this.target = null;
        done();
      } else {
        p.x += (dx / dist) * step;
        p.z += (dz / dist) * step;
        this.walkPhase += dt * (this.running ? 11 : 7);
      }
    }
    if (this.anim) {
      this.anim.t += dt;
      const k = Math.min(1, this.anim.t / this.anim.dur);
      this.anim.apply(k);
      if (k >= 1) {
        const r = this.anim.resolve;
        this.anim = null;
        r();
      }
    }
    if (this.talking) this.mouthT += dt;
    if (this.turnT > 0) this.turnT -= dt;
    // cylindrical billboard: face the camera around y only
    const cam = camera.position;
    this.plane.rotation.y = Math.atan2(cam.x - this.group.position.x, cam.z - this.group.position.z);
    this.plane.scale.x = this.facing === 'left' ? -1 : 1;
    this.applyWarp(dt);
    this.material.opacity = this.fade;
    if (this.material.transparent !== this.fade < 1) {
      this.material.transparent = this.fade < 1;
      this.material.needsUpdate = true;
    }
    // the shadow goes with the body: an erased figure leaves no trace on the floor
    this.shadowMaterial.opacity = Math.min(this.fade, 1 - this.eraseCut);
    // erasing: clip the figure from the feet up with a plane in world space
    if (this.eraseCut > 0) {
      this.clip.constant = -(this.group.position.y + this.eraseCut * this.height * 1.02);
      this.material.clippingPlanes = [this.clip];
    } else if (this.material.clippingPlanes?.length) this.material.clippingPlanes = [];
    this.redraw();
  }

  private redraw(): void {
    const walking = this.target !== null || !!this.driven?.running;
    const side = walking || this.facing === 'left' || this.facing === 'right' || this.turnT > 0;
    const frame = {
      facing: side ? ('side' as const) : this.facing === 'back' ? ('back' as const) : ('front' as const),
      emotion: this.emotion,
      walk: walking ? Math.floor(this.walkPhase) % 4 : -1,
      breath: (Math.floor(this.breathT / 0.7) % 2) as 0 | 1,
      mouthOpen: this.talking && Math.floor(this.mouthT / 0.11) % 2 === 0,
      ...(this.driven?.crouching ? { pose: 'crouch' as const } : {}),
    };
    // in the air: the passing frame (legs tucked)
    if (this.driven && this.group.position.y > 0.05) frame.walk = 1;
    const erased = erasureKey(this.erasure);
    const key = `${frame.facing}|${frame.emotion}|${frame.walk}|${frame.breath}|${frame.mouthOpen}|${frame.pose ?? ''}|${erased}|${this.talking}`;
    if (key === this.frameKey) return;
    this.frameKey = key;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(spriteFrameHD(this.id, frame), 0, 0);
    if (erased !== '0.0.0') drawErasure(this.ctx, this.canvas.width / spriteSize(this.id).w, this.id, frame, this.erasure, frame.mouthOpen);
    this.texture.needsUpdate = true;
  }

  /** Body effects for cutscenes; resolves when done. `to` = where a shrinking body is pulled. */
  effect(fx: import('./director').ActorEffect, dur: number, to?: { x: number; z: number }): Promise<void> {
    const start = { x: this.group.position.x, z: this.group.position.z, y: this.group.position.y, s: this.group.scale.y };
    const done = (apply: (k: number) => void) =>
      new Promise<void>((resolve) => {
        if (dur <= 0) {
          apply(1);
          resolve();
          return;
        }
        this.anim = { t: 0, dur, apply, resolve };
      });
    switch (fx) {
      case 'shrink':
        return done((k) => {
          const e = k * k;
          this.group.scale.setScalar(Math.max(0.001, 1 - e * 0.98));
          if (to) {
            this.group.position.x = start.x + (to.x - start.x) * e;
            this.group.position.z = start.z + (to.z - start.z) * e;
          }
          this.group.position.y = start.y + e * 0.9;
        });
      case 'grow':
        return done((k) => this.group.scale.setScalar(Math.max(0.001, k)));
      case 'appear':
        return done((k) => (this.fade = k));
      case 'dissolve':
        return done((k) => (this.fade = 1 - k));
      case 'erase':
        // erased from the feet up: the figure is cut by a rising line
        return done((k) => (this.eraseCut = k));
      case 'tremble':
        return done((k) => (this.group.position.x = start.x + (k < 1 ? Math.sin(k * 80) * 0.02 : 0)));
      case 'fall':
        return done((k) => {
          this.group.position.y = start.y - k * k * 6;
          this.plane.rotation.z = k * 1.2;
        });
      case 'stretch':
        return done((k) => (this.group.scale.y = start.s * (1 + Math.sin(k * Math.PI) * 0.6)));
      case 'erase-details':
      case 'erase-face':
      case 'erase-limbs': {
        const part = fx === 'erase-details' ? 'details' : fx === 'erase-face' ? 'face' : 'limbs';
        const from = this.erasure[part];
        // a stroke: quick at first, then the last of it goes
        return done((k) => (this.erasure[part] = from + (1 - from) * Math.sqrt(k)));
      }
      case 'warp': {
        // rises fast, holds, and leaves the figure as it was
        const from = this.warp;
        return done((k) => (this.warp = k < 1 ? Math.max(from, Math.min(1, k * 4), Math.sin(k * Math.PI)) : 0));
      }
    }
  }

  /** Her body jerks out of shape: random skews, a stretched neck, a twitching width. Back to normal at warp 0. */
  private applyWarp(dt: number): void {
    if (this.warp <= 0) {
      if (this.warpT) {
        this.warpT = 0;
        this.plane.rotation.z = 0;
        this.plane.scale.y = 1;
        this.plane.position.x = 0;
      }
      return;
    }
    this.warpT += dt;
    const w = this.warp;
    // stepped, not smooth: the figure snaps between wrong shapes
    const step = Math.floor(this.warpT * 14);
    const r = (n: number) => {
      const x = Math.sin(step * 12.9898 + n * 78.233) * 43758.5453;
      return x - Math.floor(x) - 0.5;
    };
    this.plane.rotation.z = r(1) * 0.22 * w;
    this.plane.scale.y = 1 + (0.18 + r(2) * 0.3) * w;
    this.plane.scale.x *= 1 + r(3) * 0.35 * w;
    this.plane.position.x = r(4) * 0.12 * w;
  }

  private anim: { t: number; dur: number; apply: (k: number) => void; resolve: () => void } | null = null;
  /** 0..1 how much of the figure is erased from the bottom (cutscene «Стирание»). */
  eraseCut = 0;

  dispose(): void {
    this.target?.resolve();
    this.texture.dispose();
    this.material.dispose();
    this.shadowMaterial.dispose();
    this.plane.geometry.dispose();
  }
}
