// Main game screen. Owns the StoryRuntime and the UI state (Auto, Skip,
// hidden UI, open panels) and keeps them apart: UI state never enters
// saves, and opening any panel never advances the story.
import { characters, endings, story } from '../content';
import { StoryRuntime, StoryError } from '../core/runtime';
import { SAVE_SCHEMA, type BacklogEntry, type SaveData, type SaveStore } from '../core/saves';
import type { Presentation, StoryState } from '../core/types';
import type { AudioEngine } from '../audio/engine';
import type { InputManager } from '../platform/input';
import type { MetaStore } from '../platform/meta';
import type { SettingsStore } from '../platform/settings';
import { DialogueBox } from './dialogue-box';
import { el } from './dom';
import { runEpisode } from './episode-host';
import type { Overlays } from './overlays';
import { backlogView, choicePanel, saveLoadView, settingsView, speakerName } from './panels';
import { EffectsLayer } from './effects';
import { Stage } from './stage';
import { chapterCardView } from './chapter-card';
import { CutsceneLayer, type CutsceneRun } from './cutscene-host';
import { getWorld } from '../world/instance';
import { voiceFor } from '../content/voice';
import { musicFor } from '../content/music-map';

const BACKLOG_LIMIT = 200;
const SKIP_INTERVAL_MS = 60;
const REVISION_DELAY_MS = 1100;

export interface GameServices {
  input: InputManager;
  overlays: Overlays;
  saves: SaveStore;
  settings: SettingsStore;
  meta: MetaStore;
  exitToTitle: () => void;
  loadSave: (data: SaveData) => void;
  /** Element whose data-space/data-phase drive the theme (the whole app, so panels follow it). */
  themeRoot: HTMLElement;
  audio: AudioEngine;
}

export interface GameInit {
  state?: StoryState;
  backlog?: BacklogEntry[];
  playTimeMs?: number;
}

export class GameScreen {
  readonly root: HTMLElement;
  private readonly runtime: StoryRuntime;
  private readonly stage = new Stage();
  private readonly dialogue = new DialogueBox();
  private readonly effects = new EffectsLayer();
  private pendingRevision: string | null = null;
  private revisionTimer = 0;
  // Clicks inside these layers must not bubble up and advance the dialogue.
  private readonly choiceLayer = el('div', { class: 'choice-layer', onclick: (e: Event) => e.stopPropagation() });
  private readonly episodeLayer = el('div', { class: 'episode-layer', onclick: (e: Event) => e.stopPropagation() });
  private readonly cardLayer = el('div', { class: 'card-layer' });
  private readonly cutsceneLayer: CutsceneLayer;
  private cutscene: CutsceneRun | null = null;
  private cardTimer = 0;
  private readonly autoButton: HTMLButtonElement;
  private readonly skipButton: HTMLButtonElement;
  private backlog: BacklogEntry[];
  private presentation!: Presentation;
  private auto = false;
  private skipToggle = false;
  private skipHeld = false;
  private autoTimer = 0;
  private skipTimer = 0;
  private playTimeMs: number;
  private sessionStart = performance.now();
  private episodeCancel: (() => void) | null = null;
  private popInput: () => void;
  private unsubscribeSettings: () => void;
  private destroyed = false;

