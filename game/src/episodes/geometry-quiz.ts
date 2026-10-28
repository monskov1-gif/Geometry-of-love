// Geometry mini-game: optional short articles, then tasks (condition, figure,
// answer, check, reaction). Success = every task answered correctly.
// A task marked `impossible` (chapter 5) can never be answered correctly:
// the program marks every answer wrong. Explaining the contradiction is
// rejected; refusing locks the exit, rewrites the earlier correct answers
// and covers the walls with messages — and that refusal is what ends the
// episode, so the story can continue with Dameo's escape.
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

/** Spots around the sheet (outside the task area). */
const WALL_SPOTS = [
  { top: '-2.2em', left: '0' },
  { bottom: '-2.2em', right: '0' },
  { top: '-2.2em', right: '0' },
  { bottom: '-2.2em', left: '0' },
  { top: '40%', right: '-0.5em' },
];

const WALL_MESSAGES = ['ТЫ НЕДОСТАТОЧНО СТАРАЕШЬСЯ', 'НЕПРАВИЛЬНО', 'ПОПРОБУЙ СНОВА', 'ТЫ НЕДОСТАТОЧНО СТАРАЕШЬСЯ', 'СЛУШАЙСЯ'];

export const geometryQuiz: EpisodeDefinition = {
  id: 'geometry-quiz',
  kind: 'minigame',
  title: 'Геометрические задачи',
  instructions: 'Решите каждую задачу. Введите число или выберите вариант и нажмите «Проверить». Пока ответ неверный, задачу нужно решить снова.',
  create({ root, params, reduceMotion }) {
    const setId = String(params.taskSet ?? '');
    const set = taskSets[setId];
    if (!set || set.tasks.length === 0) throw new Error(`geometry-quiz: unknown or empty task set "${setId}"`);
    const tasks = set.tasks;
    const solved: { task: GeometryTask; answer: string }[] = [];
    let finish: ((o: EpisodeOutcome) => void) | null = null;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => finish && fn(), reduceMotion ? Math.min(ms, 150) : ms));

    const historyList = el('ol', { class: 'quiz-history', 'aria-label': 'Ваши ответы' });
    // Not a working control: it appears only when the program locks the exit (story beat).
    const exitButton = el('div', { class: 'quiz-exit is-locked', role: 'status', hidden: true }, '🔒 Выход из урока заблокирован');
    const walls = el('div', { class: 'quiz-walls', 'aria-hidden': 'true' });
    const sheet = el('div', { class: 'quiz notebook-sheet' });
    root.replaceChildren(el('div', { class: 'quiz-room' }, walls, sheet, el('aside', { class: 'quiz-side' }, el('h3', { class: 'pixel' }, 'Ответы'), historyList, exitButton)));

    const renderHistory = () =>
      historyList.replaceChildren(...solved.map((s) => el('li', { dataset: { task: s.task.id } }, `${s.task.prompt.slice(0, 28)}… → ${s.answer}`)));

    const lockdown = (feedback: HTMLElement) => {
      feedback.textContent = 'Выход заблокирован.';
      feedback.dataset.state = 'wrong';
      exitButton.hidden = false;
      sheet.querySelectorAll('button, input').forEach((n) => ((n as HTMLButtonElement).disabled = true));
      // Earlier correct answers are rewritten one by one.
      [...historyList.children].forEach((li, i) =>
        later(500 + i * 450, () => {
          li.classList.add('is-rewritten');
          li.textContent = `${solved[i]!.task.prompt.slice(0, 28)}… → НЕВЕРНО`;
        }),
      );
      WALL_MESSAGES.forEach((text, i) =>
        later(700 + i * 400, () => walls.append(el('span', { class: 'wall-message pixel', style: WALL_SPOTS[i % WALL_SPOTS.length] }, text))),
      );
      later(700 + WALL_MESSAGES.length * 400 + 1200, () => finish?.({ outcome: 'success' }));
    };

    const showTask = (i: number) => {
      const task = tasks[i] as GeometryTask;
      const feedback = el('p', { class: 'quiz-feedback', role: 'status', 'aria-live': 'polite' });
      let selected = '';
      let input: HTMLInputElement | null = null;
      let wrongCount = 0;
      const extra = el('div', { class: 'quiz-extra row' });

      const submit = () => {
        const value = input ? input.value : selected;
        if (!value) {
          feedback.textContent = 'Сначала введите или выберите ответ.';
          feedback.dataset.state = 'hint';
          return;
        }
        if (!task.impossible && checkAnswer(task.answer, value)) {
          feedback.textContent = 'Правильно! Мелоди тобой гордится ★';
          feedback.dataset.state = 'correct';
          checkButton.disabled = true;
          solved.push({ task, answer: input ? value : (task.answer.type === 'choice' ? task.answer.options.find((o) => o.id === value)?.text : value) ?? value });
          renderHistory();
          later(600, () => (i + 1 < tasks.length ? showTask(i + 1) : finish?.({ outcome: 'success' })));
          return;
        }
        wrongCount++;
        feedback.textContent = 'Неверно. Попробуйте ещё раз.';
        feedback.dataset.state = 'wrong';
        if (task.impossible && wrongCount === 1) {
          extra.replaceChildren(
            el(
              'button',
              {
                class: 'btn',
                type: 'button',
                onclick: (e: Event) => {
                  (e.currentTarget as HTMLButtonElement).disabled = true;
                  feedback.textContent = 'Дамео: «Сумма углов треугольника — 180°. Здесь уже 200°. Условие противоречиво». Мелоди: «Неправильно. Попробуй снова».';
                  extra.append(
                    el('button', { class: 'btn btn-danger', type: 'button', onclick: () => lockdown(feedback) }, 'Отказаться решать'),
                  );
                },
              },
              'Объяснить, что условие противоречиво',
            ),
          );
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

      sheet.replaceChildren(
        el('div', { class: 'quiz-progress pixel' }, `${set.title} · Задача ${i + 1} / ${tasks.length}`),
        el('p', { class: 'quiz-prompt' }, task.prompt),
        ...(task.figure ? [renderFigure(task.figure)] : []),
        answerArea,
        checkButton,
        feedback,
        extra,
      );
      input?.focus();
    };

    const showArticle = (i: number) => {
      const articles = set.articles ?? [];
      const article = articles[i];
      if (!article) return showTask(0);
      const next = el(
        'button',
        { class: 'btn btn-primary', type: 'button', onclick: () => showArticle(i + 1) },
        i + 1 < articles.length ? 'Далее' : 'К задачам',
      );
      sheet.replaceChildren(
        el('div', { class: 'quiz-progress pixel' }, `${set.title} · Статья ${i + 1} / ${articles.length}`),
        el('h3', { class: 'pixel' }, article.title),
        el('p', { class: 'quiz-prompt' }, article.body),
        next,
      );
      next.focus();
    };

    return {
      run: () =>
        new Promise<EpisodeOutcome>((resolve) => {
          finish = resolve;
          showArticle(0);
        }),
      destroy: () => {
        finish = null;
        timers.forEach((t) => window.clearTimeout(t));
        root.replaceChildren();
      },
    };
  },
};
