// University-level task sets (the author: "at the university they give really
// very hard problems, from higher mathematics"). Analytic geometry, vectors,
// planes and lines in space, conics, curvature, integrals.
//   university-lecture — a hard lecture practice set
//   university-board   — the problem Dameo fails at the blackboard
// Wording and numbers are drafts (not from the synopsis); every answer is
// recomputed in tests/unit/geometry-tasks.test.ts.
import type { FigureSpec, TaskSet } from './geometry-tasks';

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

export const universitySets: Record<string, TaskSet> = {
  'university-lecture': {
    title: 'Аналитическая геометрия — практика',
    tasks: [
      {
        id: 'cross-area',
        prompt: 'Найдите площадь треугольника с вершинами\nA(1, 0, 0), B(0, 2, 0), C(0, 0, 3).',
        hint: 'S = ½·‖AB × AC‖. AB = (−1, 2, 0), AC = (−1, 0, 3), AB × AC = (6, 3, 2), ‖(6, 3, 2)‖ = √(36 + 9 + 4) = 7. Значит, S = 7/2.',
        answer: { type: 'number', value: 3.5, tolerance: 0.001 },
      },
      {
        id: 'point-plane',
        prompt: 'Найдите расстояние от точки M(3, 1, −1) до плоскости\n2x + y − 2z + 9 = 0.',
        hint: 'd = |A·x₀ + B·y₀ + C·z₀ + D| / √(A² + B² + C²) = |6 + 1 + 2 + 9| / √(4 + 1 + 4) = 18 / 3.',
        answer: { type: 'number', value: 6, tolerance: 0.001 },
      },
      {
        id: 'tetra-volume',
        prompt: 'Найдите объём тетраэдра с вершинами\nO(0, 0, 0), A(1, 2, 3), B(2, 0, 1), C(1, 1, 4).',
        hint: 'V = |det(OA, OB, OC)| / 6. det [[1, 2, 3], [2, 0, 1], [1, 1, 4]] = 1·(0 − 1) − 2·(8 − 1) + 3·(2 − 0) = −9. V = 9/6.',
        answer: { type: 'number', value: 1.5, tolerance: 0.001 },
      },
      {
        id: 'ellipse-foci',
        prompt: 'Эллипс задан уравнением x²/25 + y²/9 = 1.\nНайдите расстояние между его фокусами.',
        hint: 'a² = 25, b² = 9, c² = a² − b² = 16, c = 4. Фокусы (±4, 0), расстояние между ними 2c.',
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
        hint: 'Выделите полные квадраты: (x + 1)² − 1 − 4(y − 1)² + 4 − 7 = 0, то есть (x + 1)²/4 − (y − 1)² = 1. Квадраты входят с разными знаками.',
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
        hint: 'Линии пересекаются при x = 0 и x = 2. S = ∫₀² (2x − x²) dx = [x² − x³/3]₀² = 4 − 8/3 = 4/3.',
        figure: {
          points: lens,
          labels: [
            { at: [14, 70], text: '0' },
            { at: [82, 70], text: '2' },
          ],
        },
        answer: { type: 'number', value: 4 / 3, tolerance: 0.01 },
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
        hint: 'd = |(P₂ − P₁) · (d₁ × d₂)| / ‖d₁ × d₂‖. d₁ × d₂ = (1, 1, −1), P₂ − P₁ = (−1, 0, 2), скалярное произведение = −1 + 0 − 2 = −3, ‖d₁ × d₂‖ = √3. d = 3/√3 = √3 ≈ 1,732.',
        answer: { type: 'number', value: Math.sqrt(3), tolerance: 0.005 },
      },
      {
        id: 'helix-curvature',
        prompt: 'Найдите кривизну винтовой линии\nr(t) = (3 cos t, 3 sin t, 4t).',
        hint: 'k = ‖r′ × r″‖ / ‖r′‖³. r′ = (−3 sin t, 3 cos t, 4), ‖r′‖ = 5; r″ = (−3 cos t, −3 sin t, 0); ‖r′ × r″‖ = 3·5 = 15. k = 15/125 = 3/25.',
        answer: { type: 'number', value: 0.12, tolerance: 0.001 },
      },
      {
        id: 'rotation-volume',
        prompt: 'Кривая y = √x, 0 ≤ x ≤ 4, вращается вокруг оси Ox.\nОбъём тела вращения равен kπ. Найдите k.',
        hint: 'V = π·∫₀⁴ y² dx = π·∫₀⁴ x dx = π·[x²/2]₀⁴ = 8π.',
        answer: { type: 'number', value: 8, tolerance: 0.001 },
      },
      {
        id: 'plane-origin',
        prompt: 'Плоскость проходит через точки A(2, 0, 0), B(0, 3, 0), C(0, 0, 6).\nНайдите расстояние от начала координат до этой плоскости.\n(Можно ввести точно, например 6/√14.)',
        hint: 'Уравнение в отрезках: x/2 + y/3 + z/6 = 1, то есть 3x + 2y + z − 6 = 0. d = |−6| / √(9 + 4 + 1) = 6/√14 ≈ 1,604.',
        answer: { type: 'number', value: 6 / Math.sqrt(14), tolerance: 0.005 },
      },
    ],
  },
};
