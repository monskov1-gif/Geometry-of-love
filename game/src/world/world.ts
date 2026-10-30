// The 3D stage: one WebGL renderer for the whole game, the current location,
// its characters (Actor billboards) and the camera. Renders at a low internal
// resolution and scales up with nearest filtering, so geometry, lamps and the
// pixel sprites read as one pixel-art picture. Bloom + the kit's window-light
// response (exposure, lens flares) run on top, except in low mode.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LookLayers, WindowLight } from './kit/window-light';
import { Actor, type ActorFacing } from './actor';
import { locations3D } from './locations';
import type { LocationBuild, Shot, Vec3 } from './types';
import type { Emotion } from '../render/sprites';

export interface CastMember {
  id: string;
  emotion: Emotion;
  /** Stage position (left/center/right) or a named mark of the location. */
  mark: string;
  fx?: string | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface CameraMove {
  from: Shot;
  to: Shot;
  t: number;
  dur: number;
  resolve: () => void;
}

/** Is this a software rasteriser (headless tests, very old machines)? */
function isSoftwareGL(gl: THREE.WebGLRenderer): boolean {
  const ctx = gl.getContext();
  const ext = ctx.getExtension('WEBGL_debug_renderer_info');
  const name = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  return /swiftshader|llvmpipe|software/i.test(name);
}

export class World3D {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private readonly gl: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 80);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private look: LookLayers;
  private windowLight: WindowLight;
  readonly low: boolean;
  private group: THREE.Group | null = null;
  private build: LocationBuild | null = null;
  private locationId: string | null = null;
  private variant: string | null = null;
  private readonly actors = new Map<string, Actor>();
  private shot: Shot = { pos: [0, 1.5, 5], look: [0, 1.2, -1], fov: 40 };
  /** The shot as asked for (before fitting), refitted when the view changes shape. */
  private shotDef: Shot | null = null;
  private readonly frameListeners = new Set<() => void>();
  private move: CameraMove | null = null;
  /** Camera follows the speaker slightly (auto-direction for dialogue). */
  private speaker: string | null = null;
  /** A named shot chosen by the story; null = the camera frames whoever is on stage. */
  private storyShot: string | null = null;
  private autoFrame = true;
  private frame = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private readonly resizeObserver: ResizeObserver;
  /** Something the renderer must follow (the player in interactive episodes). */
  follow: Actor | null = null;
  reduceMotion = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'world-canvas';
    this.root = document.createElement('div');
    this.root.className = 'world-view';
    this.root.append(this.canvas);
    this.gl = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.gl.localClippingEnabled = true; // actors being erased are clipped by a plane
    // ?low=1 / ?low=0 force the mode (screenshots, debugging); otherwise software GL → low.
    const forced = new URLSearchParams(location.search).get('low');
    this.low = forced === null ? isSoftwareGL(this.gl) : forced === '1';
    if (!this.low) {
      this.composer = new EffectComposer(this.gl);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.8);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.look = new LookLayers(this.gl, { bloomPass: this.bloom });
    this.windowLight = new WindowLight({ renderer: this.look, canvas: this.canvas, low: this.low });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onVisibility = () => (document.hidden ? this.stop() : this.start());

  has(id: string | null): boolean {
    return !!id && id in locations3D;
  }

  get current(): LocationBuild | null {
    return this.build;
  }

  /** Shows a location (building it if needed) in a light state; same location → only state/variant change. */
  show(id: string, state: string | null, variant: string | null): void {
    const def = locations3D[id];
    if (!def) throw new Error(`[world] no 3D location "${id}"`);
    if (this.locationId !== id) {
      this.disposeLocation();
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.build = def.build(this.group, { low: this.low });
      this.locationId = id;
      this.variant = null;
      for (const a of this.actors.values()) this.scene.remove(a.group);
      this.actors.clear();
      this.storyShot = null;
      this.setShot('wide', 0);
    }
    const s = state && def.states.includes(state) ? state : def.defaultState;
    if (this.build!.kit.state !== s || !this.scene.background) {
      this.build!.kit.setState(s);
      this.scene.background = new THREE.Color(this.build!.kit.background);
      this.scene.fog = this.build!.kit.fog ?? null;
    }
    if (variant !== this.variant) {
      this.variant = variant;
      this.build!.setVariant?.(variant);
    }
    this.start();
  }

