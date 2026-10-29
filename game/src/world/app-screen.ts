// What the old CRT on Dameo's desk shows. «Мелоди но Махо» is a 2004 program, so
// it is drawn the way such software looked: 320×240, pastel panels, a dotted
// pattern, chunky title bars, and Melody's portrait (her real sprite sheets)
// scaled down into the window. Scanlines and a slight vignette are part of the
// picture, so the screen reads as a tube monitor up close.
import * as THREE from 'three';
import { characters, type SheetPose } from '../content/characters';
import { loadImage } from '../platform/assets';
import { NoticeColumn } from './app-notices';

export const APP_W = 320;
export const APP_H = 240;

export interface AppScreenState {
  /** 'desktop' | 'off' | 'splash' | 'lesson' | 'quiz' | … (app-* background ids without the prefix). */
  view: string;
  /** Melody's current portrait pose, if she is "on screen". */
  melody: string | null;
  /** 0 calm … 1 broken: colour drift, tearing, red tint. */
  unease: number;
  /** Small caption in the app's title bar. */
  title?: string;
  /** The story's view over the app ('desktop' = program closed, 'close-dialog'); null = `view`. */
  cover?: string | null;
  /** Melody's pop-up notifications, oldest first. */
  notices?: readonly string[];
  /** Reduced motion: no slides, blinks or flicker. */
  calm?: boolean;
}

/** Seconds Melody takes to flicker out of the picture ('vanish'). */
export const VANISH_TIME = 1.6;

const PINK = '#ffc9f6';
const PINK_DOT = '#ffe6fb';
const HOT = '#ff6cc5';
const INK = '#30243b';
const MINT = '#b2f5e4';
const LAV = '#deccff';
const LEMON = '#f8feb4';
const PAPER = '#fff9fd';

