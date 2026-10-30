// Task sets for the `geometry-quiz` episode.
//   app-lessons, app-lessons-2/3 — Melody's lessons in chapter 2, see geometry-lessons.ts.
//   university-*   — hard university sets, see geometry-university.ts.
//   correct-answer — Mini-game No. 2 «Правильный ответ» (chapter 5): three
//                    ordinary tasks (angles, area, construction) and a fourth
//                    one that cannot be solved in Euclidean geometry.
// Every played set opens with Melody's articles: each task names the article
// that teaches its method (`taughtIn`), and each hint ends with «Ответ: …».
// Task wording is drafted from the synopsis; the author may replace it.
import { lessonSets } from './geometry-lessons';
import { universitySets } from './geometry-university';
import { parseNumber } from './math-input';

export interface FigureSpec {
  /** Polygon vertices in a 0..100 × 0..70 coordinate box. */
  points: [number, number][];
  labels?: { at: [number, number]; text: string }[];
}

export type Answer =
  | { type: 'number'; value: number; tolerance?: number; unit?: string }
  | { type: 'choice'; options: { id: string; text: string }[]; correct: string };

export interface GeometryTask {
  id: string;
  prompt: string;
  figure?: FigureSpec;
  answer: Answer;
  /** How to solve it (Russian), shown on request and after a wrong answer. */
  hint?: string;
  /** Title of the article that teaches the method (in this set; for the board set, in a later lesson). */
  taughtIn?: string;
  /** The condition contradicts itself: every answer is "wrong" (chapter 5). */
  impossible?: boolean;
}

export interface Article {
  title: string;
  body: string;
}

export interface TaskSet {
  title: string;
  articles?: Article[];
  tasks: GeometryTask[];
}

const triangle: FigureSpec['points'] = [
  [12, 62],
  [88, 62],
  [38, 10],
];

const REVIEW = {
  angles: '§1. Повторяем: углы треугольника',
  area: '§2. Повторяем: площадь прямоугольника',
  construct: '§3. Повторяем: можно ли построить треугольник',
};

export const taskSets: Record<string, TaskSet> = {
  ...lessonSets,
  'correct-answer': {
    title: 'Учебная комната — «Правильный ответ»',
    articles: [
      {
        title: REVIEW.angles,
        body: 'Помнишь? Сумма углов треугольника всегда 180°. Чтобы найти третий угол, вычти два известных из 180°.\nПример: углы 40° и 60°. 180° − 40° − 60° = 80°. Я же тебе говорила!',
      },
      {
        title: REVIEW.area,
        body: 'Площадь прямоугольника — длина, умноженная на ширину: S = a · b.\nПример: стороны 3 и 7. S = 3 · 7 = 21.',
      },
      {
        title: REVIEW.construct,
        body: 'Треугольник существует, только если каждая сторона меньше суммы двух других. Достаточно проверить самую длинную.\nПример: 2, 3 и 6. 2 + 3 = 5, а 6 больше 5 — такой треугольник построить нельзя.\nБудь внимательным. Я отмечаю каждый твой ответ.',
      },
    ],
    tasks: [
      {
        id: 'third-angle',
        prompt: '∠A = 50°, ∠B = 60°. Найдите ∠C.',
        taughtIn: REVIEW.angles,
        hint: 'Сумма углов треугольника 180° (§1): ∠C = 180° − 50° − 60° = 70°.\nОтвет: 70°',
        figure: {
          points: triangle,
          labels: [
            { at: [5, 68], text: 'A 50°' },
            { at: [80, 68], text: 'B 60°' },
            { at: [36, 6], text: 'C ?' },
          ],
        },
        answer: {
          type: 'choice',
          options: [
            { id: '60', text: '60°' },
            { id: '70', text: '70°' },
            { id: '80', text: '80°' },
          ],
          correct: '70',
        },
      },
      {
        id: 'rectangle-area',
        prompt: 'Стороны прямоугольника равны 4 и 5. Найдите его площадь.',
        taughtIn: REVIEW.area,
        hint: 'Площадь прямоугольника — произведение сторон (§2): S = 4 · 5 = 20.\nОтвет: 20',
        figure: {
          points: [
            [20, 15],
            [80, 15],
            [80, 55],
            [20, 55],
          ],
          labels: [
            { at: [47, 66], text: '5' },
            { at: [84, 37], text: '4' },
          ],
        },
        answer: { type: 'number', value: 20 },
      },
      {
        id: 'construct-345',
        prompt: 'Можно ли построить треугольник со сторонами 3, 4 и 5?',
        taughtIn: REVIEW.construct,
        hint: 'Неравенство треугольника (§3): самая длинная сторона 5, сумма двух других 3 + 4 = 7, и 5 < 7.\nОтвет: да',
        answer: {
          type: 'choice',
          options: [
            { id: 'yes', text: 'Да' },
            { id: 'no', text: 'Нет' },
          ],
          correct: 'yes',
        },
      },
      {
        id: 'impossible-triangle',
        prompt: 'Постройте треугольник, в котором ∠A = 100°, ∠B = 100°. Найдите ∠C.',
        taughtIn: REVIEW.angles,
        figure: {
          points: triangle,
          labels: [
            { at: [5, 68], text: 'A 100°' },
            { at: [76, 68], text: 'B 100°' },
            { at: [36, 6], text: 'C ?' },
          ],
        },
        answer: { type: 'number', value: Number.NaN },
        impossible: true,
      },
    ],
  },
  ...universitySets,
};

export function checkAnswer(answer: Answer, input: string): boolean {
  if (answer.type === 'choice') return input === answer.correct;
  const value = parseNumber(input);
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - answer.value) <= (answer.tolerance ?? 0);
}