  private disposeLocation(): void {
    if (!this.group) return;
    this.build?.dispose?.();
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
    // Materials and canvas textures are cached by the kit across locations; geometry is per build.
    this.updaters.clear();
    this.group = null;
    this.build = null;
    this.locationId = null;
  }

  /** Places, adds and removes characters to match the story stage. */
  setCast(cast: CastMember[]): void {
    const b = this.build;
    if (!b) return;
    const keep = new Set(cast.map((c) => c.id));
    for (const [id, a] of this.actors) {
      if (!keep.has(id)) {
        this.scene.remove(a.group);
        a.dispose();
        this.actors.delete(id);
      }
    }
    for (const c of cast) {
      const mark = b.marks[c.mark] ?? b.marks.center;
      let a = this.actors.get(c.id);
      if (!a) {
        a = new Actor(c.id);
        a.place(mark.x, mark.z, mark.facing ?? 'front');
        this.actors.set(c.id, a);
        this.scene.add(a.group);
      } else if (!a.moving && (Math.abs(a.position.x - mark.x) > 0.05 || Math.abs(a.position.z - mark.z) > 0.05)) {
        // a change of stage position is a walk, not a teleport
        void a.moveTo(mark.x, mark.z).then(() => a!.turn(mark.facing ?? 'front'));
      }
      a.emotion = c.emotion;
    }
    this.frameCast();
  }

  /** The app on the desk monitor (locations with a screen). */
  setScreen(state: Partial<import('./app-screen').AppScreenState>): void {
    this.build?.screen?.app.set(state);
  }

  /** The story's camera: a named shot, or null for automatic framing of the cast. */
  setStoryShot(name: string | null): void {
    if (name === this.storyShot) return;
    this.storyShot = name;
    if (name) void this.setShot(name, 1.1);
    else this.frameCast(1.1);
  }

  /**
   * Automatic director: frames everyone on stage from in front, a little above
   * eye level, close enough for a VN medium shot; an empty stage gets the wide shot.
   */
  private frameCast(duration = 1.2): void {
    const b = this.build;
    if (!b || this.storyShot) return;
    const people = [...this.actors.values()];
    if (!people.length) {
      void this.setShot('wide', duration);
      return;
    }
    const xs = people.map((a) => a.targetX);
    const zs = people.map((a) => a.targetZ);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = zs.reduce((a, z) => a + z, 0) / zs.length;
    const spread = Math.max(...xs) - Math.min(...xs);
    const wide = b.shots.wide;
    const dist = Math.min(wide.pos[2] - cz, Math.max(2.3, 2.0 + spread * 0.9));
    const x = Math.max(b.walk.minX, Math.min(b.walk.maxX, cx));
    const height = Math.max(...people.map((a) => a.height));
    void this.setShot({ pos: [x, height * 0.86, cz + dist], look: [x, height * 0.7, cz - 1.2], fov: 46 }, duration);
  }