export class AppScreen {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private state: AppScreenState = { view: 'desktop', melody: null, unease: 0 };
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly notices = new NoticeColumn();
  private snowCanvas: HTMLCanvasElement | undefined;
  /** Screen time of the last draw, and when the shown view last changed. */
  private now = 0;
  private since = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = APP_W;
    this.canvas.height = APP_H;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    const melody = characters.melody;
    for (const pose of Object.values(melody?.poses ?? {}))
      if (pose.kind === 'sheet')
        loadImage(pose.src)
          .then((img) => {
            this.images.set(pose.src, img);
            this.draw(this.now);
          })
          .catch(() => {}); // loadImage already reports the failure to the player and the console
  }

  set(state: Partial<AppScreenState>): void {
    const before = this.shown;
    this.state = { ...this.state, ...state };
    if (this.shown !== before) this.since = this.now;
    if (state.notices) this.notices.set(state.notices, !!this.state.calm);
    this.draw(this.now);
  }

  /** The view actually on the screen: the story's cover wins over the app page. */
  get shown(): string {
    return this.state.cover ?? this.state.view;
  }

  /** Frames per second the room should redraw the screen at. */
  get fps(): number {
    return this.notices.animating || this.shown === 'vanish' || this.shown === 'static' ? 12 : 8;
  }

  get current(): Readonly<AppScreenState> {
    return this.state;
  }

  draw(t: number): void {
    this.now = t;
    const c = this.ctx;
    const view = this.shown;
    if (view === 'off' || view === 'void') {
      c.fillStyle = view === 'off' ? '#060708' : '#0c0610';
      c.fillRect(0, 0, APP_W, APP_H);
    } else if (view === 'desktop') {
      if (this.state.cover === 'desktop') this.closedDesktop();
      else this.desktop(t);
    } else if (view === 'stare') this.stare(t);
    else if (view === 'vanish') this.vanish(t);
    else if (view === 'static') this.snow();
    else {
      this.app(t);
      if (view === 'close-dialog') this.closeDialog(t);
    }
    if (view !== 'off') this.notices.draw({ ctx: c, icon: (x, y, size) => this.icon(x, y, size) }, t, !!this.state.calm);
    this.glass(t);
  }

  /** Melody's portrait, whole frame, proportions kept, fitted into a square. */
  private icon(x: number, y: number, size: number): void {
    const pose = characters.melody?.poses['cheerful'];
    if (!pose || pose.kind !== 'sheet') return;
    const img = this.images.get(pose.src);
    if (!img) return;
    const f = (pose as SheetPose).frame;
    const k = size / Math.max(f.w, f.h);
    const w = Math.round(f.w * k);
    const h = Math.round(f.h * k);
    const c = this.ctx;
    c.imageSmoothingEnabled = true; // averaging a 1200px portrait down to a few pixels
    c.drawImage(img, f.x, f.y, f.w, f.h, x + Math.floor((size - w) / 2), y + (size - h), w, h);
    c.imageSmoothingEnabled = false;
  }

  /** The program is closed: a plain desktop with her shortcut among the icons. */
  private closedDesktop(): void {
    const c = this.ctx;
    c.fillStyle = '#2a6a6a';
    c.fillRect(0, 0, APP_W, APP_H);
    c.font = '8px Tiny5, monospace';
    c.textBaseline = 'middle';
    const icons: [string, string][] = [
      ['Мой компьютер', '#d8dce4'],
      ['Корзина', '#9aa0a8'],
      ['Документы', '#e8c040'],
      ['Мелоди', ''],
    ];
    icons.forEach(([label, color], i) => {
      const y = 10 + i * 40;
      if (color) {
        c.fillStyle = color;
        c.fillRect(16, y, 20, 18);
        c.fillStyle = '#1a3a3a';
        c.fillRect(16, y + 18, 20, 2);
      } else {
        c.fillStyle = PINK;
        c.fillRect(14, y - 2, 24, 24);
        this.icon(15, y - 1, 22);
        // the shortcut arrow
        c.fillStyle = '#ffffff';
        c.fillRect(14, y + 15, 7, 7);
        c.fillStyle = '#1a1a1a';
        c.fillRect(16, y + 17, 3, 1);
        c.fillRect(18, y + 17, 1, 3);
      }
      c.fillStyle = '#ffffff';
      const w = c.measureText(label).width;
      c.fillText(label, Math.round(26 - w / 2), y + 28);
    });
    c.fillStyle = '#c8c4bc';
    c.fillRect(0, APP_H - 16, APP_W, 16);
    c.fillStyle = '#3a8a3a';
    c.fillRect(2, APP_H - 14, 34, 12);
    c.fillStyle = '#ffffff';
    c.fillText('Пуск', 6, APP_H - 8);
    c.fillStyle = '#1a1a1a';
    c.fillText('23:47', APP_W - 32, APP_H - 8);
  }

  /** She flickers out of the picture and does not come back. */
  private vanish(t: number): void {
    const c = this.ctx;
    const k = Math.min(1, (t - this.since) / VANISH_TIME);
    const calm = !!this.state.calm;
    const showHer = calm ? k < 1 : k < 1 && Math.random() > k * k * 1.1;
    if (showHer) {
      this.stare(t);
      if (calm) {
        c.fillStyle = `rgba(12,6,16,${k.toFixed(3)})`;
        c.fillRect(0, 0, APP_W, APP_H);
      } else {
        // the picture tears sideways as she goes
        for (let i = 0; i < 6; i++) {
          const y = Math.floor(Math.random() * APP_H);
          const h = 4 + Math.floor(Math.random() * 18);
          c.drawImage(this.canvas, 0, y, APP_W, h, Math.round((Math.random() - 0.5) * 60 * (0.3 + k)), y, APP_W, h);
        }
      }
    } else {
      c.fillStyle = '#0c0610';
      c.fillRect(0, 0, APP_W, APP_H);
      if (!calm && k < 1) this.snow(0.35);
    }
  }

  /** Snow of a tube with no signal. */
  private snow(alpha = 0.85): void {
    const c = this.ctx;
    const img = c.createImageData(APP_W / 2, APP_H / 2);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 200;
      img.data[i] = v;
      img.data[i + 1] = v * 0.95;
      img.data[i + 2] = v;
      img.data[i + 3] = 255 * alpha;
    }
    // drawn at half resolution and doubled: chunky like the rest of the picture
    const tmp = (this.snowCanvas ??= Object.assign(document.createElement('canvas'), { width: APP_W / 2, height: APP_H / 2 }));
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    if (alpha >= 0.85) {
      c.fillStyle = '#0c0610';
      c.fillRect(0, 0, APP_W, APP_H);
    }
    c.drawImage(tmp, 0, 0, APP_W, APP_H);
  }

  /** Windows-98-ish desktop: the abandoned site with the installer. */
  private desktop(t: number): void {
    const c = this.ctx;
    c.fillStyle = '#2a6a6a';
    c.fillRect(0, 0, APP_W, APP_H);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = ['#e8c040', '#d8dce4', '#5ab0e8', '#e86a8a', '#8ad86a'][i]!;
      c.fillRect(10, 10 + i * 34, 18, 16);
      c.fillStyle = '#ffffff';
      c.fillRect(6, 30 + i * 34, 26, 3);
    }
    c.fillStyle = '#c8c4bc';
    c.fillRect(54, 24, 240, 170);
    c.fillStyle = '#1a3a8a';
    c.fillRect(56, 26, 236, 12);
    c.fillStyle = '#ffffff';
    c.fillRect(60, 29, 80, 6);
    c.fillStyle = '#f4f0f8';
    c.fillRect(58, 42, 232, 148);
    // a forgotten fan site: marquee, blinking banners, the download link
    c.fillStyle = '#3a1a5a';
    c.fillRect(58, 42, 232, 18);
    c.fillStyle = Math.floor(t * 3) % 2 ? HOT : LEMON;
    c.fillRect(64 + ((t * 40) % 120), 47, 60, 8);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ['#ff6cc5', '#55c9f5', '#b2f5e4'][i]!;
      c.fillRect(66 + i * 74, 68, 66, 40);
    }
    c.fillStyle = '#5a3d78';
    for (let i = 0; i < 5; i++) c.fillRect(66, 118 + i * 8, 130 + ((i * 37) % 70), 3);
    c.fillStyle = '#1a3a8a';
    c.fillRect(66, 164, 150, 5);
    c.fillStyle = '#c8c4bc';
    c.fillRect(0, APP_H - 16, APP_W, 16);
    c.fillStyle = '#3a8a3a';
    c.fillRect(2, APP_H - 14, 34, 12);
  }

  private app(t: number): void {
    const c = this.ctx;
    const s = this.state;
    const dark = s.unease > 0.6;
    c.fillStyle = dark ? '#2a0c22' : PINK;
    c.fillRect(0, 0, APP_W, APP_H);
    c.fillStyle = dark ? '#40122e' : PINK_DOT;
    for (let y = 0; y < APP_H; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < APP_W; x += 8) c.fillRect(x, y, 3, 3);
    // title bar: ★ メロディのまほう ★
    c.fillStyle = dark ? '#ff315a' : HOT;
    c.fillRect(0, 0, APP_W, 18);
    c.fillStyle = PAPER;
    c.font = '10px Tiny5, monospace';
    c.textBaseline = 'middle';
    c.fillText(s.title ?? '★ Мелоди но Махо ★', 8, 9);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = [LEMON, MINT, LAV][i]!;
      c.fillRect(APP_W - 46 + i * 14, 4, 10, 10);
    }
    // main panel by view
    const panel = (x: number, y: number, w: number, h: number, fill: string) => {
      c.fillStyle = dark ? '#ff315a' : INK;
      c.fillRect(x - 2, y - 2, w + 4, h + 4);
      c.fillStyle = dark ? '#1a0814' : fill;
      c.fillRect(x, y, w, h);
    };
    if (s.view === 'splash') {
      panel(150, 40, 156, 120, PAPER);
      c.fillStyle = dark ? '#ff315a' : HOT;
      c.font = '16px Tiny5, monospace';
      c.fillText('Мелоди', 166, 66);
      c.fillText('но Махо!', 166, 86);
      c.fillStyle = dark ? '#ff9ab0' : '#5a3d78';
      c.font = '8px Tiny5, monospace';
      c.fillText('весёлая геометрия', 166, 108);
      c.fillText('версия 1.04 · 2004', 166, 122);
      // flowers
      for (let i = 0; i < 6; i++) {
        const fx = 160 + i * 24;
        const fy = 140 + Math.round(Math.sin(t * 3 + i) * 2);
        c.fillStyle = [HOT, LEMON, MINT][i % 3]!;
        c.fillRect(fx - 3, fy, 7, 3);
        c.fillRect(fx, fy - 3, 3, 7);
        c.fillStyle = PAPER;
        c.fillRect(fx, fy, 1, 1);
      }
    } else {
      // lesson board with a figure, like a page of the old program
      panel(150, 32, 158, 128, dark ? '#1a0814' : '#fffef8');
      c.strokeStyle = dark ? '#ff315a' : '#397fb7';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(170, 140);
      c.lineTo(286, 140);
      c.lineTo(200, 60);
      c.closePath();
      c.stroke();
      c.fillStyle = dark ? '#ff315a' : '#d94c62';
      c.fillRect(200 - 2, 60 - 2, 5, 5);
      c.font = '8px Tiny5, monospace';
      c.fillStyle = dark ? '#ff9ab0' : INK;
      c.fillText('A', 162, 146);
      c.fillText('B', 290, 146);
      c.fillText('C', 196, 52);
      panel(150, 172, 158, 46, s.view === 'quiz' ? LEMON : MINT);
      c.fillStyle = dark ? '#ff9ab0' : INK;
      for (let i = 0; i < 3; i++) c.fillRect(158, 182 + i * 10, 90 + ((i * 41) % 50), 3);
    }
    // Melody, scaled down from her portrait into the program window
    if (s.melody) this.melody(s.melody, t);
    // bottom bar: stars earned, a clock
    c.fillStyle = dark ? '#ff315a' : HOT;
    c.fillRect(0, APP_H - 14, APP_W, 14);
    c.fillStyle = LEMON;
    for (let i = 0; i < 5; i++) c.fillRect(8 + i * 12, APP_H - 10, 7, 7);
    if (s.unease > 0) this.corrupt(t, s.unease);
  }

  private melody(poseId: string, t: number): void {
    const pose = characters.melody?.poses[poseId];
    if (!pose || pose.kind !== 'sheet') return;
    const img = this.images.get(pose.src);
    if (!img) return;
    const p = pose as SheetPose;
    const h = 196;
    const w = Math.round((p.frame.w / p.frame.h) * h);
    const bob = this.state.unease > 0.6 ? 0 : Math.round(Math.sin(t * 2.2) * 1.5);
    const c = this.ctx;
    c.imageSmoothingEnabled = true; // downscaling a 1200px portrait: average, then the CRT quantises
    c.drawImage(img, p.frame.x, p.frame.y, p.frame.w, p.baseline, 4, APP_H - 14 - Math.round((p.baseline / p.frame.h) * h) + bob, w, Math.round((p.baseline / p.frame.h) * h));
    c.imageSmoothingEnabled = false;
  }

  /** «Закрыть «Мелоди но Махо»?» — a system dialog that will not take a «Да». */
  private closeDialog(t: number): void {
    const c = this.ctx;
    const x = 96;
    const y = 82;
    c.fillStyle = '#30243b';
    c.fillRect(x - 2, y - 2, 132, 76);
    c.fillStyle = '#c8c4bc';
    c.fillRect(x, y, 128, 72);
    c.fillStyle = '#1a3a8a';
    c.fillRect(x, y, 128, 11);
    c.fillStyle = '#ffffff';
    c.font = '8px Tiny5, monospace';
    c.textBaseline = 'middle';
    c.fillText('Выход', x + 4, y + 6);
    c.fillStyle = '#1a1a1a';
    c.fillText('Закрыть программу?', x + 10, y + 26);
    const jitter = this.state.unease > 0.6 ? Math.round(Math.sin(t * 40) * 3) : 0;
    for (const [bx, label] of [
      [x + 16, 'Да'],
      [x + 72, 'Нет'],
    ] as const) {
      c.fillStyle = '#30243b';
      c.fillRect(bx + (label === 'Да' ? jitter : 0), y + 44, 40, 16);
      c.fillStyle = label === 'Да' && this.state.unease > 0.6 ? '#9a9690' : '#e8e4dc';
      c.fillRect(bx + 1 + (label === 'Да' ? jitter : 0), y + 45, 38, 14);
      c.fillStyle = '#1a1a1a';
      c.fillText(label, bx + 12 + (label === 'Да' ? jitter : 0), y + 52);
    }
    // the cursor on «Да»
    c.fillStyle = '#ffffff';
    const cx = x + 34;
    const cy = y + 54;
    for (let i = 0; i < 8; i++) c.fillRect(cx, cy + i, Math.max(1, i - 1), 1);
  }

  /** Melody fills the window and does not move. The program has stopped pretending. */
  private stare(t: number): void {
    const c = this.ctx;
    c.fillStyle = '#1a0814';
    c.fillRect(0, 0, APP_W, APP_H);
    const pose = characters.melody?.poses['neutral'];
    if (pose && pose.kind === 'sheet') {
      const img = this.images.get(pose.src);
      if (img) {
        // cropped to the eyes, enlarged past the frame
        const p = pose as SheetPose;
        c.imageSmoothingEnabled = true;
        c.drawImage(img, p.frame.x + p.frame.w * 0.18, p.frame.y + p.frame.h * 0.12, p.frame.w * 0.64, p.frame.h * 0.5, -20, -10, APP_W + 40, APP_H + 30);
        c.imageSmoothingEnabled = false;
      }
    }
    this.corrupt(t, 0.7);
  }

  /** Unease: colour bars shift, lines tear, a red cast creeps in. */
  private corrupt(t: number, k: number): void {
    const c = this.ctx;
    const n = Math.floor(k * 8);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(((Math.sin(t * 13 + i * 7) + 1) / 2) * APP_H);
      const off = Math.round(Math.sin(t * 31 + i) * 8 * k);
      c.drawImage(this.canvas, 0, y, APP_W, 3, off, y, APP_W, 3);
    }
    c.fillStyle = `rgba(255,30,60,${0.12 * k})`;
    c.fillRect(0, 0, APP_W, APP_H);
  }

  /** Tube look: scanlines, vignette, a soft highlight. */
  private glass(t: number): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < APP_H; y += 2) c.fillRect(0, y, APP_W, 1);
    const g = c.createRadialGradient(APP_W / 2, APP_H / 2, APP_H * 0.35, APP_W / 2, APP_H / 2, APP_H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = g;
    c.fillRect(0, 0, APP_W, APP_H);
    // rolling brightness band of an old tube
    const band = ((t * 30) % (APP_H + 40)) - 20;
    c.fillStyle = 'rgba(255,255,255,0.035)';
    c.fillRect(0, band, APP_W, 14);
    this.texture.needsUpdate = true;
  }
}
