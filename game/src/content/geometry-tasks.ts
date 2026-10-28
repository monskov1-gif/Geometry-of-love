// Task sets for the `geometry-quiz` episode.
//   app-lessons    — the short onboarding of «Мелоди но махо» (chapter 2):
//                    a few short articles, simple instructions, very easy tasks.
//   correct-answer — Mini-game No. 2 «Правильный ответ» (chapter 5): three
//                    ordinary tasks (angles, area, construction) and a fourth
//                    one that cannot be solved in Euclidean geometry.
// Task wording is drafted from the synopsis; the author may replace it.

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

export const taskSets: Record<string, TaskSet> = {
  'app-lessons': {
    title: 'メロディのまほう — Урок 01',
    articles: [
      {
        title: 'Урок 01. Точка, отрезок, угол',
        body: 'Точка не имеет размера. Отрезок соединяет две точки. Два луча с общим началом образуют угол. Углы измеряют в градусах: прямой угол равен 90°.',
      },
      {
        title: 'Урок 02. Треугольник',
        body: 'Треугольник — фигура из трёх отрезков. Сумма его внутренних углов всегда равна 180°. Запомни это — Мелоди обязательно спросит!',
      },
      {
        title: 'Как отвечать',
        body: 'Введи число или выбери вариант, затем нажми «Проверить». Ошибся — ничего страшного, попробуй ещё раз. Мелоди всегда рядом!',
      },
    ],
    tasks: [
      { id: 'right-angle', prompt: 'Сколько градусов в прямом угле?', answer: { type: 'number', value: 90, unit: '°' } },
      {
        id: 'triangle-sides',
        prompt: 'Сколько сторон у треугольника?',
        figure: { points: triangle },
        answer: {
          type: 'choice',
          options: [
            { id: '3', text: '3' },
            { id: '4', text: '4' },
            { id: '5', text: '5' },
          ],
          correct: '3',
        },
      },
      {
        id: 'square-perimeter',
        prompt: 'Сторона квадрата равна 2. Чему равен его периметр?',
        figure: {
          points: [
            [30, 10],
            [70, 10],
            [70, 50],
            [30, 50],
          ],
          labels: [{ at: [45, 64], text: '2' }],
        },
        answer: { type: 'number', value: 8 },
      },
    ],
  },
  'correct-answer': {
    title: 'Учебная комната — «Правильный ответ»',
    tasks: [
      {
        id: 'third-angle',
        prompt: '∠A = 50°, ∠B = 60°. Найдите ∠C.',
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
};

export function checkAnswer(answer: Answer, input: string): boolean {
  if (answer.type === 'choice') return input === answer.correct;
  const value = Number(input.replace(',', '.').replace(/[°\s]/g, ''));
  if (!Number.isFinite(value) || input.trim() === '') return false;
  return Math.abs(value - answer.value) <= (answer.tolerance ?? 0);
}
