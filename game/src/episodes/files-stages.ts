// Data of «Системные файлы» (chapter 13): the file catalog and the four stages.
// Canon (synopsis): find Dameo's file, check the links between files, switch
// off his binding to the program; part of the data is damaged since the first
// Eraser, Compass and Ruler vanished; the Calculator explains what may be
// changed and what is dangerous; system components must not be touched.
// File names other than user_0N.usr, core.sys, world.map, session.lnk and
// progress.dat, all Calculator lines and the puzzle rules are draft gameplay
// text (not synopsis canon) and are open for the author's edits.
import type { FileKind, Graph, GraphLink, GraphNode } from './files-graph';

export interface FileInfo {
  label: string;
  kind: FileKind;
  meta: string;
}

const LINK_META = 'Файл-связка. Владелец в заголовке не указан — смотри, кто на нём держится.';

export const FILES: Record<string, FileInfo> = {
  core: { label: 'core.sys', kind: 'system', meta: 'Ядро программы. Системный компонент.' },
  world: { label: 'world.map', kind: 'system', meta: 'Карта мира и Песочницы. Системный компонент.' },
  session: { label: 'session.lnk', kind: 'link', meta: LINK_META },
  progress: { label: 'progress.dat', kind: 'link', meta: LINK_META },
  profile: { label: 'profile.cfg', kind: 'link', meta: LINK_META },
  cache: { label: 'cache.tmp', kind: 'link', meta: LINK_META },
  index: { label: 'index.idx', kind: 'link', meta: LINK_META },
  sync: { label: 'sync.lnk', kind: 'link', meta: LINK_META },
  journal: { label: 'journal.log', kind: 'link', meta: LINK_META },
  avatar: { label: 'avatar.spr', kind: 'link', meta: LINK_META },
  u01: { label: 'user_01.usr', kind: 'damaged', meta: 'Владелец: ▒▒▒. Последний вход: дата не читается. Файл повреждён.' },
  u02: { label: 'user_02.usr', kind: 'damaged', meta: 'Владелец: ▒▒▒▒▒. Последний вход: дата не читается. Файл повреждён.' },
  u03: { label: 'user_03.usr', kind: 'damaged', meta: 'Владелец: ▒▒▒▒▒. Последний вход: 2009 г. Файл повреждён: данные стёрты.' },
  u04: { label: 'user_04.usr', kind: 'damaged', meta: 'Владелец: ▒▒▒▒. Последний вход: 2010 г. Файл повреждён.' },
  u05: { label: 'user_05.usr', kind: 'damaged', meta: 'Владелец: ▒▒▒▒. Повреждён. Последняя запись: «держу дверь».' },
  u06: { label: 'user_06.usr', kind: 'damaged', meta: 'Владелец: ▒▒▒▒▒▒. Повреждён. Длина: предельная.' },
  u07: { label: 'user_07.usr', kind: 'user', meta: 'Владелец: Дамео. Статус: «становится частью кода».' },
};

export type StageKind = 'trace' | 'order' | 'unstable' | 'separate';

export interface StageNode extends GraphNode {
  x: number;
  y: number;
}

export interface Stage extends Graph {
  kind: StageKind;
  title: string;
  /** Calculator's briefing at the start (and after every restart) of the stage. */
  intro: string;
  nodes: StageNode[];
  /** separate: how many cuts the system survives. */
  budget?: number;
}

/** The graph's coordinate box (viewBox) and its 4×4 grid of file slots. */
export const VIEW = { w: 120, h: 100 };
const COLS = [15, 45, 75, 105];
const ROWS = [10, 37, 64, 90];

const nodes = (spec: Record<string, [number, number]>): StageNode[] =>
  Object.entries(spec).map(([id, [c, r]]) => {
    const info = FILES[id];
    if (!info) throw new Error(`system-files: unknown file ${id}`);
    const x = COLS[Math.floor(c)]! + (c % 1) * 30;
    return { id, kind: info.kind, x, y: ROWS[r]! };
  });

