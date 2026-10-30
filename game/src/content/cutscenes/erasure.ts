// Глава 9. «Стирание»: «Мелоди достаёт инструмент стирания и начинает
// уничтожать его прямо на глазах у Дамео. Сначала исчезают мелкие детали тела,
// затем черты лица и конечности. Ластик зовёт братьев, которые пытаются помочь
// ему, но Мелоди продолжает стирать его, не повышая голоса. Ластик исчезает
// полностью. Не остаётся тела, следов или даже ошибки в программе … Имя
// погибшего исчезает из интерфейса» (синопсис).
//
// Four short staged beats on the 3D corridor, each played right before the
// chapter's own line that describes it (ch09.ts), so the player sees the stroke
// and then reads it: 1) the small details — a corner, the side seam, the
// maker's print; 2) the face — eyes to blots, the mouth a pale strip; 3) the
// limbs, while his brothers hold on and their hands pass through; 4) the rest,
// scrubbed out from the feet up, the clean floor, and his name rubbed out of
// the interface. No captions: the words stay in the story. No crumbs and no
// outline are left behind («не остаётся крошек… не остаётся следов»).
//
// Stage (ch09): eraser-1 stands at "left", Melody at "center"; in the third and
// fourth beats Melody is off the story stage (the brothers hold "center" and
// "right"), so the scene brings her in and takes her out again. Each beat ends
// with everyone back on their marks (skipping gives the same end state); what
// was erased stays erased on his figure for the following lines.
import type { Cue, Cutscene } from '../../world/director';
import type { Shot } from '../../world/types';

/** Corridor marks (world/locations/corridor.ts): left −1.7, center 0, right 1.7; z −0.6. */
const VICTIM: [number, number] = [-1.7, -0.6];
/** Where Melody stands to reach him: an arm's length to his right, a little nearer the camera. */
const REACH: [number, number] = [-1.05, -0.35];
/** Off the story stage she comes in from (and goes back to) the front right, clear of the brothers. */
const ASIDE: [number, number] = [0.9, 0.25];

const shots = {
  /** Over Melody's shoulder down at him. */
  over: { pos: [-0.35, 1.2, 1.05], look: [-1.6, 0.3, -0.6], fov: 44 } satisfies Shot,
  /** Low and close on his body: what is gone shows as holes. */
  body: { pos: [-1.5, 0.32, 0.45], look: [-1.7, 0.24, -0.6], fov: 34 } satisfies Shot,
  /** His face. */
  face: { pos: [-1.62, 0.36, 0.2], look: [-1.7, 0.33, -0.6], fov: 30 } satisfies Shot,
  /** Down at his legs, the brothers' hands at the sides. */
  legs: { pos: [-1.4, 0.45, 0.75], look: [-1.7, 0.12, -0.6], fov: 40 } satisfies Shot,
  /** The three of them and her, from where Dameo stands. */
  group: { pos: [-0.9, 0.95, 2.1], look: [-1.3, 0.35, -0.6], fov: 46 } satisfies Shot,
  /** The empty floor where he stood. */
  floor: { pos: [-1.45, 0.55, 0.9], look: [-1.7, 0.15, -0.6], fov: 38 } satisfies Shot,
};

/** Melody steps up to him and raises the eraser. */
const approach = (bringHer: boolean): Cue[] => [
  ...(bringHer ? [{ do: 'cast', actors: [{ id: 'melody', at: ASIDE, facing: 'left' as const, emotion: 'neutral' as const }] } satisfies Cue] : []),
  { do: 'letterbox', on: true },
  { do: 'shot', shot: shots.over, dur: 0.7, async: true },
  { do: 'move', actor: 'melody', to: REACH, speed: 1.1 },
  { do: 'turn', actor: 'melody', facing: 'left' },
  { do: 'turn', actor: 'eraser-1', facing: 'right' },
  { do: 'prop', name: 'eraser', action: 'draw', dur: 0.5, target: 'melody:eraser-1' },
];

/** She steps back to her place (or out of the frame) and the scene hands back. */
const retreat = (takeHerAway: boolean): Cue[] => [
  { do: 'prop', name: 'eraser', action: 'back', dur: 0.5 },
  { do: 'prop', name: 'eraser', action: 'hide', dur: 0 },
  ...(takeHerAway
    ? ([{ do: 'move', actor: 'melody', to: ASIDE, speed: 1.3 }, { do: 'remove', actor: 'melody' }] satisfies Cue[])
    : ([{ do: 'move', actor: 'melody', to: 'center', speed: 1.1 }, { do: 'turn', actor: 'melody', facing: 'left' }] satisfies Cue[])),
  { do: 'letterbox', on: false },
];

