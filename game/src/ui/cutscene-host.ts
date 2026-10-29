// Screen side of the Cutscene Director: letterbox, captions, fades, flashes,
// shake, a «Пропустить» button, and the story props the scenes use. GameScreen
// shows it while a `cutscene` step is current and resumes the story after.
import type { AudioEngine } from '../audio/engine';
import { characters } from '../content';
import { cutscenes } from '../content/cutscenes';
import { Director, type DirectorHost } from '../world/director';
import { MonitorHand } from '../world/monitor-hand';
import { MelodyMonster } from '../world/melody-monster';
import type { World3D } from '../world/world';
import { el } from './dom';

export interface CutsceneRun {
  done: Promise<void>;
  skip(): void;
  next(): void;
  stop(): void;
}

type Prop = { act(a: string, d: number, t?: string): Promise<void>; dispose(): void };

/** Story props the scenes can use, created on first use and removed when the scene ends. */
function makeProp(name: string, world: World3D): Prop {
  if (name === 'monitor-hand') {
    const hand = new MonitorHand(world);
    const stop = world.addUpdater((dt) => hand.update(dt));
    return { act: (a, d, t) => hand.act(a, d, t), dispose: () => (stop(), hand.dispose()) };
  }
  if (name === 'melody-monster') {
    // гл. 14: she rises out of the floor where her figure stood
    const m = new MelodyMonster(world.sceneRoot);
    const mark = world.current?.marks.melody ?? world.current?.marks.left;
    m.x = (mark?.x ?? 0) - 0.5;
    m.rise = 0;
    m.glitch = 0.8;
    let anim: { t: number; dur: number; from: number; to: number; resolve: () => void } | null = null;
    const stop = world.addUpdater((dt) => {
      if (anim) {
        anim.t += dt;
        const k = Math.min(1, anim.t / anim.dur);
        m.rise = anim.from + (anim.to - anim.from) * k * k * (3 - 2 * k);
        if (k >= 1) {
          const r = anim.resolve;
          anim = null;
          r();
        }
      }
      m.update(dt, 0.6);
    });
    return {
      act: (action, dur) =>
        new Promise<void>((resolve) => {
          if (action !== 'rise' && action !== 'sink') throw new Error(`[monster] unknown action "${action}"`);
          const to = action === 'rise' ? 1 : 0;
          if (dur <= 0) {
            m.rise = to;
            resolve();
            return;
          }
          anim = { t: 0, dur, from: m.rise, to, resolve };
        }),
      dispose: () => (stop(), m.dispose()),
    };
  }
  throw new Error(`Неизвестный реквизит «${name}»`);
}

export class CutsceneLayer {
  readonly root: HTMLElement;
  private readonly fade: HTMLElement;
  private readonly flash: HTMLElement;
  private readonly bars: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly skipBtn: HTMLButtonElement;
  private director: Director | null = null;

  constructor(
    private readonly shakeTarget: HTMLElement,
    private readonly audio: AudioEngine,
    private readonly onLine: (speaker: string | null, text: string) => void,
  ) {
    this.fade = el('div', { class: 'cs-fade' });
    this.flash = el('div', { class: 'cs-flash' });
    this.bars = el('div', { class: 'cs-bars' }, el('div', { class: 'cs-bar cs-bar-top' }), el('div', { class: 'cs-bar cs-bar-bottom' }));
    this.caption = el('div', { class: 'cs-caption', 'aria-live': 'polite' });
    this.skipBtn = el(
      'button',
      {
        class: 'cs-skip',
        type: 'button',
        'data-testid': 'cutscene-skip',
        onclick: (e: Event) => {
          e.stopPropagation();
          this.director?.skip();
        },
      },
      'Пропустить ▸▸',
    );
    this.root = el(
      'div',
      { class: 'cutscene-layer', 'data-testid': 'cutscene', onclick: () => this.director?.next() },
      this.bars,
      this.fade,
      this.flash,
      this.caption,
      this.skipBtn,
    );
  }

  /** Clears a fade left over from a scene (e.g. after loading a save). */
  reset(): void {
    this.fade.style.transition = 'none';
    this.fade.style.opacity = '0';
    this.root.classList.remove('is-playing', 'has-bars');
    this.caption.replaceChildren();
  }

  play(id: string, world: World3D, reduceMotion: boolean): CutsceneRun {
    const scene = cutscenes[id];
    if (!scene) throw new Error(`Неизвестная кат-сцена «${id}»`);
    const props = new Map<string, Prop>();
    const host: DirectorHost = {
      world,
      caption: (speaker, text, dur) => {
        this.onLine(speaker, text);
        if (dur <= 0) return Promise.resolve();
        const name = speaker ? (characters[speaker]?.name ?? speaker) : null;
        this.caption.replaceChildren(
          ...(name ? [el('span', { class: 'cs-name', style: `--accent:${characters[speaker!]?.accent ?? 'var(--tape)'}` }, name)] : []),
          el('p', { class: 'cs-text' }, text),
        );
        this.caption.classList.add('is-visible');
        return new Promise((r) =>
          window.setTimeout(() => {
            this.caption.classList.remove('is-visible');
            r();
          }, dur * 1000),
        );
      },
      overlay: (kind, v, dur) => {
        const ms = Math.round(dur * 1000);
        if (kind === 'fade') {
          const color = v.to === 'white' ? '#fff9fd' : v.to === 'red' ? '#5a0710' : '#050408';
          if (v.to !== 'clear') this.fade.style.background = color;
          this.fade.style.transition = `opacity ${ms}ms ease`;
          this.fade.style.opacity = v.to === 'clear' ? '0' : '1';
          return new Promise((r) => window.setTimeout(r, ms));
        }
        if (kind === 'flash') {
          if (reduceMotion) return Promise.resolve();
          this.flash.style.background = v.color ?? '#ffffff';
          this.flash.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
          return new Promise((r) => window.setTimeout(r, ms));
        }
        if (kind === 'shake') {
          if (reduceMotion) return Promise.resolve();
          const s = (v.strength ?? 1) * 6;
          const frames = Array.from({ length: 8 }, (_, i) => ({ transform: `translate(${i % 2 ? s : -s}px, ${(i % 3) - 1}px)` }));
          this.shakeTarget.animate([...frames, { transform: 'none' }], { duration: ms });
          return new Promise((r) => window.setTimeout(r, ms));
        }
        this.root.classList.toggle('has-bars', !!v.on);
        return new Promise((r) => window.setTimeout(r, ms));
      },
      sfx: (s) => this.audio.sfx(s),
      music: (t) => this.audio.music(t),
      prop: (name, action, dur, target) => {
        let p = props.get(name);
        if (!p) {
          p = makeProp(name, world);
          props.set(name, p);
        }
        return p.act(action, dur, target);
      },
    };
    const director = new Director(host);
    this.director = director;
    this.root.classList.add('is-playing');
    const done = director.play(scene).finally(() => {
      for (const p of props.values()) p.dispose();
      // a scene may end on black or white: the next story step fades in from it
      this.fade.style.transition = 'opacity 700ms ease';
      this.fade.style.opacity = '0';
      this.root.classList.remove('is-playing', 'has-bars');
      this.caption.classList.remove('is-visible');
      if (this.director === director) this.director = null;
    });
    return { done, skip: () => director.skip(), next: () => director.next(), stop: () => director.stop() };
  }
}
