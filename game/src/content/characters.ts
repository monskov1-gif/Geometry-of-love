// Character registry. Names come from the synopsis (materials/docs).
// Melody's VN poses are regions of her real sprite sheets; everyone else is a
// generated pixel character (render/sprites) with emotions as poses.
import { EMOTIONS, type Emotion } from '../render/sprites';
import melodySheet01 from '../assets/characters/melody/melody-sheet-01.png';
import melodySheet02 from '../assets/characters/melody/melody-sheet-02.png';
import dameoBust from '../assets/characters/dameo/dameo-bust.png';
import calculatorArt from '../assets/characters/npc/calculator.png';
import rulerArt from '../assets/characters/npc/ruler.png';
import eraser1Art from '../assets/characters/npc/eraser-1.png';
import eraser2Art from '../assets/characters/npc/eraser-2.png';
import eraser3Art from '../assets/characters/npc/eraser-3.png';

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
  portrait?: { src: string; w: number; h: number; side: 'left' | 'right'; /** height against a person's portrait (1) */ scale?: number };
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
  calculator: { id: 'calculator', name: 'Калькулятор-Пушин', accent: 'var(--mint)', poses: pixel(), portrait: { src: calculatorArt, w: 706, h: 872, side: 'right', scale: 0.62 } },
  ruler: { id: 'ruler', name: 'Говорящая Линейка', accent: 'var(--lemon)', poses: pixel(), portrait: { src: rulerArt, w: 642, h: 1331, side: 'right', scale: 0.92 } },
  compass: { id: 'compass', name: 'Циркулёнок', accent: 'var(--lavender)', poses: pixel() },
  // The synopsis never names the three eraser twins: the numbers are technical
  // labels, not names. Melody's use of a name in chapter 9 is shown erased.
  // painted portraits: author art 2026-10-30 (materials/characters/npc-sprites-2026-10-30.png); which eraser is which is the lead's guess
  'eraser-1': { id: 'eraser-1', name: 'Ластик №1', accent: 'var(--baby-pink)', poses: pixel(), portrait: { src: eraser1Art, w: 496, h: 388, side: 'right', scale: 0.42 } },
  'eraser-2': { id: 'eraser-2', name: 'Ластик №2', accent: 'var(--baby-pink)', poses: pixel(), portrait: { src: eraser2Art, w: 518, h: 901, side: 'right', scale: 0.55 } },
  'eraser-3': { id: 'eraser-3', name: 'Ластик №3', accent: 'var(--baby-pink)', poses: pixel(), portrait: { src: eraser3Art, w: 377, h: 517, side: 'right', scale: 0.48 } },
};
