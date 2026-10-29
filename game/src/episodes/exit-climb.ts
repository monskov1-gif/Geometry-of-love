// Mini-game No. 1 «Выход» (chapter 4): a platformer. Dameo climbs the
// training level towards its top edge — the back of the monitor. Six
// sections (see exit-course.ts); the higher, the less stable the world:
// tiles crumble, windows pop up, and at the end the level erases itself
// from below. A fall restarts the current section from its checkpoint.
// Reaching the glass is the only success; there is no skip.
import { el } from '../ui/dom';
import { makePalette } from './exit-art';
import { buildCourse, VIEW_H, VIEW_W } from './exit-course';
import { startRun, stepRun } from './exit-run';
import { createScene } from './exit-scene';
import { createControls, palette, pixelCanvas, startLoop } from './kit';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

export { buildCourse, VIEW_H, VIEW_W };

const MELODY_LINES = [
  'Мелоди: Прыгай! Выход совсем рядом, я в тебя верю!',
  'Мелоди: Умница! Ещё чуть-чуть выше!',
  'Мелоди: Выше, выше, выше, выше…',
  'Мелоди: Выше. Выше. Выше. Выше. Выше.',
];

const SECTION_HINTS = [
  'Кубики: запрыгивайте с кубика на кубик.',
  'Облака: облака и радужный лифт двигаются — прыгайте, когда они рядом.',
  'Треугольники: плитки рассыпаются, если на них задержаться.',
  'Карусели: встаньте на звезду и прыгайте на соседнее колесо.',
  'Окна: окна приложения открываются и закрываются по очереди.',
  'Наверх: уровень стирается снизу. Быстрее!',
];

export const exitClimb: EpisodeDefinition = {
  id: 'exit-climb',
  kind: 'minigame',
  title: 'Выход',
  instructions:
    'Поднимитесь по учебному уровню к его верхней границе — к обратной стороне монитора. ← → или A / D — движение, ↑ / W / Пробел — прыжок. Шесть участков: движущиеся облака, рассыпающиеся плитки, карусели, всплывающие окна, а в конце уровень стирается снизу. Упав, вы начнёте участок заново с контрольной точки (флажок с сердечком).',
  create({ root, params, reduceMotion }) {
    const { canvas, ctx } = pixelCanvas(VIEW_W, VIEW_H, 'Уровень «Выход»');
    const caption = el('p', { class: 'episode-caption', 'aria-live': 'polite' }, MELODY_LINES[0]);
    const status = el('p', { class: 'episode-caption', dataset: { testid: 'climb-status' } }, `Участок 1 из 6. ${SECTION_HINTS[0]}`);
    const controls = createControls(['left', 'right', 'jump']);
    root.replaceChildren(el('div', { class: 'episode-canvas-wrap' }, caption, canvas, status, controls.bar));

    const course = buildCourse();
    // Dev bench only (world.html): start from a given section to look at it.
    const devSection = import.meta.env.DEV ? Number(params.startSection ?? 0) : 0;
    const run = startRun(course, Number.isInteger(devSection) && devSection > 0 && devSection < course.sections.length ? devSection : 0);
    const scene = createScene(ctx, course, makePalette(palette(root)), reduceMotion);
    let lineIndex = 0;

    const showSection = (prefix: string) => {
      status.textContent = `${prefix}Участок ${run.section + 1} из ${course.sections.length}. ${SECTION_HINTS[run.section]}`;
    };
    showSection('');

    let stop = () => {};
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    const tick = (dt: number) => {
      const jumpPressed = controls.state.jumpPressed;
      controls.state.jumpPressed = false;
      const dir = (controls.state.right ? 1 : 0) - (controls.state.left ? 1 : 0);
      const event = stepRun(course, run, { dir, jumpPressed }, dt);
      if (event === 'checkpoint') showSection('Контрольная точка. ');
      if (event === 'respawn') {
        status.dataset.state = 'wrong';
        showSection(course.sections[run.section]!.hazard ? 'Уровень стёрся под ногами — снова с контрольной точки. ' : 'Сорвался — снова с контрольной точки. ');
      } else if (event) delete status.dataset.state;

      const progress = 1 - (run.best - course.pieces[course.goal]!.y) / (course.height - 40 - course.pieces[course.goal]!.y);
      const next = Math.min(MELODY_LINES.length - 1, Math.floor(progress * MELODY_LINES.length));
      if (next > lineIndex) {
        lineIndex = next;
        caption.textContent = MELODY_LINES[next]!;
      }
      scene.draw(run, dt);
      if (event === 'success') {
        finish?.({ outcome: 'success' });
        return false;
      }
      return true;
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          scene.draw(run, 0);
          stop = startLoop(tick);
        }),
      destroy: () => {
        finish = null;
        stop();
        controls.dispose();
        root.replaceChildren();
      },
    };
  },
};