export const erasureDetails: Cutscene = {
  id: 'erasure-details',
  title: 'Стирание: мелкие детали',
  cues: [
    ...approach(false),
    { do: 'sfx', sound: 'erase' },
    { do: 'prop', name: 'eraser', action: 'stroke-details', dur: 1.3, async: true },
    { do: 'shot', shot: shots.body, dur: 0.5, async: true },
    { do: 'wait', dur: 0.45 },
    { do: 'actorFx', actor: 'eraser-1', fx: 'erase-details', dur: 0.85 },
    { do: 'emote', actor: 'eraser-1', emotion: 'scared' },
    { do: 'wait', dur: 1.4 },
    ...retreat(false),
  ],
};

export const erasureFace: Cutscene = {
  id: 'erasure-face',
  title: 'Стирание: черты лица',
  cues: [
    ...approach(false),
    { do: 'shot', shot: shots.face, dur: 0.5, async: true },
    { do: 'sfx', sound: 'erase' },
    { do: 'prop', name: 'eraser', action: 'stroke-face', dur: 1.3, async: true },
    { do: 'wait', dur: 0.45 },
    { do: 'actorFx', actor: 'eraser-1', fx: 'erase-face', dur: 0.85 },
    { do: 'actorFx', actor: 'eraser-1', fx: 'tremble', dur: 0.6, async: true },
    { do: 'wait', dur: 1.6 },
    ...retreat(false),
  ],
};

export const erasureLimbs: Cutscene = {
  id: 'erasure-limbs',
  title: 'Стирание: конечности',
  cues: [
    // the brothers hold on to him from both sides
    { do: 'letterbox', on: true },
    { do: 'shot', shot: shots.group, dur: 0 },
    {
      do: 'par',
      cues: [
        { do: 'move', actor: 'eraser-2', to: [VICTIM[0] + 0.42, VICTIM[1] + 0.05], run: true },
        { do: 'move', actor: 'eraser-3', to: [VICTIM[0] - 0.42, VICTIM[1] + 0.05], run: true },
      ],
    },
    { do: 'turn', actor: 'eraser-2', facing: 'left' },
    { do: 'turn', actor: 'eraser-3', facing: 'right' },
    ...approach(true),
    { do: 'shot', shot: shots.legs, dur: 0.5, async: true },
    { do: 'sfx', sound: 'erase' },
    { do: 'prop', name: 'eraser', action: 'stroke-limbs', dur: 1.3, async: true },
    { do: 'wait', dur: 0.45 },
    {
      do: 'par',
      cues: [
        { do: 'actorFx', actor: 'eraser-1', fx: 'erase-limbs', dur: 0.85 },
        { do: 'actorFx', actor: 'eraser-2', fx: 'tremble', dur: 0.8 },
        { do: 'actorFx', actor: 'eraser-3', fx: 'tremble', dur: 0.8 },
      ],
    },
    { do: 'wait', dur: 1.2 },
    // she is gone from the frame before the camera pulls back; the brothers are thrown off
    { do: 'shot', shot: shots.body, dur: 0.4 },
    ...retreat(true),
    {
      do: 'par',
      cues: [
        { do: 'move', actor: 'eraser-2', to: 'center' },
        { do: 'move', actor: 'eraser-3', to: 'right' },
      ],
    },
    { do: 'turn', actor: 'eraser-2', facing: 'left' },
    { do: 'turn', actor: 'eraser-3', facing: 'left' },
  ],
};

export const erasureGone: Cutscene = {
  id: 'erasure-gone',
  title: 'Стирание: ничего не остаётся',
  cues: [
    { do: 'shot', shot: shots.group, dur: 0 },
    ...approach(true),
    { do: 'shot', shot: shots.body, dur: 0.6, async: true },
    // what is left, scrubbed out from the feet up — quietly, neatly
    { do: 'sfx', sound: 'erase' },
    {
      do: 'par',
      cues: [
        { do: 'prop', name: 'eraser', action: 'scrub', dur: 2.6 },
        { do: 'actorFx', actor: 'eraser-1', fx: 'erase', dur: 2.6 },
        { do: 'sfx', sound: 'erase', async: true },
      ],
    },
    { do: 'sfx', sound: 'glitch' },
    { do: 'flash', color: '#fff9fd', dur: 0.2 },
    { do: 'prop', name: 'eraser', action: 'hide', dur: 0 },
    // she steps away; nothing is left: not a body, not a crumb, not an error
    { do: 'move', actor: 'melody', to: ASIDE, speed: 1.2, async: true },
    { do: 'shot', shot: shots.floor, dur: 0.8 },
    { do: 'wait', dur: 1.2 },
    { do: 'remove', actor: 'melody' },
    // and his name goes from the interface
    { do: 'eraseName', actor: 'eraser-1', dur: 2.6 },
    { do: 'letterbox', on: false },
  ],
};