  actor(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  get locationName(): string | null {
    return this.locationId;
  }

  get currentVariant(): string | null {
    return this.variant;
  }

  /** Removes an actor added by spawn() (or by the stage). */
  despawn(id: string): void {
    const a = this.actors.get(id);
    if (!a) return;
    this.scene.remove(a.group);
    a.dispose();
    this.actors.delete(id);
  }

  private readonly updaters = new Set<(dt: number) => void>();

  /** Per-frame callback for a story prop; returns its removal. Cleared on location change. */
  addUpdater(fn: (dt: number) => void): () => void {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  /** The scene root, for story props (the hand from the monitor) added by the director. */
  get sceneRoot(): THREE.Scene {
    return this.scene;
  }

  /** Adds an actor that is not part of the story stage (episodes, cutscenes). */
  spawn(id: string, x: number, z: number, facing: ActorFacing = 'front'): Actor {
    let a = this.actors.get(id);
    if (!a) {
      a = new Actor(id);
      this.actors.set(id, a);
      this.scene.add(a.group);
    }
    a.place(x, z, facing);
    return a;
  }

  setSpeaker(id: string | null): void {
    this.speaker = id;
    for (const [aid, a] of this.actors) a.talking = aid === id;
  }

  /** Jumps or glides to a named shot of the location (or an explicit one). */
  setShot(shot: string | Shot, duration = 0.9): Promise<void> {
    const def = typeof shot === 'string' ? this.build?.shots[shot] ?? this.build?.shots.wide : shot;
    if (!def) return Promise.resolve();
    this.shotDef = def;
    const to = this.fitted(def);
    // Asking for the shot we are already in (or gliding to) changes nothing.
    const key = JSON.stringify(to);
    if (key === JSON.stringify(this.move?.to ?? this.shot)) return Promise.resolve();
    this.move?.resolve();
    if (duration <= 0 || this.reduceMotion) {
      this.shot = to;
      this.move = null;
      this.applyCamera(this.shot);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.move = { from: this.currentShot(), to, t: 0, dur: duration, resolve };
    });
  }

  /** Resolves a shot's `fit` box into a camera distance for the current aspect. */
  private fitted(s: Shot): Shot {
    if (!s.fit) return s;
    const look = new THREE.Vector3(...s.look);
    const dir = new THREE.Vector3(...s.pos).sub(look);
    if (dir.lengthSq() < 1e-8) return s;
    dir.normalize();
    const t = Math.tan(THREE.MathUtils.degToRad((s.fov ?? 40) / 2));
    const fy = Math.min(0.9, Math.max(0.1, s.frameY ?? 0.5));
    // visible height needed: the box fits above and below its centre, and across
    const height = Math.max(s.fit[1] / (2 * Math.min(fy, 1 - fy)), s.fit[0] / Math.max(0.1, this.camera.aspect));
    const p = look.clone().addScaledVector(dir, height / 2 / t);
    // aim below the box centre so the centre lands at frameY
    const aim = look.clone();
    aim.y -= (0.5 - fy) * height;
    return { ...s, pos: [p.x, p.y, p.z], look: [aim.x, aim.y, aim.z] };
  }

  /** Called after every rendered frame (overlays that follow something in the scene). */
  onFrame(fn: () => void): () => void {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  /**
   * Where the location's computer screen is on the view, in CSS pixels of
   * `root` (bounding box of its four corners), or null if there is none or it
   * is behind the camera.
   */
  screenRect(): { x: number; y: number; w: number; h: number } | null {
    const corners = this.build?.screen?.corners;
    if (!corners) return null;
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const c of corners) {
      const p = c.clone().project(this.camera);
      if (p.z > 1) return null;
      const x = ((p.x + 1) / 2) * w;
      const y = ((1 - p.y) / 2) * h;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** Lets the camera drift toward whoever speaks; cutscenes turn this off. */
  setAutoFrame(on: boolean): void {
    this.autoFrame = on;
  }

  private currentShot(): Shot {
    const p = this.camera.position;
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    const look = p.clone().add(d.multiplyScalar(5));
    return { pos: [p.x, p.y, p.z], look: [look.x, look.y, look.z], fov: this.camera.fov };
  }

  private applyCamera(s: Shot, extra: Vec3 = [0, 0, 0]): void {
    this.camera.position.set(s.pos[0] + extra[0], s.pos[1] + extra[1], s.pos[2] + extra[2]);
    this.camera.lookAt(s.look[0] + extra[0] * 0.8, s.look[1], s.look[2]);
    if (s.fov && this.camera.fov !== s.fov) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    // Software rasterisers (and weak devices) get 15 fps: the main thread stays responsive.
    const minFrame = this.low ? 1000 / 15 : 0;
    const tick = (now: number) => {
      if (!this.running) return;
      if (now - this.last >= minFrame) {
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        this.tick(dt);
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  /** One frame; public so tests and cutscenes can step deterministically. */
  tick(dt: number): void {
    const b = this.build;
    if (!b) return;
    this.time += dt;
    b.kit.update(dt);
    b.update?.(dt, this.time);
    let base = this.shot;
    if (this.move) {
      const m = this.move;
      m.t += dt;
      const k = ease(Math.min(1, m.t / m.dur));
      base = {
        pos: [lerp(m.from.pos[0], m.to.pos[0], k), lerp(m.from.pos[1], m.to.pos[1], k), lerp(m.from.pos[2], m.to.pos[2], k)],
        look: [lerp(m.from.look[0], m.to.look[0], k), lerp(m.from.look[1], m.to.look[1], k), lerp(m.from.look[2], m.to.look[2], k)],
        fov: lerp(m.from.fov ?? 40, m.to.fov ?? 40, k),
      };
      if (m.t >= m.dur) {
        this.shot = m.to;
        this.move = null;
        m.resolve();
      }
    }
    // Auto-direction: lean a little toward the speaker; follow the player in episodes.
    let ox = 0;
    const target = this.follow ?? (this.autoFrame && this.speaker ? this.actors.get(this.speaker) : undefined);
    if (target && !this.move) ox = (target.position.x - base.look[0]) * (this.follow ? 1 : 0.18);
    this.panX = lerp(this.panX, ox, Math.min(1, dt * (this.follow ? 4 : 1.6)));
    const still = this.reduceMotion || (!this.move && this.shot.still) || (this.move && this.move.to.still);
    const sway: Vec3 = still ? [0, 0, 0] : [Math.sin(this.time * 0.31) * 0.025, Math.sin(this.time * 0.23) * 0.015, 0];
    this.applyCamera(base, [this.panX + sway[0], sway[1], sway[2]]);
    for (const u of this.updaters) u(dt);
    for (const a of this.actors.values()) a.update(dt, this.camera);
    const player = this.follow ?? this.actors.get('dameo') ?? null;
    this.windowLight.update(dt, { world: b.kit, player: player ? { position: player.position } : null, camera: this.camera });
    this.look.apply();
    if (this.composer) this.composer.render(dt);
    else this.gl.render(this.scene, this.camera);
    for (const fn of this.frameListeners) fn();
  }

  private panX = 0;

  /** Internal resolution: about 360 lines (each scene pixel 2–4 screen pixels). */
  private resize(): void {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h) return;
    const px = Math.max(this.low ? 3 : 2, Math.round(h / (this.low ? 240 : 360)));
    const rw = Math.max(1, Math.round(w / px));
    const rh = Math.max(1, Math.round(h / px));
    this.gl.setPixelRatio(1);
    this.gl.setSize(rw, rh, false);
    this.composer?.setSize(rw, rh);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // a fitted shot keeps its subject in frame when the view changes shape
    if (this.shotDef?.fit) {
      const to = this.fitted(this.shotDef);
      if (this.move) this.move.to = to;
      else this.shot = to;
    }
  }

  /** Renders one frame to a data URL (save thumbnails). */
  snapshot(width = 192): string {
    this.tick(0);
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round((width * this.canvas.height) / Math.max(1, this.canvas.width));
    c.getContext('2d')!.drawImage(this.canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  destroy(): void {
    this.stop();
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const a of this.actors.values()) a.dispose();
    this.actors.clear();
    this.disposeLocation();
    this.composer?.dispose();
    this.gl.dispose();
  }
}
