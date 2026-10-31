// Mini-game No. 4 «Системные файлы» (chapter 13). Canon: find Dameo's file,
// check the links between files and switch off his binding to the program;
// some data is damaged; the Calculator says what is dangerous; system
// components must not be touched. Four escalating stages (files-stages.ts):
//   1. trace — follow the wires and mark the link files that hang on user_07;
//   2. order — cut only Dameo's links, each after the files hanging on it are freed;
//   3. unstable — the same, while the program locks his files and restores
//      cut links; the Calculator's examples give the unlock digits in time;
//   4. separate — leave no path user_07 → world.map within three cuts.
// Mistakes restart the current stage (files-run.ts); success only after stage 4.
// Look: the code space palette, pixel backdrop and icons (files-art.ts),
// Dameo's and the Calculator's sprites by the hints.
import { el } from '../ui/dom';
import type { Emotion } from '../render/sprites/humans';
import { spriteURL } from './files-art';
import { renderPanel } from './files-panel';
import { StageRun, type RunEvent } from './files-run';
import { STAGES } from './files-stages';
import { graphSvg, renderGraph, svgEl } from './files-view';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

const NEXT_STAGE_MS = 1400;

export const systemFiles: EpisodeDefinition = {
  id: 'system-files',
  kind: 'minigame',
  title: 'Системные файлы',
  instructions:
    'Четыре этапа. Найдите нити, которые держат файл Дамео user_07.usr, и разорвите их, не задев чужие файлы и связи самой программы: на них держится мир. Выбирайте файлы и провода на схеме (мышь, касание или Tab и Enter), действия — на панели справа или снизу. Ошибка откатывает текущий этап.',
  create({ root, reduceMotion }) {
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    let index = 0;
    let run = new StageRun(STAGES[0]!);
    let selectedNode: string | null = null;
    let selectedLink: string | null = null;
    let traced: string[] = [];
    let timer = 0;

    const svg = graphSvg();
    // beside the graph (wide screens) the panel scrolls on its own, so the graph stays in view
    const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 641px)').matches;
    const side = el('div', { class: 'files-side', style: wide ? { maxHeight: '60vh', overflowY: 'auto' } : {} });
    const title = el('h3', { class: 'pixel files-stage', style: { margin: 0, color: 'var(--code-green)' } });
    const hint = el('p', { class: 'episode-caption', 'aria-live': 'polite' });
    const sprite = (id: string, emotion: Emotion) =>
      el('img', { src: spriteURL(id, emotion), alt: '', width: 48, height: 96, style: { imageRendering: 'pixelated', flex: 'none', width: '48px', height: '96px' } });
    const dameo = sprite('dameo', 'tired');
    const calc = sprite('calculator', 'neutral');
    root.replaceChildren(
      el(
        'div',
        { class: 'files' },
        title,
        el('div', { style: { display: 'flex', gap: 'var(--space-2)', alignItems: 'center' } }, dameo, calc, hint),
        el('div', { class: 'files-main' }, svg, side),
      ),
    );

    // a slow scanline over the graph (still when reduce-motion is on)
    const scan = svgEl('rect', { x: -50, y: 0, width: 220, height: 1.2, fill: 'var(--code-green)', opacity: 0.12, 'pointer-events': 'none' });
    let frame = 0;
    if (!reduceMotion) {
      const t0 = performance.now();
      const loop = (now: number) => {
        scan.setAttribute('y', String((((now - t0) / 60) % 104) - 2));
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    const say = (e: RunEvent) => {
      if (!e.text) return;
      hint.textContent = e.text;
      hint.dataset.state = e.tone === 'bad' || e.tone === 'reset' ? 'wrong' : '';
      calc.src = spriteURL('calculator', e.emotion);
      dameo.src = spriteURL('dameo', e.tone === 'reset' ? 'scared' : e.tone === 'done' ? 'neutral' : 'tired');
    };

    const render = () => {
      const focused = (document.activeElement as HTMLElement | null)?.dataset?.focus;
      title.textContent = run.stage.title;
      renderGraph(svg, run.stage, { selectedNode, selectedLink, cut: run.cut, tags: run.tags, locked: run.lock?.node ?? null, relinked: run.relinked, traced }, { node: selectNode, link: selectLink }, scan);
      renderPanel(side, run, selectedNode, selectedLink, { cut: onCut, tag: onTag, submitTags: onSubmit, trace: onTrace, digit: onDigit });
      if (focused) root.querySelector<HTMLElement | SVGElement>(`[data-focus="${focused}"]`)?.focus();
    };

    const startStage = (i: number) => {
      index = i;
      run = new StageRun(STAGES[i]!);
      selectedNode = null;
      selectedLink = null;
      traced = [];
      say({ tone: 'info', text: run.stage.intro, emotion: 'neutral' });
      render();
    };

    const handle = (e: RunEvent) => {
      if (e.tone === 'reset') {
        selectedNode = null;
        selectedLink = null;
        traced = [];
      }
      say(e);
      render();
      if (e.tone !== 'done') return;
      window.setTimeout(() => {
        if (!finish) return;
        if (index + 1 < STAGES.length) startStage(index + 1);
        else finish({ outcome: 'success' });
      }, NEXT_STAGE_MS);
    };

    const selectNode = (id: string) => {
      selectedNode = id;
      selectedLink = null;
      render();
    };
    const selectLink = (id: string) => {
      selectedLink = id;
      selectedNode = null;
      render();
    };
    const onCut = (id: string) => {
      traced = [];
      handle(run.tryCut(id));
    };
    const onTag = (id: string) => {
      run.toggleTag(id);
      render();
    };
    const onSubmit = () => handle(run.submitTags());
    const onTrace = () => {
      traced = run.trace() ?? [];
      say({ tone: 'info', text: traced.length ? `Калькулятор: «Путь ещё есть — подсветил его жёлтым. Проводов в нём: ${traced.length}».` : 'Калькулятор: «Путей нет».', emotion: 'neutral' });
      render();
    };
    const onDigit = (d: string) => {
      if (run.lock) handle(run.typeDigit(d));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!run.lock || !/^[0-9]$/.test(e.key)) return;
      e.preventDefault();
      onDigit(e.key);
    };
    window.addEventListener('keydown', onKey);

    let last = performance.now();
    timer = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const e = run.tick(dt);
      if (e) handle(e);
      const bar = side.querySelector<HTMLElement>('[data-lock-left]');
      if (bar && run.lock) bar.style.width = `${(100 * run.lock.left) / run.lock.limit}%`;
    }, 100);

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          startStage(0);
        }),
      destroy: () => {
        finish = null;
        cancelAnimationFrame(frame);
        window.clearInterval(timer);
        window.removeEventListener('keydown', onKey);
        root.replaceChildren();
      },
    };
  },
};
