// Screen manager: title screen ⇄ game screen, plus panels reachable from the
// title (load, settings). Owns the long-lived services.
import { StoryError } from '../core/runtime';
import type { SaveData, SaveStore } from '../core/saves';
import { setAssetFailureHandler } from '../platform/assets';
import type { InputManager } from '../platform/input';
import type { MetaStore } from '../platform/meta';
import type { SettingsStore } from '../platform/settings';
import { el } from './dom';
import { GameScreen, type GameInit } from './game-screen';
import { Overlays } from './overlays';
import { saveLoadView, settingsView } from './panels';

export interface AppServices {
  input: InputManager;
  saves: SaveStore;
  settings: SettingsStore;
  meta: MetaStore;
  persistentStorage: boolean;
}

export class App {
  private readonly screenRoot = el('div', { class: 'screen-root' });
  private readonly overlays: Overlays;
  private game: GameScreen | null = null;
  private popTitleInput: (() => void) | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly services: AppServices,
  ) {
    root.replaceChildren(this.screenRoot);
    this.overlays = new Overlays(root, services.input);
    setAssetFailureHandler((src) => this.overlays.toast(`Ресурс не загрузился: ${src}`, 'error'));
    services.settings.subscribe((s) => this.applyGlobalSettings(s.reduceMotion));
    this.applyGlobalSettings(services.settings.get().reduceMotion);
    if (!services.persistentStorage) {
      this.overlays.toast('Браузер запретил локальное хранилище: сохранения пропадут после закрытия вкладки.', 'error');
    }
  }

  private applyGlobalSettings(reduceMotion: boolean): void {
    this.root.classList.toggle('reduce-motion', reduceMotion);
  }

  showTitle(): void {
    this.game?.destroy();
    this.game = null;
    this.popTitleInput?.();
    this.root.dataset.space = 'app';
    this.root.dataset.phase = 'A';

    const latest = this.services.saves.latest();
    const button = (label: string, onclick: () => void, opts: { disabled?: boolean; testid: string }) =>
      el('button', { class: 'btn btn-menu', type: 'button', disabled: opts.disabled, 'data-testid': opts.testid, onclick }, label);

    const title = el(
      'div',
      { class: 'screen title-screen', 'data-testid': 'title-screen' },
      el('div', { class: 'title-decor', 'aria-hidden': 'true' }),
      el(
        'main',
        { class: 'title-center notebook-sheet' },
        el('h1', { class: 'logo pixel' }, 'Geometry of Love'),
        el('p', { class: 'prototype-badge pixel' }, 'Технический прототип — не финальная игра'),
        el(
          'nav',
          { class: 'title-menu', 'aria-label': 'Главное меню' },
          button('Новая игра', () => this.startGame({}), { testid: 'new-game' }),
          button('Продолжить', () => latest && this.loadSave(latest.data), { disabled: !latest, testid: 'continue' }),
          button('Загрузить', () => this.openLoad(), { testid: 'load' }),
          button('Настройки', () => this.overlays.open('Настройки', settingsView(this.services.settings)), { testid: 'settings' }),
        ),
        this.services.meta.endings.length
          ? el('p', { class: 'muted' }, `Открыто концовок: ${this.services.meta.endings.length}`)
          : null,
      ),
    );
    this.screenRoot.replaceChildren(title);
    this.popTitleInput = this.services.input.push('title', () => {});
    title.querySelector<HTMLButtonElement>('.btn-menu')?.focus();
  }

  private openLoad(): void {
    let close = () => {};
    close = this.overlays.open(
      'Загрузить',
      saveLoadView({
        mode: 'load',
        saves: this.services.saves,
        overlays: this.overlays,
        onLoad: (data) => {
          close();
          this.loadSave(data);
        },
      }),
      { className: 'panel-wide' },
    );
  }

  loadSave(data: SaveData): void {
    this.startGame({ state: data.state, backlog: data.backlog, playTimeMs: data.playTimeMs });
  }

  private startGame(init: GameInit): void {
    this.popTitleInput?.();
    this.popTitleInput = null;
    this.game?.destroy();
    this.game = null;
    try {
      this.game = new GameScreen(
        {
          ...this.services,
          overlays: this.overlays,
          exitToTitle: () => this.showTitle(),
          loadSave: (data) => this.loadSave(data),
          themeRoot: this.root,
        },
        init,
      );
    } catch (e) {
      const message =
        e instanceof StoryError
          ? `Сохранение несовместимо с текущей версией сценария: ${e.message}`
          : `Не удалось запустить игру: ${(e as Error).message}`;
      console.error(e);
      this.showTitle();
      this.overlays.toast(message, 'error');
      return;
    }
    this.screenRoot.replaceChildren(this.game.root);
  }
}
