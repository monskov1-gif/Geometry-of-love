// Declared story variables. Scripts may only use ids listed here; the content
// validator enforces it. Every entry names its source in the synopsis.
//
// Dameo's personal traits are NOT defined in the synopsis. Proposed names
// and scales live in docs/GAME_DESIGN.md and wait for the author's approval;
// do not add traits here until they are approved.

export const relationships: Record<string, { label: string; note: string }> = {
  melody: {
    label: 'Отношение Дамео к Мелоди',
    note: 'Гл. 2: поддержать разговор / отшутиться / попросить не задавать личных вопросов. Влияет на реплики гл. 3 и 14.',
  },
};

export const traits: Record<string, { label: string; note: string }> = {};

export const flags: Record<string, { label: string; note: string }> = {
  'sandbox.calculator': { label: 'Познакомился с Калькулятором-Пушином', note: 'Гл. 6' },
  'sandbox.ruler': { label: 'Познакомился с Говорящей Линейкой', note: 'Гл. 6' },
  'sandbox.compass': { label: 'Познакомился с Циркулёнком', note: 'Гл. 6' },
  'sandbox.erasers': { label: 'Познакомился с Ластиками', note: 'Гл. 6' },
  'archive.records': { label: 'Прочитал записи пользователей', note: 'Гл. 7' },
  'archive.calculator': { label: 'Расспросил Калькулятора о прошлом', note: 'Гл. 7' },
  'erased.eraser-1': { label: 'Имя первого Ластика стёрто из интерфейса', note: 'Гл. 9: «Имя погибшего исчезает из интерфейса»' },
};