const links = (prefix: string, pairs: string): GraphLink[] =>
  pairs
    .trim()
    .split(/\s+/)
    .map((pair, i) => {
      const [from, to] = pair.split('>');
      return { id: `${prefix}${i + 1}`, from: from!, to: to! };
    });

export const STAGES: Stage[] = [
  {
    kind: 'trace',
    title: 'Этап 1 из 4. Чьи нити',
    intro:
      'Калькулятор: «Нити от твоего файла уходят в файлы-связки, а у тех владелец не подписан. Иди по проводам от user_07.usr и пометь все связки, которые держатся на тебе. Чужие не трогай — на них висят стёртые пользователи».',
    nodes: nodes({
      core: [0.5, 0], world: [2.5, 0],
      session: [0, 1], cache: [1, 1], index: [2, 1], sync: [3, 1],
      progress: [0, 2], journal: [1, 2], profile: [2, 2], avatar: [3, 2],
      u02: [0, 3], u07: [1, 3], u04: [2, 3], u05: [3, 3],
    }),
    links: links('t', 'u07>avatar avatar>session session>core u07>profile profile>index index>world u02>journal journal>sync sync>world u04>progress progress>cache cache>core u05>progress world>core'),
  },
  {
    kind: 'order',
    title: 'Этап 2 из 4. Порядок',
    intro:
      'Калькулятор: «Теперь режь — только свои нити. Связь можно рвать, когда на её файле больше ничего твоего не висит: начинай от себя. Три ошибки порядка — и я откачу этап. Чужую связь тронешь — откачу сразу».',
    nodes: nodes({
      core: [0.5, 0], world: [2.5, 0],
      session: [0, 1], cache: [1, 1], index: [2, 1], sync: [3, 1],
      progress: [0, 2], profile: [1, 2], journal: [2, 2], avatar: [3, 2],
      u03: [0, 3], u07: [1.5, 3], u06: [3, 3],
    }),
    links: links('o', 'u07>profile u07>journal profile>cache journal>cache journal>index cache>core index>world profile>session session>core u03>progress progress>cache u06>avatar avatar>sync sync>world world>core'),
  },
  {
    kind: 'unstable',
    title: 'Этап 3 из 4. Нестабильный раздел',
    intro:
      'Калькулятор: «Здесь данные повреждены, и программа держится за тебя: будет запирать твои файлы и откатывать разрывы. Как появится замок — решай мои примеры и вводи ответы, пока не истекло время. Порядок тот же: от себя».',
    nodes: nodes({
      world: [0.5, 0], core: [2.5, 0],
      cache: [0, 1], sync: [1, 1], session: [2, 1], index: [3, 1],
      avatar: [0, 2], profile: [1, 2], progress: [2, 2], journal: [3, 2],
      u02: [0, 3], u07: [1.5, 3], u04: [3, 3],
    }),
    links: links('n', 'u07>profile u07>progress u07>avatar profile>sync progress>sync sync>world progress>index index>core avatar>cache u02>cache cache>world u04>journal journal>session session>core journal>index world>core'),
  },
  {
    kind: 'separate',
    title: 'Этап 4 из 4. Последний путь',
    intro:
      'Калькулятор: «Последняя проверка. От user_07.usr до world.map не должно остаться ни одного пути. Но система выдержит только три разрыва — больше, и она посыплется. Ищи узкие места. Кнопка „Трассировка“ покажет путь, который ещё остался».',
    nodes: nodes({
      core: [0.5, 0], world: [2.5, 0],
      session: [0, 1], cache: [1, 1], index: [2, 1], sync: [3, 1],
      progress: [0, 2], profile: [1, 2], journal: [2, 2], avatar: [3, 2],
      u01: [0, 3], u07: [1, 3], u05: [2, 3], u06: [3, 3],
    }),
    links: links('s', 'u07>progress u07>profile u07>journal u07>avatar progress>session profile>session u01>session session>core profile>cache journal>cache cache>world journal>index u05>index index>world avatar>sync u06>sync sync>world progress>cache world>core'),
    budget: 3,
  },
];

export const label = (id: string) => FILES[id]?.label ?? id;
