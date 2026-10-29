// Title screen: Dameo's room at night behind a pinned graph-paper logo and a
// stitched menu card. On the first visit of a page load the logo plays as an
// intro, gated by one key press or tap so the browser lets the sound start.
import type { AudioEngine } from '../audio/engine';
import { el } from './dom';
import { enterFullscreen } from '../platform/fullscreen';
import { LogoIntro } from './logo-intro';
import { SceneView } from './scene-view';

export interface TitleMenuItem {
  label: string;
  testid: string;
  action: () => void;
  disabled?: boolean;
}

export interface TitleOptions {
  audio: AudioEngine;
  items: TitleMenuItem[];
  footer: string | null;
  /** Play the intro (first visit) or show the finished logo straight away. */
  intro: boolean;
  reduceMotion: boolean;
}

export class TitleScreen {
  readonly root: HTMLElement;
  private readonly logo: LogoIntro;
  private readonly scene = new SceneView();
  private readonly menu: HTMLElement;
  private removeListeners: () => void = () => {};

  constructor(private readonly opts: TitleOptions) {
    this.logo = new LogoIntro(opts.audio);
    this.menu = el(
      'nav',
      { class: 'title-menu', 'aria-label': 'Главное меню' },
      el('div', { class: 'title-menu-head pixel', 'aria-hidden': 'true' }, 'меню'),
      ...opts.items.map((it, i) =>
        el(
          'button',
          {
            class: 'btn btn-menu',
            type: 'button',
            disabled: it.disabled,
            'data-testid': it.testid,
            style: `--i:${i}`,
            onclick: it.action,
          },
          el('span', { class: 'btn-menu-mark', 'aria-hidden': 'true' }),
          it.label,
        ),
      ),
      opts.footer ? el('p', { class: 'title-footer pixel' }, opts.footer) : null,
    );
    this.root = el(
      'div',
      { class: 'screen title-screen', 'data-testid': 'title-screen' },
      this.scene.root,
      el('div', { class: 'title-vignette', 'aria-hidden': 'true' }),
      this.logo.root,
      this.menu,
    );
    this.scene.show('dameo-room', 'night', null, opts.reduceMotion);
    if (opts.intro && !opts.reduceMotion) this.gate();
    else this.finish(false);
  }

  destroy(): void {
    this.removeListeners();
    this.logo.destroy();
    this.scene.destroy();
  }

  private setMenuEnabled(on: boolean): void {
    this.menu.toggleAttribute('inert', !on);
    this.menu.setAttribute('aria-hidden', String(!on));
  }

  /** "Press any key": the first gesture also unlocks audio. */
  private gate(): void {
    this.root.classList.add('is-intro');
    this.setMenuEnabled(false);
    const skip = el('button', { class: 'intro-skip pixel', type: 'button', 'data-testid': 'intro-skip' }, 'Пропустить ▸▸');
    const gate = el(
      'div',
      { class: 'intro-gate', 'data-testid': 'intro-gate' },
      el('p', { class: 'intro-gate-prompt pixel' }, '> нажмите любую клавишу', el('span', { class: 'logo-caret' })),
      el('p', { class: 'intro-gate-note' }, 'со звуком · можно пропустить'),
    );
    this.root.append(gate, skip);
    let started = false;
    const onInput = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key))) return;
      if (e instanceof KeyboardEvent) e.preventDefault();
      if (!started) {
        started = true;
        enterFullscreen();
        gate.remove();
        this.root.classList.add('is-playing');
        this.logo.play(() => this.finish(true));
      } else {
        this.logo.skip();
      }
    };
    window.addEventListener('keydown', onInput);
    this.root.addEventListener('pointerdown', onInput);
    this.removeListeners = () => {
      window.removeEventListener('keydown', onInput);
      this.root.removeEventListener('pointerdown', onInput);
      skip.remove();
    };
  }

  private finish(animated: boolean): void {
    this.removeListeners();
    this.removeListeners = () => {};
    if (!this.logo.done) this.logo.showFinal();
    this.root.classList.remove('is-intro', 'is-playing');
    this.root.classList.toggle('is-entering', animated);
    this.setMenuEnabled(true);
    this.opts.audio.music('title');
    // After the current pointer event: mousedown would otherwise move focus to where it was clicked.
    setTimeout(() => this.menu.querySelector<HTMLButtonElement>('.btn-menu:not(:disabled)')?.focus({ preventScroll: true }));
  }
}
