// Character registry. Names come from the synopsis (materials/docs).
// Every pose is either a region of a real sprite sheet or an explicit
// placeholder, which the UI renders as a labelled silhouette.
import melodySheet01 from '../assets/characters/melody/melody-sheet-01.png';
import melodySheet02 from '../assets/characters/melody/melody-sheet-02.png';

export interface SheetPose {
  kind: 'sheet';
  src: string;
  /** Source sheet size in pixels. */
  sheet: { w: number; h: number };
  /** Region of the sheet holding this pose. */
  frame: { x: number; y: number; w: number; h: number };
  /** Row (relative to frame.y) where the bust is cut off; aligned to the stage floor. */
  baseline: number;
}

export interface PlaceholderPose {
  kind: 'placeholder';
  /** Shown on the silhouette so nobody mistakes it for final art. */
  note: string;
}

export type Pose = SheetPose | PlaceholderPose;

export interface CharacterDef {
  id: string;
  name: string;
  /** Pose rendered height reference in source pixels (keeps pixel scale equal across poses). */
  referenceHeight?: number;
  /** Nameplate accent; must be one of the design tokens. */
  accent: string;
  poses: Record<string, Pose>;
}

const MELODY_SHEET_01 = { w: 2364, h: 1576 };
const MELODY_SHEET_02 = { w: 2436, h: 1624 };

const placeholder = (note = 'ВРЕМЕННАЯ ЗАГЛУШКА — спрайт ещё не нарисован'): Record<string, Pose> => ({
  default: { kind: 'placeholder', note },
});

export const characters: Record<string, CharacterDef> = {
  melody: {
    id: 'melody',
    name: 'Мелоди',
    referenceHeight: 1300,
    accent: 'var(--pink)',
    // Four busts on two sheets (2 per sheet). Pose ids describe what is drawn;
    // they are working names, not approved emotion names.
    poses: {
      'arms-crossed': {
        kind: 'sheet',
        src: melodySheet01,
        sheet: MELODY_SHEET_01,
        frame: { x: 0, y: 16, w: 1196, h: 1184 },
        baseline: 1127,
      },
      angry: {
        kind: 'sheet',
        src: melodySheet01,
        sheet: MELODY_SHEET_01,
        frame: { x: 1204, y: 8, w: 1160, h: 1200 },
        baseline: 1151,
      },
      cheerful: {
        kind: 'sheet',
        src: melodySheet02,
        sheet: MELODY_SHEET_02,
        frame: { x: 60, y: 32, w: 1200, h: 1308 },
        baseline: 1199,
      },
      neutral: {
        kind: 'sheet',
        src: melodySheet02,
        sheet: MELODY_SHEET_02,
        frame: { x: 1268, y: 52, w: 1168, h: 1236 },
        baseline: 1187,
      },
    },
  },
  dameo: { id: 'dameo', name: 'Дамео', accent: 'var(--rainbow-blue)', poses: placeholder() },
  satsuki: { id: 'satsuki', name: 'Сацуки', accent: 'var(--reality-olive)', poses: placeholder() },
  calculator: { id: 'calculator', name: 'Калькулятор-Пушин', accent: 'var(--mint)', poses: placeholder() },
  ruler: { id: 'ruler', name: 'Говорящая Линейка', accent: 'var(--lemon)', poses: placeholder() },
  compass: { id: 'compass', name: 'Циркулёнок', accent: 'var(--lavender)', poses: placeholder() },
  // The synopsis never names the three eraser twins; ids are technical.
  'eraser-1': { id: 'eraser-1', name: 'Ластик', accent: 'var(--baby-pink)', poses: placeholder() },
  'eraser-2': { id: 'eraser-2', name: 'Ластик', accent: 'var(--baby-pink)', poses: placeholder() },
  'eraser-3': { id: 'eraser-3', name: 'Ластик', accent: 'var(--baby-pink)', poses: placeholder() },
};
