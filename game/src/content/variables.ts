// Declared story variables. Scripts may only use ids listed here; the content
// validator enforces it. `status` records where each variable comes from.
//
//   canon — directly supported by the synopsis
//   test  — used only by technical test scenes; remove with them
//
// Dameo's personal traits are NOT defined in the synopsis yet. Proposed names
// and scales live in docs/GAME_DESIGN.md and wait for the author's approval;
// do not add traits here until they are approved.

type Status = 'canon' | 'test';

export const relationships: Record<string, { label: string; status: Status; note: string }> = {
  melody: {
    label: 'Отношение Дамео к Мелоди',
    status: 'canon',
    note: 'Гл. 2: поддержать разговор / отшутиться / попросить не задавать личных вопросов',
  },
};

export const traits: Record<string, { label: string; status: Status; note: string }> = {};

export const flags: Record<string, { label: string; status: Status }> = {
  'test.choice-made': { label: 'Тестовая сцена: выбор сделан', status: 'test' },
};
