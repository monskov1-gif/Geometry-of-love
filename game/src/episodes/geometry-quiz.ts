// Geometry task mini-game: condition, figure, answer input, check, reaction.
// Success = every task in the set answered correctly. Wrong answers are
// marked and the player answers again; there is no way to skip a task.
import { checkAnswer, taskSets, type FigureSpec, type GeometryTask } from '../content/geometry-tasks';
import { el } from '../ui/dom';
import type { EpisodeDefinition, EpisodeOutcome } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

function renderFigure(figure: FigureSpec): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 72');
  svg.setAttribute('class', 'quiz-figure');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Чертёж к задаче');
  const polygon = document.createElementNS(SVG_NS, 'polygon');
  polygon.setAttribute('points', figure.points.map((p) => p.join(',')).join(' '));
  svg.append(polygon);
  for (const [x, y] of figure.points) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', '1.6');
    svg.append(dot);
  }
  for (const label of figure.labels ?? []) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(label.at[0]));
    text.setAttribute('y', String(label.at[1]));
    text.textContent = label.text;
    svg.append(text);
  }
  return svg;
}

export const geometryQuiz: EpisodeDefinition = {
  id: 'geometry-quiz',
  kind: 'minigame',
  title: 'Геометрические задачи',
  instructions: 'Решите каждую задачу. Введите число или выберите вариант и нажмите «Проверить». Пока ответ неверный, задачу нужно решить снова.',
  create({ root, params }) {
    const setId = String(params.taskSet ?? '');
    const set = taskSets[setId];
    if (!set || set.tasks.length === 0) throw new Error(`geometry-quiz: unknown or empty task set "${setId}"`);
    const tasks = set.tasks;
    let finish: ((o: EpisodeOutcome) => void) | null = null;

    const showTask = (i: number) => {
      const task = tasks[i] as GeometryTask;
      const feedback = el('p', { class: 'quiz-feedback', role: 'status', 'aria-live': 'polite' });
      let selected = '';
      let input: HTMLInputElement | null = null;

      const submit = () => {
        const value = input ? input.value : selected;
        if (!value) {
          feedback.textContent = 'Сначала введите или выберите ответ.';
          feedback.dataset.state = 'hint';
          return;
        }
        if (checkAnswer(task.answer, value)) {
          feedback.textContent = 'Правильно!';
          feedback.dataset.state = 'correct';
          checkButton.disabled = true;
          window.setTimeout(() => {
            if (!finish) return; // destroyed meanwhile
            if (i + 1 < tasks.length) showTask(i + 1);
            else finish({ outcome: 'success' });
          }, 600);
        } else {
          feedback.textContent = 'Неверно. Попробуйте ещё раз.';
          feedback.dataset.state = 'wrong';
        }
      };

      let answerArea: HTMLElement;
      if (task.answer.type === 'number') {
        input = el('input', {
          class: 'quiz-input',
          type: 'text',
          inputmode: 'decimal',
          'aria-label': 'Ответ',
          autocomplete: 'off',
          onkeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter') submit();
          },
        });
        answerArea = el('div', { class: 'quiz-answer' }, input, task.answer.unit ? el('span', {}, task.answer.unit) : null);
      } else {
        const buttons = task.answer.options.map((o) =>
          el(
            'button',
            {
              class: 'btn quiz-option',
              type: 'button',
              'aria-pressed': 'false',
              onclick: (e: Event) => {
                selected = o.id;
                for (const b of buttons) b.setAttribute('aria-pressed', String(b === e.currentTarget));
              },
            },
            o.text,
          ),
        );
        answerArea = el('div', { class: 'quiz-answer quiz-options' }, ...buttons);
      }
      const checkButton = el('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, 'Проверить');

      root.replaceChildren(
        el(
          'div',
          { class: 'quiz notebook-sheet' },
          el('div', { class: 'quiz-progress pixel' }, `Задача ${i + 1} / ${tasks.length}`),
          el('p', { class: 'quiz-prompt' }, task.prompt),
          task.figure ? renderFigure(task.figure) : null,
          answerArea,
          checkButton,
          feedback,
        ),
      );
      input?.focus();
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          showTask(0);
        }),
      destroy: () => {
        finish = null;
        root.replaceChildren();
      },
    };
  },
};
