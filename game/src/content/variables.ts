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
  'ch2.anonymous': { label: 'Пытался назваться «Анонимом»', note: 'Гл. 2 (развитие): программа сама подставляет имя' },
  'ch2.told-board': { label: 'Рассказал Мелоди об унижении у доски', note: 'Гл. 2 (развитие)' },
  'ch2.boundary': { label: 'Ответил Мелоди «это не твоё дело»', note: 'Гл. 2: «просить её не задавать личных вопросов»' },
  'ch3.flattered': { label: 'Ревность Мелоди польстила Дамео', note: 'Гл. 3: «ревнует к Сацуки»' },
  'sandbox.calculator': { label: 'Познакомился с Калькулятором-Пушином', note: 'Гл. 6' },
  'sandbox.ruler': { label: 'Познакомился с Говорящей Линейкой', note: 'Гл. 6' },
  'sandbox.compass': { label: 'Познакомился с Циркулёнком', note: 'Гл. 6' },
  'sandbox.erasers': { label: 'Познакомился с Ластиками', note: 'Гл. 6' },
  'archive.records': { label: 'Прочитал записи пользователей', note: 'Гл. 7' },
  'archive.calculator': { label: 'Расспросил Калькулятора о прошлом', note: 'Гл. 7' },
  'erased.eraser-1': { label: 'Имя первого Ластика стёрто из интерфейса', note: 'Гл. 9: «Имя погибшего исчезает из интерфейса»' },
  'ch7.memory-list': {
    label: 'Дамео записал, что помнит о себе',
    note: 'Гл. 7 (развитие): «рискует потерять собственную личность»; отзывается в гл. 9, 12 и Концовке № 2',
  },
  'ch8.trusted-calculator': {
    label: 'Дамео сказал Пушину, что доверяет ему',
    note: 'Гл. 8 (развитие) — накануне доноса; отзывается в гл. 10 и 15',
  },
  'ch12.talk-later': {
    label: '«Поговорим, когда выберемся»',
    note: 'Гл. 12: «не прощает его сразу, но принимает помощь»; отзывается в гл. 15',
  },
};
