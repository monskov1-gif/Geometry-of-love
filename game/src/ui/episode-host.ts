// Runs one mandatory episode: intro card → episode → success, or failure
// with retry. There is deliberately no "skip" path; only a confirmed success
// resolves the returned promise.
import { episodes } from '../content';
import type { EpisodeInstance } from '../episodes/types';
import type { InputManager } from '../platform/input';
import { el } from './dom';

export interface EpisodeHostOptions {
  input: InputManager;
  reduceMotion: boolean;
  onMenu: () => void;
  onFatal: (message: string) => void;
}

export function runEpisode(
  container: HTMLElement,
  id: string,
  params: Record<string, unknown>,
  opts: EpisodeHostOptions,
): { done: Promise<void>; cancel: () => void } {
  const def = episodes[id];
  const root = el('div', { class: 'episode', 'data-testid': 'episode', dataset: { episode: id } });
  container.append(root);
  let instance: EpisodeInstance | null = null;
  let cancelled = false;
  const popInput = opts.input.push(`episode:${id}`, (action) => {
    if (action === 'menu') opts.onMenu();
  });

  const cleanup = () => {
    instance?.destroy();
    instance = null;
    popInput();
    root.remove();
  };

  const done = new Promise<void>((resolve) => {
    if (!def) {
      cleanup();
      opts.onFatal(`Неизвестный эпизод «${id}»`);
      return;
    }
    const intro = (message?: string) => {
      const start = el('button', { class: 'btn btn-primary', type: 'button', onclick: () => play() }, message ? 'Попробовать снова' : 'Начать');
      root.replaceChildren(
        el(
          'div',
          { class: 'episode-intro notebook-sheet' },
          el('div', { class: 'episode-kind pixel' }, def.kind === 'minigame' ? 'Мини-игра' : 'Интерактивный эпизод'),
          el('h2', { class: 'pixel' }, def.title),
          el('p', {}, def.instructions),
          message ? el('p', { class: 'episode-failure' }, message) : null,
          start,
        ),
      );
      start.focus();
    };
    const play = async () => {
      const stageRoot = el('div', { class: 'episode-stage' });
      root.replaceChildren(stageRoot);
      try {
        instance = def.create({ root: stageRoot, params, reduceMotion: opts.reduceMotion });
        const result = await instance.run();
        if (cancelled) return;
        instance.destroy();
        instance = null;
        if (result.outcome === 'success') {
          cleanup();
          resolve();
        } else intro(`Не получилось: ${result.reason}`);
      } catch (e) {
        console.error(`[episode] ${id} crashed`, e);
        cleanup();
        opts.onFatal(`Эпизод «${def.title}» завершился с ошибкой: ${(e as Error).message}`);
      }
    };
    intro();
  });

  return {
    done,
    cancel: () => {
      cancelled = true;
      cleanup();
    },
  };
}
