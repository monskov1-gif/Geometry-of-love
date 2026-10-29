// Глава 3: «Дамео собирается закрыть приложение, но из монитора внезапно
// появляется рука, хватает его и затягивает внутрь экрана» (синопсис).
// Direction (author's notes): the room at night from behind his shoulder, the
// exit dialog that will not take a «Да». Then his own eyes: Melody stares out
// of the screen, flickers and is gone — the picture tears, snow, a dark empty
// tube, silence. The glass bulges from inside like a membrane, fingertips
// pressing through; a real arm breaks out with a ripple, reaches for HIM (the
// camera), closes on him and pulls: the camera is dragged into the glass, the
// screen fills the frame and burns out white-pink. Only then the story shows
// the inside. Skipping lands on the same end state (white, hand gone, Dameo off
// the stage, the lesson back on the monitor).
import type { Cutscene } from '../../world/director';
import { VANISH_TIME } from '../../world/app-screen';

export const pulledIn: Cutscene = {
  id: 'pulled-in',
  title: 'Рука из монитора',
  cues: [
    { do: 'location', id: 'dameo-room', state: 'night' },
    { do: 'cast', actors: [{ id: 'dameo', at: 'chair', facing: 'back', emotion: 'tired' }] },
    { do: 'screen', state: { view: 'close-dialog', melody: 'angry', unease: 0.5, notices: [] } },
    { do: 'shot', shot: 'over-shoulder', dur: 0 },
    { do: 'letterbox', on: true },
    { do: 'music', track: null },
    { do: 'wait', dur: 1.0 },
    { do: 'line', speaker: 'dameo', text: 'Всё. Хватит.' },
    { do: 'sfx', sound: 'click' },
    { do: 'wait', dur: 0.5 },
    // the program refuses to close
    { do: 'screen', state: { view: 'close-dialog', melody: 'angry', unease: 0.9 } },
    { do: 'sfx', sound: 'glitch' },
    { do: 'sfx', sound: 'click' },
    { do: 'wait', dur: 0.3 },
    { do: 'sfx', sound: 'click' },
    { do: 'wait', dur: 0.4 },
    // his eyes: she fills the screen and looks at him
    { do: 'remove', actor: 'dameo' },
    { do: 'shot', shot: 'pov', dur: 0 },
    { do: 'screen', state: { view: 'stare', melody: 'neutral', unease: 1 } },
    { do: 'sfx', sound: 'heartbeat' },
    { do: 'wait', dur: 1.6 },
    // …and she is gone: the picture tears, snow, an empty dark tube
    { do: 'screen', state: { view: 'vanish' } },
    { do: 'sfx', sound: 'glitch' },
    { do: 'wait', dur: VANISH_TIME },
    { do: 'screen', state: { view: 'static' } },
    { do: 'sfx', sound: 'erase' },
    { do: 'wait', dur: 0.9 },
    { do: 'screen', state: { view: 'void' } },
    // silence
    { do: 'wait', dur: 2.6 },
    // the glass bulges from inside: a hand pressing against it
    { do: 'sfx', sound: 'heartbeat' },
    { do: 'prop', name: 'monitor-hand', action: 'press', dur: 1.8 },
    { do: 'sfx', sound: 'creak' },
    { do: 'wait', dur: 0.5 },
    // it breaks through
    { do: 'sfx', sound: 'hand' },
    {
      do: 'par',
      cues: [
        { do: 'prop', name: 'monitor-hand', action: 'emerge', dur: 0.8, target: 'camera' },
        { do: 'shake', strength: 0.5, dur: 0.5 },
      ],
    },
    { do: 'line', speaker: 'dameo', text: 'Что за…', dur: 1.2 },
    // it reaches for him; he jerks back in the chair
    {
      do: 'par',
      cues: [
        { do: 'prop', name: 'monitor-hand', action: 'reach', dur: 1.5, target: 'camera' },
        { do: 'shot', shot: 'pov-recoil', dur: 1.2 },
        { do: 'sfx', sound: 'rumble' },
      ],
    },
    // grabbed
    { do: 'sfx', sound: 'slam' },
    {
      do: 'par',
      cues: [
        { do: 'prop', name: 'monitor-hand', action: 'grab', dur: 0.3, target: 'camera' },
        { do: 'shake', strength: 1.2, dur: 0.4 },
      ],
    },
    { do: 'line', speaker: 'dameo', text: 'Пусти! ПУСТИ!', dur: 1.4 },
    // dragged into the glass: the screen fills the frame and burns out
    {
      do: 'par',
      cues: [
        { do: 'prop', name: 'monitor-hand', action: 'pull', dur: 1.7, target: 'camera' },
        { do: 'shot', shot: 'into-screen', dur: 1.7 },
        { do: 'sfx', sound: 'erase' },
      ],
    },
    { do: 'flash', color: '#ff6cc5', dur: 0.25 },
    { do: 'sfx', sound: 'sparkle' },
    { do: 'fade', to: 'white', dur: 0.4 },
    { do: 'prop', name: 'monitor-hand', action: 'hide', dur: 0 },
    { do: 'screen', state: { view: 'lesson', melody: 'cheerful', unease: 0 } },
    { do: 'wait', dur: 0.8 },
    { do: 'letterbox', on: false },
  ],
};
