// Task sets for the `geometry-quiz` episode. The quiz mechanic is meant for
// Mini-game No. 2 «Правильный ответ» and the short onboarding in
// «Мелоди но махо» (both in the synopsis). The real tasks are not written yet;
// only the technical test set exists.

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
}

export interface TaskSet {
  title: string;
  status: 'canon' | 'test';
  tasks: GeometryTask[];
}

const triangle: FigureSpec['points'] = [
  [12, 62],
  [88, 62],
  [38, 10],
];

export const taskSets: Record<string, TaskSet> = {
  'test-basics': {
    title: 'Тестовые задачи (не канон)',
    status: 'test',
    tasks: [
      {
        id: 'angle-sum',
        prompt: 'Чему равна сумма внутренних углов треугольника?',
        figure: { points: triangle },
        answer: { type: 'number', value: 180, unit: '°' },
      },
      {
        id: 'third-angle',
        prompt: '∠A = 50°, ∠B = 60°. Найдите ∠C.',
        figure: {
          points: triangle,
          labels: [
            { at: [7, 68], text: 'A 50°' },
            { at: [84, 68], text: 'B 60°' },
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
    ],
  },
};

export function checkAnswer(answer: Answer, input: string): boolean {
  if (answer.type === 'choice') return input === answer.correct;
  const value = Number(input.replace(',', '.').replace(/[°\s]/g, ''));
  if (!Number.isFinite(value) || input.trim() === '') return false;
  return Math.abs(value - answer.value) <= (answer.tolerance ?? 0);
}
