// Screen manager: title screen ⇄ game screen, plus panels reachable from the
// title (load, settings). Owns the long-lived services.
import type { AudioEngine } from '../audio/engine';
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
import { TitleScreen } from './title-screen';

export interface AppServices {
  audio: AudioEngine;
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
  private title: TitleScreen | null = null;
  private introPlayed = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly services: AppServices,
  ) {
    root.replaceChildren(this.screenRoot);
    this.overlays = new Overlays(root, services.input);
    setAssetFailureHandler((src) => this.overlays.toast(`Ресурс не загрузился: ${src}`, 'error'));
    services.settings.subscribe((s) => {
      this.applyGlobalSettings(s.reduceMotion);
      services.audio.apply(s);
    });
    this.applyGlobalSettings(services.settings.get().reduceMotion);
    services.audio.apply(services.settings.get());
    // Interface sounds for every button, in one place.
    let lastHover: EventTarget | null = null;
    root.addEventListener('pointerover', (e) => {
      const btn = (e.target as HTMLElement).closest?.('button:not(:disabled)');
      if (btn && btn !== lastHover) services.audio.sfx('hover');
      lastHover = btn ?? null;
    });
    root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest?.('button:not(:disabled)')) services.audio.sfx('click');
    });
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
    this.title?.destroy();
    this.popTitleInput?.();
    this.root.dataset.space = 'app';
    this.root.dataset.phase = 'A';

    const latest = this.services.saves.latest();
    const endings = this.services.meta.endings.length;
    this.title = new TitleScreen({
      audio: this.services.audio,
      intro: !this.introPlayed,
      reduceMotion: this.services.settings.get().reduceMotion,
      footer: endings ? `Открыто концовок: ${endings} из 3` : null,
      items: [
        { label: 'Новая игра', testid: 'new-game', action: () => this.startGame({}) },
        { label: 'Продолжить', testid: 'continue', disabled: !latest, action: () => latest && this.loadSave(latest.data) },
        { label: 'Загрузить', testid: 'load', action: () => this.openLoad() },
        { label: 'Настройки', testid: 'settings', action: () => this.overlays.open('Настройки', settingsView(this.services.settings)) },
      ],
    });
    this.introPlayed = true;
    this.screenRoot.replaceChildren(this.title.root);
    this.popTitleInput = this.services.input.push('title', () => {});
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
    this.title?.destroy();
    this.title = null;
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
          audio: this.services.audio,
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
