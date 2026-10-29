// Melody in the last chase (синопсис, гл. 14: «тело искажается, руки
// вытягиваются, голова поворачивается независимо от туловища»; the author's
// video references and sprite sheet: a huge figure crawling after him, seen
// from the side). The figure is the author's sprite sheet
// (render/sprites/monster-sheet.ts) on a plane the size of a house: she rises
// through the three big poses, then crawls with the five-frame cycle; her head
// snaps to odd angles, slices of her glitch.
import * as THREE from 'three';
import { CRAWL_FRAMES, drawMonster, loadMonsterSheet, MONSTER_H, MONSTER_W, type MonsterPose } from '../render/sprites/monster-sheet';

const HEIGHT = 5.2; // metres from the floor to the top of the sprite canvas

export class MelodyMonster {
  readonly group = new THREE.Group();
  private readonly plane: THREE.Mesh;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private phase = 0;
  private tilt = 0;
  private tiltTarget = 0;
  private snap = 1.5;
  private frameKey = '';
  /** Where her front (hand and face) is along the run, world x. */
  x = -10;
  /** 0..1: how far she has risen out of the floor (the transformation). */
  rise = 1;
  /** How often slices of her jump sideways. */
  glitch = 0.4;
  /** While rising she goes through the big poses; once up she crawls. */
  crawling = true;
  readonly scale: number;

  constructor(
    private readonly root: THREE.Object3D,
    { scale = 1 } = {},
  ) {
    this.scale = scale;
    const canvas = document.createElement('canvas');
    canvas.width = MONSTER_W;
    canvas.height = MONSTER_H;
    this.ctx = canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    const h = HEIGHT * scale;
    const w = h * (MONSTER_W / MONSTER_H);
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(-w / 2 + w * 0.06, h / 2, 0); // her clawing hand reaches just past x
    this.plane = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ map: this.texture, emissiveMap: this.texture, emissive: 0x5a4a52, alphaTest: 0.5, side: THREE.DoubleSide }),
    );
    this.group.add(this.plane);
    root.add(this.group);
    void loadMonsterSheet()
      .then(() => {
        this.frameKey = '';
        this.redraw();
      })
      .catch((e: unknown) => console.error('[monster] sprite sheet unavailable', e)); // loadImage has told the player
    this.redraw();
  }

  update(dt: number, speed: number): void {
    // one crawl cycle per ~2.4 m travelled; standing still she still shifts her weight
    this.phase += dt * Math.max(0.7, speed / 2.4) * CRAWL_FRAMES.length;
    this.snap -= dt;
    if (this.snap <= 0) {
      this.snap = 1.2 + Math.random() * 2.2;
      this.tiltTarget = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.3) : (Math.random() - 0.5) * 0.12;
    }
    // the head does not ease: it snaps, like a joint that should not turn that way
    this.tilt += (this.tiltTarget - this.tilt) * Math.min(1, dt * 18);
    const glitching = Math.random() < this.glitch * 0.08;
    this.group.position.set(this.x + (glitching ? (Math.random() - 0.5) * 0.4 : 0), -(1 - this.rise) * HEIGHT * this.scale * 0.9, -0.6);
    this.redraw();
  }

  private pose(): MonsterPose {
    if (!this.crawling) return this.rise < 0.45 ? 'rise' : this.rise < 0.85 ? 'lunge' : 'reach';
    return CRAWL_FRAMES[Math.floor(this.phase) % CRAWL_FRAMES.length]!;
  }

  private redraw(): void {
    const pose = this.pose();
    const key = `${pose}|${Math.round(this.tilt * 20)}`;
    if (key === this.frameKey) return;
    this.ctx.clearRect(0, 0, MONSTER_W, MONSTER_H);
    if (!drawMonster(this.ctx, pose, this.tilt)) return; // still loading: try again next frame
    this.frameKey = key;
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.root.remove(this.group);
    this.plane.geometry.dispose();
    (this.plane.material as THREE.Material).dispose();
    this.texture.dispose();
  }
}
