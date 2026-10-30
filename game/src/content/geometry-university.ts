// University-level task sets (the author: "at the university they give really
// very hard problems, from higher mathematics").
//   university-lecture — Melody's evening lesson a week later (ch02-day4): conics,
//                        area between curves, solids of revolution, curvature.
//                        Each method is taught by an article with a worked
//                        example (two of them are the board's own problems).
//   university-board   — the problems chalked on the seminar board (ch02-day2),
//                        which Dameo fails by canon. The classroom location
//                        renders them: keep ids and order stable.
// Wording and numbers are drafts (not from the synopsis); every answer is
// recomputed in tests/unit/geometry-tasks.test.ts, and every hint ends with
// «Ответ: …» equal to the accepted answer.
import type { FigureSpec, TaskSet } from './geometry-tasks';
import { L2, L3 } from './geometry-lessons';

/** Polygon outline of a curve given in figure coordinates. */
function curve(n: number, at: (t: number) => [number, number]): FigureSpec['points'] {
  return Array.from({ length: n }, (_, k) => {
    const [x, y] = at(k / n);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as [number, number];
  });
}

// x²/25 + y²/9 = 1 drawn 8 px per unit around (50, 35)
const ellipse = curve(36, (t) => [50 + 40 * Math.cos(2 * Math.PI * t), 35 - 24 * Math.sin(2 * Math.PI * t)]);
// region between y = 2x (top) and y = x² (bottom), 0 ≤ x ≤ 2; 30 px per unit across, 15 up, from (20, 66)
const lens: FigureSpec['points'] = [
  ...curve(10, (t) => [20 + 60 * t, 66 - 15 * 4 * t * t]),
  [80, 6],
  ...curve(10, (t) => [80 - 60 * t, 66 - 15 * 2 * (2 - 2 * t)]),
];

const LECTURE = {
  ellipse: '§1. Эллипс и его фокусы',
  conic: '§2. Какая это кривая?',
  area: '§3. Площадь между кривыми',
  rotation: '§4. Объём тела вращения',
  curvature: '§5. Кривизна пространственной кривой',
};

