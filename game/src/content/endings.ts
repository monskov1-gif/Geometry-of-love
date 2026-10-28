// The three endings from the synopsis, plus the technical test ending.
export const endings: Record<string, { title: string; status: 'canon' | 'test' }> = {
  'self-taught': { title: 'Самоучка', status: 'canon' },
  'favorite-student': { title: 'Мой любимый ученик', status: 'canon' },
  'beyond-the-screen': { title: 'За пределами экрана', status: 'canon' },
  'test-complete': { title: 'Тестовый прогон завершён', status: 'test' },
};