  constructor(
    private readonly services: GameServices,
    init: GameInit = {},
  ) {
    this.runtime = new StoryRuntime(story, init.state); // throws StoryError on incompatible saves
    this.backlog = init.backlog ? [...init.backlog] : [];
    this.playTimeMs = init.playTimeMs ?? 0;

    const tool = (label: string, title: string, onclick: () => void, testid: string) =>
      el('button', { class: 'btn btn-tool', type: 'button', title, 'data-testid': testid, onclick: (e: Event) => {
          e.stopPropagation();
          // Drop focus so a later Space/Enter advances the dialogue instead of re-pressing this button.
          (e.currentTarget as HTMLElement).blur();
          onclick();
        } }, label);
    this.autoButton = tool('Auto', 'Автопрокрутка (A)', () => this.setAuto(!this.auto), 'tool-auto');
    this.skipButton = tool('Skip', 'Пропуск (Ctrl — удерживать)', () => this.setSkip(!this.skipToggle), 'tool-skip');
    const toolbar = el(
      'nav',
      { class: 'toolbar', 'aria-label': 'Управление игрой' },
      this.autoButton,
      this.skipButton,
      tool('Журнал', 'Журнал реплик (L)', () => this.openBacklog(), 'tool-backlog'),
      tool('Скрыть', 'Скрыть интерфейс (H)', () => this.setHidden(true), 'tool-hide'),
      tool('Б.сохр', 'Быстрое сохранение', () => this.quickSave(), 'tool-quicksave'),
      tool('Б.загр', 'Быстрая загрузка', () => this.quickLoad(), 'tool-quickload'),
      tool('Сохр.', 'Сохранить', () => this.openSaveLoad('save'), 'tool-save'),
      tool('Загр.', 'Загрузить', () => this.openSaveLoad('load'), 'tool-load'),
      tool('Настр.', 'Настройки', () => this.openSettings(), 'tool-settings'),
      tool('Меню', 'Меню (Esc)', () => this.openMenu(), 'tool-menu'),
    );

    this.cutsceneLayer = new CutsceneLayer(this.stage.root, services.audio, (speaker, text) => {
      this.backlog.push({ speaker: speaker ? speakerName(speaker, this.runtime.state.flags) : null, text, kind: speaker ? 'speech' : 'narration' });
      const voice = this.skipping ? null : voiceFor(speaker, text);
      if (voice) void services.audio.speak(voice);
    });
    this.root = el(
      'div',
      { class: 'screen game-screen', 'data-testid': 'game-screen', onclick: () => this.onStageClick() },
      this.stage.root,
      this.effects.root,
      this.cutsceneLayer.root,
      this.cardLayer,
      el('div', { class: 'hud' }, this.dialogue.root, toolbar),
      this.choiceLayer,
      this.episodeLayer,
    );

    this.popInput = services.input.push('game', (action) => this.onAction(action));
    this.unsubscribeSettings = services.settings.subscribe(() => this.applySettings());
    this.applySettings();
    this.show(this.runtime.present());
  }

  destroy(): void {
    this.destroyed = true;
    this.cutscene?.stop();
    this.cutscene = null;
    window.clearTimeout(this.cardTimer);
    this.stopTimers();
    this.episodeCancel?.();
    this.popInput();
    this.unsubscribeSettings();
    this.root.remove();
  }

  // ---- presentation ----------------------------------------------------

  private show(p: Presentation): void {
    this.presentation = p;
    // one voice at a time: whatever was being said stops when the story moves on
    this.services.audio.stopSpeech();
    if (p.kind !== 'line') this.stage.showPortrait(null);
    window.clearTimeout(this.revisionTimer);
    this.pendingRevision = null;
    const reduceMotion = this.services.settings.get().reduceMotion;
    const stage = this.runtime.state.stage;
    this.stage.render(stage, this.services.themeRoot, reduceMotion);
    this.effects.play(this.runtime.takeEffects(), reduceMotion);
    // Music follows the scene, place and music() steps (content/music-map.ts), so it is
    // restored on load; the engine crossfades and keeps a theme that already plays.
    this.services.audio.music(musicFor(story, this.runtime.state));
    for (const s of this.runtime.takeSounds()) this.services.audio.sfx(s);
    this.choiceLayer.replaceChildren();
    if (p.kind !== 'card') this.cardLayer.replaceChildren();
    window.clearTimeout(this.cardTimer);
    this.root.dataset.mode = p.kind;

    switch (p.kind) {
      case 'line': {
        const accent = p.speaker ? (characters[p.speaker]?.accent ?? null) : null;
        // The backlog only ever remembers the program's "corrected" version.
        this.backlog.push({ speaker: p.speaker, text: p.revision ?? p.text, kind: p.revision ? 'corrupted' : p.textKind });
        if (this.backlog.length > BACKLOG_LIMIT) this.backlog.splice(0, this.backlog.length - BACKLOG_LIMIT);
        const speed = this.skipping ? 0 : this.services.settings.get().textSpeed;
        const name = speakerName(p.speaker, this.runtime.state.flags);
        this.stage.setSpeaking(p.speaker);
        this.stage.showPortrait(p.textKind === 'speech' || p.textKind === 'thought' ? p.speaker : null);
        const blip = p.textKind === 'narration' || p.textKind === 'thought' ? null : 'text';
        this.dialogue.show(
          { speaker: name, accent, text: p.text, kind: p.textKind },
          speed,
          () => {
            this.stage.setSpeaking(null);
            if (!p.revision) return this.onLineShown();
            this.services.audio.sfx('glitch');
            this.pendingRevision = p.revision;
            this.revisionTimer = window.setTimeout(() => this.applyRevision(), this.skipping ? 0 : REVISION_DELAY_MS);
          },
          blip ? () => this.services.audio.sfx(blip) : undefined,
        );
        // Japanese voice-over under the Russian text (none while skipping)
        if (p.textKind === 'speech' && !this.skipping) {
          const voice = voiceFor(p.speaker, p.text);
          if (voice) void this.services.audio.speak(voice);
        }
        break;
      }
      case 'choice':
        this.setSkip(false);
        this.stage.setSpeaking(null);
        this.choiceLayer.append(
          choicePanel(p.prompt, p.options, (id) => {
            this.services.audio.sfx('choice');
            this.act(() => this.runtime.choose(id));
          }),
        );
        this.choiceLayer.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
        break;
      case 'episode':
        this.setSkip(false);
        this.setAuto(false);
        this.startEpisode(p.episode, p.params);
        break;
      case 'card':
        this.stage.setSpeaking(null);
        this.cardLayer.replaceChildren(chapterCardView(p.card));
        this.services.audio.sfx('page');
        // Auto and Skip move on by themselves; otherwise the card waits for the player.
        if (this.skipping || this.auto) this.cardTimer = window.setTimeout(() => this.advance(), this.skipping ? 300 : 3200);
        break;
      case 'cutscene':
        this.setAuto(false);
        this.stage.setSpeaking(null);
        this.playCutscene(p.cutscene, p.key);
        break;
      case 'ending':
        this.setSkip(false);
        this.setAuto(false);
        this.showEnding(p.ending);
        break;
    }
    // After the switch, so the backlog already holds the current line.
    if (this.runtime.takeCheckpoint()) this.autosave();
  }