export const universitySets: Record<string, TaskSet> = {
  'university-lecture': {
    title: 'メロディのまほう — Урок 04 · Кривые и интегралы',
    articles: [
      {
        title: LECTURE.ellipse,
        body: 'Каноническое уравнение эллипса: x²/a² + y²/b² = 1, где a ≥ b. a — большая полуось, b — малая.\nФокусы лежат на большой оси в точках (−c, 0) и (c, 0), где c² = a² − b².\nРасстояние между фокусами — 2c. Не забудь умножить на 2, это самая частая ошибка!\nПример: x²/169 + y²/25 = 1. a² = 169, b² = 25, c² = 169 − 25 = 144, c = 12. Расстояние между фокусами 2c = 2 · 12 = 24.',
      },
      {
        title: LECTURE.conic,
        body: 'Если в уравнении есть x², y², x и y, выдели полные квадраты: x² + px = (x + p/2)² − p²/4.\nПотом посмотри на знаки при квадратах:\n• знаки одинаковые — эллипс (или окружность);\n• знаки разные — гипербола (а если справа остался 0 — пара пересекающихся прямых);\n• квадрат только один — парабола.\nПример: x² + 4y² − 4x + 8y + 4 = 0. x² − 4x = (x − 2)² − 4; 4y² + 8y = 4(y + 1)² − 4.\nПолучаем (x − 2)² + 4(y + 1)² = 4, то есть (x − 2)²/4 + (y + 1)² = 1. Знаки одинаковые — эллипс!',
      },
      {
        title: LECTURE.area,
        body: 'Площадь между графиками — интеграл от «верхней» функции минус «нижней»:\nS = ∫ₐᵇ (f(x) − g(x)) dx.\nГраницы a и b — точки пересечения: решаем f(x) = g(x).\nПример: y = x и y = x². x = x² → x = 0 или x = 1. На [0, 1] прямая выше параболы:\nS = ∫₀¹ (x − x²) dx = [x²/2 − x³/3]₀¹ = 1/2 − 1/3 = 1/6.',
      },
      {
        title: LECTURE.rotation,
        body: 'Кривая y = f(x) на отрезке [a, b] вращается вокруг оси Ox. Каждый её срез — круг радиуса f(x), его площадь π·f(x)². Складываем срезы:\nV = π · ∫ₐᵇ f(x)² dx.\nПример с доски: y = √x, 0 ≤ x ≤ 4. V = π·∫₀⁴ (√x)² dx = π·∫₀⁴ x dx = π·[x²/2]₀⁴ = 8π.\nЕсли спрашивают k в записи V = kπ, ответ просто 8.',
      },
      {
        title: LECTURE.curvature,
        body: 'Кривизна показывает, как сильно кривая изгибается:\nk = |r′ × r″| / |r′|³.\nШаги: 1) производные r′ и r″; 2) их векторное произведение (Урок 02, §3) и его длина; 3) длина r′ в кубе; 4) делим.\nПример с доски: винтовая линия r(t) = (3 cos t, 3 sin t, 4t).\nr′ = (−3 sin t, 3 cos t, 4), |r′| = √(9 + 16) = 5.\nr″ = (−3 cos t, −3 sin t, 0).\nr′ × r″ = (12 sin t, −12 cos t, 9), его длина √(144 + 81) = 15.\nk = 15 / 5³ = 15/125 = 3/25.\nДля любой винтовой линии (a cos t, a sin t, bt) выходит k = a / (a² + b²): 3 / (9 + 16) = 3/25. Сходится! Ты у меня самый умный.',
      },
    ],
    tasks: [
      {
        id: 'ellipse-foci',
        prompt: 'Эллипс задан уравнением x²/25 + y²/9 = 1.\nНайдите расстояние между его фокусами.',
        taughtIn: LECTURE.ellipse,
        hint: 'Как в §1: a² = 25, b² = 9.\nc² = a² − b² = 25 − 9 = 16, c = 4. Фокусы в точках (−4, 0) и (4, 0).\nРасстояние между ними 2c = 2 · 4 = 8.\nОтвет: 8',
        figure: {
          points: ellipse,
          labels: [
            { at: [91, 38], text: '5' },
            { at: [51, 9], text: '3' },
          ],
        },
        answer: { type: 'number', value: 8, tolerance: 0.001 },
      },
      {
        id: 'conic-type',
        prompt: 'Какую кривую задаёт уравнение\nx² − 4y² + 2x + 8y − 7 = 0?',
        taughtIn: LECTURE.conic,
        hint: 'Выделяем полные квадраты (§2): x² + 2x = (x + 1)² − 1; −4y² + 8y = −4(y − 1)² + 4.\n(x + 1)² − 1 − 4(y − 1)² + 4 − 7 = 0, то есть (x + 1)² − 4(y − 1)² = 4, или (x + 1)²/4 − (y − 1)² = 1.\nЗнаки при квадратах разные, справа не 0.\nОтвет: гипербола',
        answer: {
          type: 'choice',
          options: [
            { id: 'ellipse', text: 'Эллипс' },
            { id: 'hyperbola', text: 'Гипербола' },
            { id: 'parabola', text: 'Парабола' },
            { id: 'lines', text: 'Пара пересекающихся прямых' },
          ],
          correct: 'hyperbola',
        },
      },
      {
        id: 'area-integral',
        prompt: 'Найдите площадь фигуры, ограниченной линиями\ny = x² и y = 2x.\n(Можно ввести дробью, например 5/2.)',
        taughtIn: LECTURE.area,
        hint: 'Как в §3. Точки пересечения: x² = 2x → x = 0 или x = 2. На [0, 2] прямая выше параболы.\nS = ∫₀² (2x − x²) dx = [x² − x³/3]₀² = 4 − 8/3 = 4/3.\nОтвет: 4/3 ≈ 1,333',
        figure: {
          points: lens,
          labels: [
            { at: [14, 70], text: '0' },
            { at: [82, 70], text: '2' },
          ],
        },
        answer: { type: 'number', value: 4 / 3, tolerance: 0.01 },
      },
      {
        id: 'rotation-volume-lesson',
        prompt: 'Кривая y = x², 0 ≤ x ≤ 2, вращается вокруг оси Ox.\nОбъём тела вращения равен kπ. Найдите k.\n(Можно ввести дробью, например 5/2.)',
        taughtIn: LECTURE.rotation,
        hint: 'Формула из §4: V = π·∫₀² (x²)² dx = π·∫₀² x⁴ dx = π·[x⁵/5]₀² = 32π/5.\nЗначит, k = 32/5.\nОтвет: 32/5 = 6,4',
        answer: { type: 'number', value: 32 / 5, tolerance: 0.001 },
      },
      {
        id: 'helix-curvature-lesson',
        prompt: 'Найдите кривизну винтовой линии\nr(t) = (4 cos t, 4 sin t, 3t).\n(Можно ввести дробью, например 5/2.)',
        taughtIn: LECTURE.curvature,
        hint: 'Шаги из §5.\nr′ = (−4 sin t, 4 cos t, 3), |r′| = √(16 + 9) = 5.\nr″ = (−4 cos t, −4 sin t, 0).\nr′ × r″ = (12 sin t, −12 cos t, 16), его длина √(144 + 256) = 20.\nk = 20 / 5³ = 20/125 = 4/25.\nОтвет: 4/25 = 0,16',
        answer: { type: 'number', value: 4 / 25, tolerance: 0.001 },
      },
    ],
  },
  'university-board': {
    title: 'У доски — высшая математика',
    tasks: [
      {
        id: 'skew-lines',
        prompt:
          'Найдите расстояние между скрещивающимися прямыми\nL₁: r = (1, 0, 0) + t·(0, 1, 1),\nL₂: r = (0, 0, 2) + s·(1, 0, 1).\n(Можно ввести точно, например √3.)',
        taughtIn: L2.skew, // Melody teaches it that evening, with this very problem as the example
        hint: 'd = |(P₂ − P₁) · (d₁ × d₂)| / ‖d₁ × d₂‖. d₁ × d₂ = (1, 1, −1), P₂ − P₁ = (−1, 0, 2), скалярное произведение = −1 + 0 − 2 = −3, ‖d₁ × d₂‖ = √3. d = 3/√3 = √3.\nОтвет: √3 ≈ 1,732',
        answer: { type: 'number', value: Math.sqrt(3), tolerance: 0.005 },
      },
      {
        id: 'helix-curvature',
        prompt: 'Найдите кривизну винтовой линии\nr(t) = (3 cos t, 3 sin t, 4t).',
        taughtIn: LECTURE.curvature,
        hint: 'k = ‖r′ × r″‖ / ‖r′‖³. r′ = (−3 sin t, 3 cos t, 4), ‖r′‖ = 5; r″ = (−3 cos t, −3 sin t, 0); ‖r′ × r″‖ = 3·5 = 15. k = 15/125 = 3/25.\nОтвет: 3/25 = 0,12',
        answer: { type: 'number', value: 0.12, tolerance: 0.001 },
      },
      {
        id: 'rotation-volume',
        prompt: 'Кривая y = √x, 0 ≤ x ≤ 4, вращается вокруг оси Ox.\nОбъём тела вращения равен kπ. Найдите k.',
        taughtIn: LECTURE.rotation,
        hint: 'V = π·∫₀⁴ y² dx = π·∫₀⁴ x dx = π·[x²/2]₀⁴ = 8π, k = 8.\nОтвет: 8',
        answer: { type: 'number', value: 8, tolerance: 0.001 },
      },
      {
        id: 'plane-origin',
        prompt: 'Плоскость проходит через точки A(2, 0, 0), B(0, 3, 0), C(0, 0, 6).\nНайдите расстояние от начала координат до этой плоскости.\n(Можно ввести точно, например 6/√14.)',
        taughtIn: L3.distance,
        hint: 'Уравнение в отрезках: x/2 + y/3 + z/6 = 1, то есть 3x + 2y + z − 6 = 0. d = |−6| / √(9 + 4 + 1) = 6/√14.\nОтвет: 6/√14 ≈ 1,604',
        answer: { type: 'number', value: 6 / Math.sqrt(14), tolerance: 0.005 },
      },
    ],
  },
};
