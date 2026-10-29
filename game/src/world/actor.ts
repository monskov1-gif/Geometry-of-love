// A character inside a 3D location: the pixel sprite on a plane that stands on
// the floor, turns to the camera around the vertical axis (cylindrical
// billboard), is lit by the location's lamps (Lambert) and drops a soft contact
// shadow. Animation states: idle (breathing), walk (4-frame cycle, side view,
// mirrored for the other direction), turn, talk (mouth flaps) and emotion.
import * as THREE from 'three';
import { hdScale, spriteFrameHD, spriteSize, type Emotion } from '../render/sprites';

export type ActorFacing = 'front' | 'left' | 'right';

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
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private frameKey = '';
  private walkPhase = 0;
  private breathT = Math.random() * 3;
  private mouthT = 0;
  private turnT = 0;
  private target: { x: number; z: number; speed: number; resolve: () => void } | null = null;
  readonly height: number;
  emotion: Emotion = 'neutral';
  facing: ActorFacing = 'front';
  talking = false;
  /** Running instead of walking (faster cycle). */
  running = false;
  /** 0..1 erase/fade used by cutscenes (deaths). */
  fade = 1;

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
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.1, w * 0.45),
      new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false }),
    );
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
    this.target?.resolve();
    this.target = null;
    this.group.position.set(x, 0, z);
    this.facing = facing;
  }

  /** Walks (or runs) to a floor point; resolves on arrival. */
  moveTo(x: number, z: number, speed = 1.3): Promise<void> {
    this.target?.resolve();
    return new Promise((resolve) => {
      this.target = { x, z, speed, resolve };
    });
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
    if (this.talking) this.mouthT += dt;
    if (this.turnT > 0) this.turnT -= dt;
    // cylindrical billboard: face the camera around y only
    const cam = camera.position;
    this.plane.rotation.y = Math.atan2(cam.x - this.group.position.x, cam.z - this.group.position.z);
    this.plane.scale.x = this.facing === 'left' ? -1 : 1;
    this.material.opacity = this.fade;
    this.material.transparent = this.fade < 1;
    this.redraw();
  }

  private redraw(): void {
    const walking = this.target !== null;
    const side = walking || this.facing !== 'front' || this.turnT > 0;
    const frame = {
      facing: side ? ('side' as const) : ('front' as const),
      emotion: this.emotion,
      walk: walking ? Math.floor(this.walkPhase) % 4 : -1,
      breath: (Math.floor(this.breathT / 0.7) % 2) as 0 | 1,
      mouthOpen: this.talking && Math.floor(this.mouthT / 0.11) % 2 === 0,
    };
    const key = `${frame.facing}|${frame.emotion}|${frame.walk}|${frame.breath}|${frame.mouthOpen}`;
    if (key === this.frameKey) return;
    this.frameKey = key;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(spriteFrameHD(this.id, frame), 0, 0);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.target?.resolve();
    this.texture.dispose();
    this.material.dispose();
    this.plane.geometry.dispose();
  }
}