  /** Runs a runtime transition; story errors are shown, never swallowed. */
  private act(transition: () => Presentation): void {
    if (this.destroyed) return;
    try {
      this.show(transition());
    } catch (e) {
      this.fatal(e instanceof StoryError ? `Ошибка сценария: ${e.message}` : `Непредвиденная ошибка: ${(e as Error).message}`);
      console.error(e);
    }
  }

  private fatal(message: string): void {
    this.stopTimers();
    this.services.overlays.toast(message, 'error');
    this.episodeLayer.replaceChildren(
      el(
        'div',
        { class: 'episode-intro notebook-sheet', role: 'alert' },
        el('h2', { class: 'pixel' }, 'Ошибка'),
        el('p', {}, message),
        el('button', { class: 'btn btn-primary', type: 'button', onclick: () => this.services.exitToTitle() }, 'В главное меню'),
      ),
    );
  }

  // ---- dialogue flow ---------------------------------------------------

  private get skipping(): boolean {
    return this.skipToggle || this.skipHeld;
  }

  private canSkipCurrent(): boolean {
    const p = this.presentation;
    if (p.kind !== 'line') return false;
    return this.services.settings.get().skipMode === 'all' || this.services.meta.isRead(p.key);
  }

  private get uiFocused(): boolean {
    return this.services.input.top === 'game';
  }

  private onLineShown(): void {
    if (this.presentation.kind === 'line') this.services.meta.markRead(this.presentation.key);
    if (this.auto && !this.skipping) {
      window.clearTimeout(this.autoTimer);
      // Auto waits for the voice to finish its line
      const wait = Math.max(this.services.settings.get().autoDelayMs, this.services.audio.speechLeft * 1000 + 400);
      this.autoTimer = window.setTimeout(() => {
        if (this.auto && this.uiFocused && !this.dialogue.typing) this.advance();
      }, wait);
    }
  }

  private applyRevision(): void {
    if (this.pendingRevision === null) return;
    window.clearTimeout(this.revisionTimer);
    this.dialogue.rewrite(this.pendingRevision);
    this.pendingRevision = null;
    this.onLineShown();
  }

