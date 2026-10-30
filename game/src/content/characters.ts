// Character registry. Names come from the synopsis (materials/docs).
// Melody's VN poses are regions of her real sprite sheets; everyone else is a
// generated pixel character (render/sprites) with emotions as poses.
import { EMOTIONS, type Emotion } from '../render/sprites';
import melodySheet01 from '../assets/characters/melody/melody-sheet-01.png';
import melodySheet02 from '../assets/characters/melody/melody-sheet-02.png';
import dameoBust from '../assets/characters/dameo/dameo-bust.png';

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

/** A pose of a generated pixel character (render/sprites): one emotion of the shared sprite. */
export interface PixelPose {
  kind: 'pixel';
  emotion: Emotion;
}

export type Pose = SheetPose | PixelPose;

export interface CharacterDef {
  id: string;
  name: string;
  /** Pose rendered height reference in source pixels (keeps pixel scale equal across poses). */
  referenceHeight?: number;
  /** Nameplate accent; must be one of the design tokens. */
  accent: string;
  /** The author's painted portrait, shown beside the dialogue while this character speaks
   * in 3D and monitor scenes (where their pixel figure is small or off screen). */
  portrait?: { src: string; w: number; h: number; side: 'left' | 'right' };
  poses: Record<string, Pose>;
}

const MELODY_SHEET_01 = { w: 2364, h: 1576 };
const MELODY_SHEET_02 = { w: 2436, h: 1624 };

/** Pixel characters: `default` = neutral plus every emotion of the generator. */
const pixel = (): Record<string, Pose> => ({
  default: { kind: 'pixel', emotion: 'neutral' },
  ...Object.fromEntries(EMOTIONS.map((emotion) => [emotion, { kind: 'pixel', emotion } satisfies PixelPose])),
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
  dameo: {
    id: 'dameo',
    name: 'Дамео',
    accent: 'var(--rainbow-blue)',
    poses: pixel(),
    // author art 2026-10-30 (materials/characters/melody-dameo-2026-10-30.png), cut out
    portrait: { src: dameoBust, w: 933, h: 1304, side: 'left' },
  },
  satsuki: { id: 'satsuki', name: 'Сацуки', accent: 'var(--reality-olive)', poses: pixel() },
  calculator: { id: 'calculator', name: 'Калькулятор-Пушин', accent: 'var(--mint)', poses: pixel() },
  ruler: { id: 'ruler', name: 'Говорящая Линейка', accent: 'var(--lemon)', poses: pixel() },
  compass: { id: 'compass', name: 'Циркулёнок', accent: 'var(--lavender)', poses: pixel() },
  // The synopsis never names the three eraser twins: the numbers are technical
  // labels, not names. Melody's use of a name in chapter 9 is shown erased.
  'eraser-1': { id: 'eraser-1', name: 'Ластик №1', accent: 'var(--baby-pink)', poses: pixel() },
  'eraser-2': { id: 'eraser-2', name: 'Ластик №2', accent: 'var(--baby-pink)', poses: pixel() },
  'eraser-3': { id: 'eraser-3', name: 'Ластик №3', accent: 'var(--baby-pink)', poses: pixel() },
};