  /**
   * A cutscene plays on the shared 3D world; when it ends (watched or skipped)
   * the story moves on. Skip mode passes scenes already seen.
   */
  private playCutscene(id: string, key: string): void {
    let run: CutsceneRun;
    try {
      run = this.cutsceneLayer.play(id, getWorld(), this.services.settings.get().reduceMotion);
    } catch (e) {
      this.fatal(`Кат-сцена не запустилась: ${(e as Error).message}`);
      console.error(e);
      return;
    }
    this.cutscene = run;
    if (this.skipping && this.services.meta.isRead(key)) run.skip();
    run.done
      .then(() => {
        if (this.cutscene !== run || this.destroyed) return;
        this.cutscene = null;
        this.services.meta.markRead(key);
        this.act(() => this.runtime.completeCutscene());
      })
      .catch((e: unknown) => {
        console.error(e);
        // A broken scene must not block the story: report it and continue.
        this.services.overlays.toast(`Ошибка кат-сцены: ${(e as Error).message}`, 'error');
        if (this.cutscene === run && !this.destroyed) {
          this.cutscene = null;
          this.act(() => this.runtime.completeCutscene());
        }
      });
  }

  private advance(): void {
    if (this.presentation.kind === 'card') {
      this.act(() => this.runtime.advance());
      return;
    }
    if (this.presentation.kind === 'cutscene') {
      this.cutscene?.next();
      return;
    }
    if (this.presentation.kind !== 'line') return;
    if (this.dialogue.typing) {
      this.dialogue.complete();
      return;
    }
    if (this.pendingRevision !== null) {
      this.applyRevision();
      return;
    }
    this.act(() => this.runtime.advance());
  }

  private onStageClick(): void {
    if (this.root.classList.contains('ui-hidden')) {
      this.setHidden(false);
      return;
    }
    if (this.uiFocused) this.advance();
  }

  private onAction(action: string): void {
    if (this.root.classList.contains('ui-hidden') && action !== 'skip-end') {
      this.setHidden(false);
      return;
    }
    switch (action) {
      case 'advance':
        this.advance();
        break;
      case 'backlog':
        this.openBacklog();
        break;
      case 'hide':
        this.setHidden(true);
        break;
      case 'auto':
        this.setAuto(!this.auto);
        break;
      case 'skip-start':
        this.skipHeld = true;
        this.runSkip();
        break;
      case 'skip-end':
        this.skipHeld = false;
        this.updateModeButtons();
        break;
      case 'menu':
        this.openMenu();
        break;
    }
  }

  private setAuto(on: boolean): void {
    this.auto = on;
    window.clearTimeout(this.autoTimer);
    this.updateModeButtons();
    if (on && this.presentation?.kind === 'line' && !this.dialogue.typing) this.onLineShown();
  }

  private setSkip(on: boolean): void {
    this.skipToggle = on;
    if (!on) this.skipHeld = false;
    this.updateModeButtons();
    if (on) this.runSkip();
  }

  private runSkip(): void {
    this.updateModeButtons();
    window.clearTimeout(this.skipTimer);
    const tick = () => {
      if (!this.skipping || this.destroyed) return;
      if (!this.uiFocused) {
        this.skipTimer = window.setTimeout(tick, SKIP_INTERVAL_MS);
        return;
      }
      if (this.pendingRevision !== null) this.applyRevision();
      // A cutscene in progress finishes on its own (skipped if already seen); skip resumes after it.
      if (this.presentation.kind === 'cutscene') {
        this.skipTimer = window.setTimeout(tick, SKIP_INTERVAL_MS);
        return;
      }
      if (this.presentation.kind === 'card') {
        this.act(() => this.runtime.advance());
        this.skipTimer = window.setTimeout(tick, SKIP_INTERVAL_MS);
        return;
      }
      if (!this.canSkipCurrent()) {
        this.skipToggle = false;
        this.skipHeld = false;
        this.updateModeButtons();
        if (this.presentation.kind === 'line') this.services.overlays.toast('Пропуск остановлен: новая реплика');
        return;
      }
      this.dialogue.complete();
      this.act(() => this.runtime.advance());
      this.skipTimer = window.setTimeout(tick, SKIP_INTERVAL_MS);
    };
    tick();
  }

  private updateModeButtons(): void {
    this.autoButton.setAttribute('aria-pressed', String(this.auto));
    this.skipButton.setAttribute('aria-pressed', String(this.skipping));
    this.root.classList.toggle('mode-auto', this.auto);
    this.root.classList.toggle('mode-skip', this.skipping);
  }

  private setHidden(hidden: boolean): void {
    this.root.classList.toggle('ui-hidden', hidden);
  }

  private stopTimers(): void {
    window.clearTimeout(this.revisionTimer);
    window.clearTimeout(this.autoTimer);
    window.clearTimeout(this.skipTimer);
  }

  private applySettings(): void {
    const s = this.services.settings.get();
    this.root.style.setProperty('--text-scale', String(s.textScale));
    this.root.style.setProperty('--dialog-opacity', String(s.dialogOpacity));
  }

  // ---- episodes and endings --------------------------------------------

  private startEpisode(id: string, params: Record<string, unknown>): void {
    this.episodeCancel?.();
    const run = runEpisode(this.episodeLayer, id, params, {
      input: this.services.input,
      reduceMotion: this.services.settings.get().reduceMotion,
      onMenu: () => this.openMenu(),
      onFatal: (message) => this.fatal(message),
    });
    this.episodeCancel = run.cancel;
    run.done.then(() => {
      this.episodeCancel = null;
      this.act(() => this.runtime.completeEpisode());
    });
  }

  private showEnding(id: string): void {
    this.services.meta.unlockEnding(id);
    const title = endings[id]?.title ?? id;
    this.episodeLayer.replaceChildren(
      el(
        'div',
        { class: 'ending-card notebook-sheet', 'data-testid': 'ending' },
        el('div', { class: 'episode-kind pixel' }, 'Концовка'),
        el('h2', { class: 'pixel' }, title),
        el('button', { class: 'btn btn-primary', type: 'button', onclick: () => this.services.exitToTitle() }, 'В главное меню'),
      ),
    );
  }

  // ---- saves and panels ------------------------------------------------

  private elapsed(): number {
    const now = performance.now();
    this.playTimeMs += now - this.sessionStart;
    this.sessionStart = now;
    return this.playTimeMs;
  }

  makeSave(): SaveData {
    const scene = this.runtime.currentScene;
    return {
      schema: SAVE_SCHEMA,
      savedAt: new Date().toISOString(),
      playTimeMs: Math.round(this.elapsed()),
      sceneTitle: scene.title,
      chapter: scene.chapter,
      state: this.runtime.snapshot(),
      // The current line is re-added to the backlog when the save is shown again.
      backlog: this.presentation.kind === 'line' ? this.backlog.slice(0, -1) : [...this.backlog],
    };
  }

  private autosave(): void {
    if (this.presentation.kind === 'ending') return;
    const result = this.services.saves.write('auto', this.makeSave());
    if (!result.ok) this.services.overlays.toast(`Автосохранение не удалось: ${result.error}`, 'error');
  }

  private quickSave(): void {
    const result = this.services.saves.write('quick', this.makeSave());
    this.services.overlays.toast(result.ok ? 'Быстрое сохранение готово' : `Не удалось сохранить: ${result.error}`, result.ok ? 'info' : 'error');
  }

  private quickLoad(): void {
    const read = this.services.saves.read('quick');
    if (read.status === 'ok') this.services.loadSave(read.data);
    else this.services.overlays.toast(read.status === 'empty' ? 'Быстрого сохранения нет' : `Сохранение повреждено: ${read.reason}`, 'error');
  }

  private openBacklog(): void {
    this.services.overlays.open('Журнал', backlogView(this.backlog, this.runtime.state.flags), { className: 'panel-backlog' });
  }

  private openSaveLoad(mode: 'save' | 'load'): void {
    let close = () => {};
    const view = saveLoadView({
      mode,
      saves: this.services.saves,
      overlays: this.services.overlays,
      makeSave: () => this.makeSave(),
      onLoad: (data) => {
        close();
        this.services.loadSave(data);
      },
    });
    close = this.services.overlays.open(mode === 'save' ? 'Сохранить' : 'Загрузить', view, { className: 'panel-wide' });
  }

  private openSettings(): void {
    this.services.overlays.open('Настройки', settingsView(this.services.settings));
  }

  private openMenu(): void {
    let close = () => {};
    const item = (label: string, action: () => void) =>
      el('button', { class: 'btn menu-item', type: 'button', onclick: () => (close(), action()) }, label);
    const body = el(
      'div',
      { class: 'menu-list' },
      item('Вернуться к игре', () => {}),
      item('Сохранить', () => this.openSaveLoad('save')),
      item('Загрузить', () => this.openSaveLoad('load')),
      item('Настройки', () => this.openSettings()),
      item('Главное меню', async () => {
        if (await this.services.overlays.confirm('Выйти в главное меню? Несохранённый прогресс после последнего автосохранения будет потерян.', 'Выйти')) {
          this.services.exitToTitle();
        }
      }),
    );
    close = this.services.overlays.open('Меню', body, { className: 'panel-small' });
  }
}
